import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/use_auth_store";
import type { TemplateData } from "@/types";

interface EmailTemplateState {
  open: boolean;
  termId: string | null;
  loading: boolean;
  data: Record<string, TemplateData> | null;
  saving: string | null;
  saveStatus: Record<string, "ok" | "err">;
  bannerKey: Record<string, number>;
  openModal: (termId: string) => Promise<void>;
  closeModal: () => void;
  updateTpl: (type: string, patch: Partial<TemplateData>) => void;
  save: (type: string) => Promise<void>;
  reset: (type: string) => Promise<void>;
  uploadBanner: (type: string, file: File) => Promise<void>;
  deleteBanner: (type: string) => Promise<void>;
}

export const useEmailTemplateStore = create<EmailTemplateState>((set, get) => ({
  open: false,
  termId: null,
  loading: false,
  data: null,
  saving: null,
  saveStatus: {},
  bannerKey: {},

  openModal: async (termId) => {
    set({ open: true, termId, loading: true, data: null });
    const raw = await apiFetch<TemplateData[]>(`/api/terms/${termId}/email-templates`);
    set({ data: Object.fromEntries(raw.map(t => [t.type, t])), loading: false });
  },

  closeModal: () => set({ open: false }),

  updateTpl: (type, patch) =>
    set(state => state.data
      ? { data: { ...state.data, [type]: { ...state.data[type], ...patch } } }
      : {}
    ),

  save: async (type) => {
    const { termId, data } = get();
    if (!termId || !data) return;
    set({ saving: type });
    try {
      const tpl = data[type];
      await apiFetch(`/api/terms/${termId}/email-templates/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: tpl.subject, body: tpl.body }),
      });
      get().updateTpl(type, { is_custom: true });
      set(state => ({ saveStatus: { ...state.saveStatus, [type]: "ok" } }));
      setTimeout(() => set(state => {
        const s = { ...state.saveStatus };
        delete s[type];
        return { saveStatus: s };
      }), 2500);
    } catch {
      set(state => ({ saveStatus: { ...state.saveStatus, [type]: "err" } }));
      setTimeout(() => set(state => {
        const s = { ...state.saveStatus };
        delete s[type];
        return { saveStatus: s };
      }), 3500);
    } finally {
      set({ saving: null });
    }
  },

  reset: async (type) => {
    const { termId } = get();
    if (!termId) return;
    await apiFetch(`/api/terms/${termId}/email-templates/${type}`, { method: "DELETE" });
    const raw = await apiFetch<TemplateData[]>(`/api/terms/${termId}/email-templates`);
    set({ data: Object.fromEntries(raw.map(t => [t.type, t])) });
  },

  uploadBanner: async (type, file) => {
    const { termId } = get();
    if (!termId) return;
    const form = new FormData();
    form.append("file", file);
    const token = useAuthStore.getState().token;
    await fetch(`/api/terms/${termId}/email-templates/${type}/banner`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    get().updateTpl(type, { has_banner: true });
    set(state => ({ bannerKey: { ...state.bannerKey, [type]: Date.now() } }));
  },

  deleteBanner: async (type) => {
    const { termId } = get();
    if (!termId) return;
    await apiFetch(`/api/terms/${termId}/email-templates/${type}/banner`, { method: "DELETE" });
    get().updateTpl(type, { has_banner: false });
  },
}));
