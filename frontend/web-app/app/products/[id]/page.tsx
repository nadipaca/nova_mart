"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchProductById, type Product } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    setLoading(true);
    fetchProductById(params.id, session ?? null)
      .then(data => {
        if (!cancelled) {
          setProduct(data);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params?.id, session]);

  if (loading || !product) {
    return <p className="text-sm text-gray-500">Loading product...</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">{product.name}</h1>
      <p className="text-sm text-gray-600 mb-4">
        {product.description ?? "No description"}
      </p>
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
        <button
          className="px-3 py-1 border rounded text-sm"
          onClick={() => addToCart(product)}
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}

