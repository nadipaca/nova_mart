"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { fetchProducts, type Product } from "@/lib/api";
import { useCart } from "@/context/CartContext";

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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {products.map(p => (
          <div key={p.id} className="border rounded p-3 flex flex-col">
            <Link href={`/products/${p.id}`} className="font-medium mb-1">
              {p.name}
            </Link>
            <p className="text-xs text-gray-500 flex-1">
              {p.description ?? "No description"}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold">${p.price.toFixed(2)}</span>
              <button
                className="px-2 py-1 text-xs border rounded"
                onClick={() => addToCart(p)}
              >
                Add to cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

