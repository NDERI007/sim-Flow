import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
export async function notifyQuotaFailure({
  email,
  messagePreview,
  missingAmount,
  availableQuota,
}: {
  email: string;
  messagePreview: string;
  missingAmount: number;
  availableQuota: number;
}) {
  try {
    await resend.emails.send({
      from: 'no-reply@qualitechlabs.org',
      to: email,
      subject: 'Insufficient SMS Quota',
      html: `
        <p>Hi there,</p>
        <p>We tried to send your scheduled message, but your SMS quota is too low.</p>
        <p><strong>Preview:</strong> ${messagePreview}</p>
        <p><strong>Available:</strong> ${availableQuota} segments</p>
        <p><strong>Required:</strong> ${missingAmount} segments</p>
        <p>Please top up to ensure future messages are delivered.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/purchase">Top Up Now</a></p>
        <p>— Your SMS Gateway Team</p>
      `,
    });
  } catch (err) {
    console.error('❌ Failed to send quota warning email:', err);
  }
}
