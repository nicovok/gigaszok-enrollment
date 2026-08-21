import { useState } from "react";
import {
  Modal, Stack, Table, Code, Badge, Group, Text, Button,
  Paper, TextInput, ActionIcon, Tooltip, CopyButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconCheck, IconCopy, IconMailCog, IconWebhook, IconTrash } from "@tabler/icons-react";
import { ApiError } from "@/lib/api";
import { useTermStore } from "@/stores/use_term_store";
import { useWebhookStore } from "@/stores/use_webhook_store";
import { useEmailTemplateStore } from "@/stores/use_email_template_store";

type Props = { opened: boolean; onClose: () => void };

export function TermsModal({ opened, onClose }: Props) {
  const { terms, createTerm, deleteTerm, setTermActive } = useTermStore();
  const { openModal: openWebhooks } = useWebhookStore();
  const { openModal: openEmailTemplates } = useEmailTemplateStore();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  function handleNameChange(val: string) {
    setName(val);
    const digits = val.replace(/[^0-9]/g, "");
    if (digits.length >= 4) {
      setSlug("beiratkozas" + digits.slice(2, 4) + (digits.length >= 6 ? digits.slice(4, 6) : digits.slice(4)));
    }
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) { setError("Minden mező kitöltése kötelező."); return; }
    try {
      await createTerm(name.trim(), slug.trim());
      setName(""); setSlug(""); setError("");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.status === 409 ? "Ez a slug már foglalt." : `Hiba (${e.status}): ${e.body}`);
      } else {
        setError("Ismeretlen hiba történt.");
      }
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTerm(id);
    } catch {
      notifications.show({ color: "red", message: "Nem törölhető: vannak jelentkezők ebben a turnusban." });
    }
  }

  return (
    <Modal opened={opened} onClose={() => { onClose(); setError(""); }} title="Turnusok kezelése" size="90%">
      <Stack gap="md">
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
                          onClick={() => setTermActive(t.id, t.active ? 0 : 1)}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Törlés">
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(t.id)}>
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

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Text fw={500} size="sm">Új turnus</Text>
            <TextInput
              label="Megnevezés"
              placeholder="pl. 2026/27"
              value={name}
              onChange={e => handleNameChange(e.currentTarget.value)}
            />
            <TextInput
              label="Webhook slug"
              placeholder="pl. beiratkozas2627"
              value={slug}
              onChange={e => setSlug(e.currentTarget.value)}
              description="A webhook URL: /webhooks/[slug]"
            />
            {error && <Text c="red" size="sm">{error}</Text>}
            <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>Létrehozás</Button>
          </Stack>
        </Paper>
      </Stack>
    </Modal>
  );
}
