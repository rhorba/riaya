import { describe, expect, it } from "vitest";
import {
  EMBEDDING_DIM,
  cosineSimilarity,
  embedCaregiver,
  embedQuery,
  toVectorLiteral,
  tokenize,
} from "./embedding.js";

function norm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

describe("embedding determinism", () => {
  it("produces a vector of the configured dimension", () => {
    const v = embedCaregiver({ careTypes: ["daya"], text: "expérience douce" });
    expect(v).toHaveLength(EMBEDDING_DIM);
  });

  it("is deterministic — identical input yields an identical vector", () => {
    const input = { careTypes: ["nanny", "babysitter"], text: "patiente et expérimentée" };
    expect(embedCaregiver(input)).toEqual(embedCaregiver(input));
  });

  it("embeds the same query and caregiver text into the same space", () => {
    const a = embedCaregiver({ careTypes: ["daya"], text: "casablanca" });
    const b = embedQuery({ careTypes: ["daya"], text: "casablanca" });
    expect(a).toEqual(b);
  });

  it("returns unit-length vectors (cosine-ready)", () => {
    const v = embedCaregiver({ careTypes: ["after_school"], text: "soutien scolaire primaire" });
    expect(norm(v)).toBeCloseTo(1, 6);
  });

  it("returns an all-zero vector for empty input (no NaNs from normalization)", () => {
    const v = embedCaregiver({ careTypes: [], text: "" });
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe("embedding semantics", () => {
  it("ranks a same-care-type caregiver above a different one", () => {
    const query = embedQuery({ careTypes: ["daya"], text: "daya à domicile" });
    const sameType = embedCaregiver({ careTypes: ["daya"], text: "daya à domicile chaleureuse" });
    const otherType = embedCaregiver({
      careTypes: ["after_school"],
      text: "aide aux devoirs collège",
    });
    expect(cosineSimilarity(query, sameType)).toBeGreaterThan(cosineSimilarity(query, otherType));
  });

  it("cosine similarity of a vector with itself is ~1", () => {
    const v = embedCaregiver({ careTypes: ["nanny"], text: "rabat agdal" });
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });
});

describe("tokenize", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(tokenize("Daya, à Casablanca!")).toEqual(["daya", "a", "casablanca"]);
  });

  it("keeps Arabic tokens", () => {
    expect(tokenize("مربية الرباط")).toEqual(["مربية", "الرباط"]);
  });
});

describe("toVectorLiteral", () => {
  it("formats a pgvector literal", () => {
    expect(toVectorLiteral([0.1, 0.2, -0.3])).toBe("[0.1,0.2,-0.3]");
  });
});
