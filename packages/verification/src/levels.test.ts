import { describe, expect, it } from "vitest";
import { FileValidationError, validateDocumentFile } from "./files.js";
import { type LevelDoc, computeVerificationLevel, levelRank } from "./levels.js";

const doc = (type: LevelDoc["type"], status: LevelDoc["status"]): LevelDoc => ({ type, status });

describe("computeVerificationLevel", () => {
  it("no documents → unverified", () => {
    expect(computeVerificationLevel([])).toBe("unverified");
  });

  it("CIN pending (not yet approved) → id_checked", () => {
    expect(computeVerificationLevel([doc("cin", "pending")])).toBe("id_checked");
  });

  it("CIN rejected (and nothing pending) → unverified", () => {
    expect(computeVerificationLevel([doc("cin", "rejected")])).toBe("unverified");
  });

  it("CIN approved → cin_verified", () => {
    expect(computeVerificationLevel([doc("cin", "approved")])).toBe("cin_verified");
  });

  it("CIN + police clearance approved → background_cleared", () => {
    expect(
      computeVerificationLevel([doc("cin", "approved"), doc("police_clearance", "approved")])
    ).toBe("background_cleared");
  });

  it("full package approved → certified", () => {
    expect(
      computeVerificationLevel([
        doc("cin", "approved"),
        doc("police_clearance", "approved"),
        doc("health_cert", "approved"),
        doc("reference", "approved"),
      ])
    ).toBe("certified");
  });

  it("missing reference keeps it at background_cleared (not certified)", () => {
    expect(
      computeVerificationLevel([
        doc("cin", "approved"),
        doc("police_clearance", "approved"),
        doc("health_cert", "approved"),
      ])
    ).toBe("background_cleared");
  });

  it("a pending health cert does not promote to certified", () => {
    expect(
      computeVerificationLevel([
        doc("cin", "approved"),
        doc("police_clearance", "approved"),
        doc("health_cert", "pending"),
        doc("reference", "approved"),
      ])
    ).toBe("background_cleared");
  });

  it("levelRank is monotonic up the ladder", () => {
    expect(levelRank("unverified")).toBeLessThan(levelRank("cin_verified"));
    expect(levelRank("cin_verified")).toBeLessThan(levelRank("certified"));
  });
});

describe("validateDocumentFile", () => {
  it("accepts a JPEG within size and returns its extension", () => {
    expect(validateDocumentFile(1024, "image/jpeg")).toBe("jpg");
  });

  it("accepts PDF", () => {
    expect(validateDocumentFile(1024, "application/pdf")).toBe("pdf");
  });

  it("rejects an empty file", () => {
    expect(() => validateDocumentFile(0, "image/png")).toThrow(FileValidationError);
    try {
      validateDocumentFile(0, "image/png");
    } catch (e) {
      expect((e as FileValidationError).code).toBe("empty");
    }
  });

  it("rejects an oversized file", () => {
    try {
      validateDocumentFile(6 * 1024 * 1024, "image/png");
    } catch (e) {
      expect((e as FileValidationError).code).toBe("too_large");
    }
  });

  it("rejects a disallowed MIME type", () => {
    try {
      validateDocumentFile(1024, "application/zip");
    } catch (e) {
      expect((e as FileValidationError).code).toBe("type_not_allowed");
    }
  });
});
