import { Text, Group, Button } from "@mantine/core";

type Props = { sent: number; failed: number; onClose: () => void };

export function BatchSendResult({ sent, failed, onClose }: Props) {
  return (
    <>
      <Text size="sm">
        <strong>{sent}</strong> email elküldve
        {failed > 0 && <>, <strong>{failed}</strong> sikertelen</>}.
      </Text>
      <Group justify="flex-end">
        <Button onClick={onClose}>Bezárás</Button>
      </Group>
    </>
  );
}
