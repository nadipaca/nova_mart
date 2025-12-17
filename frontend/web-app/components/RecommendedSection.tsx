"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fetchRecommendations, fetchProducts } from "@/lib/api";
import { ProductGrid } from "@/components/ProductGrid";
import type { Product } from "@/lib/api";

interface Props {
  userIdHint?: string;
}

export function RecommendedSection({ userIdHint }: Props) {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = userIdHint ?? (session?.user as any)?.sub;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // If user is signed in, fetch personalized recommendations
    if (userId) {
      fetchRecommendations(userId, session ?? null)
        .then(res => {
          if (cancelled) return;
          // Fetch actual product details for recommended IDs
          return fetchProducts(session ?? null).then(allProducts => {
            const recommended = allProducts.filter(p => 
              res.productIds.includes(String(p.id))
            );
            setProducts(recommended);
          });
        })
        .catch(err => {
          console.error("Failed to fetch recommendations:", err);
          // Fallback to featured products
          return fetchProducts(session ?? null).then(allProducts => {
            if (!cancelled) setProducts(allProducts.slice(0, 10));
          });
        })
        .finally(() => !cancelled && setLoading(false));
    } else {
      // For non-authenticated users, show featured/trending products
      fetchProducts(session ?? null)
        .then(allProducts => {
          if (!cancelled) {
            // Show top-rated or random selection
            const featured = allProducts
              .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
              .slice(0, 8);
            setProducts(featured);
          }
        })
        .catch(err => console.error("Failed to fetch products:", err))
        .finally(() => !cancelled && setLoading(false));
    }

    return () => {
      cancelled = true;
    };
  }, [userId, session]);

  return (
    <section className="mt-8">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          {userId ? "Recommended for You" : "Featured Products"}
        </h2>
        <p className="text-gray-600">
          {userId 
            ? "Based on your browsing and purchase history" 
            : "Discover our top-rated products"}
        </p>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2 text-sm">Loading recommendations...</p>
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No products available at the moment.
          </p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <ProductGrid products={products} />
      )}
    </section>
  );
}