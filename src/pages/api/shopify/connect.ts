// pages/api/shopify/connect.ts
import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

interface ShopifyConnectResponse {
  success?: boolean;
  message?: string;
  config?: { storeUrl: string; accessToken: string };
  error?: string;
  details?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ShopifyConnectResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let { storeUrl, accessToken } = req.body;

    // --- Basic validation ---
    if (!storeUrl || !accessToken) {
      return res.status(400).json({ error: "Missing store URL or access token" });
    }

    // ✅ FIX: Auto-correct URL if user just types "mystore"
    storeUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!storeUrl.includes('.')) {
      storeUrl += '.myshopify.com';
    }

    // ✅ FIX: Removed strict "shpat_" check. 
    // Now accepts any token that works (shpat_, shpo_, or custom).
    if (accessToken.length < 10) { 
      return res.status(400).json({
        error: "Invalid access token",
        details: "Token is too short to be valid.",
      });
    }

    // --- Real Shopify verification ---
    // We try to fetch the Shop details to prove the token works.
    const url = `https://${storeUrl}/admin/api/2024-01/shop.json`;
    
    try {
      await axios.get(url, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      });

      return res.status(200).json({
        success: true,
        message: "Shopify connected successfully",
        config: { storeUrl, accessToken },
      });

    } catch (err: any) {
      console.error("Shopify API verification failed:", err.response?.status, err.response?.data);

      // Provide more informative errors
      let details = err.response?.data || err.message;
      let status = err.response?.status;

      if (status === 401) {
        details = "Unauthorized: Token is invalid. If using 'Online' mode, the token may have expired.";
      } else if (status === 404) {
        details = `Shop not found: '${storeUrl}'. Check spelling.`;
      } else if (status === 403) {
        details = "Forbidden: Token exists but lacks permissions (need 'read_orders').";
      }

      return res.status(400).json({
        error: "Failed to connect Shopify",
        details,
      });
    }
  } catch (error: any) {
    console.error("Unexpected Shopify connect error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : error,
    });
  }
}