/* ----------------------------------------------------------------------------
 * Typed client for the ProductDNA FastAPI backend.
 *
 * The API host defaults to http://localhost:8000 (the backend's dev port) and
 * can be overridden with VITE_API_BASE_URL. CORS on the backend allows the
 * Vite dev origin (http://localhost:5173).
 * ------------------------------------------------------------------------- */

export type ConfidenceLevel = "high" | "medium" | "low" | "missing";

export interface FieldValue {
  value: string | null;
  confidence: number; // 0-100
  confidence_level: ConfidenceLevel;
  reasoning: string;
  source: string;
}

export interface Product {
  id: string;
  image_url: string;
  brand: FieldValue;
  product_name: FieldValue;
  weight: FieldValue;
  barcode: FieldValue;
  category: FieldValue;
  packaging: FieldValue;
  status: string; // "extracting" | "needs_review" | "approved" | ...
  created_at: string;
  updated_at: string;
}

export interface Extraction {
  image: string;
  brand: string;
  productName: string;
  confidence: number;
  status: string;
  timestamp: string;
}

export interface Stats {
  products_processed: number;
  avg_confidence: number;
  duplicates_pending: number;
  needs_review: number;
}

export interface DuplicateCandidate {
  id: string;
  product_a: Product;
  product_b: Product;
  similarity: number;
  status: string;
}

export interface QueryResult {
  answer: string;
  sql: string;
  results: Record<string, unknown>[];
}

export interface UploadResult {
  product_id: string;
  status: string;
}

// Accept either a bare host (http://localhost:8000) or one that already
// includes the /api suffix — normalize so we never double it to /api/api.
const RAW_BASE: string = (
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");
const API_HOST = RAW_BASE.replace(/\/api$/, "");
const API_BASE = `${API_HOST}/api`;

/** Resolve a backend-relative asset path (e.g. /static/uploads/x.jpg) to a full URL. */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_HOST}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

/* --- Endpoints ----------------------------------------------------------- */

export const getStats = () => request<Stats>("/stats");
export const getExtractions = () => request<Extraction[]>("/extractions");

export const getProducts = (params?: { status?: string; search?: string }) => {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return request<Product[]>(`/products${qs ? `?${qs}` : ""}`);
};

export const getProduct = (id: string) => request<Product>(`/products/${id}`);

export const getDuplicates = () => request<DuplicateCandidate[]>("/duplicates");

export const mergeDuplicate = (id: string, winnerFields: Record<string, unknown> = {}) =>
  request<{ status: string }>(`/duplicates/${id}/merge`, {
    method: "POST",
    body: JSON.stringify(winnerFields),
  });

export const separateDuplicate = (id: string) =>
  request<{ status: string }>(`/duplicates/${id}/separate`, { method: "POST" });

export const ask = (question: string) =>
  request<QueryResult>("/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });

export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  // Note: no Content-Type header — the browser sets the multipart boundary.
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json())?.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json();
}

/** Direct download URL for the approved-products Excel export. */
export const exportUrl = `${API_BASE}/export`;

/* --- Helpers ------------------------------------------------------------- */

const FIELD_KEYS = [
  "brand",
  "product_name",
  "weight",
  "barcode",
  "category",
  "packaging",
] as const;

/** Average confidence across a product's extracted fields (0-100, rounded). */
export function overallConfidence(p: Product): number {
  const vals = FIELD_KEYS.map((k) => p[k]?.confidence ?? 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round(sum / vals.length);
}

/** Map a backend status string to a human label. */
export function statusLabel(status: string): string {
  switch (status) {
    case "needs_review":
      return "Needs Review";
    case "approved":
      return "Approved";
    case "extracting":
      return "Extracting";
    case "merged":
      return "Merged";
    case "kept_separate":
      return "Kept Separate";
    default:
      return status;
  }
}