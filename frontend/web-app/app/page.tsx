import Link from "next/link";
import { RecommendedSection } from "@/components/RecommendedSection";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="mt-4">
        <h1 className="text-2xl font-bold mb-2">Welcome to NovaMart</h1>
        <p className="text-gray-700 mb-4">
          Browse products, manage your cart, and enjoy personalized
          recommendations.
        </p>
        <Link
          href="/products"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          Start shopping
        </Link>
      </section>

      <RecommendedSection />
    </div>
  );
}

