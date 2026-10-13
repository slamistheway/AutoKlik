import {
  assertEmailConfigured,
  sendPasswordResetEmail,
} from './password-reset-email';

describe('Password reset email delivery', () => {
  const previous = {
    key: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM,
    url: process.env.FRONTEND_URL,
  };

  afterEach(() => {
    jest.restoreAllMocks();
    for (const [key, value] of Object.entries({
      RESEND_API_KEY: previous.key,
      MAIL_FROM: previous.from,
      FRONTEND_URL: previous.url,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('requires provider credentials and a sender before requesting emails', () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
    expect(assertEmailConfigured).toThrow();
  });

  it('sends the reset link to the account email through the configured provider', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.MAIL_FROM = 'AutoKlik <noreply@example.test>';
    process.env.FRONTEND_URL = 'https://autoklik.example.test';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    await sendPasswordResetEmail('user@example.test', 'test-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(typeof options?.body).toBe('string');
    const body = JSON.parse(options?.body as string) as {
      to: string[];
      from: string;
      text: string;
    };
    expect(body.to).toEqual(['user@example.test']);
    expect(body.from).toBe(process.env.MAIL_FROM);
    expect(body.text).toContain(
      'https://autoklik.example.test/reset-password?token=test-token',
    );
  });

  it('reports provider rejection without exposing reset tokens or response contents', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.MAIL_FROM = 'noreply@example.test';
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response('private provider response', { status: 403 }),
      );
    await expect(
      sendPasswordResetEmail('user@example.test', 'secret-token'),
    ).rejects.toThrow('Password-reset email delivery failed');
  });
});
