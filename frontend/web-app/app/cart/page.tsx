"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { placeOrder } from "@/lib/api";

export default function CartPage() {
  const { items, setQuantity, removeFromCart, clearCart } = useCart();
  const { data: session } = useSession();
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const total = items.reduce(
    (sum, ci) => sum + ci.product.price * ci.quantity,
    0
  );

  const totalQuantity = items.reduce((sum, ci) => sum + ci.quantity, 0);

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
            productSku: ci.product.sku?.toLowerCase(),
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
      const status = (err as any)?.response?.status as number | undefined;
      const data = (err as any)?.response?.data as any;
      const apiMessage =
        typeof data?.message === "string"
          ? data.message
          : typeof data?.detail === "string"
            ? data.detail
            : undefined;

      if (status === 409 && apiMessage) {
        setMessage(apiMessage);
      } else {
        setMessage("Failed to place order. Please try again.");
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-xl font-semibold">Your cart</h1>
        {items.length > 0 && (
          <p className="text-sm text-gray-600">
            {items.length} item{items.length === 1 ? "" : "s"} ({totalQuantity} total)
          </p>
        )}
      </div>
      {items.length === 0 && (
        <p className="text-sm text-gray-500">Your cart is empty.</p>
      )}
      {items.map(ci => (
        <div
          key={ci.product.id}
          className="flex items-center justify-between border-b py-4 text-sm gap-4"
        >
          <div>
            <div className="font-medium">{ci.product.name}</div>
            <div className="text-gray-500 flex items-center gap-2 mt-1">
              <span>${ci.product.price.toFixed(2)} each</span>
              <span className="text-gray-300">•</span>
              <span className="font-medium text-gray-700">
                ${(ci.product.price * ci.quantity).toFixed(2)} subtotal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                type="button"
                className="px-3 py-2 hover:bg-gray-50 disabled:opacity-40"
                onClick={() => setQuantity(ci.product.id, ci.quantity - 1)}
                disabled={ci.quantity <= 1}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <div className="px-4 py-2 border-x min-w-[44px] text-center">
                {ci.quantity}
              </div>
              <button
                type="button"
                className="px-3 py-2 hover:bg-gray-50"
                onClick={() => setQuantity(ci.product.id, ci.quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              className="px-3 py-2 border rounded text-xs hover:bg-gray-50"
              onClick={() => removeFromCart(ci.product.id)}
            >
              Remove
            </button>
          </div>
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
