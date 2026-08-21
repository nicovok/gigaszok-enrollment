import { useMemo } from "react";
import { Paper, Table, Text, Badge, Button, Group, Tooltip, ActionIcon, Center, Loader } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconMail, IconBell, IconTrash, IconHistory } from "@tabler/icons-react";
import { useApplicantStore } from "@/stores/use_applicant_store";
import { formatDate } from "@/lib/utils";
import type { Applicant, EmailLog } from "@/types";

type Props = {
  onEmailLog: (a: Applicant, logs: EmailLog[]) => void;
};

function confirmAction(opts: {
  title: string;
  message: React.ReactNode;
  confirm: string;
  color: string;
  onConfirm: () => Promise<void> | void;
  notification?: { color: string; message: string };
}) {
  modals.openConfirmModal({
    title: opts.title,
    children: <Text size="sm">{opts.message}</Text>,
    labels: { confirm: opts.confirm, cancel: "Mégse" },
    confirmProps: { color: opts.color },
    onConfirm: async () => {
      await opts.onConfirm();
      if (opts.notification) notifications.show(opts.notification);
    },
  });
}

export function ApplicantsTable({ onEmailLog }: Props) {
  const {
    applicants, filter, loading, fetchEmailLog,
    togglePaid, sendReminder, sendRegistrationEmail, deleteApplicant,
  } = useApplicantStore();

  const filtered = useMemo(() =>
    applicants.filter(a => filter === "all" ? true : filter === "paid" ? a.paid === 1 : a.paid === 0),
    [applicants, filter]
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
                      onClick={() => confirmAction({
                        title: a.paid ? "Befizetés visszavonása" : "Befizetés manuális rögzítése",
                        message: a.paid
                          ? <>Biztosan visszavonod <strong>{a.child_name}</strong> befizetett státuszát?</>
                          : <>Biztosan befizetettre állítod <strong>{a.child_name}</strong> státuszát?</>,
                        confirm: a.paid ? "Visszavon" : "Igen, befizetve",
                        color: a.paid ? "red" : "green",
                        onConfirm: () => togglePaid(a),
                        notification: { color: "green", message: a.paid ? "Befizetés visszavonva." : "Befizetés rögzítve." },
                      })}
                    >
                      {a.paid ? "Visszavon" : "Befizetve"}
                    </Button>
                    {a.email && (
                      <Tooltip label="Beiratkozás visszaigazolás újraküldése">
                        <ActionIcon
                          fz="sm" variant="subtle" color="blue"
                          onClick={() => confirmAction({
                            title: "Beiratkozás visszaigazolás küldése",
                            message: <>Beiratkozás visszaigazoló emailt küldesz <strong>{a.child_name}</strong> szülőjének ({a.email})?</>,
                            confirm: "Küldés",
                            color: "blue",
                            onConfirm: () => sendRegistrationEmail(a.id),
                            notification: { color: "blue", message: "Visszaigazolás elküldve." },
                          })}
                        >
                          <IconMail size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {!a.paid && a.email && (
                      <Tooltip label="Emlékeztető küldése">
                        <ActionIcon
                          fz="sm" variant="subtle" color="orange"
                          onClick={() => confirmAction({
                            title: "Emlékeztető küldése",
                            message: <>Emlékeztetőt küldesz <strong>{a.child_name}</strong> szülőjének ({a.email})?</>,
                            confirm: "Küldés",
                            color: "orange",
                            onConfirm: () => sendReminder(a.id),
                            notification: { color: "orange", message: "Emlékeztető elküldve." },
                          })}
                        >
                          <IconBell size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <Tooltip label="Törlés">
                      <ActionIcon
                        fz="sm" variant="subtle" color="red"
                        onClick={() => confirmAction({
                          title: "Jelentkezés törlése",
                          message: <>Biztosan törlöd <strong>{a.child_name}</strong> jelentkezését? Ez a művelet nem vonható vissza.</>,
                          confirm: "Törlés",
                          color: "red",
                          onConfirm: () => deleteApplicant(a.id),
                        })}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Email napló">
                      <ActionIcon
                        fz="sm" variant="subtle" color="gray"
                        onClick={async () => {
                          const logs = await fetchEmailLog(a.id);
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
