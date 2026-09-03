const mockSendTransacEmail = jest.fn();
const mockBrevoClient = jest.fn().mockImplementation(() => ({
  transactionalEmails: { sendTransacEmail: mockSendTransacEmail },
}));

jest.mock('@getbrevo/brevo', () => ({
  BrevoClient: mockBrevoClient,
}));

import { renderPasswordResetEmail, sendPasswordResetEmail } from './email.service';

beforeEach(() => {
  jest.clearAllMocks();
  mockSendTransacEmail.mockResolvedValue({ messageId: 'brevo-message-id' });
});

test('sends password reset email through Brevo with HTML, plain text, sender, and reply-to', async () => {
  await sendPasswordResetEmail({
    email: 'recipient@example.com',
    name: 'Recipient',
    resetUrl: 'https://app.example.com/reset-password?token=secret',
    expiresInMinutes: 60,
  });

  expect(mockBrevoClient).toHaveBeenCalledWith({
    apiKey: 'test-brevo-key',
    timeoutInSeconds: 15,
    maxRetries: 2,
  });
  expect(mockSendTransacEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: 'Reset your PosterAI password',
      htmlContent: expect.stringContaining('Choose a new password'),
      textContent: expect.stringContaining('https://app.example.com/reset-password?token=secret'),
      sender: { name: 'PosterAI Test', email: 'no-reply@example.com' },
      replyTo: { email: 'support@example.com' },
      to: [{ email: 'recipient@example.com', name: 'Recipient' }],
    })
  );
});

test('escapes user-controlled content in the HTML template', () => {
  const content = renderPasswordResetEmail({
    email: 'recipient@example.com',
    name: '<script>alert(1)</script>',
    resetUrl: 'https://app.example.com/reset?token=a&next="bad"',
    expiresInMinutes: 60,
  });
  expect(content.htmlContent).not.toContain('<script>alert(1)</script>');
  expect(content.htmlContent).toContain('&lt;script&gt;');
  expect(content.htmlContent).toContain('&amp;next=&quot;bad&quot;');
});
