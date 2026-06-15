
import { create } from "zustand";
import { supabase } from "../api/supabase";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  init: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    set({ user, loading: false });
  },
}));