import { useState, useEffect, useCallback } from "react";
import {
  AppShell, Group, Title, Button, Select, Badge, Table,
  Text, Stack, SimpleGrid, Paper, Modal, TextInput, Textarea,
  SegmentedControl, FileButton, Alert, Loader, Center,
  ActionIcon, Tooltip, CopyButton, Code, Avatar, Image, UnstyledButton, Tabs, PasswordInput,
} from "@mantine/core";
import {
  IconUpload, IconPlus, IconCheck, IconCopy,
  IconAlertCircle, IconEdit, IconTrash, IconBell, IconHistory, IconMail, IconSend, IconMailCog, IconWebhook,
} from "@tabler/icons-react";
import logo from "../logo.png";

type User = { name: string; email: string; picture?: string };

type Term = {
  id: string;
  name: string;
  slug: string;
  active: number;
  webhook_secret: string;
  created_at: number;
};

type Applicant = {
  id: string;
  term_id: string;
  child_name: string;
  parent_name: string;
  email: string;
  raw_json: string;
  paid: number;
  created_at: number;
};

type CSVResult = {
  matched: number;
  updated: number;
  already_paid: number;
};

type TemplateType = "registration" | "reminder" | "payment_confirmation";

type TemplateData = {
  type: TemplateType;
  subject: string;
  body: string;
  has_banner: boolean;
  is_custom: boolean;
};

type Props = {
  token: string;
  user: User;
  onLogout: () => void;
};

