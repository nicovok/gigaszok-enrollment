import { useAuthStore } from "../stores/useAuthStore";

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}`);
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const r = await fetch(path, {
    ...options,
    headers: { ...(options?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    if (r.status === 401) {
      localStorage.removeItem("token");
      window.location.reload();
    }
    const body = await r.text().catch(() => "");
    throw new ApiError(r.status, body);
  }
  return r.json() as Promise<T>;
}
