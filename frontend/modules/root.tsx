import { useEffect, useState } from "react";
import { Center, Loader } from "@mantine/core";
import Dashboard from "./dashboard";

type User = { name: string; email: string; picture?: string };

function decodeToken(token: string): User {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
}

export default function Root() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      localStorage.setItem("token", urlToken);
      window.history.replaceState({}, "", window.location.pathname);
      setToken(urlToken);
      setLoading(false);
      return;
    }

    if (!token) {
      redirectToLogin();
      return;
    }

    fetch("/api/auth/verify", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) { localStorage.removeItem("token"); redirectToLogin(); }
        else setLoading(false);
      })
      .catch(() => { localStorage.removeItem("token"); redirectToLogin(); });
  }, []);

  function redirectToLogin() {
    fetch("/api/auth/login")
      .then(r => r.json())
      .then(({ authUrl }) => { window.location.href = authUrl; });
  }

  function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "/api/auth/logout";
  }

  if (loading) return <Center h="100vh"><Loader /></Center>;

  const user = decodeToken(token!);
  return <Dashboard token={token!} user={user} onLogout={handleLogout} />;
}
