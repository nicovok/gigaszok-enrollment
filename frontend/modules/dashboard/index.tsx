import { useState, useEffect } from "react";
import {
  AppShell, Stack, Alert, Group, Button, SegmentedControl,
  Paper, Code, CopyButton, Tooltip, ActionIcon, FileButton, Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconCopy, IconSend, IconUpload } from "@tabler/icons-react";
import { Header } from "./Header";
import { StatsBar } from "./StatsBar";
import { ApplicantsTable } from "./ApplicantsTable";
import { TermsModal } from "./modals/TermsModal";
import { WebhooksModal } from "./modals/WebhooksModal";
import { EmailTemplatesModal } from "./modals/EmailTemplatesModal";
import { BroadcastModal } from "./modals/BroadcastModal";
import { ReminderModal } from "./modals/ReminderModal";
import { ConfirmPaidModal, ConfirmRemindModal, ConfirmRegEmailModal, DeleteApplicantModal } from "./modals/ConfirmModals";
import { EmailLogModal } from "./modals/EmailLogModal";
import { useTermStore } from "../../stores/useTermStore";
import { useApplicantStore } from "../../stores/useApplicantStore";
import type { Applicant, EmailLog } from "../../types";

export default function Dashboard() {
  const { terms, selectedTermId, fetchTerms } = useTermStore();
  const { applicants, filter, csvLoading, csvResult, setFilter, fetchApplicants, uploadCSV } = useApplicantStore();

  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [remindModalOpen, setRemindModalOpen] = useState(false);
  const [confirmApplicant, setConfirmApplicant] = useState<Applicant | null>(null);
  const [confirmRemindApplicant, setConfirmRemindApplicant] = useState<Applicant | null>(null);
  const [deleteApplicant, setDeleteApplicant] = useState<Applicant | null>(null);
  const [confirmRegEmailApplicant, setConfirmRegEmailApplicant] = useState<Applicant | null>(null);
  const [logApplicant, setLogApplicant] = useState<Applicant | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

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
      <Header onOpenTerms={() => setTermsModalOpen(true)} />

      <AppShell.Main maw={1100} mx="auto">
        <Stack gap="md">
          {terms.length === 0 && (
            <Alert color="blue" title="Nincs turnus" icon={<IconAlertCircle size={16} />}>
              Hozz létre egy turnust a kezdéshez.{" "}
              <Button variant="subtle" size="xs" onClick={() => setTermsModalOpen(true)}>
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
                  onClick={() => setRemindModalOpen(true)}
                >
                  Emlékeztető ({unpaidCount})
                </Button>
                <Button
                  variant="light"
                  color="blue"
                  leftSection={<IconSend size={15} />}
                  onClick={() => setBroadcastOpen(true)}
                >
                  Egyedi email
                </Button>
              </Group>
            </Group>
          )}

          {selectedTermId && (
            <ApplicantsTable
              onConfirmPaid={setConfirmApplicant}
              onConfirmRemind={setConfirmRemindApplicant}
              onConfirmRegEmail={setConfirmRegEmailApplicant}
              onDelete={setDeleteApplicant}
              onEmailLog={(a, logs) => { setLogApplicant(a); setEmailLogs(logs); }}
            />
          )}
        </Stack>
      </AppShell.Main>

      <TermsModal opened={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
      <WebhooksModal />
      <EmailTemplatesModal />
      <BroadcastModal opened={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
      <ReminderModal opened={remindModalOpen} unpaidCount={unpaidCount} onClose={() => setRemindModalOpen(false)} />
      <ConfirmPaidModal applicant={confirmApplicant} onClose={() => setConfirmApplicant(null)} />
      <ConfirmRemindModal applicant={confirmRemindApplicant} onClose={() => setConfirmRemindApplicant(null)} />
      <ConfirmRegEmailModal applicant={confirmRegEmailApplicant} onClose={() => setConfirmRegEmailApplicant(null)} />
      <DeleteApplicantModal applicant={deleteApplicant} onClose={() => setDeleteApplicant(null)} />
      <EmailLogModal applicant={logApplicant} logs={emailLogs} onClose={() => setLogApplicant(null)} />
    </AppShell>
  );
}
