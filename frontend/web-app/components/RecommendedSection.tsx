"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fetchRecommendations } from "@/lib/api";

interface Props {
  userIdHint?: string;
}

export function RecommendedSection({ userIdHint }: Props) {
  const { data: session } = useSession();
  const [productIds, setProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = userIdHint ?? (session?.user as any)?.sub;

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchRecommendations(userId, session ?? null)
      .then(res => {
        if (!cancelled) {
          setProductIds(res.productIds);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, session]);

  if (!userId) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-2">Recommended for you</h2>
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {!loading && productIds.length === 0 && (
        <p className="text-sm text-gray-500">
          No recommendations yet. Start browsing products.
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {productIds.map(pid => (
          <Link
            key={pid}
            href={`/products/${pid}`}
            className="px-3 py-2 border rounded text-sm"
          >
            Product #{pid}
          </Link>
        ))}
      </div>
    </section>
  );
}

