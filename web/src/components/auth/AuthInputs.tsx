"use client";

import { cn } from "@/lib/utils";

export function InputLabel({ children }: { children: string }) {
  return (
    <label className="block text-[0.79rem] font-semibold text-rec-muted mb-1 uppercase tracking-[0.5px]">
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3.5 py-2.5 border-2 border-rec-border rounded-xl font-sans text-[0.93rem] text-rec-text bg-rec-bg transition-colors outline-none",
        "focus:border-rec-primary-light focus:bg-rec-card focus:ring-4 focus:ring-rec-primary/10",
        props.className,
      )}
    />
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={cn(
        "w-full mt-4 bg-rec-primary text-rec-card py-2.5 rounded-xl font-bold text-[0.95rem] transition-colors",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "hover:bg-rec-primary/90 active:bg-rec-primary/85",
        props.className,
      )}
    />
  );
}
