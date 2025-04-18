import { json } from '@sveltejs/kit';
import { searchByPartNumber, searchByDescription, getProductBySku, type SynnexProduct } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const searchType = url.searchParams.get('type') || 'part';
  const searchTerm = url.searchParams.get('term') || '';
  
  if (!searchTerm) {
    return json({
      success: false,
      message: 'Search term is required',
      results: []
    }, { status: 400 });
  }
  
  try {
    let results: SynnexProduct[] = [];
    
    switch (searchType) {
      case 'part':
        // Use Drizzle ORM to search by part number
        results = await searchByPartNumber(searchTerm);
        break;
      case 'description':
        // Use Drizzle ORM to search by description
        results = await searchByDescription(searchTerm);
        break;
      case 'sku':
        // Use Drizzle ORM to search by SKU
        const product = await getProductBySku(searchTerm);
        if (product) {
          results = [product];
        }
        break;
      default:
        return json({
          success: false,
          message: 'Invalid search type',
          results: []
        }, { status: 400 });
    }
    
    return json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    
    return json({
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      results: []
    }, { status: 500 });
  }
}
