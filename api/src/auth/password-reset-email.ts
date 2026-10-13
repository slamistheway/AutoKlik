export function assertEmailConfigured() {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    throw new Error(
      'Configure RESEND_API_KEY and MAIL_FROM before sending reset emails',
    );
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  assertEmailConfigured();
  const url = new URL(
    '/reset-password',
    process.env.FRONTEND_URL ?? 'http://localhost:3000',
  );
  url.searchParams.set('token', token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject: 'AutoKlik — promjena lozinke',
      text: `Za promjenu lozinke otvorite ovu poveznicu:\n\n${url.toString()}\n\nPoveznica vrijedi 30 minuta i može se iskoristiti jednom. Ako niste zatražili promjenu lozinke, zanemarite ovu poruku.`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Password-reset email delivery failed');
}
