import axios from "axios";
import type { Session } from "next-auth";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.novamart.dev";

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
  const res = await axios.get<RecommendationResponse>(
    `${apiBaseUrl}/recommendations`,
    {
      params: { userId },
      headers: authHeaders(session)
    }
  );
  return res.data;
}

export interface CreateOrderItem {
  productId: number;
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
  const res = await axios.post(`${apiBaseUrl}/orders`, payload, {
    headers: {
      ...authHeaders(session),
      "Content-Type": "application/json"
    }
  });
  return res.data;
}
