/**
 * Deterministic caregiver embedding (Sprint 3). PURE — no DB, no network, no
 * external model — so it runs identically in CI, the seed, and at query time, and
 * is unit-testable for determinism.
 *
 * v0.1 uses feature hashing (the "hashing trick"): each token is hashed to a
 * dimension and a sign, accumulated, then L2-normalized. This is not a semantic
 * model, but it is stable and gives meaningful cosine similarity between
 * caregivers/queries that share care types and experience vocabulary — enough to
 * rank search results. A real sentence-transformer is a v0.2 swap behind this
 * same interface.
 */

/** Must match the pgvector column dimension (`caregiver_profiles.skill_vector`). */
export const EMBEDDING_DIM = 384;

/** care types carry the strongest signal — weight their tokens up. */
const CARE_TYPE_WEIGHT = 3;

export type CaregiverEmbeddingInput = {
  careTypes: string[];
  /** free experience text — bio, languages, neighborhoods, etc. */
  text?: string;
};

/** FNV-1a 32-bit hash — small, fast, dependency-free, stable across runs. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// biome-ignore lint/suspicious/noMisleadingCharacterClass: intentional combining-marks range — strips NFD diacritics, no base chars in the class
const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_TOKEN_CHARS = /[^a-z0-9؀-ۿ]+/g;

/** Lowercase, strip accents/punctuation, split on whitespace, drop empties. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "") // strip combining diacritics
    .replace(NON_TOKEN_CHARS, " ") // keep latin + arabic, drop the rest
    .split(/\s+/)
    .filter(Boolean);
}

function l2normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

function accumulate(vec: number[], token: string, weight: number): void {
  const h = fnv1a(token);
  const dim = h % EMBEDDING_DIM;
  // Second hash bit decides the sign — reduces collisions cancelling signal.
  const sign = (fnv1a(`${token}#`) & 1) === 0 ? 1 : -1;
  vec[dim] = (vec[dim] ?? 0) + sign * weight;
}

/** Embed a caregiver's care types + experience text into a unit vector. */
export function embedCaregiver(input: CaregiverEmbeddingInput): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0);
  for (const ct of input.careTypes) {
    accumulate(vec, `care:${ct.toLowerCase()}`, CARE_TYPE_WEIGHT);
  }
  for (const token of tokenize(input.text ?? "")) {
    accumulate(vec, token, 1);
  }
  return l2normalize(vec);
}

/** Embed a free-text + care-type search query into the same space. */
export function embedQuery(input: CaregiverEmbeddingInput): number[] {
  return embedCaregiver(input);
}

/** Cosine similarity of two unit (or arbitrary) vectors, in [-1, 1]. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** pgvector literal "[0.1,0.2,...]" for a parameterized query value. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
