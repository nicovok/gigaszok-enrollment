import { Modal, Stack, Paper, Badge, Group, TextInput, PasswordInput, Button, Text, Code, Center, Loader } from "@mantine/core";
import { useWebhookStore } from "@/stores/use_webhook_store";
import { useTermStore } from "@/stores/use_term_store";

const EVENTS = [
  { event: "registration", label: "Beiratkozás", color: "blue" },
  { event: "payment", label: "Befizetés", color: "green" },
  { event: "reminder", label: "Emlékeztető", color: "orange" },
] as const;

export function WebhooksModal() {
  const { open, termId, loading, data, saving, closeModal, update, save, remove } = useWebhookStore();
  const { terms } = useTermStore();
  const termName = terms.find(t => t.id === termId)?.name ?? "";

  return (
    <Modal opened={open} onClose={closeModal} title={`Kimenő webhookok – ${termName}`} size="lg">
      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : data && (
        <Stack gap="md">
          {EVENTS.map(({ event, label, color }) => {
            const cfg = data[event] ?? { url: "", auth_header: "" };
            return (
              <Paper key={event} withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Badge color={color} variant="light" size="sm">{label}</Badge>
                  <TextInput
                    label="Webhook URL"
                    placeholder="https://..."
                    value={cfg.url}
                    onChange={e => update(event, { url: e.currentTarget.value })}
                  />
                  <PasswordInput
                    label="Authorization fejléc (opcionális)"
                    placeholder="Bearer eyJ..."
                    value={cfg.auth_header}
                    onChange={e => update(event, { auth_header: e.currentTarget.value })}
                  />
                  <Group justify="flex-end">
                    {cfg.url && (
                      <Button size="xs" color="red" variant="subtle" onClick={() => remove(event)}>Törlés</Button>
                    )}
                    <Button size="xs" loading={saving === event} disabled={!cfg.url.trim()} onClick={() => save(event)}>
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
  );
}
