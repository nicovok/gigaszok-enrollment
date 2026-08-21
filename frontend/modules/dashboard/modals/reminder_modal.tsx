import { useState } from "react";
import { Modal, Stack, Text, Group, Button } from "@mantine/core";
import { useApplicantStore } from "@/stores/use_applicant_store";
import { BatchSendResult } from "./batch_send_result";

type Props = { opened: boolean; unpaidCount: number; onClose: () => void };

export function ReminderModal({ opened, unpaidCount, onClose }: Props) {
  const { remindAll } = useApplicantStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  async function handleSend() {
    setLoading(true);
    try {
      setResult(await remindAll());
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
          <BatchSendResult sent={result.sent} failed={result.failed} onClose={handleClose} />
        )}
      </Stack>
    </Modal>
  );
}
