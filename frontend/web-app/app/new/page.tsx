"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchNewArrivals, type Product } from "@/lib/api";
import { ProductGrid } from "@/components/ProductGrid";
import { Sparkles } from "lucide-react";

export default function NewArrivalsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNewArrivals(session ?? null)
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
          <Sparkles className="text-blue-500" size={32} />
          <h1 className="text-3xl md:text-4xl font-bold">New Arrivals</h1>
        </div>
        <p className="text-gray-600">Discover the latest products just added to our store</p>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2">Fresh & New</h2>
        <p className="text-lg">Be the first to own our newest products</p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading new arrivals...</p>}
      
      {!loading && products.length === 0 && (
        <p className="text-gray-500">No new arrivals yet. Check back soon!</p>
      )}

      <ProductGrid products={products} />
    </div>
  );
}