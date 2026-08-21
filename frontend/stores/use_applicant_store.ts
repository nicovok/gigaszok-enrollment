import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { Applicant, CSVResult } from "@/types";

interface ApplicantState {
  applicants: Applicant[];
  filter: "all" | "paid" | "unpaid";
  loading: boolean;
  csvLoading: boolean;
  csvResult: CSVResult | null;
  setFilter: (f: "all" | "paid" | "unpaid") => void;
  fetchApplicants: (termId: string) => Promise<void>;
  togglePaid: (applicant: Applicant, termId: string) => Promise<void>;
  deleteApplicant: (applicantId: string, termId: string) => Promise<void>;
  uploadCSV: (file: File, termId: string) => Promise<void>;
}

export const useApplicantStore = create<ApplicantState>((set) => ({
  applicants: [],
  filter: "all",
  loading: false,
  csvLoading: false,
  csvResult: null,

  setFilter: (filter) => set({ filter }),

  fetchApplicants: async (termId) => {
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

  togglePaid: async (applicant, termId) => {
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

  deleteApplicant: async (applicantId, termId) => {
    await apiFetch(`/api/terms/${termId}/applicants/${applicantId}`, { method: "DELETE" });
    set(state => ({ applicants: state.applicants.filter(a => a.id !== applicantId) }));
  },

  uploadCSV: async (file, termId) => {
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
