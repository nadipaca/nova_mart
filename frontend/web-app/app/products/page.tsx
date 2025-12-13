"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchProducts, type Product } from "@/lib/api";
import { ProductGrid } from "@/components/ProductGrid";
import { Package } from "lucide-react";

export default function ProductsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProducts(session ?? null)
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
          <Package className="text-blue-600" size={32} />
          <h1 className="text-3xl md:text-4xl font-bold">All Products</h1>
        </div>
        <p className="text-gray-600">Browse our complete catalog of products</p>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-4">Loading products...</p>
        </div>
      )}
      
      {!loading && products.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500">No products available.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Showing {products.length} products
          </div>
          <ProductGrid products={products} />
        </>
      )}
    </div>
  );
}