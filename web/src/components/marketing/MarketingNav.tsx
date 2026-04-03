"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

function LangToggle({ locale, t, className = "" }: {
  locale: string;
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  const pathname = usePathname();
  const otherLocale = locale === "ar" ? "en" : "ar";
  // Replace /ar/... or /en/... with the other locale
  const switchHref = `/${otherLocale}${pathname.slice(locale.length + 1)}`;

  return (
    <Link
      href={switchHref}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-doc-border text-doc-muted hover:text-doc-text hover:border-doc-accent/50 transition-colors text-sm font-medium ${className}`}
      aria-label={locale === "ar" ? t("langEn") : t("langAr")}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span>{locale === "ar" ? t("langEn") : t("langAr")}</span>
    </Link>
  );
}

export default function MarketingNav() {
  const t = useTranslations("nav");
  const locale = useLocale();

  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setAtTop(y < 20);
      if (y > lastY.current && y > 80) setVisible(false);
      else setVisible(true);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const href = (path: string) => `/${locale}${path}`;
  const navLinks = [
    { label: t("features"), href: href("/features") },
    { label: t("pricing"), href: href("/pricing") },
    { label: t("about"), href: href("/about") },
  ];

  return (
    <motion.header
      animate={{ y: visible ? 0 : -80 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        atTop
          ? "bg-transparent"
          : "bg-doc-bg/85 backdrop-blur-md border-b border-doc-border"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href={href("/landing")}
          className="text-doc-text font-bold text-lg tracking-tight shrink-0 hover:text-doc-accent transition-colors"
        >
          {t("logo")}
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-doc-muted hover:text-doc-text transition-colors font-medium"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs + lang switcher */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <LangToggle locale={locale} t={t} />
          <Link
            href={href("/login")}
            className="text-sm font-medium text-doc-muted hover:text-doc-text transition-colors px-3 py-1.5"
          >
            {t("login")}
          </Link>
          <Link
            href={href("/signup")}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-doc-accent text-doc-bg hover:opacity-90 transition-opacity"
          >
            {t("signup")}
          </Link>
        </div>

        {/* Mobile hamburger / close */}
        <button
          className="md:hidden p-2 text-doc-muted hover:text-doc-text transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? t("close") : t("logo")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="3" y1="6" x2="17" y2="6" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="14" x2="17" y2="14" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-doc-card border-t border-doc-border px-6 py-4 flex flex-col gap-4"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-doc-muted hover:text-doc-text transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-doc-border" />
            <Link
              href={href("/login")}
              onClick={() => setMenuOpen(false)}
              className="text-doc-muted hover:text-doc-text transition-colors font-medium"
            >
              {t("login")}
            </Link>
            <Link
              href={href("/signup")}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-doc-accent text-doc-bg text-center hover:opacity-90 transition-opacity"
            >
              {t("signup")}
            </Link>
            <LangToggle locale={locale} t={t} className="self-start" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
