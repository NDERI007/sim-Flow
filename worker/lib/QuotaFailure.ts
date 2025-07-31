import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyAdmin({
  subject,
  body,
}: {
  subject: string;
  body: string;
}) {
  try {
    await resend.emails.send({
      from: 'no-reply@qualitechlabs.org',
      to: 'tnderi373@gmail.com',
      subject,
      html: `
        <p>Admin Alert:</p>
        ${body}
        <p>— Automated System</p>
      `,
    });
  } catch (err) {
    console.error('Failed to send admin alert:', err);
  }
}
