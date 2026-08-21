import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { WebhookEventType } from "@/types";

type WebhookEntry = { url: string; auth_header: string };

interface WebhookState {
  open: boolean;
  termId: string | null;
  loading: boolean;
  data: Record<WebhookEventType, WebhookEntry> | null;
  saving: WebhookEventType | null;
  openModal: (termId: string) => Promise<void>;
  closeModal: () => void;
  update: (event: WebhookEventType, patch: Partial<WebhookEntry>) => void;
  save: (event: WebhookEventType) => Promise<void>;
  remove: (event: WebhookEventType) => Promise<void>;
}

export const useWebhookStore = create<WebhookState>((set, get) => ({
  open: false,
  termId: null,
  loading: false,
  data: null,
  saving: null,

  openModal: async (termId) => {
    set({ open: true, termId, loading: true, data: null });
    try {
      const raw = await apiFetch<Array<{ event: WebhookEventType; url: string; auth_header: string }>>(
        `/api/terms/${termId}/outgoing-webhooks`
      );
      set({
        data: Object.fromEntries(
          raw.map(d => [d.event, { url: d.url, auth_header: d.auth_header }])
        ) as Record<WebhookEventType, WebhookEntry>,
      });
    } finally {
      set({ loading: false });
    }
  },

  closeModal: () => set({ open: false }),

  update: (event, patch) =>
    set(state => state.data
      ? { data: { ...state.data, [event]: { ...(state.data[event] ?? { url: "", auth_header: "" }), ...patch } } }
      : {}
    ),

  save: async (event) => {
    const { termId, data } = get();
    if (!termId || !data) return;
    set({ saving: event });
    try {
      await apiFetch(`/api/terms/${termId}/outgoing-webhooks/${event}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data[event]),
      });
    } finally {
      set({ saving: null });
    }
  },

  remove: async (event) => {
    const { termId } = get();
    if (!termId) return;
    await apiFetch(`/api/terms/${termId}/outgoing-webhooks/${event}`, { method: "DELETE" });
    get().update(event, { url: "", auth_header: "" });
  },
}));
