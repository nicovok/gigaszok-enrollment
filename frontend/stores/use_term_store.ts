import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { Term } from "@/types";

interface TermState {
  terms: Term[];
  selectedTermId: string | null;
  setSelectedTermId: (id: string | null) => void;
  fetchTerms: () => Promise<void>;
  createTerm: (name: string, slug: string) => Promise<void>;
  deleteTerm: (id: string) => Promise<void>;
  setTermActive: (id: string, active: number) => Promise<void>;
}

export const useTermStore = create<TermState>((set, get) => ({
  terms: [],
  selectedTermId: null,

  setSelectedTermId: (id) => set({ selectedTermId: id }),

  fetchTerms: async () => {
    try {
      const data = await apiFetch<Term[]>("/api/terms");
      set(state => {
        const newSelectedId = state.selectedTermId
          ?? (data.length > 0 ? (data.find(t => t.active === 1) ?? data[0]).id : null);
        return { terms: data, selectedTermId: newSelectedId };
      });
    } catch {
      // ignore
    }
  },

  createTerm: async (name, slug) => {
    await apiFetch("/api/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    await get().fetchTerms();
  },

  deleteTerm: async (id) => {
    await apiFetch(`/api/terms/${id}`, { method: "DELETE" });
    set(state => ({
      selectedTermId: state.selectedTermId === id ? null : state.selectedTermId,
    }));
    await get().fetchTerms();
  },

  setTermActive: async (id, active) => {
    await apiFetch(`/api/terms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await get().fetchTerms();
  },
}));
