import { describe, expect, it } from "vitest";
import {
  type AvailabilitySlot,
  dayOfWeekFor,
  openRangesForDate,
  slotsForDate,
  slotsOverlap,
  timeToMinutes,
  utcDateParts,
  windowCovered,
} from "./slots.js";

const recurring = (
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  available = true
): AvailabilitySlot => ({
  dayOfWeek,
  specificDate: null,
  startTime,
  endTime,
  available,
});

const override = (
  specificDate: string,
  startTime: string,
  endTime: string,
  available = true
): AvailabilitySlot => ({
  dayOfWeek: null,
  specificDate,
  startTime,
  endTime,
  available,
});

describe("slot time helpers", () => {
  it("converts HH:MM to minutes", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("throws on malformed time", () => {
    expect(() => timeToMinutes("24:00")).toThrow();
    expect(() => timeToMinutes("8:00")).toThrow();
    expect(() => timeToMinutes("abc")).toThrow();
  });

  it("computes UTC weekday for a date string", () => {
    // 2027-03-10 is a Wednesday.
    expect(dayOfWeekFor("2027-03-10")).toBe(3);
  });

  it("splits a timestamp into UTC date + time parts", () => {
    expect(utcDateParts(new Date("2027-03-10T09:30:00Z"))).toEqual({
      dateStr: "2027-03-10",
      time: "09:30",
    });
  });
});

describe("slotsForDate (override precedence)", () => {
  // 2027-03-10 is a Wednesday (dow 3).
  const slots = [
    recurring(3, "08:00", "12:00"),
    recurring(3, "14:00", "18:00"),
    recurring(4, "09:00", "17:00"),
    override("2027-03-10", "10:00", "11:00"),
  ];

  it("returns the date override and ignores recurring slots when one exists", () => {
    const result = slotsForDate(slots, "2027-03-10");
    expect(result).toHaveLength(1);
    expect(result[0].specificDate).toBe("2027-03-10");
  });

  it("falls back to recurring weekday slots with no override", () => {
    const result = slotsForDate(slots, "2027-03-17"); // next Wednesday, no override
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.dayOfWeek === 3)).toBe(true);
  });
});

describe("windowCovered", () => {
  const slots = [recurring(3, "08:00", "12:00"), recurring(3, "14:00", "18:00")];

  it("covers a window fully inside one slot", () => {
    expect(windowCovered(slots, "2027-03-10", "09:00", "11:00")).toBe(true);
  });

  it("rejects a window straddling two separate slots", () => {
    expect(windowCovered(slots, "2027-03-10", "11:00", "15:00")).toBe(false);
  });

  it("rejects a window outside any slot", () => {
    expect(windowCovered(slots, "2027-03-10", "19:00", "20:00")).toBe(false);
  });

  it("a blocked date override makes the day unavailable", () => {
    const blocked = [...slots, override("2027-03-10", "00:00", "23:59", false)];
    expect(windowCovered(blocked, "2027-03-10", "09:00", "11:00")).toBe(false);
  });
});

describe("openRangesForDate", () => {
  it("returns available ranges sorted by start time", () => {
    const slots = [recurring(3, "14:00", "18:00"), recurring(3, "08:00", "12:00")];
    expect(openRangesForDate(slots, "2027-03-10")).toEqual([
      { startTime: "08:00", endTime: "12:00" },
      { startTime: "14:00", endTime: "18:00" },
    ]);
  });

  it("excludes unavailable slots", () => {
    const slots = [recurring(3, "08:00", "12:00", false)];
    expect(openRangesForDate(slots, "2027-03-10")).toEqual([]);
  });
});

describe("slotsOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(slotsOverlap(recurring(1, "08:00", "12:00"), recurring(1, "11:00", "14:00"))).toBe(true);
  });

  it("treats touching ranges as non-overlapping", () => {
    expect(slotsOverlap(recurring(1, "08:00", "12:00"), recurring(1, "12:00", "14:00"))).toBe(
      false
    );
  });
});
