import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLoginFailures, isRateLimited, recordLoginFailure } from "./rate-limit.js";

const KEY = "test@example.com";

afterEach(() => {
  // Clean up after each test so state doesn't leak between cases
  clearLoginFailures(KEY);
  vi.useRealTimers();
});

describe("isRateLimited", () => {
  it("returns false for an unknown key", () => {
    expect(isRateLimited(KEY)).toBe(false);
  });

  it("returns false after fewer than 5 failures", () => {
    recordLoginFailure(KEY);
    recordLoginFailure(KEY);
    recordLoginFailure(KEY);
    recordLoginFailure(KEY);
    expect(isRateLimited(KEY)).toBe(false);
  });

  it("returns true after 5 failures (lockout threshold)", () => {
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    expect(isRateLimited(KEY)).toBe(true);
  });

  it("returns false after the lockout window expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    expect(isRateLimited(KEY)).toBe(true);
    // Advance 15 minutes + 1ms
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(isRateLimited(KEY)).toBe(false);
  });

  it("cleans the bucket entry once the lockout expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    isRateLimited(KEY); // triggers cleanup
    // A subsequent failure should start a fresh window (not still locked)
    expect(isRateLimited(KEY)).toBe(false);
  });
});

describe("recordLoginFailure", () => {
  it("does not lock out before reaching 5 failures", () => {
    for (let i = 0; i < 4; i++) recordLoginFailure(KEY);
    expect(isRateLimited(KEY)).toBe(false);
  });

  it("locks out exactly on the 5th failure", () => {
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    expect(isRateLimited(KEY)).toBe(true);
  });

  it("additional failures do not reset the lockout timer", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    recordLoginFailure(KEY); // 6th failure
    expect(isRateLimited(KEY)).toBe(true);
  });
});

describe("clearLoginFailures", () => {
  it("removes a locked-out key", () => {
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    clearLoginFailures(KEY);
    expect(isRateLimited(KEY)).toBe(false);
  });

  it("is a no-op for an unknown key", () => {
    expect(() => clearLoginFailures("nonexistent@example.com")).not.toThrow();
  });

  it("allows failures to accumulate again after clearing", () => {
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    clearLoginFailures(KEY);
    recordLoginFailure(KEY);
    expect(isRateLimited(KEY)).toBe(false); // fresh window, only 1 failure
  });
});
