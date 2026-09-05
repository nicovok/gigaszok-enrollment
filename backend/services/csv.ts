export function parseCSV(text: string): string[][] {
  const firstLine = text.split("\n")[0] ?? "";
  const sep = (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length ? ";" : ",";

  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => splitLine(line, sep));
}

export function splitLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      cells.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim().replace(/^"|"$/g, ""));
  return cells;
}

export function isAmount5000(cell: string): boolean {
  // handles "5000", "5 000", "5000.00", "5 000,00", "5000,00"
  const normalized = cell.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  return parseFloat(normalized) === 5000;
}
