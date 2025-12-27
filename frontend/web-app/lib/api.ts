import axios from "axios";
import type { Session } from "next-auth";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

const apiBaseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.novamart.dev"
);

function defaultOrderBaseUrlFromApiBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.port = "8081";
      return normalizeBaseUrl(url.toString());
    }
  } catch {
    // ignore
  }
  return baseUrl;
}

const orderBaseUrl = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_ORDER_API_BASE_URL ??
    defaultOrderBaseUrlFromApiBaseUrl(apiBaseUrl)
);

function authHeaders(session: Session | null) {
  const token = (session as any)?.accessToken as string | undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  createdAt?: string;
  rating?: number;
  reviewCount?: number;
}

export async function fetchProducts(session: Session | null): Promise<Product[]> {
  const res = await axios.get<Product[]>(`${apiBaseUrl}/products`, {
    headers: authHeaders(session)
  });
  return res.data;
}

export async function fetchProductById(
  id: string,
  session: Session | null
): Promise<Product> {
  const res = await axios.get<Product>(
    `${apiBaseUrl}/products/${id}`,
    {
      headers: authHeaders(session)
    }
  );
  return res.data;
}

export async function fetchDeals(session: Session | null): Promise<Product[]> {
  const products = await fetchProducts(session);
  return products.filter(p => p.price < 50).slice(0, 20);
}

export async function fetchNewArrivals(session: Session | null): Promise<Product[]> {
  const products = await fetchProducts(session);
  return products
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 20);
}

export async function fetchBestSellers(session: Session | null): Promise<Product[]> {
  const products = await fetchProducts(session);
  return products
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 20);
}

export interface RecommendationResponse {
  userId: string;
  productIds: string[];
}

export async function fetchRecommendations(
  userId: string,
  session: Session | null
): Promise<RecommendationResponse> {
  try {
    const res = await axios.get<RecommendationResponse>(
      `${apiBaseUrl}/recommendations`,
      {
        params: { userId },
        headers: authHeaders(session)
      }
    );
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return { userId, productIds: [] };
    }
    throw err;
  }
}

export interface CreateOrderItem {
  productId: number;
  productSku?: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderRequest {
  customerId: string;
  items: CreateOrderItem[];
}

export async function placeOrder(
  payload: CreateOrderRequest,
  session: Session | null
): Promise<any> {
  const res = await axios.post(`${orderBaseUrl}/orders`, payload, {
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json"
    }
  });
  return res.data;
}
