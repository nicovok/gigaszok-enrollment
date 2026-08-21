import { Paper, Table, Text, Badge, Button, Group, Tooltip, ActionIcon, Center, Loader } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconMail, IconBell, IconTrash, IconHistory } from "@tabler/icons-react";
import { useApplicantStore } from "@/stores/use_applicant_store";
import { useTermStore } from "@/stores/use_term_store";
import { formatDate } from "@/lib/utils";
import type { Applicant, EmailLog } from "@/types";

type Props = {
  onEmailLog: (a: Applicant, logs: EmailLog[]) => void;
};

export function ApplicantsTable({ onEmailLog }: Props) {
  const {
    applicants, filter, loading, fetchEmailLog,
    togglePaid, sendReminder, sendRegistrationEmail, deleteApplicant,
  } = useApplicantStore();
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
                <Text c="dimmed" ta="center" py="md" fz="sm">Nincs találat</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            filtered.map(a => (
              <Table.Tr key={a.id}>
                <Table.Td fw={500}>{a.child_name}</Table.Td>
                <Table.Td c="dimmed" fz="sm">{a.parent_name}</Table.Td>
                <Table.Td c="dimmed" fz="sm">{a.email}</Table.Td>
                <Table.Td c="dimmed" fz="sm">{formatDate(a.created_at)}</Table.Td>
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
                      onClick={() => modals.openConfirmModal({
                        title: a.paid ? "Befizetés visszavonása" : "Befizetés manuális rögzítése",
                        children: (
                          <Text size="sm">
                            {a.paid
                              ? <>Biztosan visszavonod <strong>{a.child_name}</strong> befizetett státuszát?</>
                              : <>Biztosan befizetettre állítod <strong>{a.child_name}</strong> státuszát?</>
                            }
                          </Text>
                        ),
                        labels: { confirm: a.paid ? "Visszavon" : "Igen, befizetve", cancel: "Mégse" },
                        confirmProps: { color: a.paid ? "red" : "green" },
                        onConfirm: async () => {
                          await togglePaid(a, selectedTermId!);
                          notifications.show({
                            color: "green",
                            message: a.paid ? "Befizetés visszavonva." : "Befizetés rögzítve.",
                          });
                        },
                      })}
                    >
                      {a.paid ? "Visszavon" : "Befizetve"}
                    </Button>
                    {a.email && (
                      <Tooltip label="Beiratkozás visszaigazolás újraküldése">
                        <ActionIcon
                          fz="sm"
                          variant="subtle"
                          color="blue"
                          onClick={() => modals.openConfirmModal({
                            title: "Beiratkozás visszaigazolás küldése",
                            children: (
                              <Text size="sm">
                                Beiratkozás visszaigazoló emailt küldesz <strong>{a.child_name}</strong> szülőjének ({a.email})?
                              </Text>
                            ),
                            labels: { confirm: "Küldés", cancel: "Mégse" },
                            confirmProps: { color: "blue" },
                            onConfirm: async () => {
                              await sendRegistrationEmail(a.id, selectedTermId!);
                              notifications.show({ color: "blue", message: "Visszaigazolás elküldve." });
                            },
                          })}
                        >
                          <IconMail size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {!a.paid && a.email && (
                      <Tooltip label="Emlékeztető küldése">
                        <ActionIcon
                          fz="sm"
                          variant="subtle"
                          color="orange"
                          onClick={() => modals.openConfirmModal({
                            title: "Emlékeztető küldése",
                            children: (
                              <Text size="sm">
                                Emlékeztetőt küldesz <strong>{a.child_name}</strong> szülőjének ({a.email})?
                              </Text>
                            ),
                            labels: { confirm: "Küldés", cancel: "Mégse" },
                            confirmProps: { color: "orange" },
                            onConfirm: async () => {
                              await sendReminder(a.id, selectedTermId!);
                              notifications.show({ color: "orange", message: "Emlékeztető elküldve." });
                            },
                          })}
                        >
                          <IconBell size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Törlés">
                      <ActionIcon
                        fz="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => modals.openConfirmModal({
                          title: "Jelentkezés törlése",
                          children: (
                            <Text size="sm">
                              Biztosan törlöd <strong>{a.child_name}</strong> jelentkezését? Ez a művelet nem vonható vissza.
                            </Text>
                          ),
                          labels: { confirm: "Törlés", cancel: "Mégse" },
                          confirmProps: { color: "red" },
                          onConfirm: () => deleteApplicant(a.id, selectedTermId!),
                        })}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Email napló">
                      <ActionIcon
                        fz="sm"
                        variant="subtle"
                        color="gray"
                        onClick={async () => {
                          const logs = await fetchEmailLog(a.id, selectedTermId!);
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
