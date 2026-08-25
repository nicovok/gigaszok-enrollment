import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/use_auth_store";
import { useTermStore } from "@/stores/use_term_store";
import type { Applicant, CSVResult, EmailLog } from "@/types";

interface ApplicantState {
  applicants: Applicant[];
  filter: "all" | "paid" | "unpaid";
  loading: boolean;
  csvLoading: boolean;
  csvResult: CSVResult | null;
  xlsxLoading: boolean;
  setFilter: (f: "all" | "paid" | "unpaid") => void;
  fetchApplicants: () => Promise<void>;
  togglePaid: (applicant: Applicant) => Promise<void>;
  deleteApplicant: (applicantId: string) => Promise<void>;
  uploadCSV: (file: File) => Promise<void>;
  downloadXlsx: () => Promise<void>;
  sendReminder: (applicantId: string) => Promise<void>;
  sendRegistrationEmail: (applicantId: string) => Promise<void>;
  fetchEmailLog: (applicantId: string) => Promise<EmailLog[]>;
  broadcast: (subject: string, body: string, filter: "all" | "paid" | "unpaid") => Promise<{ sent: number; failed: number }>;
  remindAll: () => Promise<{ sent: number; failed: number }>;
}

export const useApplicantStore = create<ApplicantState>((set, get) => ({
  applicants: [],
  filter: "all",
  loading: false,
  csvLoading: false,
  csvResult: null,
  xlsxLoading: false,

  setFilter: (filter) => set({ filter }),

  fetchApplicants: async () => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) { set({ applicants: [] }); return; }
    set({ loading: true, csvResult: null });
    try {
      const data = await apiFetch<Applicant[]>(`/api/terms/${termId}/applicants`);
      set({ applicants: data });
    } catch {
      set({ applicants: [] });
    } finally {
      set({ loading: false });
    }
  },

  togglePaid: async (applicant) => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return;
    await apiFetch(`/api/terms/${termId}/applicants/${applicant.id}/paid`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: applicant.paid === 0 }),
    });
    set(state => ({
      applicants: state.applicants.map(a =>
        a.id === applicant.id ? { ...a, paid: a.paid === 0 ? 1 : 0 } : a
      ),
    }));
  },

  deleteApplicant: async (applicantId) => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return;
    await apiFetch(`/api/terms/${termId}/applicants/${applicantId}`, { method: "DELETE" });
    set(state => ({ applicants: state.applicants.filter(a => a.id !== applicantId) }));
  },

  sendReminder: async (applicantId) => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return;
    await apiFetch(`/api/terms/${termId}/applicants/${applicantId}/remind`, { method: "POST" });
  },

  sendRegistrationEmail: async (applicantId) => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return;
    await apiFetch(`/api/terms/${termId}/applicants/${applicantId}/registration-email`, { method: "POST" });
  },

  fetchEmailLog: async (applicantId) => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return [];
    return apiFetch<EmailLog[]>(`/api/terms/${termId}/applicants/${applicantId}/email-log`);
  },

  broadcast: async (subject, body, filter) => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return { sent: 0, failed: 0 };
    return apiFetch<{ sent: number; failed: number }>(`/api/terms/${termId}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, filter }),
    });
  },

  remindAll: async () => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return { sent: 0, failed: 0 };
    return apiFetch<{ sent: number; failed: number }>(`/api/terms/${termId}/remind`, { method: "POST" });
  },

  downloadXlsx: async () => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return;
    set({ xlsxLoading: true });
    try {
      const token = useAuthStore.getState().token;
      const filter = get().filter;
      const resp = await fetch(`/api/terms/${termId}/applicants/export?filter=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jelentkezok.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      set({ xlsxLoading: false });
    }
  },

  uploadCSV: async (file) => {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return;
    set({ csvLoading: true, csvResult: null });
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await apiFetch<CSVResult>(`/api/terms/${termId}/csv`, {
        method: "POST",
        body: form,
      });
      set({ csvResult: result });
      const updated = await apiFetch<Applicant[]>(`/api/terms/${termId}/applicants`);
      set({ applicants: updated });
    } finally {
      set({ csvLoading: false });
    }
  },
}));
