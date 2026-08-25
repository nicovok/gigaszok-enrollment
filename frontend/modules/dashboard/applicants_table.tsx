import { useMemo, useState } from "react";
import { Paper, Table, Text, Badge, Button, Group, Tooltip, ActionIcon, Center, Loader, Modal, Stack, Anchor } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconMail, IconBell, IconTrash, IconHistory, IconForms } from "@tabler/icons-react";
import { useApplicantStore } from "@/stores/use_applicant_store";
import { apiFetch } from "@/lib/api";
import { useTermStore } from "@/stores/use_term_store";
import { formatDate } from "@/lib/utils";
import type { Applicant, EmailLog } from "@/types";

type FormField = { name: string; type: string; value: unknown };

function renderFieldValue(field: FormField): React.ReactNode {
  if (field.value == null) return <Text size="sm" c="dimmed">—</Text>;
  if (field.type === "signature") {
    const files = field.value as Array<{ file_url?: string; file_name?: string }>;
    return (
      <Stack gap={2}>
        {files.map((f, i) => (
          f.file_url
            ? <Anchor key={i} href={f.file_url} target="_blank" size="sm">{f.file_name ?? "Aláírás"}</Anchor>
            : <Text key={i} size="sm">{f.file_name ?? "Aláírás"}</Text>
        ))}
      </Stack>
    );
  }
  if (Array.isArray(field.value)) return <Text size="sm">{field.value.join(", ")}</Text>;
  return <Text size="sm">{String(field.value)}</Text>;
}

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
  const [formDataModal, setFormDataModal] = useState<{ applicant: Applicant; fields: FormField[] } | null>(null);

  async function openFormData(a: Applicant) {
    const termId = useTermStore.getState().selectedTermId;
    if (!termId) return;
    const full = await apiFetch<Applicant & { raw_json: string }>(`/api/terms/${termId}/applicants/${a.id}`);
    let fields: FormField[] = [];
    try {
      const formFields = full.raw_json ? JSON.parse(full.raw_json) : {};
      fields = Object.values(formFields) as FormField[];
    } catch { /* skip */ }
    setFormDataModal({ applicant: a, fields });
  }

  const filtered = useMemo(() =>
    applicants.filter(a => filter === "all" ? true : filter === "paid" ? a.paid === 1 : a.paid === 0),
    [applicants, filter]
  );

  if (loading) return <Center py="xl"><Loader /></Center>;

  return (
    <>
    <Modal
      opened={formDataModal !== null}
      onClose={() => setFormDataModal(null)}
      title={formDataModal ? `Jelentkezési adatok — ${formDataModal.applicant.child_name}` : ""}
      size="lg"
    >
      {formDataModal && (
        <Table>
          <Table.Tbody>
            {formDataModal.fields.map((field, i) => (
              <Table.Tr key={i}>
                <Table.Td w="40%" fw={500} fz="sm" style={{ verticalAlign: "top" }}>{field.name}</Table.Td>
                <Table.Td>{renderFieldValue(field)}</Table.Td>
              </Table.Tr>
            ))}
            {formDataModal.fields.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={2}>
                  <Text c="dimmed" fz="sm">Nincs form adat.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}
    </Modal>
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
                    <Tooltip label="Jelentkezési adatok">
                      <ActionIcon
                        fz="sm" variant="subtle" color="violet"
                        onClick={() => openFormData(a)}
                      >
                        <IconForms size={14} />
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
    </>
  );
}
