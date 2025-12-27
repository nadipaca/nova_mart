"use client";

import Link from "next/link";
import { Star, Heart, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/api";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const rating = product.rating ?? 4.5;
  const reviewCount = product.reviewCount ?? 0;
  const isOnSale = product.price < 50;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="flex flex-col h-full min-h-[420px] max-h-[420px] bg-white h-100 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-400">
        {/* Image Container */}
        <div className="relative aspect-square bg-white overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOnSale && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-md">
                SALE
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
            >
              <Heart size={18} className="text-gray-600 hover:text-red-500" />
            </button>
            <button
              onClick={handleQuickAdd}
              className="p-2 bg-blue-600 rounded-full shadow-md hover:bg-blue-700 transition-colors"
              title="Quick add to cart"
            >
              <Plus size={18} className="text-white" />
            </button>
          </div>
        </div>
        
        {/* Product Info */}
        <div className="p-3 space-y-2">
          {/* Product Name */}
          <h3 className="font-medium text-sm md:text-base line-clamp-2 min-h-[40px] group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          
          {/* Rating */}
          <div className="flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">({reviewCount})</span>
          </div>

          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-lg md:text-xl font-bold text-gray-900">
                ${product.price.toFixed(2)}
              </span>
              {isOnSale && (
                <span className="text-sm text-gray-500 line-through">
                  ${(product.price * 1.3).toFixed(2)}
                </span>
              )}
            </div>
            {isOnSale && (
              <p className="text-xs text-green-600 font-semibold">
                Save ${((product.price * 1.3) - product.price).toFixed(2)}
              </p>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleQuickAdd}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm md:text-base shadow-sm hover:shadow-md"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </Link>
  );
}
