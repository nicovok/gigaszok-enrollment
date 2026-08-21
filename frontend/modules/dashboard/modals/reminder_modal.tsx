import { useState } from "react";
import { Modal, Stack, Text, Group, Button } from "@mantine/core";
import { apiFetch } from "@/lib/api";
import { useTermStore } from "@/stores/use_term_store";

type Props = { opened: boolean; unpaidCount: number; onClose: () => void };

export function ReminderModal({ opened, unpaidCount, onClose }: Props) {
  const { selectedTermId } = useTermStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  async function handleSend() {
    setLoading(true);
    try {
      const res = await apiFetch<{ sent: number; failed: number }>(
        `/api/terms/${selectedTermId}/remind`, { method: "POST" }
      );
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    onClose();
    setResult(null);
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Emlékeztető küldése" size="sm">
      <Stack gap="md">
        {!result ? (
          <>
            <Text size="sm">
              Emlékeztető emailt küldesz <strong>{unpaidCount}</strong> nem fizető jelentkezőnek.
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={handleClose}>Mégse</Button>
              <Button color="orange" loading={loading} onClick={handleSend}>Küldés</Button>
            </Group>
          </>
        ) : (
          <>
            <Text size="sm">
              <strong>{result.sent}</strong> email elküldve
              {result.failed > 0 && <>, <strong>{result.failed}</strong> sikertelen</>}.
            </Text>
            <Group justify="flex-end">
              <Button onClick={handleClose}>Bezárás</Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
