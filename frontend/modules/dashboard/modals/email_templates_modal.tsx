import {
  Modal, Tabs, Center, Loader, Stack, Paper, Text, Badge,
  FileButton, Button, TextInput, Textarea, Group, Code,
} from "@mantine/core";
import { IconMail, IconBell, IconCheck, IconUpload } from "@tabler/icons-react";
import { useEmailTemplateStore } from "@/stores/use_email_template_store";
import { useTermStore } from "@/stores/use_term_store";
import type { TemplateType } from "@/types";

const TEMPLATE_TABS: Array<{ value: TemplateType; label: string; icon: React.ReactNode }> = [
  { value: "registration", label: "Visszaigazolás", icon: <IconMail size={14} /> },
  { value: "reminder", label: "Emlékeztető", icon: <IconBell size={14} /> },
  { value: "payment_confirmation", label: "Befizetés", icon: <IconCheck size={14} /> },
];

export function EmailTemplatesModal() {
  const { open, termId, loading, data, saving, saveStatus, bannerKey, closeModal, updateTpl, save, reset, uploadBanner, deleteBanner } = useEmailTemplateStore();
  const { terms } = useTermStore();
  const termName = terms.find(t => t.id === termId)?.name ?? "";

  return (
    <Modal opened={open} onClose={closeModal} title={`Email sablonok – ${termName}`} size="xl">
      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : data && (
        <Tabs defaultValue="registration">
          <Tabs.List>
            {TEMPLATE_TABS.map(({ value, label, icon }) => (
              <Tabs.Tab key={value} value={value} leftSection={icon}>{label}</Tabs.Tab>
            ))}
          </Tabs.List>

          {TEMPLATE_TABS.map(({ value: type }) => {
            const tpl = data[type];
            if (!tpl) return null;
            const hasBox = type !== "payment_confirmation";
            return (
              <Tabs.Panel key={type} value={type} pt="md">
                <Stack gap="md">
                  <Paper withBorder p="sm" radius="md">
                    <Stack gap="xs">
                      <Text fw={500} size="sm">Borítókép</Text>
                      {tpl.has_banner ? (
                        <Group align="flex-start">
                          <img
                            key={bannerKey[type] ?? 0}
                            src={`/api/terms/${termId}/email-templates/${type}/banner`}
                            style={{ maxHeight: 80, borderRadius: 4, display: "block" }}
                          />
                          <Button size="xs" color="red" variant="subtle" onClick={() => deleteBanner(type)}>
                            Törlés
                          </Button>
                        </Group>
                      ) : (
                        <Badge color="gray" variant="light">Nincs – a logo jelenik meg</Badge>
                      )}
                      <FileButton onChange={file => file && uploadBanner(type, file)} accept="image/*">
                        {props => (
                          <Button {...props} variant="light" size="xs" leftSection={<IconUpload size={14} />} w="fit-content">
                            {tpl.has_banner ? "Csere" : "Kép feltöltése"}
                          </Button>
                        )}
                      </FileButton>
                    </Stack>
                  </Paper>

                  <TextInput
                    label="Tárgy"
                    value={tpl.subject}
                    onChange={e => updateTpl(type, { subject: e.currentTarget.value })}
                  />

                  <Textarea
                    label="Szöveg"
                    value={tpl.body}
                    onChange={e => updateTpl(type, { body: e.currentTarget.value })}
                    minRows={6}
                    autosize
                  />

                  <Text size="xs" c="dimmed">
                    Változók: <Code>{"{child_name}"}</Code> – résztvevő neve, <Code>{"{parent_name}"}</Code> – szülő neve
                    {hasBox && <>, <Code>{"{bank_adatok}"}</Code> – banki adatok box (számlaszám, közlemény)</>}
                  </Text>

                  <Group justify="space-between">
                    {tpl.is_custom && (
                      <Button size="xs" variant="subtle" color="gray" onClick={() => reset(type)}>
                        Szöveg visszaállítása
                      </Button>
                    )}
                    <Group gap="xs" ml="auto">
                      {saveStatus[type] === "ok" && <Text size="sm" c="green" fw={500}>Mentve!</Text>}
                      {saveStatus[type] === "err" && <Text size="sm" c="red" fw={500}>Mentési hiba!</Text>}
                      <Button size="sm" loading={saving === type} onClick={() => save(type)}>Mentés</Button>
                    </Group>
                  </Group>
                </Stack>
              </Tabs.Panel>
            );
          })}
        </Tabs>
      )}
    </Modal>
  );
}
