import nodemailer, { type Transporter } from 'nodemailer';
import {
  claimBookingEmail,
  completeBookingEmail,
  failBookingEmail,
  getBookingEmailState,
  type BookingEmailRecipient,
  type BookingRecord,
} from './booking-database';

const ADMIN_EMAIL = 'festusleonard996@gmail.com';
let transporter: Transporter | undefined;

class BookingEmailConfigurationError extends Error {
  readonly code = 'SMTP_CONFIG';

  constructor(message: string) {
    super(message);
    this.name = 'BookingEmailConfigurationError';
  }
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST?.trim();
  const portValue = process.env.SMTP_PORT?.trim();
  const secureValue = process.env.SMTP_SECURE?.trim().toLowerCase();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME?.trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  const requiredSettings: Array<[string, string | undefined]> = [
    ['SMTP_HOST', host],
    ['SMTP_PORT', portValue],
    ['SMTP_SECURE', secureValue],
    ['SMTP_USER', user],
    ['SMTP_PASS', pass],
    ['SMTP_FROM_NAME', fromName],
    ['SMTP_FROM_EMAIL', fromEmail],
  ];
  const missingSettings = requiredSettings
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missingSettings.length) {
    throw new BookingEmailConfigurationError(
      `Missing or empty SMTP environment variable(s): ${missingSettings.join(', ')}.`,
    );
  }
  if (!host || !portValue || !secureValue || !user || !pass || !fromEmail) {
    throw new BookingEmailConfigurationError('Gmail SMTP settings are incomplete.');
  }

  const port = Number(portValue);
  if (host.toLowerCase() !== 'smtp.gmail.com') {
    throw new BookingEmailConfigurationError('SMTP_HOST must be smtp.gmail.com for Gmail delivery.');
  }
  if (port !== 587 || secureValue !== 'false') {
    throw new BookingEmailConfigurationError('Gmail SMTP requires SMTP_PORT=587 and SMTP_SECURE=false.');
  }
  if (user.toLowerCase() !== ADMIN_EMAIL || fromEmail.toLowerCase() !== ADMIN_EMAIL) {
    throw new BookingEmailConfigurationError('SMTP_USER and SMTP_FROM_EMAIL must match the configured Gmail account.');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    requireTLS: true,
    tls: { rejectUnauthorized: true },
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function emailDetails(booking: BookingRecord): Array<[string, string]> {
  return [
    ['Booking reference', booking.reference],
    ['Booking status', booking.status],
    ['Apartment', booking.unit_code ?? 'Not assigned'],
    ['Full name', booking.name],
    ['Email address', booking.email],
    ['Phone number', booking.phone || 'Not provided'],
    ['Check-in', booking.checkin],
    ['Check-out', booking.checkout],
    ['Adults', booking.adults === null ? 'Not recorded' : String(booking.adults)],
    ['Children', booking.children === null ? 'Not recorded' : String(booking.children)],
    ['Additional beds requested', booking.extra_beds_requested === null ? 'Not recorded' : String(booking.extra_beds_requested)],
    ['Child sleeping arrangement', booking.children_approval_status ?? 'Not recorded'],
    ['Accommodation type', booking.accommodation_type || 'Not specified'],
    ['Special requests', booking.special_requests || 'None'],
  ];
}

function detailsTable(booking: BookingRecord): string {
  return emailDetails(booking)
    .map(([label, value]) => `<tr>
      <th align="left" style="padding:12px 14px;border-bottom:1px solid #e6ece7;color:#526258;font-size:13px;font-weight:600">${escapeHtml(label)}</th>
      <td align="left" style="padding:12px 14px;border-bottom:1px solid #e6ece7;color:#17241b;font-size:14px">${escapeHtml(value)}</td>
    </tr>`)
    .join('');
}

function emailShell(title: string, content: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f7f1;font-family:Arial,Helvetica,sans-serif;color:#17241b">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f1;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
          <tr><td style="background:#122d20;padding:26px 30px">
            <p style="margin:0;color:#f5df96;font-size:12px;letter-spacing:2px;text-transform:uppercase">Mums Backpackers</p>
            <h1 style="margin:10px 0 0;color:#ffffff;font-family:Georgia,serif;font-size:26px;font-weight:normal">${escapeHtml(title)}</h1>
          </td></tr>
          <tr><td style="padding:26px 30px;line-height:1.55">${content}</td></tr>
          <tr><td style="background:#f2f5f0;padding:20px 30px;color:#526258;font-size:12px;line-height:1.6">
            Mums Backpackers · <a href="mailto:${ADMIN_EMAIL}" style="color:#25543a">${ADMIN_EMAIL}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export interface ConfirmedEnquiryEmail {
  id: string;
  name: string;
  email: string;
  category: 'Room booking' | 'Vehicle rental' | 'Safari';
  details: Array<[string, string]>;
}

export async function sendConfirmedEnquiryEmail(enquiry: ConfirmedEnquiryEmail): Promise<void> {
  const rows = enquiry.details.map(([label, value]) => `<tr>
      <th align="left" style="padding:12px 14px;border-bottom:1px solid #e6ece7;color:#526258;font-size:13px;font-weight:600">${escapeHtml(label)}</th>
      <td align="left" style="padding:12px 14px;border-bottom:1px solid #e6ece7;color:#17241b;font-size:14px">${escapeHtml(value)}</td>
    </tr>`).join('');
  const detailsTableHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows}</table>`;
  const content = `<p style="margin:0 0 16px">Hello ${escapeHtml(enquiry.name)},</p>
    <p style="margin:0 0 20px">Your ${escapeHtml(enquiry.category.toLowerCase())} has been confirmed. We look forward to welcoming you.</p>
    <h2 style="margin:24px 0 10px;color:#122d20;font-family:Georgia,serif;font-size:20px">Confirmation details</h2>
    ${detailsTableHtml}
    <p style="margin:20px 0 0">If you have questions, reply to this email or contact <a href="mailto:${ADMIN_EMAIL}" style="color:#25543a">${ADMIN_EMAIL}</a>.</p>`;
  const text = [
    `Hello ${enquiry.name},`,
    '',
    `Your ${enquiry.category.toLowerCase()} has been confirmed. We look forward to welcoming you.`,
    '',
    ...enquiry.details.map(([label, value]) => `${label}: ${value}`),
    '',
    `Questions? Contact ${ADMIN_EMAIL}.`,
  ].join('\n');

  await getTransporter().sendMail({
    from: {
      name: process.env.SMTP_FROM_NAME?.trim() ?? '',
      address: process.env.SMTP_FROM_EMAIL?.trim() ?? '',
    },
    to: enquiry.email,
    messageId: `<confirmation-${enquiry.id}@gmail.com>`,
    subject: `Confirmed · ${enquiry.category} · Mums Backpackers`,
    html: emailShell('Your booking is confirmed', content),
    text,
  });
}

function customerEmail(booking: BookingRecord) {
  const childReview = booking.children && booking.children > 0
    ? ' Your request for children and additional sleeping arrangements is subject to administrator approval.'
    : '';
  const html = `<p style="margin:0 0 16px">Hello ${escapeHtml(booking.name)},</p>
    <p style="margin:0 0 20px">We received your booking request. It is <strong>pending confirmation</strong>; our team will contact you to confirm availability.${escapeHtml(childReview)}</p>
    <h2 style="margin:24px 0 10px;color:#122d20;font-family:Georgia,serif;font-size:20px">Your request details</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${detailsTable(booking)}</table>
    <p style="margin:20px 0 0">If you have questions, reply to this email or contact <a href="mailto:${ADMIN_EMAIL}" style="color:#25543a">${ADMIN_EMAIL}</a>.</p>`;
  const text = [
    `Hello ${booking.name},`,
    '',
    `We received your booking request. It is pending confirmation; our team will contact you to confirm availability.${childReview}`,
    '',
    ...emailDetails(booking).map(([label, value]) => `${label}: ${value}`),
    '',
    `Questions? Contact ${ADMIN_EMAIL}.`,
  ].join('\n');

  return {
    subject: `Booking request received · ${booking.reference}`,
    html: emailShell('Request received', html),
    text,
  };
}

function adminEmail(booking: BookingRecord) {
  const html = `<p style="margin:0 0 20px">A new booking request needs review.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${detailsTable(booking)}</table>`;
  const text = [
    'A new booking request needs review.',
    '',
    ...emailDetails(booking).map(([label, value]) => `${label}: ${value}`),
  ].join('\n');

  return {
    subject: `New booking request · ${booking.reference}`,
    html: emailShell('New booking request', html),
    text,
  };
}

interface BookingEmailErrorDetails {
  code: string;
  name: string;
  message: string;
  command?: string;
  responseCode?: number;
}

function redactSecrets(message: string): string {
  const secrets = [
    process.env.SMTP_PASS,
    process.env.SMTP_PASSWORD,
    process.env.DB_PASSWORD,
    process.env.BOOKING_RATE_LIMIT_SECRET,
    process.env.BOOKING_RETRY_SECRET,
  ].filter((secret): secret is string => Boolean(secret));

  return secrets.reduce(
    (safeMessage, secret) => safeMessage.split(secret).join('[REDACTED]'),
    message,
  )
    .replace(/\b(Bearer|Basic)\s+\S+/gi, '$1 [REDACTED]')
    .replace(/\b(password|pass)\s*[:=]\s*[^,\s]+/gi, '$1=[REDACTED]')
    .slice(0, 1000);
}

function getErrorDetails(error: unknown): BookingEmailErrorDetails {
  if (error instanceof Error) {
    const candidate = error as Error & {
      code?: unknown;
      command?: unknown;
      responseCode?: unknown;
    };
    return {
      code: typeof candidate.code === 'string' ? candidate.code : candidate.name,
      name: candidate.name,
      message: redactSecrets(candidate.message),
      ...(typeof candidate.command === 'string' ? { command: candidate.command } : {}),
      ...(typeof candidate.responseCode === 'number' ? { responseCode: candidate.responseCode } : {}),
    };
  }

  return {
    code: 'UnknownError',
    name: 'UnknownError',
    message: 'Unknown email delivery error.',
  };
}

async function sendOne(booking: BookingRecord, recipient: BookingEmailRecipient): Promise<void> {
  let claimed: boolean;
  try {
    claimed = await claimBookingEmail(booking.id, recipient);
  } catch (error) {
    const details = getErrorDetails(error);
    console.error('Could not claim booking email for delivery.', {
      reference: booking.reference,
      recipient,
      code: details.code,
      name: details.name,
      message: details.message,
    });
    return;
  }
  if (!claimed) return;

  const sender = {
    name: process.env.SMTP_FROM_NAME?.trim() ?? '',
    address: process.env.SMTP_FROM_EMAIL?.trim() ?? '',
  };
  const message = recipient === 'admin' ? adminEmail(booking) : customerEmail(booking);
  let smtpMessageId = '';

  try {
    const result = await getTransporter().sendMail({
      from: sender,
      to: recipient === 'admin' ? ADMIN_EMAIL : booking.email,
      replyTo: recipient === 'admin' ? booking.email : undefined,
      messageId: `<booking-${booking.id}-${recipient}@gmail.com>`,
      ...message,
    });
    smtpMessageId = result.messageId;
  } catch (error) {
    const details = getErrorDetails(error);
    const attempts = recipient === 'admin'
      ? booking.admin_email_attempts + 1
      : booking.customer_email_attempts + 1;
    const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
    const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    console.error('Booking email delivery failed.', {
      reference: booking.reference,
      recipient,
      code: details.code,
      name: details.name,
      message: details.message,
      ...(details.command ? { command: details.command } : {}),
      ...(details.responseCode ? { responseCode: details.responseCode } : {}),
    });
    try {
      await failBookingEmail(booking.id, recipient, `${details.code}: ${details.message}`, retryAt);
    } catch (recordError) {
      const recordErrorDetails = getErrorDetails(recordError);
      console.error('Could not record booking email failure.', {
        reference: booking.reference,
        recipient,
        code: recordErrorDetails.code,
        name: recordErrorDetails.name,
        message: recordErrorDetails.message,
      });
    }
    return;
  }

  try {
    await completeBookingEmail(booking.id, recipient);
    console.info('Booking email accepted by Gmail SMTP and marked sent.', {
      reference: booking.reference,
      recipient,
      messageId: smtpMessageId,
    });
  } catch (error) {
    const details = getErrorDetails(error);
    console.error('SMTP accepted booking email but sent state could not be saved; retry claim retained.', {
      reference: booking.reference,
      recipient,
      code: details.code,
      name: details.name,
      message: details.message,
      ...(details.command ? { command: details.command } : {}),
      ...(details.responseCode ? { responseCode: details.responseCode } : {}),
    });
  }
}

export async function deliverBookingEmails(booking: BookingRecord): Promise<boolean> {
  await sendOne(booking, 'admin');
  await sendOne(booking, 'customer');

  try {
    const state = await getBookingEmailState(booking.id);
    if (!state) return true;
    return !state.admin_email_sent_at || !state.customer_email_sent_at;
  } catch (error) {
    const details = getErrorDetails(error);
    console.error('Could not verify booking email delivery state.', {
      reference: booking.reference,
      code: details.code,
      name: details.name,
      message: details.message,
    });
    return true;
  }
}
