import { Paper, Table, Text, Badge, Button, Group, Tooltip, ActionIcon, Center, Loader } from "@mantine/core";
import { IconMail, IconBell, IconTrash, IconHistory } from "@tabler/icons-react";
import { apiFetch } from "../../lib/api";
import { useApplicantStore } from "../../stores/useApplicantStore";
import { useTermStore } from "../../stores/useTermStore";
import { formatDate } from "../../lib/utils";
import type { Applicant, EmailLog } from "../../types";

type Props = {
  onConfirmPaid: (a: Applicant) => void;
  onConfirmRemind: (a: Applicant) => void;
  onConfirmRegEmail: (a: Applicant) => void;
  onDelete: (a: Applicant) => void;
  onEmailLog: (a: Applicant, logs: EmailLog[]) => void;
};

export function ApplicantsTable({ onConfirmPaid, onConfirmRemind, onConfirmRegEmail, onDelete, onEmailLog }: Props) {
  const { applicants, filter, loading } = useApplicantStore();
  const { selectedTermId } = useTermStore();

  const filtered = applicants.filter(a =>
    filter === "all" ? true : filter === "paid" ? a.paid === 1 : a.paid === 0
  );

  if (loading) return <Center py="xl"><Loader /></Center>;

  return (
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
              <Table.Td colSpan={6}>
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
                    <Button size="xs" variant="subtle" color={a.paid ? "red" : "green"} onClick={() => onConfirmPaid(a)}>
                      {a.paid ? "Visszavon" : "Befizetve"}
                    </Button>
                    {a.email && (
                      <Tooltip label="Beiratkozás visszaigazolás újraküldése">
                        <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => onConfirmRegEmail(a)}>
                          <IconMail size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {!a.paid && a.email && (
                      <Tooltip label="Emlékeztető küldése">
                        <ActionIcon size="sm" variant="subtle" color="orange" onClick={() => onConfirmRemind(a)}>
                          <IconBell size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Törlés">
                      <ActionIcon size="sm" variant="subtle" color="red" onClick={() => onDelete(a)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Email napló">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="gray"
                        onClick={async () => {
                          const logs = await apiFetch<EmailLog[]>(
                            `/api/terms/${selectedTermId}/applicants/${a.id}/email-log`
                          );
                          onEmailLog(a, logs);
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
  );
}
