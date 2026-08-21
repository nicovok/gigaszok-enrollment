import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { TemplateType, TemplateData } from "@/types";

interface EmailTemplateState {
  open: boolean;
  termId: string | null;
  loading: boolean;
  data: Record<TemplateType, TemplateData> | null;
  saving: TemplateType | null;
  saveStatus: Partial<Record<TemplateType, "ok" | "err">>;
  bannerKey: Partial<Record<TemplateType, number>>;
  openModal: (termId: string) => Promise<void>;
  closeModal: () => void;
  updateTpl: (type: TemplateType, patch: Partial<TemplateData>) => void;
  save: (type: TemplateType) => Promise<void>;
  reset: (type: TemplateType) => Promise<void>;
  uploadBanner: (type: TemplateType, file: File) => Promise<void>;
  deleteBanner: (type: TemplateType) => Promise<void>;
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
    set({
      data: Object.fromEntries(raw.map(t => [t.type, t])) as Record<TemplateType, TemplateData>,
      loading: false,
    });
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
    let status: "ok" | "err" = "err";
    try {
      const tpl = data[type];
      await apiFetch(`/api/terms/${termId}/email-templates/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: tpl.subject, body: tpl.body }),
      });
      get().updateTpl(type, { is_custom: true });
      status = "ok";
    } catch {
      // status stays "err"
    } finally {
      set({ saving: null });
    }
    set(state => ({ saveStatus: { ...state.saveStatus, [type]: status } }));
    setTimeout(() => set(state => {
      const s = { ...state.saveStatus };
      delete s[type];
      return { saveStatus: s };
    }), status === "ok" ? 2500 : 3500);
  },

  reset: async (type) => {
    const { termId } = get();
    if (!termId) return;
    await apiFetch(`/api/terms/${termId}/email-templates/${type}`, { method: "DELETE" });
    const raw = await apiFetch<TemplateData[]>(`/api/terms/${termId}/email-templates`);
    set({ data: Object.fromEntries(raw.map(t => [t.type, t])) as Record<TemplateType, TemplateData> });
  },

  uploadBanner: async (type, file) => {
    const { termId } = get();
    if (!termId) return;
    const form = new FormData();
    form.append("file", file);
    await apiFetch(`/api/terms/${termId}/email-templates/${type}/banner`, {
      method: "POST",
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
