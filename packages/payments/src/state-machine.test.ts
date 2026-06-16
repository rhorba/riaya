import { describe, expect, it } from "vitest";
import {
  type EscrowStatus,
  EscrowTransitionError,
  assertEscrowTransition,
  canTransitionEscrow,
  isTerminalEscrow,
} from "./state-machine.js";

describe("escrow state machine", () => {
  it("allows the happy path pending → authorized → captured → released", () => {
    expect(canTransitionEscrow("pending", "authorized")).toBe(true);
    expect(canTransitionEscrow("authorized", "captured")).toBe(true);
    expect(canTransitionEscrow("captured", "released")).toBe(true);
  });

  it("allows refund before capture and dispute after capture", () => {
    expect(canTransitionEscrow("authorized", "refunded")).toBe(true);
    expect(canTransitionEscrow("captured", "disputed")).toBe(true);
    expect(canTransitionEscrow("disputed", "released")).toBe(true);
    expect(canTransitionEscrow("disputed", "refunded")).toBe(true);
  });

  it("forbids skipping states", () => {
    expect(canTransitionEscrow("pending", "captured")).toBe(false);
    expect(canTransitionEscrow("pending", "released")).toBe(false);
    expect(canTransitionEscrow("authorized", "released")).toBe(false);
  });

  it("forbids leaving a terminal state", () => {
    expect(canTransitionEscrow("released", "refunded")).toBe(false);
    expect(canTransitionEscrow("refunded", "released")).toBe(false);
    expect(isTerminalEscrow("released")).toBe(true);
    expect(isTerminalEscrow("refunded")).toBe(true);
    expect(isTerminalEscrow("captured")).toBe(false);
  });

  it("forbids paying out (release) directly from pending or authorized", () => {
    expect(canTransitionEscrow("pending", "released")).toBe(false);
    expect(canTransitionEscrow("authorized", "released")).toBe(false);
  });

  it("assertEscrowTransition throws on an illegal move", () => {
    expect(() => assertEscrowTransition("pending", "captured")).toThrow(EscrowTransitionError);
    expect(() => assertEscrowTransition("authorized", "captured")).not.toThrow();
  });

  it("covers every status in the transition table", () => {
    const statuses: EscrowStatus[] = [
      "pending",
      "authorized",
      "captured",
      "released",
      "refunded",
      "disputed",
    ];
    for (const s of statuses) expect(typeof isTerminalEscrow(s)).toBe("boolean");
  });
});
