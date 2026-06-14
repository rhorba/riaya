import { describe, expect, it } from "vitest";
import {
  type BookingStatus,
  BookingTransitionError,
  actorCanTransition,
  assertTransition,
  canTransition,
  isTerminal,
} from "./state-machine.js";

describe("booking state machine", () => {
  it("allows the legal lifecycle transitions", () => {
    expect(canTransition("requested", "confirmed")).toBe(true);
    expect(canTransition("requested", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "in_progress")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("in_progress", "completed")).toBe(true);
    expect(canTransition("in_progress", "disputed")).toBe(true);
    expect(canTransition("disputed", "completed")).toBe(true);
  });

  it("forbids skipping states", () => {
    // No requested → in_progress / completed (must be confirmed first).
    expect(canTransition("requested", "in_progress")).toBe(false);
    expect(canTransition("requested", "completed")).toBe(false);
    // No confirmed → completed (must go through in_progress).
    expect(canTransition("confirmed", "completed")).toBe(false);
  });

  it("treats completed / cancelled as terminal", () => {
    const terminals: BookingStatus[] = ["completed", "cancelled"];
    for (const s of terminals) {
      expect(isTerminal(s)).toBe(true);
      expect(canTransition(s, "confirmed")).toBe(false);
    }
  });

  it("assertTransition throws on an illegal transition", () => {
    expect(() => assertTransition("requested", "completed")).toThrow(BookingTransitionError);
    expect(() => assertTransition("completed", "requested")).toThrow(BookingTransitionError);
    expect(() => assertTransition("requested", "confirmed")).not.toThrow();
  });

  describe("actor permissions (RBAC at the logic layer)", () => {
    it("only the caregiver may accept a request (family cannot)", () => {
      expect(actorCanTransition("requested", "confirmed", "caregiver")).toBe(true);
      expect(actorCanTransition("requested", "confirmed", "family")).toBe(false);
    });

    it("only the family may start a confirmed session", () => {
      expect(actorCanTransition("confirmed", "in_progress", "family")).toBe(true);
      expect(actorCanTransition("confirmed", "in_progress", "caregiver")).toBe(false);
    });

    it("only an admin may resolve a dispute", () => {
      expect(actorCanTransition("disputed", "completed", "admin")).toBe(true);
      expect(actorCanTransition("disputed", "completed", "family")).toBe(false);
      expect(actorCanTransition("disputed", "cancelled", "caregiver")).toBe(false);
    });

    it("never permits an illegal transition regardless of actor", () => {
      expect(actorCanTransition("requested", "completed", "admin")).toBe(false);
    });
  });
});
