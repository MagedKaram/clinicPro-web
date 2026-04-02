export function AdminStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-rec-card border border-rec-border rounded-2xl shadow-rec p-4">
      <div className="text-[0.85rem] font-semibold text-rec-muted">{label}</div>
      <div className="mt-2 text-2xl font-black text-rec-text">{value}</div>
      {hint ? (
        <div className="mt-1 text-[0.85rem] text-rec-muted">{hint}</div>
      ) : null}
    </div>
  );
}
