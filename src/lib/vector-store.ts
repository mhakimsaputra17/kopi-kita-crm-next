import "server-only";
import pg from "pg";
import { toSql } from "pgvector";
import { generateEmbedding } from "./embeddings";

/**
 * Shared pool — reuses the DATABASE_URL from environment.
 * Singleton to avoid creating a new pool per request.
 */
const globalForPool = globalThis as unknown as { vectorPool?: pg.Pool };

function getPool(): pg.Pool {
  if (!globalForPool.vectorPool) {
    globalForPool.vectorPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return globalForPool.vectorPool;
}

export interface SimilarCustomer {
  id: string;
  name: string;
  favoriteDrink: string;
  interestTags: string[];
  similarity: number;
}

/**
 * Semantic search: find customers most similar to the query text.
 * Uses cosine distance (<=> operator) on the `embedding` column.
 */
export async function searchSimilarCustomers(
  query: string,
  limit = 10,
  minSimilarity = 0.35,
): Promise<SimilarCustomer[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const queryEmbedding = await generateEmbedding(query);

    const result = await client.query(
      `SELECT id, name, favorite_drink AS "favoriteDrink",
              interest_tags AS "interestTags",
              1 - (embedding <=> $1::vector) AS similarity
       FROM customers
       WHERE embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) >= $3
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [toSql(queryEmbedding), limit, minSimilarity],
    );

    return result.rows as SimilarCustomer[];
  } finally {
    client.release();
  }
}

/**
 * Upsert embedding for a single customer.
 */
export async function upsertCustomerEmbedding(
  customerId: string,
  embedding: number[],
): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query(
      `UPDATE customers SET embedding = $1::vector WHERE id = $2`,
      [toSql(embedding), customerId],
    );
  } finally {
    client.release();
  }
}

/**
 * Batch upsert embeddings for multiple customers (used in seed).
 */
export async function batchUpsertEmbeddings(
  items: { id: string; embedding: number[] }[],
): Promise<void> {
  if (items.length === 0) return;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const item of items) {
      await client.query(
        `UPDATE customers SET embedding = $1::vector WHERE id = $2`,
        [toSql(item.embedding), item.id],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Hybrid search: combine vector similarity + keyword matching on tags/drinks.
 * Merges results from both methods and deduplicates by customer ID.
 * This solves cross-language queries (e.g. "kopi pahit" → "black coffee").
 */
export async function hybridSearchCustomers(
  query: string,
  limit = 10,
): Promise<SimilarCustomer[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const queryEmbedding = await generateEmbedding(query);

    const result = await client.query(
      `WITH vector_results AS (
        SELECT id, name, favorite_drink, interest_tags,
               1 - (embedding <=> $1::vector) AS similarity
        FROM customers
        WHERE embedding IS NOT NULL
          AND 1 - (embedding <=> $1::vector) >= 0.35
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      ),
      keyword_results AS (
        SELECT id, name, favorite_drink, interest_tags,
               0.75::float AS similarity
        FROM customers
        WHERE favorite_drink ILIKE '%' || $3 || '%'
           OR EXISTS (
             SELECT 1 FROM unnest(interest_tags) AS tag
             WHERE tag ILIKE '%' || $3 || '%'
           )
        LIMIT $2
      ),
      combined AS (
        SELECT * FROM vector_results
        UNION ALL
        SELECT * FROM keyword_results
      )
      SELECT id, name,
             favorite_drink AS "favoriteDrink",
             interest_tags AS "interestTags",
             MAX(similarity) AS similarity
      FROM combined
      GROUP BY id, name, favorite_drink, interest_tags
      ORDER BY MAX(similarity) DESC
      LIMIT $2`,
      [toSql(queryEmbedding), limit, query.toLowerCase()],
    );

    return result.rows as SimilarCustomer[];
  } finally {
    client.release();
  }
}
