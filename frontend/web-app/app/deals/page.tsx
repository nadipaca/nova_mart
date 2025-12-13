"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchDeals, type Product } from "@/lib/api";
import { ProductGrid } from "@/components/ProductGrid";
import { Tag, Clock } from "lucide-react";

export default function DealsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDeals(session ?? null)
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
          <Tag className="text-red-500" size={32} />
          <h1 className="text-3xl md:text-4xl font-bold">Today's Deals</h1>
        </div>
        <p className="text-gray-600 flex items-center gap-2">
          <Clock size={18} />
          Limited time offers - Don't miss out!
        </p>
      </div>

      {/* Deal Banner */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2">Flash Sale!</h2>
        <p className="text-lg">Save up to 50% on selected items</p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading deals...</p>}
      
      {!loading && products.length === 0 && (
        <p className="text-gray-500">No deals available right now. Check back soon!</p>
      )}

      <ProductGrid products={products} />
    </div>
  );
}