import { useState, useRef } from "react";
import { Modal, Stack, Button, Group, Alert, Text, ScrollArea, Table, Badge } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconDatabaseImport, IconUpload } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api";
import { useApplicantStore } from "@/stores/use_applicant_store";
import { useTermStore } from "@/stores/use_term_store";
import type { FamilyRecord, RegistryExport } from "../../../../../registry/types";

type Props = { opened: boolean; onClose: () => void };

function isRegistryExport(v: unknown): v is RegistryExport {
  return (
    typeof v === "object" && v !== null &&
    (v as RegistryExport).schema_version === "1" &&
    Array.isArray((v as RegistryExport).families)
  );
}

export function RegistryImportModal({ opened, onClose }: Props) {
  const termId = useTermStore((s) => s.selectedTermId);
  const applicants = useApplicantStore((s) => s.applicants);
  const fetchApplicants = useApplicantStore((s) => s.fetchApplicants);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<0 | 1>(0);
  const [parsed, setParsed] = useState<RegistryExport | null>(null);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);

  const existingEmails = new Set(applicants.map((a) => a.email.toLowerCase()));

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError("");
    setParsed(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!isRegistryExport(json)) {
          setParseError("Érvénytelen formátum. Gigászok Registry JSON szükséges (schema_version: \"1\").");
          return;
        }
        setParsed(json);
      } catch {
        setParseError("Nem sikerült beolvasni a fájlt. Győzödj meg róla, hogy érvényes JSON.");
      }
    };
    reader.readAsText(file);
  }

  const toImport: FamilyRecord[] = parsed
    ? parsed.families.filter((f) => !existingEmails.has(f.parent_email.toLowerCase()))
    : [];
  const toSkip: FamilyRecord[] = parsed
    ? parsed.families.filter((f) => existingEmails.has(f.parent_email.toLowerCase()))
    : [];

  async function doImport() {
    if (!parsed || !termId) return;
    setImporting(true);
    try {
      const result = await apiFetch<{ imported: number; skipped: number }>(
        `/api/terms/${termId}/registry/import`,
        { method: "POST", body: JSON.stringify({ families: parsed.families }) },
      );
      notifications.show({ color: "green", message: `${result.imported} importálva, ${result.skipped} kihagyva.` });
      await fetchApplicants();
      onClose();
    } catch {
      notifications.show({ color: "red", message: "Import sikertelen." });
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setStep(0);
    setParsed(null);
    setParseError("");
    onClose();
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Adatimport" size="lg" centered>
      {step === 0 ? (
        <Stack gap="sm">
          <Stack gap={4}>
            <Text size="sm" fw={500}>Registry JSON fájl</Text>
            <Button
              variant="light"
              leftSection={<IconUpload size={14} />}
              onClick={() => fileRef.current?.click()}
            >
              {parsed ? `${parsed.families.length} familie betöltve` : "Fájl kiválasztása…"}
            </Button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFile} />
            {parseError && (
              <Alert color="red" icon={<IconAlertCircle size={14} />} py={6}>
                <Text size="xs">{parseError}</Text>
              </Alert>
            )}
            {parsed && (
              <Text size="xs" c="dimmed">
                Forrás: {parsed.source} · Exportálva: {new Date(parsed.exported_at).toLocaleString("hu-HU")}
              </Text>
            )}
          </Stack>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={handleClose}>Mégse</Button>
            <Button disabled={!parsed} onClick={() => setStep(1)}>Tovább →</Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="sm">
          <Alert color={toImport.length > 0 ? "blue" : "orange"} icon={<IconAlertCircle size={14} />} py={8}>
            <Text size="sm">
              <strong>{toImport.length}</strong> új szülő kerül importálásra,{" "}
              <strong>{toSkip.length}</strong> kihagyva (már létezik ebben a turnusban).
            </Text>
          </Alert>
          <ScrollArea h={260}>
            <Table striped fz="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Szülő neve</Table.Th>
                  <Table.Th>E-mail</Table.Th>
                  <Table.Th>Gyerekek</Table.Th>
                  <Table.Th>Státusz</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {parsed!.families.map((f, i) => {
                  const skip = existingEmails.has(f.parent_email.toLowerCase());
                  return (
                    <Table.Tr key={i} style={skip ? { opacity: 0.5 } : undefined}>
                      <Table.Td>{f.parent_name}</Table.Td>
                      <Table.Td c="dimmed">{f.parent_email}</Table.Td>
                      <Table.Td c="dimmed">{f.children.map((c) => c.name).join(", ") || "—"}</Table.Td>
                      <Table.Td>
                        {skip
                          ? <Badge color="gray" size="xs">Kihagyva</Badge>
                          : <Badge color="green" size="xs">Importálásra kész</Badge>
                        }
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={() => setStep(0)}>← Vissza</Button>
            <Button
              leftSection={<IconDatabaseImport size={15} />}
              loading={importing}
              disabled={toImport.length === 0}
              onClick={doImport}
            >
              Importálás ({toImport.length})
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
