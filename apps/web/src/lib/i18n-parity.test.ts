/**
 * S6-08 — i18n parity + RTL audit
 *
 * 1. Every key in fr.json exists in ar.json and en.json (no gaps).
 * 2. No directional Tailwind classes (ml-*, mr-*, pl-*, pr-*, text-left, text-right)
 *    in the app source — all layout must use logical properties for RTL correctness.
 * 3. Admin signed URL paths call getDocumentSignedUrl, which enforces admin-only
 *    access and writes an audit log entry — tested separately in admin-rls.test.ts.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../../..");

function loadMessages(locale: string) {
  return JSON.parse(
    readFileSync(resolve(ROOT, `apps/web/messages/${locale}.json`), "utf8")
  ) as Record<string, unknown>;
}

function flatKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k)
  );
}

describe("i18n — locale file parity", () => {
  const fr = loadMessages("fr");
  const ar = loadMessages("ar");
  const en = loadMessages("en");

  const frKeys = new Set(flatKeys(fr));
  const arKeys = new Set(flatKeys(ar));
  const enKeys = new Set(flatKeys(en));

  it("ar.json has no missing keys vs fr.json", () => {
    const missing = [...frKeys].filter((k) => !arKeys.has(k));
    expect(missing, `Missing in ar.json: ${missing.join(", ")}`).toHaveLength(0);
  });

  it("en.json has no missing keys vs fr.json", () => {
    const missing = [...frKeys].filter((k) => !enKeys.has(k));
    expect(missing, `Missing in en.json: ${missing.join(", ")}`).toHaveLength(0);
  });

  it("ar.json has no extra keys not in fr.json", () => {
    const extra = [...arKeys].filter((k) => !frKeys.has(k));
    expect(extra, `Extra in ar.json: ${extra.join(", ")}`).toHaveLength(0);
  });

  it("en.json has no extra keys not in fr.json", () => {
    const extra = [...enKeys].filter((k) => !frKeys.has(k));
    expect(extra, `Extra in en.json: ${extra.join(", ")}`).toHaveLength(0);
  });

  it("all three locale files have equal key count", () => {
    expect(frKeys.size).toBe(arKeys.size);
    expect(frKeys.size).toBe(enKeys.size);
  });
});

describe("RTL audit — no directional Tailwind in app/src", () => {
  const { globSync } = require("node:fs");
  // Collect all .tsx/.ts files under apps/web/src
  const files: string[] = globSync
    ? (globSync("apps/web/src/**/*.{tsx,ts}", { cwd: ROOT }) as string[]).filter(
        (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx")
      )
    : [];

  const DIRECTIONAL_RE = /\b(ml-\d|mr-\d|pl-\d|pr-\d|text-left|text-right)\b/;

  // Skip this test if glob isn't available (older Node); we rely on Biome CI instead
  const hasGlob = typeof globSync === "function";

  it.skipIf(!hasGlob)("no directional Tailwind classes found in TSX/TS source", () => {
    const violations: string[] = [];
    for (const rel of files) {
      const content = readFileSync(resolve(ROOT, rel), "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        if (DIRECTIONAL_RE.test(line)) {
          violations.push(`${rel}:${i + 1} — ${line.trim()}`);
        }
      }
    }
    expect(violations, `Directional Tailwind found:\n${violations.join("\n")}`).toHaveLength(0);
  });
});
