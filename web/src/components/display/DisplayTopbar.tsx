"use client";

type DisplayTopbarProps = {
  clinicTitle: string;
  timeText: string;
  dateText: string;
};

export function DisplayTopbar({
  clinicTitle,
  timeText,
  dateText,
}: DisplayTopbarProps) {
  return (
    <div className="relative z-10 flex items-center justify-between px-11 py-4 bg-dis-topbar border-b border-dis-border backdrop-blur">
      <div className="flex items-center gap-3 text-[1.3rem] font-bold text-dis-text/90">
        <span className="w-2.5 h-2.5 rounded-full bg-dis-accent shadow-[0_0_10px_var(--dis-accent)] dis-pulse-dot" />
        <span>{clinicTitle}</span>
      </div>

      <div
        className="text-[1.7rem] font-black text-dis-accent tracking-[2px] tabular-nums"
        suppressHydrationWarning
      >
        {timeText}
      </div>

      <div
        className="text-[0.85rem] text-dis-muted text-start"
        suppressHydrationWarning
      >
        {dateText}
      </div>
    </div>
  );
}
