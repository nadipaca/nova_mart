"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Heart } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
}

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
  const rating = product.rating ?? 4.5;
  const reviewCount = product.reviewCount ?? 0;

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
      <Link href={`/products/${product.id}`}>
        <div className="relative aspect-square bg-gray-100">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
            <Heart size={18} className="text-gray-600 hover:text-red-500" />
          </button>
          {product.price < 30 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              SALE
            </span>
          )}
        </div>
        
        <div className="p-3">
          <h3 className="font-medium text-sm md:text-base line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-1 mb-2">
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

          <div className="flex items-baseline gap-2">
            <span className="text-lg md:text-xl font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            {product.price < 30 && (
              <span className="text-sm text-gray-500 line-through">
                ${(product.price * 1.3).toFixed(2)}
              </span>
            )}
          </div>

          <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm md:text-base">
            Add to Cart
          </button>
        </div>
      </Link>
    </div>
  );
}