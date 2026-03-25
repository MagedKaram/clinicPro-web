---
description: "Workspace instructions for Clinic Queue Next.js SaaS: UI-first build, component breakdown, server/client balance, and Tailwind design tokens only."
---

# Clinic Queue (Next.js SaaS) — Workspace Instructions

الهدف: نبدأ Phase UI في Next.js بشكل منظم، مع تقسيم واضح للكومبوننتس، وموازنة Server/Client، وباستخدام Tailwind design system فقط (بدون ألوان/ستايلات هارد-coded).

> قاعدة ذهبية: **UI-first** الآن. أي داتا = mock/fixtures لحد Phase 2.

---

## Specs

### S0 — Non‑Negotiables (لازم)

1. **Tailwind system فقط**
   - ممنوع كتابة ألوان/ظلال/فونتات inline أو في CSS بشكل hard-coded.
   - أي لون/ظل/خلفية متكرر لازم يبقى Token (CSS variables) ويتستخدم عبر Tailwind classes.
   - الاستثناء الوحيد: قيم معقدة غير قابلة للتوكنايز بسهولة (مثل `radial-gradient(...)`, `background-size` لباترن) — بس تكون قليلة ومبررة.

2. **Server Components by default**
   - أي `page.tsx` و `layout.tsx` تكون Server افتراضيًا.
   - `"use client"` فقط عند الحاجة الفعلية: state, effects, events, browser APIs, animations.

3. **Break components aggressively (لكن بدون مبالغة)**
   - Component واحد = مسؤولية واحدة.
   - لو UI بتتكرر في صفحتين أو أكتر → Shared component.
   - لو الملف كبر ~120 سطر أو بقى فيه أكثر من concern → قسمه.

4. **No extra UX**
   - نطبق UX المطلوبة فقط (من غير صفحات زيادة/مودالز زيادة/فلاتر إضافية/حركات مش مطلوبة).

---

### S1 — App Scope (UI Phase)

نفس الشاشات الأساسية (زي النظام الحالي):

- `/login` (role-based)
- `/reception`
- `/doctor`
- `/display`
- `/reports`

**Phase UI:**

- استخدم mock state و mock settings.
- كل الـ actions تعمل update للـ mock state محليًا (أو client store) مؤقتًا.

---

### S2 — Data Contracts (UI-first Types)

اعمل Types واضحة من البداية (بدون `any`):

- `Patient` (id, name, phone?, address?, createdAt?)
- `Visit` (id, patientId, ticket, visitType, status, date, time, diagnosis?, prescription?, notes?, price, paid)
- `QueueState` (current, waitingCount, waitingPatients, queue)
- `Settings` (clinicName, doctorName, address, phone, priceNew, priceFollowup)

**Enums/Unions:**

- `VisitStatus = "waiting" | "serving" | "done"`
- `VisitType = "new" | "followup"`
- `Role = "reception" | "doctor"`

---

### S3 — Server/Client Split Rules (مهم)

**Server (افتراضي):**

- Layout shell, headers، stat cards الثابتة، initial data fetch (حتى لو mock).

**Client:**

- Tabs switching
- Forms (registration / visit form)
- Realtime simulation (Phase UI) + later: subscriptions
- Clock / timers / audio

**RSC Slots Pattern (مفضل):**

- الصفحة Server تعمل compose للـ UI.
- Client component للـ tabs يستقبل slots (`ReactNode`) بدل ما يـ import server components داخل client.

**ممنوع:**

- وضع `"use client"` على الصفحة كلها لمجرد وجود جزء تفاعلي صغير.

---

### S4 — Component Architecture (Breakdown)

#### Shared (Reusable)

- TopBar / Header
- Clock (Client)
- StatBox
- EmptyState
- PatientBadge (new/followup)
- SearchInput (Client: debounced)

#### Reception

- RegistrationForm (Client)
- QueueList (Client)
- TicketDisplay (Client)
- BillingPopup (Client)
- BalanceBar (Client)

#### Doctor

- QueueSidebar (Client)
- CurrentPatientPanel (Client)
- VisitForm (Client)
- MedicalHistoryPopup (Client)

#### Display

- CurrentNumberDisplay (Client)
- WaitingList (Client)
- AnnouncementOverlay (Client + audio)
- Ticker (Client animation)

#### Reports

- FinancialReport (Client)
- DebtorsReport (Client)
- PatientReport (Client)
- SummaryCards (Server)

**Naming:**

- Components: `PascalCase.tsx`
- Hooks: `useXxx.ts`
- Types: `types/*.ts`

---

### S5 — Styling & Tokens

**قاعدة:** لا تكتب ألوان جديدة داخل JSX.

- اعمل tokens في `globals.css` (CSS variables) + استخدمها عبر Tailwind (مثلاً عبر `@theme inline` أو mapping في config حسب Tailwind v4).
- استعمل `cn()` helper لدمج الكلاسات.

**منع:**

- `style={{ background: "#..." }}`
- `style={{ color: "#..." }}`
- `rgba(...)` hard-coded في border/background (إلا استثناءات S0).

---

### S6 — UI Build Order (أولوية التنفيذ)

1. Layout + tokens + shared components
2. `/login` UI
3. `/reception` UI (form + queue + billing popup)
4. `/doctor` UI (queue + current patient + history)
5. `/display` UI (big number + overlay + ticker)
6. `/reports` UI

---

### S7 — Quality Bar

- TypeScript strict (بدون `any`)
- Components صغيرة وواضحة
- لا تغييرات unrelated
- لو عملت token/utility جديد → استخدمه في كل الأماكن بدل ما تكرر قيم

---

## Working Agreement (للتنفيذ)

- قبل إضافة component جديد: اتأكد إنه مش موجود بشكل قريب في shared.
- قبل جعل ملف Client: جرّب تعزل الجزء التفاعلي فقط.
- أي UI تكرر 2+ مرات → Shared.
