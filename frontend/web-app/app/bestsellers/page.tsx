"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchBestSellers, type Product } from "@/lib/api";
import { ProductGrid } from "@/components/ProductGrid";
import { TrendingUp, Award } from "lucide-react";

export default function BestSellersPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBestSellers(session ?? null)
      .then(data => {
        if (!cancelled) {
          setProducts(data);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Award className="text-yellow-500" size={32} />
          <h1 className="text-3xl md:text-4xl font-bold">Best Sellers</h1>
        </div>
        <p className="text-gray-600 flex items-center gap-2">
          <TrendingUp size={18} />
          Most popular products loved by our customers
        </p>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2">Customer Favorites</h2>
        <p className="text-lg">Top-rated products with proven quality</p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading best sellers...</p>}
      
      {!loading && products.length === 0 && (
        <p className="text-gray-500">No best sellers data available yet.</p>
      )}

      <ProductGrid products={products} />
    </div>
  );
}