"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { placeOrder } from "@/lib/api";

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart();
  const { data: session } = useSession();
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const total = items.reduce(
    (sum, ci) => sum + ci.product.price * ci.quantity,
    0
  );

  const handlePlaceOrder = async () => {
    if (!session?.user) {
      setMessage("Please sign in before placing an order.");
      return;
    }
    const customerId = (session.user as any).sub ?? session.user.email;
    setPlacing(true);
    setMessage(null);
    try {
      await placeOrder(
        {
          customerId,
          items: items.map(ci => ({
            productId: ci.product.id,
            quantity: ci.quantity,
            unitPrice: ci.product.price
          }))
        },
        session ?? null
      );
      clearCart();
      setMessage("Order placed successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Your cart</h1>
      {items.length === 0 && (
        <p className="text-sm text-gray-500">Your cart is empty.</p>
      )}
      {items.map(ci => (
        <div
          key={ci.product.id}
          className="flex items-center justify-between border-b py-2 text-sm"
        >
          <div>
            <div className="font-medium">{ci.product.name}</div>
            <div className="text-gray-500">
              {ci.quantity} × ${ci.product.price.toFixed(2)}
            </div>
          </div>
          <button
            className="px-2 py-1 border rounded text-xs"
            onClick={() => removeFromCart(ci.product.id)}
          >
            Remove
          </button>
        </div>
      ))}

      {items.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
            onClick={handlePlaceOrder}
            disabled={placing}
          >
            {placing ? "Placing order..." : "Place order"}
          </button>
        </div>
      )}

      {message && (
        <p className="mt-3 text-sm text-gray-700" data-testid="cart-message">
          {message}
        </p>
      )}
    </div>
  );
}

