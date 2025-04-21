import { json } from '@sveltejs/kit';
import { searchByPartNumber, searchByDescription, getProductBySku, searchByManufacturerName, type SynnexProduct } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const searchType = url.searchParams.get('type') || 'part';
  const searchTerm = url.searchParams.get('term') || '';
  const orderBy = url.searchParams.get('orderBy') || '';
  const orderDir = url.searchParams.get('orderDir') === 'desc' ? 'desc' : 'asc';
  
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
        try {
          // Use Drizzle ORM to search by part number
          results = await searchByPartNumber(searchTerm, orderBy, orderDir);
          console.log(`Found ${results.length} results for part number search: ${searchTerm}`);
        } catch (error) {
          console.error('Error searching by part number:', error);
          throw new Error(`Part number search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        break;
        
      case 'description':
        try {
          // Use Drizzle ORM to search by description
          results = await searchByDescription(searchTerm, orderBy, orderDir);
          console.log(`Found ${results.length} results for description search: ${searchTerm}`);
        } catch (error) {
          console.error('Error searching by description:', error);
          throw new Error(`Description search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        break;
        
      case 'sku':
        try {
          // Use Drizzle ORM to search by SKU
          const product = await getProductBySku(searchTerm);
          if (product) {
            results = [product];
            console.log(`Found product for SKU search: ${searchTerm}`);
          } else {
            console.log(`No product found for SKU: ${searchTerm}`);
          }
        } catch (error) {
          console.error('Error searching by SKU:', error);
          throw new Error(`SKU search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        break;

      case 'manufacturer':
        try {
          results = await searchByManufacturerName(searchTerm, orderBy, orderDir);
          console.log(`Found ${results.length} results for manufacturer search: ${searchTerm}`);
        } catch (error) {
          console.error('Error searching by manufacturer:', error);
          throw new Error(`Manufacturer search failed: ${error instanceof Error ? error.message : String(error)}`);
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
    
    // Provide more detailed error information for debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      searchType,
      searchTerm,
      timestamp: new Date().toISOString()
    };
    
    console.error('Search error details:', errorDetails);
    
    return json({
      success: false,
      message: errorDetails.message,
      error: errorDetails,
      results: []
    }, { status: 500 });
  }
}
