import { MailDeliveryError } from '../mail-transport.js';
import { ResendTransport, type ResendEmailsClient } from './resend.transport.js';

const mail = { to: 'ada@example.test', subject: 'Subject', html: '<p>Hi</p>' };

function client(result: Awaited<ReturnType<ResendEmailsClient['emails']['send']>> | Error) {
  const send = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return { send, client: { emails: { send } } as ResendEmailsClient };
}

describe('ResendTransport (SDK faked: no network)', () => {
  it('sends from the configured sender with the message as given', async () => {
    const { send, client: c } = client({ data: { id: 'email_1' }, error: null });
    await new ResendTransport('key', 'GleamLearn <onboarding@resend.dev>', c).send(mail);
    expect(send).toHaveBeenCalledWith({ from: 'GleamLearn <onboarding@resend.dev>', ...mail });
  });

  it('turns an API refusal into MailDeliveryError with only the Resend error code', async () => {
    const { client: c } = client({
      data: null,
      error: { name: 'validation_error', statusCode: 403, message: 'You can only send testing emails to your own address (ada@example.test)' } as never,
    });
    const err = await new ResendTransport('key', 'x <a@resend.dev>', c).send(mail).catch((e) => e);
    expect(err).toBeInstanceOf(MailDeliveryError);
    expect(err.reason).toBe('resend:validation_error');
    expect(err.message).not.toContain('ada@example.test');
  });

  it('turns a network failure into MailDeliveryError', async () => {
    const { client: c } = client(Object.assign(new Error('getaddrinfo ENOTFOUND api.resend.com'), { name: 'TypeError' }));
    const err = await new ResendTransport('key', 'x <a@resend.dev>', c).send(mail).catch((e) => e);
    expect(err).toBeInstanceOf(MailDeliveryError);
    expect(err.reason).toBe('resend:TypeError');
  });
});
