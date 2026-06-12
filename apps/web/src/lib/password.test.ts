import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing (Argon2id)", () => {
  it("produces an argon2id hash, never plaintext", async () => {
    const hash = await hashPassword("Sup3r-Secret!");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain("Sup3r-Secret!");
  });

  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword(hash, "correct horse battery staple")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });

  it("uses a random salt — same password hashes differently each time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toEqual(b);
  });
});
