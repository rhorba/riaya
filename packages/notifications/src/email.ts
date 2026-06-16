/**
 * Email delivery abstraction (Module H, Sprint 5). v0.1 ships `DevEmailProvider`
 * (records + logs, no real send). The production Resend adapter implements the
 * same interface; selected by env (`RESEND_API_KEY` present → Resend).
 */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailSendResult = { id: string; delivered: boolean };

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/**
 * Development provider: never sends a real email. Records each message (for tests
 * / local inspection) and logs a one-line summary. NEVER use in production.
 */
export class DevEmailProvider implements EmailProvider {
  readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<EmailSendResult> {
    this.sent.push(message);
    console.log(`[email:dev] → ${message.to} · ${message.subject}`);
    return Promise.resolve({ id: `dev_email_${this.sent.length}`, delivered: false });
  }

  /** Test helper: last message sent to an address. */
  lastTo(to: string): EmailMessage | undefined {
    return [...this.sent].reverse().find((m) => m.to === to);
  }
}

/**
 * Production provider: sends via Resend. `resend` is imported lazily so the
 * package (and its pure templates) can be pulled into any bundle without dragging
 * the SDK in until a real send actually happens.
 */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { Resend } = await import("resend");
    const resend = new Resend(this.apiKey);
    const { data } = await resend.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { id: data?.id ?? "unknown", delivered: true };
  }
}

/**
 * Select the email provider from env. Dev unless a Resend key is configured —
 * v0.1 deploys without email credentials and still works end-to-end.
 */
export function createEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Riaya <no-reply@riaya.ma>";
  if (apiKey) return new ResendEmailProvider(apiKey, from);
  return new DevEmailProvider();
}

/** The process-wide email provider. */
export const emailProvider: EmailProvider = createEmailProvider();
