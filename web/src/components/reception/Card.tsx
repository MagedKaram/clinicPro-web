import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "bg-rec-card border border-rec-border rounded-2xl shadow-rec p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  icon,
  children,
  className,
}: {
  icon: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[1rem] font-bold text-rec-primary mb-4 pb-3 border-b-2 border-rec-bg flex items-center gap-2",
        className,
      )}
    >
      <div className="w-8 h-8 bg-rec-bg rounded-[9px] flex items-center justify-center">
        {icon}
      </div>
      {children}
    </div>
  );
}
