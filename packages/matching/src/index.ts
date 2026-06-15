// pgvector caregiver matching (Module — Sprint 3).
export {
  EMBEDDING_DIM,
  type CaregiverEmbeddingInput,
  tokenize,
  embedCaregiver,
  embedQuery,
  cosineSimilarity,
  toVectorLiteral,
} from "./embedding.js";
export { type CaregiverMatch, type SearchOptions, searchCaregivers } from "./search.js";
