import type { Config, Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  const siteUrl = process.env.URL;
  const retrySecret = process.env.BOOKING_RETRY_SECRET;

  if (!siteUrl || !retrySecret) {
    console.error('Scheduled booking email retry is missing deployment configuration.');
    return { statusCode: 500, body: 'Retry configuration missing.' };
  }

  try {
    const response = await fetch(new URL('/api/bookings/retry', siteUrl), {
      method: 'POST',
      headers: { authorization: `Bearer ${retrySecret}` },
    });

    if (!response.ok) {
      console.error('Scheduled booking email retry endpoint failed.', { status: response.status });
      return { statusCode: 502, body: 'Retry endpoint failed.' };
    }

    return { statusCode: 200, body: 'Booking email retry completed.' };
  } catch {
    console.error('Scheduled booking email retry request failed.');
    return { statusCode: 502, body: 'Retry endpoint unavailable.' };
  }
};

export const config: Config = { schedule: '*/5 * * * *' };
