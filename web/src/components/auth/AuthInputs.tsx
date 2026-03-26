"use client";

import { useState } from "react";
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

/** Password input with a show/hide toggle eye button */
export function PasswordInput(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(
          "w-full px-3.5 py-2.5 pe-11 border-2 border-rec-border rounded-xl font-sans text-[0.93rem] text-rec-text bg-rec-bg transition-colors outline-none",
          "focus:border-rec-primary-light focus:bg-rec-card focus:ring-4 focus:ring-rec-primary/10",
          props.className,
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 end-0 flex items-center px-3 text-rec-muted hover:text-rec-primary transition-colors"
      >
        {visible ? (
          // Eye-off icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // Eye icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
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
