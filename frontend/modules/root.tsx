import { useEffect, useState } from "react";
import { Center, Loader, Stack, Alert, Button } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import Dashboard from "./dashboard";
import { useAuthStore } from "@/stores/use_auth_store";

export default function Root() {
  const { token, setToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("login_error");
    if (err) window.history.replaceState({}, "", window.location.pathname);
    return err;
  });

  function redirectToLogin() {
    fetch("/api/auth/login")
      .then(r => r.json() as Promise<{ authUrl: string }>)
      .then(({ authUrl }) => { window.location.href = authUrl; });
  }

  useEffect(() => {
    if (loginError) return;

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

  if (loginError) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md" maw={400}>
          <Alert color="red" title="Bejelentkezési hiba" icon={<IconAlertCircle size={16} />}>
            {loginError}
          </Alert>
          <Button onClick={() => { setLoginError(null); redirectToLogin(); }}>
            Újra próbálkozás
          </Button>
        </Stack>
      </Center>
    );
  }

  if (loading) return <Center h="100vh"><Loader /></Center>;

  return <Dashboard />;
}
