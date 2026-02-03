import 'isomorphic-fetch';
import { ShopifyOrder, ShopifyConfig } from '@/lib/types';

/* ===================== HELPER ===================== */
function sanitizeStoreUrl(url: string): string {
  let clean = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!clean.includes('.')) {
    clean += '.myshopify.com';
  }
  return clean;
}

/* ===================== FETCH ORDERS ===================== */
// ✅ FIX: Ensure return type is Promise<ShopifyOrder[]> (NOT void)
export async function getShopifyOrders(
  config: ShopifyConfig, 
  limit: number = 5, 
  status: string = 'any'
): Promise<ShopifyOrder[]> {
  
  const { storeUrl, accessToken } = config;
  
  if (!storeUrl || !accessToken) {
    throw new Error('❌ Missing Shopify credentials.');
  }

  const cleanUrl = sanitizeStoreUrl(storeUrl);
  const endpoint = `https://${cleanUrl}/admin/api/2024-01/orders.json?status=${status}&limit=${limit}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('❌ Token Expired or Invalid.');
      throw new Error(`Shopify API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // ✅ FIX: Explicitly return the array. If undefined, return empty array [].
    return (data.orders || []) as ShopifyOrder[];

  } catch (error: any) {
    console.error('Error fetching Shopify orders:', error.message);
    // ✅ FIX: Return empty array on error so .map() doesn't crash
    return []; 
  }
}