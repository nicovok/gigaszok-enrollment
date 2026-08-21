import { useState, useEffect } from "react";
import {
  AppShell, Stack, Alert, Group, Button, SegmentedControl,
  Paper, Code, CopyButton, Tooltip, ActionIcon, FileButton, Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconCopy, IconSend, IconUpload } from "@tabler/icons-react";
import { Header } from "./header";
import { StatsBar } from "./stats_bar";
import { ApplicantsTable } from "./applicants_table";
import { TermsModal } from "./modals/terms_modal";
import { WebhooksModal } from "./modals/webhooks_modal";
import { EmailTemplatesModal } from "./modals/email_templates_modal";
import { BroadcastModal } from "./modals/broadcast_modal";
import { ReminderModal } from "./modals/reminder_modal";
import { EmailLogModal } from "./modals/email_log_modal";
import { useTermStore } from "@/stores/use_term_store";
import { useApplicantStore } from "@/stores/use_applicant_store";
import type { Applicant, EmailLog } from "@/types";

type ModalState =
  | { type: "none" }
  | { type: "terms" }
  | { type: "broadcast" }
  | { type: "remind" }
  | { type: "emailLog"; applicant: Applicant; logs: EmailLog[] };

export default function Dashboard() {
  const { terms, selectedTermId, fetchTerms } = useTermStore();
  const { applicants, filter, csvLoading, csvResult, setFilter, fetchApplicants, uploadCSV } = useApplicantStore();

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const closeModal = () => setModal({ type: "none" });

  useEffect(() => { fetchTerms(); }, []);
  useEffect(() => {
    if (selectedTermId) fetchApplicants(selectedTermId);
  }, [selectedTermId]);

  const paidCount = applicants.filter(a => a.paid === 1).length;
  const unpaidCount = applicants.length - paidCount;
  const selectedTerm = terms.find(t => t.id === selectedTermId);
  const webhookUrl = selectedTerm ? `${window.location.origin}/webhooks/${selectedTerm.slug}` : null;

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <Header onOpenTerms={() => setModal({ type: "terms" })} />

      <AppShell.Main maw={1100} mx="auto">
        <Stack gap="md">
          {terms.length === 0 && (
            <Alert color="blue" title="Nincs turnus" icon={<IconAlertCircle size={16} />}>
              Hozz létre egy turnust a kezdéshez.{" "}
              <Button variant="subtle" size="xs" onClick={() => setModal({ type: "terms" })}>
                Turnus létrehozása
              </Button>
            </Alert>
          )}

          {selectedTermId && (
            <StatsBar total={applicants.length} paid={paidCount} unpaid={unpaidCount} />
          )}

          {webhookUrl && (
            <Paper withBorder p="sm" radius="md">
              <Group gap="xs">
                <Text size="sm" fw={500}>Webhook URL:</Text>
                <Code>{webhookUrl}</Code>
                <CopyButton value={webhookUrl}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Másolva!" : "Másolás"}>
                      <ActionIcon variant="subtle" size="sm" onClick={copy}>
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Paper>
          )}

          {selectedTermId && (
            <Group justify="space-between">
              <SegmentedControl
                value={filter}
                onChange={v => setFilter(v as typeof filter)}
                data={[
                  { label: "Összes", value: "all" },
                  { label: "Befizetve", value: "paid" },
                  { label: "Nem fizetett", value: "unpaid" },
                ]}
              />
              <Group gap="xs">
                <FileButton onChange={file => file && uploadCSV(file, selectedTermId)} accept=".csv">
                  {props => (
                    <Button {...props} variant="light" leftSection={<IconUpload size={15} />} loading={csvLoading}>
                      CSV feltöltés
                    </Button>
                  )}
                </FileButton>
                {csvResult && (
                  <Text size="sm" c="dimmed">
                    {csvResult.updated} frissítve, {csvResult.already_paid} már fizette
                  </Text>
                )}
                <Button
                  variant="light"
                  color="orange"
                  disabled={unpaidCount === 0}
                  onClick={() => setModal({ type: "remind" })}
                >
                  Emlékeztető ({unpaidCount})
                </Button>
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<IconSend size={15} />}
                  onClick={() => setModal({ type: "broadcast" })}
                >
                  Egyedi email
                </Button>
              </Group>
            </Group>
          )}

          {selectedTermId && (
            <ApplicantsTable
              onEmailLog={(a, logs) => setModal({ type: "emailLog", applicant: a, logs })}
            />
          )}
        </Stack>
      </AppShell.Main>

      <TermsModal opened={modal.type === "terms"} onClose={closeModal} />
      <WebhooksModal />
      <EmailTemplatesModal />
      <BroadcastModal opened={modal.type === "broadcast"} onClose={closeModal} />
      <ReminderModal opened={modal.type === "remind"} unpaidCount={unpaidCount} onClose={closeModal} />
      <EmailLogModal
        applicant={modal.type === "emailLog" ? modal.applicant : null}
        logs={modal.type === "emailLog" ? modal.logs : []}
        onClose={closeModal}
      />
    </AppShell>
  );
}
