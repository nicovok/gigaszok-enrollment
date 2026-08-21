import { useState } from "react";
import { Modal, Stack, SegmentedControl, TextInput, Textarea, Text, Group, Button } from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api";
import { useTermStore } from "@/stores/use_term_store";
import { BatchSendResult } from "./batch_send_result";

type Props = { opened: boolean; onClose: () => void };

export function BroadcastModal({ opened, onClose }: Props) {
  const { selectedTermId } = useTermStore();
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  function handleClose() {
    onClose();
    setSubject(""); setBody(""); setResult(null);
  }

  async function handleSend() {
    setLoading(true);
    try {
      const res = await apiFetch<{ sent: number; failed: number }>(
        `/api/terms/${selectedTermId}/broadcast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body, filter }),
        }
      );
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Egyedi email küldése" size="lg">
      <Stack gap="md">
        {!result ? (
          <>
            <SegmentedControl
              value={filter}
              onChange={v => setFilter(v as typeof filter)}
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
              value={subject}
              onChange={e => setSubject(e.currentTarget.value)}
              required
            />
            <Textarea
              label="Tartalom"
              placeholder="Email szövege..."
              value={body}
              onChange={e => setBody(e.currentTarget.value)}
              minRows={8}
              autosize
              required
            />
            <Text size="xs" c="dimmed">
              Az emailbe automatikusan bekerül a szülő neve megszólításként és az aláírás.
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={handleClose}>Mégse</Button>
              <Button
                color="blue"
                leftSection={<IconSend size={15} />}
                loading={loading}
                disabled={!subject.trim() || !body.trim()}
                onClick={handleSend}
              >
                Küldés
              </Button>
            </Group>
          </>
        ) : (
          <BatchSendResult sent={result.sent} failed={result.failed} onClose={handleClose} />
        )}
      </Stack>
    </Modal>
  );
}
