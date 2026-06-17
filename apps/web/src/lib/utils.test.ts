import { describe, expect, it } from "vitest";
import { cn } from "./utils.js";

describe("cn()", () => {
  it("returns a single class unchanged", () => {
    expect(cn("px-4")).toBe("px-4");
  });

  it("merges multiple classes", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("resolves Tailwind conflicts — last class wins", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("omits falsy conditionals", () => {
    const active = false;
    const result = cn("base", active && "active");
    expect(result).toBe("base");
  });

  it("includes truthy conditionals", () => {
    const active = true;
    const result = cn("base", active && "active");
    expect(result).toBe("base active");
  });

  it("handles undefined and null gracefully", () => {
    expect(() => cn(undefined, null as never, "valid")).not.toThrow();
  });
});
