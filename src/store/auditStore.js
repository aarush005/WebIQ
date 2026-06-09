import { create } from "zustand";
import { persist } from "zustand/middleware";


export const useAuditStore = create(
    // persist() auto saves to localStorage so data survives page refresh
    persist(
        (set, get) => ({
            // STATE - the data
        current: null,    // current audit result object
        audits: [],       // history array of past audits
        loading: false,
        error: null,

        // ACTIONS -  functions that update state
        setCurrent: (audit) => set({ current: audit}),

        addToHistory: (audit) => set((state) => ({
            // keep only last 20 audits to avoid storage bloat
            audits:[audit,...state.audits].slice(0,20)
        })),

        setLoading: (val) => set({loading: val}),
        setError: (msg) => set({error: msg}),

        clearCurrent: () => set({error: msg}),
        
        deleteAudit: (id)=>set((state)=> ({
            audits: state.audits.filter(a=> a.id !== id)
        })),
        }),
        {
            name: "WebIq", //localStorage key
            // Only persist audits history, not loading/error states
            partialize: (state) => ({audits: state.audits}),
        }
    )
)