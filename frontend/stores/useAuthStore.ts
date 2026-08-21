import { create } from "zustand";
import type { User } from "../types";

function decodeToken(token: string): User {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(() => {
  const stored = localStorage.getItem("token");
  return {
    token: stored,
    user: stored ? decodeToken(stored) : null,
    setToken: (token) => {
      localStorage.setItem("token", token);
      useAuthStore.setState({ token, user: decodeToken(token) });
    },
    logout: () => {
      localStorage.removeItem("token");
      window.location.href = "/api/auth/logout";
    },
  };
});
