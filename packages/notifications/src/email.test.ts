import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevEmailProvider, ResendEmailProvider, createEmailProvider } from "./email.js";

// Mock the resend SDK so ResendEmailProvider can be tested without real API keys
vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = {
      send: async (_opts: unknown) => ({ data: { id: "resend-abc123" }, error: null }),
    };
  },
}));

describe("DevEmailProvider", () => {
  let provider: DevEmailProvider;

  beforeEach(() => {
    provider = new DevEmailProvider();
  });

  it("starts with an empty sent queue", () => {
    expect(provider.sent).toHaveLength(0);
  });

  it("records sent messages", async () => {
    await provider.send({ to: "sara@example.com", subject: "Test", text: "Hello" });
    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]?.to).toBe("sara@example.com");
  });

  it("returns an incrementing id and delivered=false", async () => {
    const r1 = await provider.send({ to: "a@b.com", subject: "S1", text: "T1" });
    const r2 = await provider.send({ to: "a@b.com", subject: "S2", text: "T2" });
    expect(r1.id).toContain("dev_email");
    expect(r1.delivered).toBe(false);
    expect(r2.id).not.toBe(r1.id);
  });

  it("lastTo returns the most recent message for that address", async () => {
    await provider.send({ to: "sara@example.com", subject: "First", text: "T1" });
    await provider.send({ to: "sara@example.com", subject: "Second", text: "T2" });
    const last = provider.lastTo("sara@example.com");
    expect(last?.subject).toBe("Second");
  });

  it("lastTo returns undefined when no messages were sent to that address", () => {
    expect(provider.lastTo("unknown@example.com")).toBeUndefined();
  });

  it("stores multiple recipients independently", async () => {
    await provider.send({ to: "alice@example.com", subject: "A", text: "A" });
    await provider.send({ to: "bob@example.com", subject: "B", text: "B" });
    expect(provider.lastTo("alice@example.com")?.subject).toBe("A");
    expect(provider.lastTo("bob@example.com")?.subject).toBe("B");
  });
});

describe("ResendEmailProvider", () => {
  it("sends an email and returns the Resend id with delivered=true", async () => {
    const provider = new ResendEmailProvider("test-api-key", "Riaya <no-reply@riaya.ma>");
    const result = await provider.send({
      to: "fatima@example.com",
      subject: "Paiement versé",
      text: "Votre paiement a été libéré.",
    });
    expect(result.id).toBe("resend-abc123");
    expect(result.delivered).toBe(true);
  });
});

describe("createEmailProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns DevEmailProvider when RESEND_API_KEY is absent", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const p = createEmailProvider();
    expect(p).toBeInstanceOf(DevEmailProvider);
  });

  it("returns ResendEmailProvider when RESEND_API_KEY is set", () => {
    vi.stubEnv("RESEND_API_KEY", "re_live_test_key");
    const p = createEmailProvider();
    expect(p).toBeInstanceOf(ResendEmailProvider);
  });
});
