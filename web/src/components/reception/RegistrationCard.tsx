"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Patient, PatientBillingSummary, VisitType } from "@/types/clinic";
import { Card, CardTitle } from "@/components/reception/Card";
import { TicketArea } from "@/components/reception/TicketArea";
import { VisitTypeToggle } from "@/components/reception/VisitTypeToggle";
import { useTranslations } from "next-intl";
import { getPatientBillingSummaryAction } from "@/lib/actions/clinic";

type RegisterPayload = {
  patientId?: string;
  name: string;
  phone?: string;
  nationalId?: string;
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

  const [submitting, setSubmitting] = useState(false);

  const [visitType, setVisitType] = useState<VisitType>("new");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [address, setAddress] = useState("");

  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summary, setSummary] = useState<PatientBillingSummary | null>(null);

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

  const phoneMatch = useMemo(() => {
    if (selectedPatient) return null;

    const normalize = (s: string) => s.replace(/\D/g, "").trim();
    const q = normalize(phone);
    if (q.length < 6) return null;

    return (
      patients.find((p) => {
        const pPhone = typeof p.phone === "string" ? normalize(p.phone) : "";
        return pPhone.length > 0 && pPhone === q;
      }) ?? null
    );
  }, [patients, phone, selectedPatient]);

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
    setNationalId("");
    setAddress("");
    setSummary(null);
  }

  useEffect(() => {
    if (!selectedPatient?.id) {
      setSummary(null);
      return;
    }

    let cancelled = false;
    setSummaryBusy(true);
    (async () => {
      try {
        const next = await getPatientBillingSummaryAction(selectedPatient.id);
        if (cancelled) return;
        setSummary(next);
      } catch {
        if (cancelled) return;
        setSummary(null);
      } finally {
        if (!cancelled) setSummaryBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPatient?.id]);

  async function handleRegister() {
    if (busy || submitting) return;
    const finalName = name.trim();
    if (!finalName) {
      window.alert(t("alerts.missingName"));
      return;
    }

    setSubmitting(true);

    try {
      const { ticket, time, waitingAhead } = await onRegister({
        patientId: selectedPatient?.id,
        name: finalName,
        phone: phone.trim() || undefined,
        nationalId: nationalId.trim() || undefined,
        address: address.trim() || undefined,
        visitType,
      });

      setTicketVisible(true);
      setTicketNumber(ticket);
      setTicketName(finalName);
      setTicketType(visitType);
      setTicketTime(time);
      setTicketWaitingAhead(waitingAhead);

      // Reset inputs for the next patient.
      setSearchQuery("");
      setIsSearchOpen(false);
      clearPatient();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      window.alert(message);
    } finally {
      setSubmitting(false);
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
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[0.95rem]">
            {selectedPatient?.name ?? "—"}
          </div>
          <div className="text-[0.78rem] text-rec-muted">
            {(selectedPatient?.phone ?? "").trim() || "—"}
          </div>

          {selectedPatient ? (
            <div className="mt-2">
              {!summary && summaryBusy ? (
                <div className="text-[0.78rem] text-rec-muted">
                  {t("register.summary.loading")}
                </div>
              ) : summary ? (
                <div className="bg-warning-soft border border-warning/30 rounded-xl px-3 py-2">
                  <div className="text-[0.8rem] font-bold text-warning-ink-strong">
                    {t("register.summary.remainingTitle", {
                      amount: summary.remaining,
                      currency: t("balanceBar.currency"),
                    })}
                  </div>
                  <div className="mt-1 text-[0.78rem] text-warning-ink flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      {t("register.summary.total", {
                        amount: summary.charged,
                        currency: t("balanceBar.currency"),
                      })}
                    </span>
                    <span>
                      {t("register.summary.paid", {
                        amount: summary.paid,
                        currency: t("balanceBar.currency"),
                      })}
                    </span>
                    <span>
                      {t("register.summary.visits", {
                        count: summary.visitsCount,
                      })}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
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

              {phoneMatch ? (
                <div className="mt-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-[0.8rem] text-warning-ink flex items-center gap-2">
                  <div className="shrink-0">⚠️</div>
                  <div className="flex-1 min-w-0">
                    {t("register.phoneExists", { name: phoneMatch.name })}
                  </div>
                  <button
                    type="button"
                    onClick={() => selectPatient(phoneMatch)}
                    disabled={Boolean(busy) || submitting}
                    className="shrink-0 px-3 py-1 rounded-lg bg-rec-primary text-rec-card text-[0.78rem] font-bold cursor-pointer"
                  >
                    {t("register.useFile")}
                  </button>
                </div>
              ) : null}
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

          <div className="mb-4">
            <InputLabel>{t("register.fields.nationalId")}</InputLabel>
            <TextInput
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder={t("register.fields.nationalIdPlaceholder")}
              maxLength={14}
            />
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
        disabled={Boolean(busy) || submitting}
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
