import { json } from '@sveltejs/kit';
import { countProducts } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Use Drizzle ORM to count rows in the synnex_flat_file table
    const totalRows = await countProducts();
    
    return json({
      success: true,
      message: 'Database connection successful',
      data: { total_rows: totalRows }
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    
    return json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
