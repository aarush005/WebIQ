import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuditStore = create(
  persist(
    (set) => ({
      current: null,
      audits: [],
      loading: false,
      error: null,

      setCurrent: (audit) => set({ current: audit }),
      addToHistory: (audit) => set((state) => ({
        audits: [audit, ...state.audits].slice(0, 20),
      })),
      setLoading: (val) => set({ loading: val }),
      setError: (msg) => set({ error: msg }),
      clearCurrent: () => set({ current: null }),
    }),
    {
      name: "growthlens-audits",
      partialize: (state) => ({
        current: state.current,
        audits: state.audits,
      }),
    }
  )
);