class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}`);
  }
}

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...options,
    headers: { ...(options?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    if (r.status === 401) {
      localStorage.removeItem("token");
      window.location.reload();
    }
    const body = await r.text().catch(() => "");
    throw new ApiError(r.status, body);
  }
  return r.json() as Promise<T>;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("hu-HU", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Dashboard({ token, user, onLogout }: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<CSVResult | null>(null);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [confirmApplicant, setConfirmApplicant] = useState<Applicant | null>(null);
  const [remindModalOpen, setRemindModalOpen] = useState(false);
  const [remindLoading, setRemindLoading] = useState(false);
  const [remindResult, setRemindResult] = useState<{ sent: number; failed: number } | null>(null);
  const [logApplicant, setLogApplicant] = useState<Applicant | null>(null);
  const [emailLogs, setEmailLogs] = useState<{ id: string; type: string; sent_at: number }[]>([]);
  const [confirmRemindApplicant, setConfirmRemindApplicant] = useState<Applicant | null>(null);
  const [deleteApplicant, setDeleteApplicant] = useState<Applicant | null>(null);
  const [confirmRegEmailApplicant, setConfirmRegEmailApplicant] = useState<Applicant | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastFilter, setBroadcastFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null);
  const [newTermName, setNewTermName] = useState("");
  const [newTermSlug, setNewTermSlug] = useState("");
  const [termError, setTermError] = useState("");
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookTermId, setWebhookTermId] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookData, setWebhookData] = useState<Record<string, { url: string; auth_header: string }> | null>(null);
  const [webhookSaving, setWebhookSaving] = useState<string | null>(null);
  const [emailTplOpen, setEmailTplOpen] = useState(false);
  const [emailTplTermId, setEmailTplTermId] = useState<string | null>(null);
  const [emailTplLoading, setEmailTplLoading] = useState(false);
  const [emailTplData, setEmailTplData] = useState<Record<string, TemplateData> | null>(null);
  const [emailTplSaving, setEmailTplSaving] = useState<string | null>(null);
  const [bannerKey, setBannerKey] = useState<Record<string, number>>({});
  const [emailTplSaveStatus, setEmailTplSaveStatus] = useState<Record<string, "ok" | "err">>({});

  const fetchTerms = useCallback(async () => {
    try {
      const data = await apiFetch<Term[]>("/api/terms", token);
      setTerms(data);
      if (data.length > 0 && !selectedTermId) {
        const active = data.find(t => t.active === 1) ?? data[0];
        setSelectedTermId(active.id);
      }
    } catch {
      // ignore
    }
  }, [token, selectedTermId]);

  useEffect(() => { fetchTerms(); }, [fetchTerms]);

  useEffect(() => {
    if (!selectedTermId) { setApplicants([]); return; }
    setLoadingApplicants(true);
    setCsvResult(null);
    apiFetch<Applicant[]>(`/api/terms/${selectedTermId}/applicants`, token)
      .then(setApplicants)
      .catch(() => setApplicants([]))
      .finally(() => setLoadingApplicants(false));
  }, [selectedTermId, token]);

  const termOptions = terms.map(t => ({ value: t.id, label: t.name }));

  const filtered = applicants.filter(a =>
    filter === "all" ? true : filter === "paid" ? a.paid === 1 : a.paid === 0
  );
  const paidCount = applicants.filter(a => a.paid === 1).length;
  const unpaidCount = applicants.length - paidCount;

  async function handleCSVUpload(file: File | null) {
    if (!file || !selectedTermId) return;
    setCsvLoading(true);
    setCsvResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/terms/${selectedTermId}/csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const result = await res.json() as CSVResult;
      setCsvResult(result);
      // Refresh applicants
      const updated = await apiFetch<Applicant[]>(`/api/terms/${selectedTermId}/applicants`, token);
      setApplicants(updated);
    } catch {
      setCsvResult(null);
    } finally {
      setCsvLoading(false);
    }
  }

  async function togglePaid(applicant: Applicant) {
    if (!selectedTermId) return;
    await apiFetch(`/api/terms/${selectedTermId}/applicants/${applicant.id}/paid`, token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: applicant.paid === 0 }),
    });
    setApplicants(prev =>
      prev.map(a => a.id === applicant.id ? { ...a, paid: a.paid === 0 ? 1 : 0 } : a)
    );
  }

  function handleNewTermNameChange(val: string) {
    setNewTermName(val);
    // Auto-generate slug: "2026/27" → "beiratkozas2627"
    const digits = val.replace(/[^0-9]/g, "");
    if (digits.length >= 4) {
      const slug = "beiratkozas" + digits.slice(2, 4) + (digits.length >= 6 ? digits.slice(4, 6) : digits.slice(4));
      setNewTermSlug(slug);
    }
  }

  async function handleCreateTerm() {
    if (!newTermName.trim() || !newTermSlug.trim()) {
      setTermError("Minden mező kitöltése kötelező.");
      return;
    }
    try {
      await apiFetch("/api/terms", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTermName.trim(), slug: newTermSlug.trim() }),
      });
      setNewTermName("");
      setNewTermSlug("");
      setTermError("");
      await fetchTerms();
    } catch (e) {
      if (e instanceof ApiError) {
        setTermError(e.status === 409 ? "Ez a slug már foglalt." : `Hiba (${e.status}): ${e.body}`);
      } else {
        setTermError("Ismeretlen hiba történt.");
      }
    }
  }

  async function handleDeleteTerm(id: string) {
    try {
      await apiFetch(`/api/terms/${id}`, token, { method: "DELETE" });
      if (selectedTermId === id) setSelectedTermId(null);
      await fetchTerms();
    } catch {
      alert("Nem törölhető: vannak jelentkezők ebben a turnusban.");
    }
  }

  async function openWebhooks(termId: string) {
    setWebhookTermId(termId);
    setWebhookOpen(true);
    setWebhookLoading(true);
    try {
      const data = await apiFetch<Array<{ event: string; url: string; auth_header: string }>>(`/api/terms/${termId}/outgoing-webhooks`, token);
      setWebhookData(Object.fromEntries(data.map(d => [d.event, { url: d.url, auth_header: d.auth_header }])));
    } finally {
      setWebhookLoading(false);
    }
  }

  function updateWebhook(event: string, patch: { url?: string; auth_header?: string }) {
    setWebhookData(prev => prev ? { ...prev, [event]: { ...prev[event], ...patch } } : prev);
  }

  async function saveWebhook(event: string) {
    if (!webhookTermId || !webhookData) return;
    setWebhookSaving(event);
    try {
      await apiFetch(`/api/terms/${webhookTermId}/outgoing-webhooks/${event}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookData[event]),
      });
    } finally {
      setWebhookSaving(null);
    }
  }

  async function deleteWebhook(event: string) {
    if (!webhookTermId) return;
    await apiFetch(`/api/terms/${webhookTermId}/outgoing-webhooks/${event}`, token, { method: "DELETE" });
    updateWebhook(event, { url: "", auth_header: "" });
  }

  async function openEmailTemplates(termId: string) {
    setEmailTplTermId(termId);
    setEmailTplOpen(true);
    setEmailTplLoading(true);
    try {
      const data = await apiFetch<TemplateData[]>(`/api/terms/${termId}/email-templates`, token);
      setEmailTplData(Object.fromEntries(data.map(t => [t.type, t])));
    } finally {
      setEmailTplLoading(false);
    }
  }

  function updateTpl(type: string, patch: Partial<TemplateData>) {
    setEmailTplData(prev => prev ? { ...prev, [type]: { ...prev[type], ...patch } } : prev);
  }

  async function saveEmailTemplate(type: string) {
    if (!emailTplTermId || !emailTplData) return;
    setEmailTplSaving(type);
    try {
      const tpl = emailTplData[type];
      await apiFetch(`/api/terms/${emailTplTermId}/email-templates/${type}`, token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: tpl.subject, body: tpl.body }),
      });
      updateTpl(type, { is_custom: true });
      setEmailTplSaveStatus(prev => ({ ...prev, [type]: "ok" }));
      setTimeout(() => setEmailTplSaveStatus(prev => { const n = { ...prev }; delete n[type]; return n; }), 2500);
    } catch {
      setEmailTplSaveStatus(prev => ({ ...prev, [type]: "err" }));
      setTimeout(() => setEmailTplSaveStatus(prev => { const n = { ...prev }; delete n[type]; return n; }), 3500);
    } finally {
      setEmailTplSaving(null);
    }
  }

  async function resetEmailTemplate(type: string) {
    if (!emailTplTermId) return;
    await apiFetch(`/api/terms/${emailTplTermId}/email-templates/${type}`, token, { method: "DELETE" });
    const data = await apiFetch<TemplateData[]>(`/api/terms/${emailTplTermId}/email-templates`, token);
    setEmailTplData(Object.fromEntries(data.map(t => [t.type, t])));
  }

  async function uploadBanner(type: string, file: File) {
    if (!emailTplTermId) return;
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/terms/${emailTplTermId}/email-templates/${type}/banner`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    updateTpl(type, { has_banner: true });
    setBannerKey(prev => ({ ...prev, [type]: Date.now() }));
  }

  async function deleteBanner(type: string) {
    if (!emailTplTermId) return;
    await apiFetch(`/api/terms/${emailTplTermId}/email-templates/${type}/banner`, token, { method: "DELETE" });
    updateTpl(type, { has_banner: false });
  }

  const selectedTerm = terms.find(t => t.id === selectedTermId);
  const webhookUrl = selectedTerm
    ? `${window.location.origin}/webhooks/${selectedTerm.slug}`
    : null;

  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Image src={logo} h={40} w={40} fit="contain" />
            <Title order={3}>Beiratkozás</Title>
            <Select
              data={termOptions}
              value={selectedTermId}
              onChange={setSelectedTermId}
              placeholder="Válassz turnust"
              w={160}
            />
            <Button
              leftSection={<IconEdit size={15} />}
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => setTermsModalOpen(true)}
            >
              Turnusok
            </Button>
          </Group>
          <Group gap="sm">
            <UnstyledButton
              onClick={() => window.open("https://auth.nicoprt.xyz", "_blank")}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Avatar size="sm" radius="xl" color="blue" src={user.picture ?? undefined}>{initials}</Avatar>
              <Text size="sm" fw={500} visibleFrom="sm">{user.name}</Text>
            </UnstyledButton>
            <Button variant="subtle" color="gray" size="xs" onClick={onLogout}>Kilépés</Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main maw={1100} mx="auto">
        <Stack gap="md">
          {/* No terms yet */}
          {terms.length === 0 && (
            <Alert color="blue" title="Nincs turnus" icon={<IconAlertCircle size={16} />}>
              Hozz létre egy turnust a kezdéshez.{" "}
              <Button variant="subtle" size="xs" onClick={() => setTermsModalOpen(true)}>
                Turnus létrehozása
              </Button>
            </Alert>
          )}

          {/* Stats */}
          {selectedTermId && (
            <SimpleGrid cols={3}>
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Összes jelentkező</Text>
                <Title order={2}>{applicants.length}</Title>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Befizetve</Text>
                <Title order={2} c="green">{paidCount}</Title>
              </Paper>
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Hiányzó befizetés</Text>
                <Title order={2} c="red">{unpaidCount}</Title>
              </Paper>
            </SimpleGrid>
          )}

          {/* Webhook URL */}
          {webhookUrl && (
            <Paper withBorder p="sm" radius="md">
              <Group gap="xs">
                <Text size="sm" fw={500}>Webhook URL:</Text>
                <Code>{webhookUrl}</Code>
                <CopyButton value={webhookUrl}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Másolva!" : "Másolás"}>
                      <ActionIcon variant="subtle" size="sm" onClick={copy}>
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Paper>
          )}

          {/* Actions bar */}
          {selectedTermId && (
            <Group justify="space-between">
              <SegmentedControl
                value={filter}
                onChange={v => setFilter(v as typeof filter)}
                data={[
                  { label: "Összes", value: "all" },
                  { label: "Befizetve", value: "paid" },
                  { label: "Nem fizetett", value: "unpaid" },
                ]}
              />
              <Group gap="xs">
                <Button
                  variant="light"
                  color="orange"
                  disabled={unpaidCount === 0}
                  onClick={() => { setRemindResult(null); setRemindModalOpen(true); }}
                >
                  Emlékeztető küldése ({unpaidCount})
                </Button>
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<IconSend size={15} />}
                  onClick={() => { setBroadcastResult(null); setBroadcastOpen(true); }}
                >
                  Egyedi email
                </Button>
              </Group>
            </Group>
          )}


          {/* Applicants table */}
          {selectedTermId && (
            loadingApplicants ? (
              <Center py="xl"><Loader /></Center>
            ) : (
              <Paper withBorder radius="md">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Résztvevő neve</Table.Th>
                      <Table.Th>Szülő neve</Table.Th>
                      <Table.Th>E-mail</Table.Th>
                      <Table.Th>Jelentkezés időpontja</Table.Th>
                      <Table.Th>Befizetés státusza</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filtered.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Text c="dimmed" ta="center" py="md" size="sm">Nincs találat</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      filtered.map(a => (
                        <Table.Tr key={a.id}>
                          <Table.Td fw={500}>{a.child_name}</Table.Td>
                          <Table.Td c="dimmed" size="sm">{a.parent_name}</Table.Td>
                          <Table.Td c="dimmed" size="sm">{a.email}</Table.Td>
                          <Table.Td c="dimmed" size="sm">{formatDate(a.created_at)}</Table.Td>
                          <Table.Td>
                            <Badge color={a.paid ? "green" : "red"} variant="light">
                              {a.paid ? "Befizetve" : "Nincs befizetve"}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4} wrap="nowrap">
                              <Button
                                size="xs"
                                variant="subtle"
                                color={a.paid ? "red" : "green"}
                                onClick={() => setConfirmApplicant(a)}
                              >
                                {a.paid ? "Visszavon" : "Befizetve"}
                              </Button>
                              {a.email && (
                                <Tooltip label="Beiratkozás visszaigazolás újraküldése">
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="blue"
                                    onClick={() => setConfirmRegEmailApplicant(a)}
                                  >
                                    <IconMail size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              {!a.paid && a.email && (
                                <Tooltip label="Emlékeztető küldése">
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="orange"
                                    onClick={() => setConfirmRemindApplicant(a)}
                                  >
                                    <IconBell size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                              <Tooltip label="Törlés">
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="red"
                                  onClick={() => setDeleteApplicant(a)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Email napló">
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="gray"
                                  onClick={async () => {
                                    const logs = await apiFetch<{ id: string; type: string; sent_at: number }[]>(
                                      `/api/terms/${selectedTermId}/applicants/${a.id}/email-log`, token
                                    );
                                    setEmailLogs(logs);
                                    setLogApplicant(a);
                                  }}
                                >
                                  <IconHistory size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            )
          )}
        </Stack>
      </AppShell.Main>

      {/* Broadcast email modal */}
      <Modal
        opened={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        title="Egyedi email küldése"
        size="lg"
      >
        <Stack gap="md">
          {!broadcastResult ? (
            <>
              <SegmentedControl
                value={broadcastFilter}
                onChange={v => setBroadcastFilter(v as typeof broadcastFilter)}
                data={[
                  { label: "Mindenki", value: "all" },
                  { label: "Befizetve", value: "paid" },
                  { label: "Nem fizetett", value: "unpaid" },
                ]}
                fullWidth
              />
              <TextInput
                label="Tárgy"
                placeholder="Email tárgya"
                value={broadcastSubject}
                onChange={e => setBroadcastSubject(e.currentTarget.value)}
                required
              />
              <Textarea
                label="Tartalom"
                placeholder="Email szövege..."
                value={broadcastBody}
                onChange={e => setBroadcastBody(e.currentTarget.value)}
                minRows={8}
                autosize
                required
              />
              <Text size="xs" c="dimmed">
                Az emailbe automatikusan bekerül a szülő neve megszólításként és az aláírás.
              </Text>
              <Group justify="flex-end">
                <Button variant="subtle" color="gray" onClick={() => setBroadcastOpen(false)}>Mégse</Button>
                <Button
                  color="blue"
                  leftSection={<IconSend size={15} />}
                  loading={broadcastLoading}
                  disabled={!broadcastSubject.trim() || !broadcastBody.trim()}
                  onClick={async () => {
                    setBroadcastLoading(true);
                    try {
                      const res = await apiFetch<{ sent: number; failed: number }>(
                        `/api/terms/${selectedTermId}/broadcast`, token, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ subject: broadcastSubject, body: broadcastBody, filter: broadcastFilter }),
                        }
                      );
                      setBroadcastResult(res);
                    } finally {
                      setBroadcastLoading(false);
                    }
                  }}
                >
                  Küldés
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Text size="sm">
                <strong>{broadcastResult.sent}</strong> email elküldve
                {broadcastResult.failed > 0 && <>, <strong>{broadcastResult.failed}</strong> sikertelen</>}.
              </Text>
              <Group justify="flex-end">
                <Button onClick={() => { setBroadcastOpen(false); setBroadcastSubject(""); setBroadcastBody(""); }}>Bezárás</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Terms management modal */}
      <Modal
        opened={termsModalOpen}
        onClose={() => { setTermsModalOpen(false); setTermError(""); }}
        title="Turnusok kezelése"
        size="90%"
      >
        <Stack gap="md">
          {/* Existing terms */}
          {terms.length > 0 && (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Név</Table.Th>
                  <Table.Th>Webhook slug</Table.Th>
                  <Table.Th>Secret</Table.Th>
                  <Table.Th>Státusz</Table.Th>
                  <Table.Th>Eszközök</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {terms.map(t => (
                  <Table.Tr key={t.id}>
                    <Table.Td fw={500}>{t.name}</Table.Td>
                    <Table.Td><Code>/webhooks/{t.slug}</Code></Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Code style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.webhook_secret || "–"}
                        </Code>
                        {t.webhook_secret && (
                          <CopyButton value={t.webhook_secret}>
                            {({ copied, copy }) => (
                              <Tooltip label={copied ? "Másolva!" : "Secret másolása"}>
                                <ActionIcon variant="subtle" size="sm" onClick={copy}>
                                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </CopyButton>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={t.active ? "green" : "gray"} variant="light">
                        {t.active ? "Aktív" : "Inaktív"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label="Email sablonok">
                          <ActionIcon variant="subtle" color="blue" onClick={() => openEmailTemplates(t.id)}>
                            <IconMailCog size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Kimenő webhookok">
                          <ActionIcon variant="subtle" color="violet" onClick={() => openWebhooks(t.id)}>
                            <IconWebhook size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label={t.active ? "Inaktiválás" : "Aktiválás"}>
                          <ActionIcon
                            variant="subtle"
                            color={t.active ? "gray" : "green"}
                            onClick={async () => {
                              await apiFetch(`/api/terms/${t.id}`, token, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ active: t.active ? 0 : 1 }),
                              });
                              fetchTerms();
                            }}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Törlés">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeleteTerm(t.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          {/* New term form */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text fw={500} size="sm">Új turnus</Text>
              <TextInput
                label="Megnevezés"
                placeholder="pl. 2026/27"
                value={newTermName}
                onChange={e => handleNewTermNameChange(e.currentTarget.value)}
              />
              <TextInput
                label="Webhook slug"
                placeholder="pl. beiratkozas2627"
                value={newTermSlug}
                onChange={e => setNewTermSlug(e.currentTarget.value)}
                description="A webhook URL: /webhooks/[slug]"
              />
              {termError && <Text c="red" size="sm">{termError}</Text>}
              <Button leftSection={<IconPlus size={16} />} onClick={handleCreateTerm}>
                Létrehozás
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Modal>

      {/* Reminder modal */}
      <Modal
        opened={remindModalOpen}
        onClose={() => setRemindModalOpen(false)}
        title="Emlékeztető küldése"
        size="sm"
      >
        <Stack gap="md">
          {!remindResult ? (
            <>
              <Text size="sm">
                Emlékeztető emailt küldesz <strong>{unpaidCount}</strong> nem fizető jelentkezőnek.
              </Text>
              <Group justify="flex-end">
                <Button variant="subtle" color="gray" onClick={() => setRemindModalOpen(false)}>Mégse</Button>
                <Button
                  color="orange"
                  loading={remindLoading}
                  onClick={async () => {
                    setRemindLoading(true);
                    try {
                      const res = await apiFetch<{ sent: number; failed: number }>(
                        `/api/terms/${selectedTermId}/remind`, token, { method: "POST" }
                      );
                      setRemindResult(res);
                    } finally {
                      setRemindLoading(false);
                    }
                  }}
                >
                  Küldés
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Text size="sm">
                <strong>{remindResult.sent}</strong> email elküldve
                {remindResult.failed > 0 && <>, <strong>{remindResult.failed}</strong> sikertelen</>}.
              </Text>
              <Group justify="flex-end">
                <Button onClick={() => setRemindModalOpen(false)}>Bezárás</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Confirm paid toggle modal */}
      <Modal
        opened={!!confirmApplicant}
        onClose={() => setConfirmApplicant(null)}
        title={confirmApplicant?.paid ? "Befizetés visszavonása" : "Befizetés manuális rögzítése"}
        size="sm"
      >
        {confirmApplicant && (
          <Stack gap="md">
            <Text size="sm">
              {confirmApplicant.paid
                ? <>Biztosan visszavonod <strong>{confirmApplicant.child_name}</strong> befizetett státuszát?</>
                : <>Biztosan befizetettre állítod <strong>{confirmApplicant.child_name}</strong> státuszát?</>
              }
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => setConfirmApplicant(null)}>Mégse</Button>
              <Button
                color={confirmApplicant.paid ? "red" : "green"}
                onClick={async () => {
                  await togglePaid(confirmApplicant);
                  setConfirmApplicant(null);
                }}
              >
                {confirmApplicant.paid ? "Visszavon" : "Igen, befizetve"}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
      {/* Individual remind confirm modal */}
      <Modal
        opened={!!confirmRemindApplicant}
        onClose={() => setConfirmRemindApplicant(null)}
        title="Emlékeztető küldése"
        size="sm"
      >
        {confirmRemindApplicant && (
          <Stack gap="md">
            <Text size="sm">
              Emlékeztetőt küldesz <strong>{confirmRemindApplicant.child_name}</strong> szülőjének ({confirmRemindApplicant.email})?
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => setConfirmRemindApplicant(null)}>Mégse</Button>
              <Button
                color="orange"
                onClick={async () => {
                  await apiFetch(
                    `/api/terms/${selectedTermId}/applicants/${confirmRemindApplicant.id}/remind`,
                    token, { method: "POST" }
                  );
                  setConfirmRemindApplicant(null);
                }}
              >
                Küldés
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Registration email resend confirm modal */}
      <Modal
        opened={!!confirmRegEmailApplicant}
        onClose={() => setConfirmRegEmailApplicant(null)}
        title="Beiratkozás visszaigazolás küldése"
        size="sm"
      >
        {confirmRegEmailApplicant && (
          <Stack gap="md">
            <Text size="sm">
              Beiratkozás visszaigazoló emailt küldesz <strong>{confirmRegEmailApplicant.child_name}</strong> szülőjének ({confirmRegEmailApplicant.email})?
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => setConfirmRegEmailApplicant(null)}>Mégse</Button>
              <Button
                color="blue"
                onClick={async () => {
                  await apiFetch(
                    `/api/terms/${selectedTermId}/applicants/${confirmRegEmailApplicant.id}/registration-email`,
                    token, { method: "POST" }
                  );
                  setConfirmRegEmailApplicant(null);
                }}
              >
                Küldés
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Delete applicant confirm modal */}
      <Modal
        opened={!!deleteApplicant}
        onClose={() => setDeleteApplicant(null)}
        title="Jelentkezés törlése"
        size="sm"
      >
        {deleteApplicant && (
          <Stack gap="md">
            <Text size="sm">
              Biztosan törlöd <strong>{deleteApplicant.child_name}</strong> jelentkezését? Ez a művelet nem vonható vissza.
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => setDeleteApplicant(null)}>Mégse</Button>
              <Button
                color="red"
                onClick={async () => {
                  await apiFetch(
                    `/api/terms/${selectedTermId}/applicants/${deleteApplicant.id}`,
                    token, { method: "DELETE" }
                  );
                  setApplicants(prev => prev.filter(a => a.id !== deleteApplicant.id));
                  setDeleteApplicant(null);
                }}
              >
                Törlés
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Outgoing webhooks modal */}
      <Modal
        opened={webhookOpen}
        onClose={() => setWebhookOpen(false)}
        title={`Kimenő webhookok – ${terms.find(t => t.id === webhookTermId)?.name ?? ""}`}
        size="lg"
      >
        {webhookLoading ? (
          <Center py="xl"><Loader /></Center>
        ) : webhookData && (
          <Stack gap="md">
            {([
              { event: "registration", label: "Beiratkozás", color: "blue" },
              { event: "payment", label: "Befizetés", color: "green" },
              { event: "reminder", label: "Emlékeztető", color: "orange" },
            ] as const).map(({ event, label, color }) => {
              const cfg = webhookData[event] ?? { url: "", auth_header: "" };
              return (
                <Paper key={event} withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Group gap="xs">
                      <Badge color={color} variant="light" size="sm">{label}</Badge>
                    </Group>
                    <TextInput
                      label="Webhook URL"
                      placeholder="https://..."
                      value={cfg.url}
                      onChange={e => updateWebhook(event, { url: e.currentTarget.value })}
                    />
                    <PasswordInput
                      label="Authorization fejléc (opcionális)"
                      placeholder="Bearer eyJ..."
                      value={cfg.auth_header}
                      onChange={e => updateWebhook(event, { auth_header: e.currentTarget.value })}
                    />
                    <Group justify="flex-end">
                      {cfg.url && (
                        <Button size="xs" color="red" variant="subtle" onClick={() => deleteWebhook(event)}>
                          Törlés
                        </Button>
                      )}
                      <Button
                        size="xs"
                        loading={webhookSaving === event}
                        disabled={!cfg.url.trim()}
                        onClick={() => saveWebhook(event)}
                      >
                        Mentés
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
            <Text size="xs" c="dimmed">
              A webhook POST kéréssel hívódik meg JSON payload-dal: <Code>{"{ event, term_id, applicant, timestamp }"}</Code>
            </Text>
          </Stack>
        )}
      </Modal>

      {/* Email templates modal */}
      <Modal
        opened={emailTplOpen}
        onClose={() => setEmailTplOpen(false)}
        title={`Email sablonok – ${terms.find(t => t.id === emailTplTermId)?.name ?? ""}`}
        size="xl"
      >
        {emailTplLoading ? (
          <Center py="xl"><Loader /></Center>
        ) : emailTplData && (
          <Tabs defaultValue="registration">
            <Tabs.List>
              <Tabs.Tab value="registration" leftSection={<IconMail size={14} />}>Visszaigazolás</Tabs.Tab>
              <Tabs.Tab value="reminder" leftSection={<IconBell size={14} />}>Emlékeztető</Tabs.Tab>
              <Tabs.Tab value="payment_confirmation" leftSection={<IconCheck size={14} />}>Befizetés</Tabs.Tab>
            </Tabs.List>

            {(["registration", "reminder", "payment_confirmation"] as TemplateType[]).map(type => {
              const tpl = emailTplData[type];
              if (!tpl) return null;
              const hasBox = type !== "payment_confirmation";
              return (
                <Tabs.Panel key={type} value={type} pt="md">
                  <Stack gap="md">
                    <Paper withBorder p="sm" radius="md">
                      <Stack gap="xs">
                        <Text fw={500} size="sm">Borítókép</Text>
                        {tpl.has_banner ? (
                          <Group align="flex-start">
                            <img
                              key={bannerKey[type] ?? 0}
                              src={`/api/terms/${emailTplTermId}/email-templates/${type}/banner`}
                              style={{ maxHeight: 80, borderRadius: 4, display: "block" }}
                            />
                            <Button size="xs" color="red" variant="subtle" onClick={() => deleteBanner(type)}>
                              Törlés
                            </Button>
                          </Group>
                        ) : (
                          <Badge color="gray" variant="light">Nincs – a logo jelenik meg</Badge>
                        )}
                        <FileButton onChange={file => file && uploadBanner(type, file)} accept="image/*">
                          {props => (
                            <Button {...props} variant="light" size="xs" leftSection={<IconUpload size={14} />} w="fit-content">
                              {tpl.has_banner ? "Csere" : "Kép feltöltése"}
                            </Button>
                          )}
                        </FileButton>
                      </Stack>
                    </Paper>

                    <TextInput
                      label="Tárgy"
                      value={tpl.subject}
                      onChange={e => updateTpl(type, { subject: e.currentTarget.value })}
                    />

                    <Textarea
                      label="Szöveg"
                      value={tpl.body}
                      onChange={e => updateTpl(type, { body: e.currentTarget.value })}
                      minRows={6}
                      autosize
                    />

                    <Text size="xs" c="dimmed">
                      Változók: <Code>{"{child_name}"}</Code> – résztvevő neve, <Code>{"{parent_name}"}</Code> – szülő neve
                      {hasBox && <>, <Code>{"{bank_adatok}"}</Code> – banki adatok box (számlaszám, közlemény)</>}
                    </Text>

                    <Group justify="space-between">
                      {tpl.is_custom && (
                        <Button size="xs" variant="subtle" color="gray" onClick={() => resetEmailTemplate(type)}>
                          Szöveg visszaállítása
                        </Button>
                      )}
                      <Group gap="xs" ml="auto">
                        {emailTplSaveStatus[type] === "ok" && (
                          <Text size="sm" c="green" fw={500}>Mentve!</Text>
                        )}
                        {emailTplSaveStatus[type] === "err" && (
                          <Text size="sm" c="red" fw={500}>Mentési hiba!</Text>
                        )}
                        <Button
                          size="sm"
                          loading={emailTplSaving === type}
                          onClick={() => saveEmailTemplate(type)}
                        >
                          Mentés
                        </Button>
                      </Group>
                    </Group>
                  </Stack>
                </Tabs.Panel>
              );
            })}
          </Tabs>
        )}
      </Modal>

      {/* Email log modal */}
      <Modal
        opened={!!logApplicant}
        onClose={() => setLogApplicant(null)}
        title={`Email napló – ${logApplicant?.child_name}`}
        size="md"
      >
        <Stack gap="sm">
          {emailLogs.length === 0 ? (
            <Text c="dimmed" size="sm">Nem lett még email elküldve.</Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Típus</Table.Th>
                  <Table.Th>Küldve</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {emailLogs.map(log => (
                  <Table.Tr key={log.id}>
                    <Table.Td>
                      <Badge
                        color={log.type === "payment_confirmation" ? "green" : log.type === "registration" ? "blue" : log.type === "custom" ? "violet" : "orange"}
                        variant="light"
                      >
                        {log.type === "payment_confirmation" ? "Befizetés visszaigazolás" : log.type === "registration" ? "Beiratkozás visszaigazolás" : log.type === "custom" ? "Egyedi email" : "Emlékeztető"}
                      </Badge>
                    </Table.Td>
                    <Table.Td c="dimmed" size="sm">{formatDate(log.sent_at)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Modal>
    </AppShell>
  );
}
