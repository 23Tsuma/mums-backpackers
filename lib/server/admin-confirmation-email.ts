import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { sendConfirmedEnquiryEmail, type ConfirmedEnquiryEmail } from '@/lib/server/booking-email';
import { getDatabasePool } from '@/lib/server/mysql';

type ConfirmableRequest = ConfirmedEnquiryEmail & { category: ConfirmedEnquiryEmail['category'] };
type ConfirmableTable = 'booking_requests' | 'safari_enquiries' | 'vehicle_rental_enquiries';

interface ConfirmationState extends RowDataPacket {
  confirmation_email_sent_at: string | null;
  confirmation_email_attempts: number;
}

export interface ConfirmationEmailResult {
  sent: boolean;
  pending: boolean;
  message: string;
}

const tableForCategory: Record<ConfirmableRequest['category'], ConfirmableTable> = {
  'Room booking': 'booking_requests',
  'Vehicle rental': 'vehicle_rental_enquiries',
  Safari: 'safari_enquiries',
};

function errorCode(error: unknown): string {
  return error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
}

export async function sendAdminConfirmationEmail(
  category: ConfirmableRequest['category'],
  enquiry: Omit<ConfirmableRequest, 'category'>,
): Promise<ConfirmationEmailResult> {
  const table = tableForCategory[category];
  const database = getDatabasePool();
  const [claim] = await database.execute<ResultSetHeader>(
    `UPDATE ${table}
     SET confirmation_email_claimed_at = UTC_TIMESTAMP(3),
         confirmation_email_attempts = confirmation_email_attempts + 1
     WHERE id = ?
       AND status = 'Confirmed'
       AND confirmation_email_sent_at IS NULL
       AND confirmation_email_attempts < 8
       AND (
         confirmation_email_claimed_at IS NULL
         OR confirmation_email_claimed_at < UTC_TIMESTAMP(3) - INTERVAL 15 MINUTE
       )`,
    [enquiry.id],
  );

  if (claim.affectedRows !== 1) {
    const [rows] = await database.execute<ConfirmationState[]>(
      `SELECT confirmation_email_sent_at, confirmation_email_attempts
       FROM ${table}
       WHERE id = ?
       LIMIT 1`,
      [enquiry.id],
    );
    const state = rows[0];
    if (!state) return { sent: false, pending: false, message: 'The request could not be found.' };
    if (state.confirmation_email_sent_at) {
      return { sent: true, pending: false, message: 'Confirmation email was already sent.' };
    }
    if (Number(state.confirmation_email_attempts) >= 8) {
      return { sent: false, pending: true, message: 'Email retry limit reached. Please check the email settings.' };
    }
    return { sent: false, pending: true, message: 'Confirmation email delivery is already in progress.' };
  }

  try {
    await sendConfirmedEnquiryEmail({ ...enquiry, category });
  } catch (error) {
    const code = errorCode(error);
    console.error('Customer confirmation email could not be delivered.', {
      requestId: enquiry.id,
      category,
      code,
    });
    try {
      await database.execute(
        `UPDATE ${table}
         SET confirmation_email_claimed_at = NULL,
             confirmation_email_last_error = ?
         WHERE id = ?`,
        [`${code}: Confirmation email delivery failed.`, enquiry.id],
      );
      return {
        sent: false,
        pending: true,
        message: 'The request is confirmed, but its email could not be sent. Please retry the confirmation email.',
      };
    } catch (recordError) {
      console.error('Could not record customer confirmation email failure.', {
        requestId: enquiry.id,
        category,
        code: errorCode(recordError),
      });
      return {
        sent: false,
        pending: true,
        message: 'The request is confirmed, but email delivery could not be verified. Please retry later.',
      };
    }
  }

  try {
    await database.execute(
      `UPDATE ${table}
       SET confirmation_email_sent_at = UTC_TIMESTAMP(3),
           confirmation_email_claimed_at = NULL,
           confirmation_email_last_error = NULL
       WHERE id = ?`,
      [enquiry.id],
    );
    return { sent: true, pending: false, message: 'Confirmation email sent to the client.' };
  } catch (error) {
    console.error('Confirmation email was accepted but sent status could not be saved.', {
      requestId: enquiry.id,
      category,
      code: errorCode(error),
    });
    return {
      sent: false,
      pending: true,
      message: 'Email was sent, but its delivery status could not be saved. Check before retrying.',
    };
  }
}
