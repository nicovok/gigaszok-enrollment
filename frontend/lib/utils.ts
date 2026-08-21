export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("hu-HU", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
