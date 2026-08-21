import { Modal, Stack, Text, Group, Button } from "@mantine/core";
import { apiFetch } from "@/lib/api";
import { useApplicantStore } from "@/stores/use_applicant_store";
import { useTermStore } from "@/stores/use_term_store";
import type { Applicant } from "@/types";

type ApplicantModalProps = { applicant: Applicant | null; onClose: () => void };

export function ConfirmPaidModal({ applicant, onClose }: ApplicantModalProps) {
  const { togglePaid } = useApplicantStore();
  const { selectedTermId } = useTermStore();

  return (
    <Modal
      opened={!!applicant}
      onClose={onClose}
      title={applicant?.paid ? "Befizetés visszavonása" : "Befizetés manuális rögzítése"}
      size="sm"
    >
      {applicant && (
        <Stack gap="md">
          <Text size="sm">
            {applicant.paid
              ? <>Biztosan visszavonod <strong>{applicant.child_name}</strong> befizetett státuszát?</>
              : <>Biztosan befizetettre állítod <strong>{applicant.child_name}</strong> státuszát?</>
            }
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={onClose}>Mégse</Button>
            <Button
              color={applicant.paid ? "red" : "green"}
              onClick={async () => { await togglePaid(applicant, selectedTermId!); onClose(); }}
            >
              {applicant.paid ? "Visszavon" : "Igen, befizetve"}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export function ConfirmRemindModal({ applicant, onClose }: ApplicantModalProps) {
  const { selectedTermId } = useTermStore();

  return (
    <Modal opened={!!applicant} onClose={onClose} title="Emlékeztető küldése" size="sm">
      {applicant && (
        <Stack gap="md">
          <Text size="sm">
            Emlékeztetőt küldesz <strong>{applicant.child_name}</strong> szülőjének ({applicant.email})?
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={onClose}>Mégse</Button>
            <Button
              color="orange"
              onClick={async () => {
                await apiFetch(`/api/terms/${selectedTermId}/applicants/${applicant.id}/remind`, { method: "POST" });
                onClose();
              }}
            >
              Küldés
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export function ConfirmRegEmailModal({ applicant, onClose }: ApplicantModalProps) {
  const { selectedTermId } = useTermStore();

  return (
    <Modal opened={!!applicant} onClose={onClose} title="Beiratkozás visszaigazolás küldése" size="sm">
      {applicant && (
        <Stack gap="md">
          <Text size="sm">
            Beiratkozás visszaigazoló emailt küldesz <strong>{applicant.child_name}</strong> szülőjének ({applicant.email})?
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={onClose}>Mégse</Button>
            <Button
              color="blue"
              onClick={async () => {
                await apiFetch(`/api/terms/${selectedTermId}/applicants/${applicant.id}/registration-email`, { method: "POST" });
                onClose();
              }}
            >
              Küldés
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

export function DeleteApplicantModal({ applicant, onClose }: ApplicantModalProps) {
  const { deleteApplicant } = useApplicantStore();
  const { selectedTermId } = useTermStore();

  return (
    <Modal opened={!!applicant} onClose={onClose} title="Jelentkezés törlése" size="sm">
      {applicant && (
        <Stack gap="md">
          <Text size="sm">
            Biztosan törlöd <strong>{applicant.child_name}</strong> jelentkezését? Ez a művelet nem vonható vissza.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={onClose}>Mégse</Button>
            <Button
              color="red"
              onClick={async () => { await deleteApplicant(applicant.id, selectedTermId!); onClose(); }}
            >
              Törlés
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
