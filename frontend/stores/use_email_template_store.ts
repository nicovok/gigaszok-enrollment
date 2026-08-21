import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { notifications } from "@mantine/notifications";
import type { TemplateType, TemplateData } from "@/types";

interface EmailTemplateState {
  open: boolean;
  termId: string | null;
  loading: boolean;
  data: Record<TemplateType, TemplateData> | null;
  saving: TemplateType | null;
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
    try {
      const tpl = data[type];
      await apiFetch(`/api/terms/${termId}/email-templates/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: tpl.subject, body: tpl.body }),
      });
      get().updateTpl(type, { is_custom: true });
      notifications.show({ color: "green", message: "Sablon mentve." });
    } catch {
      notifications.show({ color: "red", message: "Mentési hiba!" });
    } finally {
      set({ saving: null });
    }
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
