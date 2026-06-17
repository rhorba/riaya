import { describe, expect, it } from "vitest";
// Import via barrel to cover packages/verification/src/index.ts
import { DevStorage, SIGNED_URL_TTL_SECONDS, buildDocumentKey, storage } from "./index.js";

describe("SIGNED_URL_TTL_SECONDS", () => {
  it("is 900 seconds (15 minutes)", () => {
    expect(SIGNED_URL_TTL_SECONDS).toBe(900);
  });
});

describe("buildDocumentKey", () => {
  it("includes the caregiverId, type, and a UUID", () => {
    const key = buildDocumentKey("cg-123", "cin", "pdf");
    expect(key).toMatch(/^verification\/cg-123\/cin\/[0-9a-f-]+\.pdf$/);
  });

  it("generates unique keys for the same caregiver", () => {
    const a = buildDocumentKey("cg-123", "cin", "pdf");
    const b = buildDocumentKey("cg-123", "cin", "pdf");
    expect(a).not.toBe(b);
  });

  it("uses the provided extension", () => {
    const key = buildDocumentKey("cg-123", "health_cert", "jpg");
    expect(key).toContain(".jpg");
  });
});

describe("DevStorage", () => {
  it("put stores bytes and read retrieves them", async () => {
    const store = new DevStorage();
    const bytes = new Uint8Array([1, 2, 3]);
    await store.put("test-key", bytes, "application/pdf");
    expect(store.read("test-key")).toEqual(bytes);
  });

  it("read returns undefined for unknown keys", () => {
    const store = new DevStorage();
    expect(store.read("nonexistent")).toBeUndefined();
  });

  it("getSignedUrl returns a URL containing the key", async () => {
    const store = new DevStorage();
    const url = await store.getSignedUrl("verification/cg/cin/abc.pdf", 900);
    expect(url).toContain("verification");
    expect(url).toContain("expires=");
    expect(url).toContain("sig=");
  });

  it("caps the TTL at SIGNED_URL_TTL_SECONDS", async () => {
    const store = new DevStorage();
    const url = await store.getSignedUrl("key", 9999);
    const params = new URL(url).searchParams;
    const expires = Number(params.get("expires"));
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(expires - nowSeconds).toBeLessThanOrEqual(SIGNED_URL_TTL_SECONDS);
  });

  it("generates a different sig on each call (random)", async () => {
    const store = new DevStorage();
    const url1 = await store.getSignedUrl("key", 900);
    const url2 = await store.getSignedUrl("key", 900);
    const sig1 = new URL(url1).searchParams.get("sig");
    const sig2 = new URL(url2).searchParams.get("sig");
    expect(sig1).not.toBe(sig2);
  });
});

describe("storage singleton", () => {
  it("is a DevStorage instance", () => {
    expect(storage).toBeInstanceOf(DevStorage);
  });
});
