import { AppShell, Group, Title, Button, Select, Avatar, Text, UnstyledButton, Image } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import { useAuthStore } from "@/stores/use_auth_store";
import { useTermStore } from "@/stores/use_term_store";
import logo from "../../logo.png";

type Props = { onOpenTerms: () => void };

export function Header({ onOpenTerms }: Props) {
  const { user, logout } = useAuthStore();
  const { terms, selectedTermId, setSelectedTermId } = useTermStore();

  const termOptions = terms.map(t => ({ value: t.id, label: t.name }));
  const initials = user?.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "";

  return (
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between">
        <Group gap="sm">
          <Image src={logo} h={40} w={40} fit="contain" />
          <Title order={3}>Beiratkozás</Title>
          <Select
            data={termOptions}
            value={selectedTermId}
            onChange={setSelectedTermId}
            placeholder="Válassz turnust"
            w={160}
          />
          <Button leftSection={<IconEdit size={15} />} variant="subtle" color="gray" size="xs" onClick={onOpenTerms}>
            Turnusok
          </Button>
        </Group>
        <Group gap="sm">
          <UnstyledButton
            onClick={() => window.open("https://auth.nicoprt.xyz", "_blank")}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Avatar size="sm" radius="xl" color="blue" src={user?.picture ?? undefined}>{initials}</Avatar>
            <Text size="sm" fw={500} visibleFrom="sm">{user?.name}</Text>
          </UnstyledButton>
          <Button variant="subtle" color="gray" size="xs" onClick={logout}>Kilépés</Button>
        </Group>
      </Group>
    </AppShell.Header>
  );
}
