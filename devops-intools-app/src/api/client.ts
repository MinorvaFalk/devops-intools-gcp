import type { ApiEnvelope } from "../types/api";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1";
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (body.error) msg = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  const envelope = (await res.json()) as ApiEnvelope<T>;
  return envelope.data;
}

export const get = <T>(path: string) => request<T>(path);

export const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const del = <T>(path: string) => request<T>(path, { method: "DELETE" });
