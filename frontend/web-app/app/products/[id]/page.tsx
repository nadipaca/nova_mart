"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchProductById, type Product } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { Star, Heart, Share2, Truck, RotateCcw, Shield } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

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
      .catch(err => console.error("Error fetching product:", err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params?.id, session]);

  if (loading || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-12 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rating = product.rating ?? 4.5;
  const reviewCount = product.reviewCount ?? 127;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm mb-6 text-gray-600">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-blue-600">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package className="w-32 h-32" />
              </div>
            )}
            <button className="absolute top-4 right-4 p-3 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors">
              <Heart className="text-gray-600 hover:text-red-500" />
            </button>
          </div>
          
          {/* Thumbnail images would go here */}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{product.name}</h1>
            
            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {rating} ({reviewCount} reviews)
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="border-t border-b border-gray-200 py-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-bold text-red-600">
                ${product.price.toFixed(2)}
              </span>
              {product.price < 50 && (
                <span className="text-lg text-gray-500 line-through">
                  ${(product.price * 1.3).toFixed(2)}
                </span>
              )}
            </div>
            {product.price < 50 && (
              <p className="text-green-600 font-semibold mt-1">
                Save ${((product.price * 1.3) - product.price).toFixed(2)} (23% off)
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Product Description</h3>
            <p className="text-gray-700 leading-relaxed">
              {product.description || "No description available"}
            </p>
          </div>

          {/* Quantity & Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="font-semibold">Quantity:</label>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-gray-100 transition-colors"
                >
                  −
                </button>
                <span className="px-6 py-2 border-x border-gray-300">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 hover:bg-gray-100 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  addToCart(product, quantity);
                  alert(`Added ${quantity} item(s) to cart!`);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                Add to Cart
              </button>
              <button className="px-6 py-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Share2 />
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Truck className="text-blue-600" size={24} />
              <div>
                <p className="font-semibold">Free Shipping</p>
                <p className="text-sm text-gray-600">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RotateCcw className="text-blue-600" size={24} />
              <div>
                <p className="font-semibold">30-Day Returns</p>
                <p className="text-sm text-gray-600">Easy returns policy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="text-blue-600" size={24} />
              <div>
                <p className="font-semibold">Secure Payment</p>
                <p className="text-sm text-gray-600">100% secure transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}