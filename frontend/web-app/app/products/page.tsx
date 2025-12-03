"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { fetchProducts, type Product } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import {ProductGrid} from "@/components/ProductGrid";

export default function ProductsPage() {
  const { data: session } = useSession();
  const { addToCart } = useCart();
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
    <div>
      <h1 className="text-xl font-semibold mb-4">Products</h1>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      <ProductGrid products={products} />
    </div>
  );
}

