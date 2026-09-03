import { BrevoClient } from '@getbrevo/brevo';
import { env } from '../config/env';

export interface PasswordResetEmail {
  email: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!
  );
}

export function renderPasswordResetEmail(input: PasswordResetEmail): {
  subject: string;
  htmlContent: string;
  textContent: string;
} {
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(input.resetUrl);
  const subject = 'Reset your PosterAI password';
  const textContent = [
    `Hello ${input.name},`,
    '',
    'We received a request to reset your PosterAI password.',
    `Open this link to choose a new password: ${input.resetUrl}`,
    '',
    `This link expires in ${input.expiresInMinutes} minutes and can only be used once.`,
    'If you did not request this reset, you can safely ignore this email.',
  ].join('\n');
  const htmlContent = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:40px 20px">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
        <h1 style="margin:0 0 20px;font-size:24px">Reset your password</h1>
        <p>Hello ${safeName},</p>
        <p>We received a request to reset your PosterAI password.</p>
        <p style="margin:28px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Choose a new password</a>
        </p>
        <p style="font-size:14px;color:#64748b">This link expires in ${input.expiresInMinutes} minutes and can only be used once.</p>
        <p style="font-size:14px;color:#64748b">If you did not request this reset, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;
  return { subject, htmlContent, textContent };
}

export async function sendPasswordResetEmail(input: PasswordResetEmail): Promise<void> {
  if (!env.BREVO_API_KEY) {
    throw new Error('Transactional email is not configured.');
  }

  const client = new BrevoClient({
    apiKey: env.BREVO_API_KEY,
    timeoutInSeconds: 15,
    maxRetries: 2,
  });
  const content = renderPasswordResetEmail(input);

  await client.transactionalEmails.sendTransacEmail({
    ...content,
    sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM_ADDRESS },
    replyTo: { email: env.EMAIL_REPLY_TO },
    to: [{ email: input.email, name: input.name }],
  });
}
