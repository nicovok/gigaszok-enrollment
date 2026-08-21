import { SimpleGrid, Paper, Text, Title } from "@mantine/core";

type Props = { total: number; paid: number; unpaid: number };

export function StatsBar({ total, paid, unpaid }: Props) {
  return (
    <SimpleGrid cols={3}>
      <Paper withBorder p="md" radius="md">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Összes jelentkező</Text>
        <Title order={2}>{total}</Title>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Befizetve</Text>
        <Title order={2} c="green">{paid}</Title>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Hiányzó befizetés</Text>
        <Title order={2} c="red">{unpaid}</Title>
      </Paper>
    </SimpleGrid>
  );
}
