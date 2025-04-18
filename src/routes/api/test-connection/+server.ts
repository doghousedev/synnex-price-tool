import { json } from '@sveltejs/kit';
import { countProducts } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    console.log('Testing database connection...');
    
    // Use Drizzle ORM to count rows in the synnex_flat_file table
    const totalRows = await countProducts();
    console.log(`Connection successful. Found ${totalRows} total rows in synnex_flat_file table.`);
    
    return json({
      success: true,
      message: 'Database connection successful',
      data: { total_rows: totalRows }
    });
  } catch (error) {
    // Log detailed error information
    console.error('Database connection test failed:', error);
    
    // Capture stack trace if available
    const stack = error instanceof Error ? error.stack : undefined;
    
    // Create detailed error object
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack,
      timestamp: new Date().toISOString()
    };
    
    console.error('Connection error details:', errorDetails);
    
    return json({
      success: false,
      message: 'Database connection failed',
      error: errorDetails
    }, { status: 500 });
  }
}
