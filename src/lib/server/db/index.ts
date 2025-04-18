import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, ilike, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import { synnexFlatFile } from './schema';

// Create postgres connection
const queryClient = postgres(DATABASE_URL, { ssl: 'require' });

// Create drizzle database instance
export const db = drizzle(queryClient);

// Types for Synnex product data
export type SynnexProduct = typeof synnexFlatFile.$inferSelect;

/**
 * Search products by manufacturer part number
 * @param partNumber The part number to search for
 * @returns Array of matching products
 */
export async function searchByPartNumber(partNumber: string) {
  return db
    .select()
    .from(synnexFlatFile)
    .where(ilike(synnexFlatFile.manufacturer_part_no, `%${partNumber}%`))
    .limit(100);
}

/**
 * Search products by description
 * @param description The description text to search for
 * @returns Array of matching products
 */
export async function searchByDescription(description: string) {
  return db
    .select()
    .from(synnexFlatFile)
    .where(ilike(synnexFlatFile.part_description, `%${description}%`))
    .limit(100);
}

/**
 * Get a product by its Synnex SKU
 * @param sku The Synnex SKU to search for
 * @returns The matching product or null
 */
export async function getProductBySku(sku: string | number) {
  const results = await db
    .select()
    .from(synnexFlatFile)
    .where(eq(synnexFlatFile.td_synnex_sku, sku.toString()))
    .limit(1);
  
  return results[0] || null;
}

/**
 * Count total rows in the synnex_flat_file table
 * @returns The total count of products
 */
export async function countProducts() {
  const result = await db
    .select({ count: sql`count(*)` })
    .from(synnexFlatFile);
  
  return result[0]?.count || 0;
}
