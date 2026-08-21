import { Modal, Stack, Text, Table, Badge } from "@mantine/core";
import { formatDate } from "@/lib/utils";
import type { Applicant, EmailLog, EmailLogType } from "@/types";

type Props = { applicant: Applicant | null; logs: EmailLog[]; onClose: () => void };

const LOG_LABELS: Record<EmailLogType, string> = {
  registration: "Beiratkozás visszaigazolás",
  reminder: "Emlékeztető",
  payment_confirmation: "Befizetés visszaigazolás",
  custom: "Egyedi email",
};

const LOG_COLORS: Record<EmailLogType, string> = {
  registration: "blue",
  reminder: "orange",
  payment_confirmation: "green",
  custom: "violet",
};

export function EmailLogModal({ applicant, logs, onClose }: Props) {
  return (
    <Modal opened={!!applicant} onClose={onClose} title={`Email napló – ${applicant?.child_name}`} size="md">
      <Stack gap="sm">
        {logs.length === 0 ? (
          <Text c="dimmed" fz="sm">Nem lett még email elküldve.</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Típus</Table.Th>
                <Table.Th>Küldve</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.map(log => (
                <Table.Tr key={log.id}>
                  <Table.Td>
                    <Badge color={LOG_COLORS[log.type]} variant="light">
                      {LOG_LABELS[log.type]}
                    </Badge>
                  </Table.Td>
                  <Table.Td c="dimmed" fz="sm">{formatDate(log.sent_at)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Modal>
  );
}
