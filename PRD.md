# 🏥 Clinic Queue System — SaaS PRD

> **Product Requirements Document**
> Stack: Next.js 15 · TypeScript · Tailwind CSS · Supabase · Socket.IO
> Status: Phase 1 — UI Conversion (Mock Data Only)

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Installation & Setup](#4-installation--setup)
5. [Core Packages & Tools](#5-core-packages--tools)
6. [Architecture & Patterns](#6-architecture--patterns)
7. [Development Guidelines](#7-development-guidelines)
   - [File Naming Conventions](#71-file-naming-conventions)
   - [Folder Organization](#72-folder-organization)
   - [TypeScript Usage](#73-typescript-usage)
   - [Component Props](#74-component-props)
   - [**Reusable Component Structure**](#75-reusable-component-structure) ⭐ NEW
   - [Styling Best Practices](#76-styling-best-practices)
8. [Key Features](#8-key-features)
9. [Routing & Navigation](#9-routing--navigation)
10. [State Management](#10-state-management)
11. [Styling & Theming](#11-styling--theming)
12. [i18n Internationalization](#12-i18n-internationalization)
13. [API Integration](#13-api-integration)
14. [Plugins & Configuration](#14-plugins--configuration)
15. [Common Workflows](#15-common-workflows)
16. [Best Practices](#16-best-practices)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Project Overview

### ما هو المشروع؟

**Clinic Queue SaaS** — نظام إدارة عيادة طبية متكامل يعمل على السحابة، يتحول من نظام محلي (Flask + SQLite) إلى منتج SaaS متعدد المستأجرين (Multi-tenant) باستخدام Next.js 16 + Supabase.

### المراحل

| المرحلة     | الوصف                                            | الحالة  |
| ----------- | ------------------------------------------------ | ------- |
| **Phase 1** | تحويل UI فقط — pixel-perfect مع mock data        | 🔄 جاري |
| **Phase 2** | ربط Supabase — Auth + Database + Realtime        | ⏳ قادم |
| **Phase 3** | Multi-tenant + Billing (Stripe) + Dashboard      | ⏳ قادم |
| **Phase 4** | Mobile App (React Native) + WhatsApp Integration | ⏳ قادم |

### الشاشات الخمس

```
1. /login          → صفحة تسجيل الدخول (استقبال / دكتور)
2. /reception      → الاستقبال — تسجيل المرضى + قائمة الانتظار
3. /doctor         → لوحة الدكتور — الكشف + الملف الطبي
4. /display        → شاشة العرض — للتلفزيون في صالة الانتظار
5. /reports        → التقارير المالية الشاملة
```

---

## 2. Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                            │
├─────────────────────────────────────────────────────────┤
│  Framework    │  Next.js 16 (App Router)                │
│  Language     │  TypeScript 5                           │
│  Styling      │  Tailwind CSS v4                        │
│  UI Library   │  shadcn/ui (Radix UI primitives)        │
│  Icons        │  Lucide React                           │
│  Fonts        │  Cairo (Google Fonts) — Arabic          │
│  Animation    │  Framer Motion                          │
│  Real-time    │  Socket.IO Client                       │
├─────────────────────────────────────────────────────────┤
│                     BACKEND (Phase 2)                   │
├─────────────────────────────────────────────────────────┤
│  BaaS         │  Supabase                               │
│  Auth         │  Supabase Auth                          │
│  Database     │  Supabase PostgreSQL                    │
│  Realtime     │  Supabase Realtime                      │
│  Storage      │  Supabase Storage                       │
│  Edge Fns     │  Supabase Edge Functions                │
├─────────────────────────────────────────────────────────┤
│                     TOOLING                             │
├─────────────────────────────────────────────────────────┤
│  Package Mgr  │  pnpm                                   │
│  Linting      │  ESLint + Prettier                      │
│  Git Hooks    │  Husky + lint-staged                    │
│  Type Check   │  tsc --noEmit                           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
website/
├── PRD.md                          ← هذا الملف
└── web/                            ← Next.js 15 project
    ├── public/
    │   ├── fonts/
    │   └── sounds/
    │       └── beep.mp3
    ├── src/
    │   ├── app/                    ← App Router (Next.js 15)
    │   │   ├── (auth)/
    │   │   │   └── login/
    │   │   │       └── page.tsx    ← SERVER COMPONENT
    │   │   ├── (clinic)/
    │   │   │   ├── layout.tsx      ← SERVER: auth guard
    │   │   │   ├── reception/
    │   │   │   │   └── page.tsx    ← SERVER COMPONENT
    │   │   │   ├── doctor/
    │   │   │   │   └── page.tsx    ← SERVER COMPONENT
    │   │   │   ├── display/
    │   │   │   │   └── page.tsx    ← SERVER COMPONENT
    │   │   │   └── reports/
    │   │   │       └── page.tsx    ← SERVER COMPONENT
    │   │   ├── layout.tsx          ← Root layout (RTL + Cairo)
    │   │   └── globals.css
    │   │
    │   ├── components/             ← ALL COMPONENTS
    │   │   ├── ui/                 ← shadcn/ui base components
    │   │   │   ├── button.tsx
    │   │   │   ├── card.tsx
    │   │   │   ├── badge.tsx
    │   │   │   ├── dialog.tsx
    │   │   │   ├── input.tsx
    │   │   │   ├── table.tsx
    │   │   │   └── ...
    │   │   │
    │   │   ├── shared/             ← Reusable across all pages
    │   │   │   ├── TopBar.tsx      ← SERVER: clinic name + clock
    │   │   │   ├── Clock.tsx       ← CLIENT: live clock
    │   │   │   ├── PatientBadge.tsx← SERVER: new/followup pill
    │   │   │   ├── StatBox.tsx     ← SERVER: number + label
    │   │   │   ├── SearchInput.tsx ← CLIENT: debounced search
    │   │   │   ├── EmptyState.tsx  ← SERVER: empty placeholder
    │   │   │   └── LoadingSpinner.tsx
    │   │   │
    │   │   ├── reception/          ← Reception-specific
    │   │   │   ├── RegistrationForm.tsx    ← CLIENT
    │   │   │   ├── PatientSearch.tsx       ← CLIENT
    │   │   │   ├── TicketDisplay.tsx       ← CLIENT
    │   │   │   ├── QueueList.tsx           ← CLIENT (realtime)
    │   │   │   ├── BillingPopup.tsx        ← CLIENT
    │   │   │   ├── BalanceBar.tsx          ← CLIENT
    │   │   │   └── BillingHistory.tsx      ← CLIENT
    │   │   │
    │   │   ├── doctor/             ← Doctor-specific
    │   │   │   ├── CurrentPatient.tsx      ← CLIENT (socket)
    │   │   │   ├── VisitForm.tsx           ← CLIENT
    │   │   │   ├── MedicalHistoryPopup.tsx ← CLIENT
    │   │   │   ├── LastVisitBox.tsx        ← SERVER
    │   │   │   ├── QueueSidebar.tsx        ← CLIENT (realtime)
    │   │   │   └── DoctorStats.tsx         ← CLIENT
    │   │   │
    │   │   ├── display/            ← Display screen
    │   │   │   ├── CurrentNumberDisplay.tsx ← CLIENT (socket)
    │   │   │   ├── WaitingList.tsx          ← CLIENT (socket)
    │   │   │   ├── AnnouncementOverlay.tsx  ← CLIENT (socket)
    │   │   │   └── Ticker.tsx               ← CLIENT (animation)
    │   │   │
    │   │   └── reports/            ← Reports page
    │   │       ├── FinancialReport.tsx     ← CLIENT
    │   │       ├── DebtorsReport.tsx       ← CLIENT
    │   │       ├── PatientReport.tsx       ← CLIENT
    │   │       ├── SummaryCards.tsx        ← SERVER
    │   │       ├── DayBreakdown.tsx        ← CLIENT
    │   │       └── ReportTable.tsx         ← SERVER
    │   │
    │   ├── hooks/                  ← Custom React Hooks
    │   │   ├── useSocket.ts        ← Socket.IO connection
    │   │   ├── useQueue.ts         ← Queue state management
    │   │   ├── useClock.ts         ← Live clock
    │   │   ├── usePatientSearch.ts ← Debounced search
    │   │   └── useBilling.ts       ← Billing popup state
    │   │
    │   ├── lib/                    ← Utilities
    │   │   ├── utils.ts            ← cn() + helpers
    │   │   ├── formatDate.ts       ← Arabic date formatting
    │   │   ├── socket.ts           ← Socket.IO client singleton
    │   │   └── mock-data.ts        ← Phase 1: mock data
    │   │
    │   ├── types/                  ← TypeScript types
    │   │   ├── patient.ts
    │   │   ├── visit.ts
    │   │   ├── queue.ts
    │   │   └── settings.ts
    │   │
    │   └── constants/
    │       ├── themes.ts           ← Color tokens per page
    │       └── routes.ts
    │
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── eslint.config.mjs
    └── package.json
```

---

## 4. Installation & Setup

```bash
# 1. إنشاء مشروع Next.js 16
cd website
pnpm create next-app@latest web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd web

# 2. تثبيت shadcn/ui
pnpm dlx shadcn@latest init

# 3. تثبيت المكتبات
pnpm add \
  socket.io-client \
  framer-motion \
  lucide-react \
  clsx \
  tailwind-merge \
  date-fns

# 4. تثبيت مكتبات التطوير
pnpm add -D \
  prettier \
  prettier-plugin-tailwindcss \
  @types/node

# 5. تشغيل
pnpm dev
```

---

## 5. Core Packages & Tools

| Package                   | الاستخدام          | نوعه    |
| ------------------------- | ------------------ | ------- |
| `next` 16                 | Framework الأساسي  | Prod    |
| `react` 19                | UI Library         | Prod    |
| `typescript` 5            | Type safety        | Dev     |
| `tailwindcss` v4          | Styling            | Prod    |
| `shadcn/ui`               | UI Components base | Prod    |
| `lucide-react`            | Icons              | Prod    |
| `socket.io-client`        | Real-time events   | Prod    |
| `framer-motion`           | Animations         | Prod    |
| `clsx` + `tailwind-merge` | Class merging      | Prod    |
| `date-fns`                | Date formatting    | Prod    |
| `supabase-js`             | Backend (Phase 2)  | Phase 2 |

---

## 6. Architecture & Patterns

### Server Components vs Client Components

```
قاعدة بسيطة:
┌──────────────────────────────────────────────┐
│  SERVER COMPONENT (default)                  │
│  ✓ يعرض داتا ثابتة أو من الـ DB             │
│  ✓ لا يحتاج useState / useEffect            │
│  ✓ لا يحتاج event listeners                │
│  ✓ لا يحتاج browser APIs                   │
│  مثال: TopBar, StatBox, PatientBadge         │
├──────────────────────────────────────────────┤
│  CLIENT COMPONENT ("use client")             │
│  ✓ يستخدم useState / useEffect              │
│  ✓ يتعامل مع events (onClick, onChange)     │
│  ✓ يستخدم Socket.IO / real-time             │
│  ✓ يستخدم browser APIs (Audio, etc)         │
│  مثال: QueueList, VisitForm, Clock           │
└──────────────────────────────────────────────┘
```

### Data Flow Pattern

```
Page (Server Component)
    ↓ passes initial data as props
Layout Shell (Server Component)
    ↓ passes props
Interactive Section (Client Component "use client")
    ↓ manages local state
    ↓ subscribes to Socket.IO events
    ↓ calls API routes
UI Components (Server or Client)
```

### Component Communication

```
Parent → Child   : Props
Child → Parent   : Callbacks (onAction)
Global State     : Zustand (Phase 2) / Context (Phase 1)
Real-time        : Socket.IO hooks
```

---

## 7. Development Guidelines

### 7.1 File Naming Conventions

```
Components        : PascalCase    → PatientBadge.tsx
Hooks             : camelCase     → useQueue.ts
Utilities         : camelCase     → formatDate.ts
Types             : camelCase     → patient.ts
Pages             : lowercase     → page.tsx (Next.js convention)
Layouts           : lowercase     → layout.tsx
Constants         : camelCase     → themes.ts
CSS               : kebab-case    → globals.css
```

### 7.2 Folder Organization

```
❌ لا تضع كل شيء في components/
✓  قسّم حسب الصفحة: components/reception/ components/doctor/
✓  المشتركة في: components/shared/
✓  shadcn/ui في: components/ui/ (لا تعدل عليها)
```

### 7.3 TypeScript Usage

```typescript
// ✓ استخدم interface للـ Props
interface PatientBadgeProps {
  type: "new" | "followup";
  className?: string;
}

// ✓ استخدم type للـ union types
type VisitStatus = "waiting" | "serving" | "done";

// ✓ export الـ types من types/
// ❌ لا تعرّف types داخل الـ component file

// ✓ استخدم strict null checks
const name = patient?.name ?? "غير محدد";
```

### 7.4 Component Props

```typescript
// ✓ الشكل الصحيح
interface Props {
  // required props أولاً
  ticket: number;
  name: string;
  // optional props بعدين
  className?: string;
  onSelect?: (id: number) => void;
}

export function PatientRow({ ticket, name, className, onSelect }: Props) {
  // ...
}

// ✓ استخدم children بشكل صريح
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
```

### 7.5 Reusable Component Structure

#### ⭐ القاعدة الذهبية: Component واحد = مسؤولية واحدة

```typescript
// 📁 components/shared/PatientBadge.tsx

// 1. كل import في الأعلى
import { cn } from "@/lib/utils"

// 2. Type definition
interface PatientBadgeProps {
  type: "new" | "followup"
  size?: "sm" | "md"
  className?: string
}

// 3. Static data / constants بره الـ component
const CONFIG = {
  new: {
    label: "🆕 كشف جديد",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  followup: {
    label: "🔄 متابعة",
    className: "bg-teal-500/12 text-teal-400 border-teal-500/30",
  },
} as const

// 4. Component export
export function PatientBadge({ type, size = "md", className }: PatientBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold border",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        CONFIG[type].className,
        className
      )}
    >
      {CONFIG[type].label}
    </span>
  )
}
```

#### متى تعمل component جديدة؟

```
✓ لو نفس الـ UI بيتكرر في 2+ أماكن
✓ لو الـ component وصل لـ 100+ سطر
✓ لو الـ component عندها مسؤوليات متعددة
❌ لا تعمل component لاستخدام مرة واحدة بس
```

#### أنواع الـ Reusable Components في المشروع

```
┌─────────────────────────────────────────────────────────┐
│  Level 1: Base UI (shadcn/ui)                           │
│  Button, Card, Badge, Input, Dialog, Table              │
│  → لا تعدل عليها                                       │
├─────────────────────────────────────────────────────────┤
│  Level 2: Shared Domain Components                      │
│  PatientBadge, StatBox, TopBar, Clock, EmptyState       │
│  → مشتركة بين كل الصفحات                              │
├─────────────────────────────────────────────────────────┤
│  Level 3: Feature Components                            │
│  QueueList, VisitForm, BillingPopup                     │
│  → خاصة بصفحة معينة                                   │
├─────────────────────────────────────────────────────────┤
│  Level 4: Page Components                               │
│  ReceptionPage, DoctorPage                              │
│  → بتجمع الـ features مع بعض                          │
└─────────────────────────────────────────────────────────┘
```

### 7.6 Styling Best Practices

```typescript
// ✓ استخدم cn() دايماً لمزج الـ classes
import { cn } from "@/lib/utils"

className={cn(
  "base classes here",
  condition && "conditional classes",
  className // always accept external className
)}

// ✓ استخدم CSS Variables للـ themes (في globals.css)
// ❌ لا تستخدم inline styles إلا في حالات الضرورة
// ✓ Mobile-first: ابدأ بـ base ثم md: lg: xl:
// ✓ استخدم semantic colors من الـ theme مش hard-coded
```

---

## 8. Key Features

### 8.1 نظام الانتظار (Queue Management)

```
Components:
├── QueueList (CLIENT)          → قائمة المنتظرين real-time
├── RegistrationForm (CLIENT)   → تسجيل مريض جديد
├── PatientSearch (CLIENT)      → بحث عن مريض موجود
├── TicketDisplay (CLIENT)      → عرض التذكرة بعد التسجيل
└── StatBox (SERVER)            → إحصائيات (الانتظار، الحالي)

Socket Events:
├── state_update    → تحديث قائمة الانتظار
└── billing_popup   → فتح popup المحاسبة
```

### 8.2 لوحة الدكتور (Doctor Panel)

```
Components:
├── CurrentPatient (CLIENT)         → عرض المريض الحالي
├── VisitForm (CLIENT)              → فورم التشخيص
├── MedicalHistoryPopup (CLIENT)    → popup التاريخ الطبي
├── LastVisitBox (SERVER)           → ملخص آخر زيارة
├── QueueSidebar (CLIENT)           → قائمة الانتظار الجانبية
└── DoctorStats (CLIENT)            → الإحصائيات

Socket Events:
├── patient_ready   → مريض جاهد للكشف
└── state_update    → تحديث القائمة
```

### 8.3 شاشة العرض (Display Screen)

```
Components:
├── CurrentNumberDisplay (CLIENT)   → الرقم الكبير الحالي
├── WaitingList (CLIENT)            → قائمة المنتظرين
├── AnnouncementOverlay (CLIENT)    → إعلان 15 ثانية
└── Ticker (CLIENT)                 → شريط الأخبار المتحرك

الـ Announcement:
- يظهر 15 ثانية عند استدعاء مريض
- Animation: fadeIn → show → fadeOut
- Sound: 3 beeps (Web Audio API)
```

### 8.4 نظام المحاسبة (Billing)

```
Components:
├── BillingPopup (CLIENT)   → popup تسجيل الدفع
├── BalanceBar (CLIENT)     → شريط المتبقيات اليومي
└── BillingHistory (CLIENT) → سجل المحاسبات اليوم

المنطق:
balance = charged - paid    (رصيد المريض الكلي)
charged = مجموع أسعار كل الزيارات
paid    = مجموع كل الدفعات
```

### 8.5 التقارير (Reports)

```
3 أنواع:
1. التقرير المالي (Financial)  → بالتواريخ / فلترة
2. المرضى المدينون (Debtors)   → من عندهم رصيد
3. تقرير مريض (Patient)        → كل زياراته

Components:
├── FinancialReport (CLIENT)    → فلترة + جدول
├── DebtorsReport (CLIENT)      → قائمة المدينين
├── PatientReport (CLIENT)      → ملف المريض الكامل
├── SummaryCards (SERVER)       → 5 بطاقات إحصائية
├── DayBreakdown (CLIENT)       → تفصيل يومي
└── ReportTable (SERVER)        → جدول البيانات
```

---

## 9. Routing & Navigation

```
app/
├── (auth)/
│   └── login/page.tsx              → /login
│       └── login/[role]/page.tsx   → /login/reception | /login/doctor
├── (clinic)/
│   ├── layout.tsx                  → Auth guard
│   ├── reception/page.tsx          → /reception
│   ├── doctor/page.tsx             → /doctor
│   ├── display/page.tsx            → /display
│   └── reports/page.tsx            → /reports
└── page.tsx                        → redirect → /login
```

### Navigation Logic

```typescript
// Phase 1: Mock auth في الـ middleware
// Phase 2: Supabase Auth

// middleware.ts
export function middleware(request: NextRequest) {
  const role = request.cookies.get("role")?.value;

  if (!role && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Doctor لا يدخل /reception والعكس
  if (role === "doctor" && request.nextUrl.pathname === "/reception") {
    return NextResponse.redirect(new URL("/doctor", request.url));
  }
}
```

---

## 10. State Management

### Phase 1: Local State + Context

```typescript
// useQueue.ts — الحالة الأساسية
interface QueueState {
  current: number | null;
  waitingCount: number;
  waitingPatients: Patient[];
  queue: Visit[];
}

// استخدام:
const { current, waitingPatients } = useQueue();
```

### Phase 2: Zustand + Supabase Realtime

```typescript
// store/queue.ts
import { create } from "zustand";

interface QueueStore extends QueueState {
  setQueue: (state: Partial<QueueState>) => void;
  callNext: () => Promise<void>;
}
```

---

## 11. Styling & Theming

### الثيمات حسب الصفحة

```typescript
// constants/themes.ts

export const themes = {
  // الاستقبال — أزرق فاتح
  reception: {
    bg: "#f0f4f8",
    primary: "#0a5c8a",
    accent: "#00c9b1",
    card: "#ffffff",
  },

  // الدكتور — أزرق داكن
  doctor: {
    bg: "#0d1f33",
    primary: "#132840",
    accent: "#00c9b1",
    card: "#132840",
  },

  // شاشة العرض — أسود مميز
  display: {
    bg: "#050e1a",
    primary: "#00e5cc",
    accent: "#f59e0b",
    card: "rgba(255,255,255,0.05)",
  },

  // التقارير — نفس الاستقبال
  reports: {
    bg: "#f0f4f8",
    primary: "#0a5c8a",
    accent: "#00c9b1",
    card: "#ffffff",
  },
} as const;
```

### CSS Variables في globals.css

```css
/* Light theme (Reception + Reports) */
:root {
  --primary: #0a5c8a;
  --primary-light: #1a7ab5;
  --accent: #00c9b1;
  --bg: #f0f4f8;
  --card: #ffffff;
  --text: #1a2636;
  --muted: #7a8fa6;
  --border: #dce5ef;
  --new: #0a5c8a;
  --followup: #00897b;
  --danger: #e53935;
  --warning: #f59e0b;
  --success: #2e7d32;
}

/* Dark theme (Doctor) */
.theme-doctor {
  --bg: #0d1f33;
  --card: #132840;
  --text: #e8f0f8;
  --muted: #6b8aaa;
  --border: #1e3d5c;
}

/* Display theme */
.theme-display {
  --bg: #050e1a;
  --accent: #00e5cc;
  --text: #ffffff;
}
```

### Cairo Font Setup (RTL)

```typescript
// app/layout.tsx
import { Cairo } from "next/font/google"

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "600", "700", "900"],
  variable: "--font-cairo",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-cairo">{children}</body>
    </html>
  )
}
```

---

## 12. i18n Internationalization

### Phase 1: عربي فقط

```
اللغة الافتراضية: العربية (ar)
الاتجاه: RTL
التقويم: عربي (ar-EG locale)
الأرقام: عربية (١٢٣ style) في العرض
```

### تنسيق التاريخ بالعربي

```typescript
// lib/formatDate.ts

const ARABIC_MONTHS = [
  "",
  "يناير",
  "فبراير",
  "مارس",
  "إبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

export function formatDateArabic(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${ARABIC_MONTHS[m]} ${y}`;
  // → "15 مارس 2026"
}

export function formatTimeArabic(date = new Date()): string {
  return date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateLong(date = new Date()): string {
  return date.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
```

### Phase 2: next-intl

```
المحتوى: عربي + إنجليزي
i18n library: next-intl
Routing: /ar/* و /en/*
```

---

## 13. API Integration

### Phase 1: Mock Data

```typescript
// lib/mock-data.ts

export const MOCK_QUEUE_STATE = {
  current: 5,
  waitingCount: 3,
  waitingPatients: [
    { id: 1, ticket: 6, name: "أحمد محمد", type: "new", time: "10:30" },
    { id: 2, ticket: 7, name: "فاطمة علي", type: "followup", time: "10:35" },
    { id: 3, ticket: 8, name: "محمد حسن", type: "new", time: "10:40" },
  ],
};

export const MOCK_SETTINGS = {
  clinic_name: "عيادة د. أحمد",
  doctor_name: "د. أحمد محمد",
  price_new: 200,
  price_followup: 100,
};
```

### Phase 2: API Routes

```
app/api/
├── auth/
│   ├── login/route.ts
│   └── logout/route.ts
├── queue/
│   ├── state/route.ts
│   ├── add/route.ts
│   └── next/route.ts
├── patients/
│   ├── search/route.ts
│   └── [id]/route.ts
├── visits/
│   └── [id]/
│       ├── finish/route.ts
│       └── add-charge/route.ts
├── payments/route.ts
├── report/route.ts
└── settings/route.ts
```

### Socket.IO Client

```typescript
// lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000", {
      autoConnect: false,
    });
  }
  return socket;
}

// hooks/useSocket.ts
("use client");

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

export function useSocket() {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    socketRef.current.connect();
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return socketRef.current;
}
```

---

## 14. Plugins & Configuration

### next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // RTL support
  i18n: undefined, // نستخدم dir="rtl" في الـ HTML مش هنا

  // Image optimization
  images: {
    domains: [],
  },

  // Phase 2: Supabase rewrites
  async rewrites() {
    return [];
  },
};

export default nextConfig;
```

### tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
      },
      colors: {
        primary: "#0a5c8a",
        accent: "#00c9b1",
        "accent-amber": "#f59e0b",
      },
      animation: {
        "pulse-slow": "pulse 2s infinite",
        blink: "blink 1s infinite",
        "ticker-move": "tickerMove 28s linear infinite",
        "announce-in": "announceAnim 15s ease forwards",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        tickerMove: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        announceAnim: {
          "0%": { opacity: "0" },
          "5%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### tsconfig.json (الأهم)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 15. Common Workflows

### إضافة صفحة جديدة

```bash
# 1. إنشاء الصفحة
touch src/app/(clinic)/new-page/page.tsx

# 2. إضافة الـ components folder
mkdir src/components/new-page

# 3. تحديد: أي components server وأيها client؟

# 4. إنشاء الـ types
touch src/types/new-page.ts

# 5. إضافة mock data
# في src/lib/mock-data.ts
```

### إضافة Component جديد

```bash
# 1. حدد مكانه: shared أو feature-specific؟

# shared:
touch src/components/shared/NewComponent.tsx

# feature:
touch src/components/reception/NewComponent.tsx

# 2. Template:
cat > src/components/shared/NewComponent.tsx << 'EOF'
import { cn } from "@/lib/utils"

interface NewComponentProps {
  // props هنا
  className?: string
}

export function NewComponent({ className }: NewComponentProps) {
  return (
    <div className={cn("", className)}>
      {/* content */}
    </div>
  )
}
EOF
```

### تحديث الـ Mock Data

```typescript
// src/lib/mock-data.ts
// Phase 1: كل الـ data هنا
// Phase 2: يتحول لـ Supabase queries
```

---

## 16. Best Practices

### ✅ Do

```typescript
// 1. Server Component by default
// لو مش محتاج useState أو events → اتركه server

// 2. اقسم الـ Client Components
// بدل ما تعمل صفحة كاملة "use client"
// اعمل component صغيرة client

// 3. استخدم Suspense للـ loading states
<Suspense fallback={<LoadingSpinner />}>
  <AsyncComponent />
</Suspense>

// 4. Loading UI
// app/reception/loading.tsx → يظهر تلقائياً

// 5. Error Boundaries
// app/reception/error.tsx → يمسك الأخطاء

// 6. Type everything
const handleNext = async (visitId: number): Promise<void> => { ... }
```

### ❌ Don't

```typescript
// 1. لا تحط "use client" في الـ layout
// Layout بيتأثر على كل الـ pages

// 2. لا تعمل fetch داخل Client Component
// اعمله في Server Component وpass الـ data كـ props

// 3. لا تستخدم any
const data: any = ... // ❌

// 4. لا تنسى الـ key في القوائم
patients.map(p => <PatientRow {...p} />) // ❌
patients.map(p => <PatientRow key={p.id} {...p} />) // ✓

// 5. لا تضع logic في الـ JSX
{patients.filter(p => p.status === "waiting").map(...)} // ❌
// اعمل variable بره
const waitingPatients = patients.filter(p => p.status === "waiting") // ✓
```

---

## 17. Troubleshooting

### مشكلة: "use client" error

```
Error: You're importing a component that needs useXxx
Solution: أضف "use client" في أعلى الملف
```

### مشكلة: Hydration mismatch

```
Error: Hydration failed because the initial UI does not match
Cause: عادةً بيحصل مع الـ clock أو random values
Solution: استخدم useEffect للقيم اللي بتختلف بين server وclient

// ❌ Wrong
export function Clock() {
  return <div>{new Date().toLocaleTimeString()}</div>
}

// ✓ Correct
"use client"
export function Clock() {
  const [time, setTime] = useState("")
  useEffect(() => {
    setTime(new Date().toLocaleTimeString())
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(id)
  }, [])
  return <div>{time}</div>
}
```

### مشكلة: RTL مش شغال صح

```
1. تأكد من dir="rtl" في <html>
2. تأكد من lang="ar"
3. Tailwind: استخدم rtl: prefix لو محتاج
4. Flexbox: بيعكس تلقائياً مع RTL
```

### مشكلة: Font مش بيظهر

```
1. تأكد من import Cairo في layout.tsx
2. تأكد من إضافة font-cairo في Tailwind config
3. تأكد من className="font-cairo" على الـ body
```

### مشكلة: Socket.IO مش بيتوصل

```
1. تأكد الـ Flask server شغال على port 5000
2. تأكد CORS مفتوح في Flask
3. NEXT_PUBLIC_SOCKET_URL في .env.local
```

---

## 📊 Phase 1 Checklist

### UI Components (Server)

- [ ] `PatientBadge` — new/followup pill
- [ ] `StatBox` — number + label card
- [ ] `EmptyState` — empty placeholder
- [ ] `TopBar` — clinic name + clock
- [ ] `SummaryCards` — report summary

### UI Components (Client)

- [ ] `Clock` — live clock
- [ ] `SearchInput` — debounced search
- [ ] `QueueList` — real-time queue
- [ ] `RegistrationForm` — patient registration
- [ ] `TicketDisplay` — ticket after registration
- [ ] `BillingPopup` — billing dialog
- [ ] `BalanceBar` — daily balance bar
- [ ] `CurrentPatient` — doctor current patient
- [ ] `VisitForm` — visit form
- [ ] `MedicalHistoryPopup` — medical history
- [ ] `CurrentNumberDisplay` — display big number
- [ ] `AnnouncementOverlay` — 15s announcement

### Pages

- [ ] `/login` — login page
- [ ] `/reception` — reception page
- [ ] `/doctor` — doctor page
- [ ] `/display` — display screen
- [ ] `/reports` — reports page

### Hooks

- [ ] `useSocket` — Socket.IO connection
- [ ] `useQueue` — queue state
- [ ] `useClock` — live clock
- [ ] `usePatientSearch` — patient search

---

_PRD Version 1.0 | Last Updated: March 2026_
