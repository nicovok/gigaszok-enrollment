import { useEffect, useState } from "react";
import { Center, Loader } from "@mantine/core";
import Dashboard from "./dashboard";
import { useAuthStore } from "@/stores/use_auth_store";

export default function Root() {
  const { token, setToken } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
      window.history.replaceState({}, "", window.location.pathname);
      setLoading(false);
      return;
    }

    if (!token) {
      redirectToLogin();
      return;
    }

    fetch("/api/auth/verify", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) { useAuthStore.getState().logout(); }
        else setLoading(false);
      })
      .catch(() => { useAuthStore.getState().logout(); });
  }, []);

  function redirectToLogin() {
    fetch("/api/auth/login")
      .then(r => r.json() as Promise<{ authUrl: string }>)
      .then(({ authUrl }) => { window.location.href = authUrl; });
  }

  if (loading) return <Center h="100vh"><Loader /></Center>;

  return <Dashboard />;
}
