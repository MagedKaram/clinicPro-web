function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function dayLabel(locale: string, dayISO: string): string {
  const d = new Date(`${dayISO}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function AdminLineChart({
  locale,
  data,
}: {
  locale: string;
  data: Array<{ day: string; value: number }>;
}) {
  const W = 300;
  const H = 60;
  const max =
    data.reduce((m, d) => Math.max(m, Number(d.value ?? 0)), 0) || 1;

  const pts = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * W;
      const y = H - (Math.max(0, Number(d.value ?? 0)) / max) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-20"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {data.length > 1 && (
          <polyline
            fill="none"
            stroke="currentColor"
            className="text-rec-primary"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pts}
          />
        )}
      </svg>
      {first && last ? (
        <div className="flex justify-between text-[0.72rem] text-rec-muted">
          <span>{dayLabel(locale, first.day)}</span>
          <span>{dayLabel(locale, last.day)}</span>
        </div>
      ) : null}
    </div>
  );
}

export function AdminBarChart({
  locale,
  data,
  rawLabels,
}: {
  locale: string;
  data: Array<{ day: string; value: number }>;
  rawLabels?: boolean;
}) {
  const values = data.map((d) => Number(d.value ?? 0));
  const max = values.reduce((m, v) => (v > m ? v : m), 0) || 1;

  return (
    <div className="mt-4">
      <div className="flex h-28 items-end gap-2">
        {data.map((d) => {
          const raw = Number(d.value ?? 0);
          const pct = clamp((raw / max) * 100, 0, 100);
          const label = rawLabels ? d.day : dayLabel(locale, d.day);
          return (
            <div key={d.day} className="flex flex-1 flex-col gap-2">
              <div
                className="w-full rounded-lg bg-rec-primary/80"
                style={{ height: `${pct}%` }}
                aria-label={`${d.day}: ${raw}`}
              />
              <div className="text-[0.72rem] text-rec-muted text-center truncate">
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminDonutChart({
  items,
  ariaLabel,
}: {
  items: Array<{ label: string; value: number; className: string }>;
  ariaLabel?: string;
}) {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0) || 1;
  const segments = items.reduce<{
    acc: number;
    segments: Array<{
      key: string;
      className: string;
      dash: string;
      offset: number;
    }>;
  }>(
    (state, item) => {
      const value = Math.max(0, item.value);
      const pct = (value / total) * 100;
      const dash = `${pct} ${100 - pct}`;
      const offset = 25 - (state.acc / total) * 100;

      return {
        acc: state.acc + value,
        segments: [
          ...state.segments,
          {
            key: item.label,
            className: item.className,
            dash,
            offset,
          },
        ],
      };
    },
    { acc: 0, segments: [] },
  ).segments;

  return (
    <div className="mt-4 flex items-center gap-4">
      <svg
        viewBox="0 0 42 42"
        className="h-28 w-28 shrink-0"
        role="img"
        aria-label={ariaLabel ?? ""}
      >
        <circle
          cx="21"
          cy="21"
          r="15.915"
          fill="transparent"
          stroke="currentColor"
          className="text-rec-border"
          strokeWidth="6"
        />
        {segments.map((seg) => (
          <circle
            key={seg.key}
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            stroke="currentColor"
            className={seg.className}
            strokeWidth="6"
            strokeDasharray={seg.dash}
            strokeDashoffset={seg.offset}
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${item.className.replace(
                "text-",
                "bg-",
              )}`}
            />
            <div className="text-[0.9rem] text-rec-text">
              {item.label}
              <span className="text-rec-muted"> · </span>
              <span className="font-bold">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
