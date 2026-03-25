"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Patient, VisitType } from "@/types/clinic";
import { Card, CardTitle } from "@/components/reception/Card";
import { TicketArea } from "@/components/reception/TicketArea";
import { VisitTypeToggle } from "@/components/reception/VisitTypeToggle";
import { useTranslations } from "next-intl";

type RegisterPayload = {
  patientId?: string;
  name: string;
  phone?: string;
  address?: string;
  visitType: VisitType;
};

export type RegistrationCardProps = {
  patients: Patient[];
  busy?: boolean;
  onRegister: (payload: RegisterPayload) => Promise<{
    ticket: number;
    time: string;
    waitingAhead: number;
  }>;
};

function InputLabel({ children }: { children: string }) {
  return (
    <label className="block text-[0.79rem] font-semibold text-rec-muted mb-1 uppercase tracking-[0.5px]">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
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

export function RegistrationCard({
  onRegister,
  patients,
  busy,
}: RegistrationCardProps) {
  const t = useTranslations("reception");
  const blurTimeoutRef = useRef<number | null>(null);

  const [visitType, setVisitType] = useState<VisitType>("new");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [ticketVisible, setTicketVisible] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [ticketName, setTicketName] = useState("");
  const [ticketType, setTicketType] = useState<VisitType>("new");
  const [ticketTime, setTicketTime] = useState("");
  const [ticketWaitingAhead, setTicketWaitingAhead] = useState(0);

  const results = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return [];
    const qLower = q.toLowerCase();
    return patients
      .filter((p) => {
        const phoneText = p.phone ?? "";
        return (
          p.name.toLowerCase().includes(qLower) ||
          phoneText.toLowerCase().includes(qLower)
        );
      })
      .slice(0, 8);
  }, [patients, searchQuery]);

  function scheduleHideSearch() {
    if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = window.setTimeout(
      () => setIsSearchOpen(false),
      200,
    );
  }

  function showSearch() {
    if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    setIsSearchOpen(true);
  }

  function selectPatient(p: Patient) {
    setSelectedPatient(p);
    setName(p.name);
    setPhone(p.phone ?? "");
    setAddress(p.address ?? "");
    setIsSearchOpen(false);
  }

  function clearPatient() {
    setSelectedPatient(null);
    setName("");
    setPhone("");
    setAddress("");
  }

  async function handleRegister() {
    if (busy) return;
    const finalName = name.trim();
    if (!finalName) {
      window.alert(t("alerts.missingName"));
      return;
    }

    try {
      const { ticket, time, waitingAhead } = await onRegister({
        patientId: selectedPatient?.id,
        name: finalName,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        visitType,
      });

      setTicketVisible(true);
      setTicketNumber(ticket);
      setTicketName(finalName);
      setTicketType(visitType);
      setTicketTime(time);
      setTicketWaitingAhead(waitingAhead);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      window.alert(message);
    }
  }

  return (
    <Card className="flex-1">
      <CardTitle icon="📋">{t("register.title")}</CardTitle>

      <div className="mb-4">
        <InputLabel>{t("register.search.label")}</InputLabel>

        <div className="relative">
          <TextInput
            type="text"
            placeholder={t("register.search.placeholder")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={showSearch}
            onBlur={scheduleHideSearch}
            autoComplete="off"
          />

          <div
            className={cn(
              "absolute top-full left-0 right-0 mt-1 bg-rec-card border-2 border-rec-border rounded-xl shadow-rec z-50 max-h-56 overflow-y-auto",
              isSearchOpen && results.length ? "block" : "hidden",
            )}
          >
            {results.map((p) => (
              <button
                type="button"
                key={p.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPatient(p)}
                className="w-full text-right px-3.5 py-2.5 border-b border-rec-border last:border-b-0 hover:bg-rec-soft-primary transition-colors flex items-center gap-2"
              >
                <div className="font-bold text-[0.9rem]">{p.name}</div>
                <div className="text-[0.76rem] text-rec-muted">
                  {p.phone ?? ""}
                </div>
                <span className="mr-auto text-[0.7rem] px-2 py-0.5 rounded-full bg-rec-soft-primary text-rec-primary font-bold">
                  {t("register.search.badge")}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-[0.76rem] text-rec-muted mt-1">
          {t("register.search.hint")}
        </div>
      </div>

      <div
        className={cn(
          "bg-linear-to-br from-rec-soft-primary to-rec-soft-primary-2 border-2 border-rec-primary-light rounded-xl p-4 mb-4",
          selectedPatient ? "flex items-center gap-3" : "hidden",
        )}
      >
        <div className="w-10 h-10 rounded-full bg-rec-primary text-rec-card flex items-center justify-center text-[1.1rem] font-black shrink-0">
          {selectedPatient?.name?.trim().at(0) ?? "?"}
        </div>
        <div className="flex-1">
          <div className="font-bold text-[0.95rem]">
            {selectedPatient?.name ?? "—"}
          </div>
          <div className="text-[0.78rem] text-rec-muted">
            {(selectedPatient?.phone ?? "").trim() || "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={clearPatient}
          className="mr-auto bg-transparent border border-rec-primary/30 rounded-lg px-2.5 py-1 text-[0.76rem] text-rec-primary cursor-pointer"
        >
          {t("register.selected.cancel")}
        </button>
      </div>

      {!selectedPatient && (
        <div>
          <div className="mb-4">
            <InputLabel>{t("register.fields.fullName")}</InputLabel>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("register.fields.fullNamePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="mb-4">
              <InputLabel>{t("register.fields.phone")}</InputLabel>
              <TextInput
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("register.fields.phonePlaceholder")}
              />
            </div>
            <div className="mb-4">
              <InputLabel>{t("register.fields.address")}</InputLabel>
              <TextInput
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("register.fields.addressPlaceholder")}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <InputLabel>{t("register.visitType.label")}</InputLabel>
        <VisitTypeToggle value={visitType} onChange={setVisitType} />
      </div>

      <button
        type="button"
        onClick={handleRegister}
        disabled={Boolean(busy)}
        className="w-full py-3 rounded-xl bg-rec-primary text-rec-card font-bold text-[0.93rem] cursor-pointer transition-colors hover:bg-rec-primary-light"
      >
        {t("register.submit")}
      </button>

      <TicketArea
        visible={ticketVisible}
        ticketNumber={ticketNumber}
        patientName={ticketName}
        visitType={ticketType}
        timeText={ticketTime}
        waitingAhead={ticketWaitingAhead}
        onPrint={() => window.print()}
      />
    </Card>
  );
}
