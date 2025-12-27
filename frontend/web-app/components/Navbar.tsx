"use client";

import Link from "next/link";
import { SignInButton, SignOutButton, useSessionUser } from "./auth-buttons";
import { ShoppingCart, Search, Menu, User, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

export function Navbar() {
  const user = useSessionUser();
  const { items } = useCart();
  const cartCount = items.length;
  const [showDepartments, setShowDepartments] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-blue-600 text-white text-xs py-2">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span>Free shipping on orders over $50</span>
          <div className="flex gap-4">
            <Link href="/help" className="hover:underline">Help</Link>
            <Link href="/orders" className="hover:underline">Track Order</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <h1 className="text-2xl md:text-3xl font-bold text-blue-600">NovaMart</h1>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products, categories..."
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-full focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                <Search size={20} />
              </button>
            </div>
          </div>

          {/* User actions - Fixed width to prevent layout shift */}
          <div className="flex items-center gap-4 min-w-[280px] justify-end">
            {/* Account section */}
            <div className="min-w-[120px]">
              {user ? (
                <div className="flex items-center gap-2 text-sm">
                  <User size={20} className="text-gray-600" />
                  <div className="hidden md:block">
                    <div className="text-xs text-gray-600">Hello, {user.name?.split(' ')[0] || 'User'}</div>
                    <div className="font-semibold">Account</div>
                  </div>
                </div>
              ) : (
                <SignInButton />
              )}
            </div>
            
            {/* Cart */}
            <Link href="/cart" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
              <div className="relative">
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-semibold px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="hidden md:block font-semibold">Cart</span>
            </Link>

            {/* Sign out */}
            <div className="min-w-[80px]">
              {user && <SignOutButton />}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 relative">
          <ul className="flex items-center gap-6 py-3 text-sm font-medium overflow-x-auto">
            <li>
              <button
                onClick={() => setShowDepartments(!showDepartments)}
                className="flex items-center gap-2 hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                <Menu size={18} />
                All Departments
                <ChevronDown size={16} />
              </button>

              {showDepartments && (
                <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-lg py-2 min-w-[200px] z-50">
                  <Link
                    href="/departments"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setShowDepartments(false)}
                  >
                    View All Departments
                  </Link>
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link href="/products" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setShowDepartments(false)}>All Products</Link>
                  <Link href="/departments/electronics" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setShowDepartments(false)}>Electronics</Link>
                  <Link href="/departments/computers" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setShowDepartments(false)}>Computers</Link>
                  <Link href="/departments/audio-headphones" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setShowDepartments(false)}>Audio & Headphones</Link>
                  <Link href="/departments/home-appliances" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setShowDepartments(false)}>Home Appliances</Link>
                </div>
              )}

            </li>
            <li><Link href="/products" className="hover:text-blue-600 transition-colors whitespace-nowrap">All Products</Link></li>
            <li><Link href="/deals" className="hover:text-blue-600 transition-colors whitespace-nowrap">Today's Deals</Link></li>
            <li><Link href="/new" className="hover:text-blue-600 transition-colors whitespace-nowrap">New Arrivals</Link></li>
            <li><Link href="/bestsellers" className="hover:text-blue-600 transition-colors whitespace-nowrap">Best Sellers</Link></li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
