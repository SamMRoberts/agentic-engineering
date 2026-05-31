export function StatusPill({ status }: { status?: string }) {
  const s = (status || "unknown").toLowerCase();
  return <span className={`pill ${s}`}>{s}</span>;
}
