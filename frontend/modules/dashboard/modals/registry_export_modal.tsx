import { useState, useMemo } from "react";
import { Modal, Stack, SegmentedControl, Text, Button, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDatabaseExport } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api";
import { useApplicantStore } from "@/stores/use_applicant_store";
import { useTermStore } from "@/stores/use_term_store";
import type { RegistryExport } from "../../../../../registry/types";

type Props = { opened: boolean; onClose: () => void };

export function RegistryExportModal({ opened, onClose }: Props) {
  const termId = useTermStore((s) => s.selectedTermId);
  const applicants = useApplicantStore((s) => s.applicants);
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  const familyCount = useMemo(() => {
    const filtered = filter === "paid"
      ? applicants.filter((a) => a.paid === 1)
      : filter === "unpaid"
        ? applicants.filter((a) => a.paid === 0)
        : applicants;
    return new Set(filtered.map((a) => a.email.toLowerCase())).size;
  }, [applicants, filter]);

  async function doExport() {
    if (!termId) return;
    setExporting(true);
    try {
      const data = await apiFetch<RegistryExport>(`/api/terms/${termId}/registry/export`, {
        method: "POST",
        body: JSON.stringify({ filter }),
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gigaszok-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      notifications.show({ color: "red", message: "Export sikertelen." });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Adatexport" centered>
      <Stack gap="sm">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          fullWidth
          data={[
            { value: "all", label: "Összes" },
            { value: "paid", label: "Befizetve" },
            { value: "unpaid", label: "Nem fizetett" },
          ]}
        />
        <Text size="sm" c="dimmed" ta="center">
          {familyCount} szülő kerül exportálásra
        </Text>
        <Group justify="flex-end" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>Mégse</Button>
          <Button
            leftSection={<IconDatabaseExport size={15} />}
            loading={exporting}
            disabled={familyCount === 0}
            onClick={doExport}
          >
            Export JSON
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
