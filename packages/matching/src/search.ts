import type { Database, Tx } from "@riaya/db";
import { type SQL, sql } from "drizzle-orm";
import { type CaregiverEmbeddingInput, embedQuery, toVectorLiteral } from "./embedding.js";

export type CaregiverMatch = {
  id: string;
  /** cosine similarity in [0, 1] — higher is a closer match. */
  score: number;
};

export type SearchOptions = CaregiverEmbeddingInput & {
  /** Extra filter (e.g. care type / city / rate), ANDed with the vector search. */
  where?: SQL | undefined;
  limit?: number | undefined;
};

/**
 * Rank caregivers by pgvector cosine similarity to the query embedding (Sprint 3).
 * Only caregivers with a populated `skill_vector` participate; an optional `where`
 * applies the same structured filters the search page uses. Returns ids ordered
 * by descending relevance with a 0–1 score.
 *
 * `exec` may be the public `db` (search is public, RLS `USING(true)`) or an
 * RLS-scoped `tx`.
 */
export async function searchCaregivers(
  exec: Database | Tx,
  opts: SearchOptions
): Promise<CaregiverMatch[]> {
  const vec = embedQuery({ careTypes: opts.careTypes ?? [], text: opts.text ?? "" });
  const literal = toVectorLiteral(vec);
  const limit = opts.limit ?? 20;
  const filter = opts.where ? sql`AND (${opts.where})` : sql``;

  const rows = await exec.execute(sql`
    SELECT id, 1 - (skill_vector <=> ${literal}::vector) AS score
    FROM caregiver_profiles
    WHERE skill_vector IS NOT NULL ${filter}
    ORDER BY skill_vector <=> ${literal}::vector
    LIMIT ${limit}
  `);

  return (rows as unknown as Array<{ id: string; score: number | string }>).map((r) => ({
    id: r.id,
    score: Number(r.score),
  }));
}
