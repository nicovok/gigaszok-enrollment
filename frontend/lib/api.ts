import { useAuthStore } from "@/stores/use_auth_store";

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}`);
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const isFormData = options?.body instanceof FormData;
  const r = await fetch(path, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!r.ok) {
    if (r.status === 401) {
      useAuthStore.getState().logout();
    }
    const body = await r.text().catch(() => "");
    throw new ApiError(r.status, body);
  }
  return r.json() as Promise<T>;
}
