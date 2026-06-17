import { describe, expect, it } from "vitest";
import { fail, ok } from "./action-result.js";

describe("ok()", () => {
  it("returns ok=true with data", () => {
    const result = ok({ id: "123" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ id: "123" });
  });

  it("wraps primitive data", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });

  it("wraps void/undefined as ok(undefined)", () => {
    const result = ok(undefined);
    expect(result.ok).toBe(true);
  });
});

describe("fail()", () => {
  it("returns ok=false with error string", () => {
    const result = fail("bookingNotFound");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("bookingNotFound");
  });

  it("preserves the error message verbatim", () => {
    const msg = "Something went terribly wrong";
    const result = fail(msg);
    if (!result.ok) expect(result.error).toBe(msg);
  });
});
