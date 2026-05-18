<div align="center">

# Quartiq

### Enterprise Goal Setting & Performance Tracking Portal

**Structure the way your organization sets, reviews, and tracks goals — from planning through execution.**

<br/>

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://atomquest-goal-portal-mu.vercel.app)
[![License MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

<br/>

**[🚀 Live Demo](https://atomquest-goal-portal-mu.vercel.app/login)** &nbsp;·&nbsp; **[📦 Repository](https://github.com/devsivv/atomquest-goal-portal)**

</div>

---

## Why Quartiq Exists

Enterprise performance management is broken at the workflow layer.

Most organizations rely on a patchwork of spreadsheets, email threads, and disconnected tools. Goals are set at the start of a quarter and forgotten. Managers have no centralized visibility into their team's submissions. HR has no structured audit trail. Executives are the last to know when execution is failing.

The result: reactive leadership, zero accountability, and performance cycles that mean nothing.

**Quartiq is the structured alternative.** A role-aware, workflow-driven platform that enforces a disciplined goal lifecycle — from employee planning, through manager review and approval, to executive analytics and governance — all within a single, production-grade system.

---

## Platform at a Glance

| Workspace | Who | What They Do |
|---|---|---|
| **Employee** | Individual contributors | Draft goals, track weightage, submit for review, log quarterly progress |
| **Manager** | Team leads | Review submissions, approve / reject / request revisions, monitor execution |
| **Admin / HR** | Platform owners | Manage cycles, govern goal locks, view org-wide analytics, export reports |

---

## Feature Overview

### Employee Experience

A structured planning workspace with a friction-free autosave experience and strict BRD-compliant submission rules.

| Feature | Detail |
|---|---|
| Goal Planning Studio | Dynamic form supporting up to 8 goals per cycle |
| JSONB Autosave Engine | Drafts persist continuously to a single JSONB anchor — no data loss on close |
| Live Weightage Tracker | Real-time banner: enforces total = exactly 100% with red/yellow/green states |
| Strict Submission Validation | Zod-enforced: max 8 goals · min 10% each · all 7 fields required |
| Goal Status View | Read-only view of approved goals with status badges and deadlines |
| Quarterly Check-in Tracking | Structured progress logging per approved goal, per quarter (Q1–Q4) |
| Planned vs. Actual Table | Side-by-side target vs. achieved comparison with history panel |
| Revision Workflow | Receive structured manager feedback, edit, and resubmit |

### Manager Intelligence

A complete team goal review system — optimistic updates, bulk operations, and predictive insight.

| Feature | Detail |
|---|---|
| Team Review Queue | All submitted goals grouped by employee, filterable and searchable |
| Approve / Reject / Request Revision | Per-goal action modal with required justification — RPC-backed |
| Bulk Approve | One-click approval for all pending goals of a team member |
| Stats Banner | Live KPIs: total submissions, pending, approved, revision-requested |
| Debounced Search | 300ms debounced search across employee names and goal titles |
| Status Filtering | Filter queue: Pending · Approved · Revision Requested |
| Manager Analytics | Quarterly performance trends, at-risk tracking, execution velocity |
| Predictive Insights | Deterministic intelligence: momentum shifts, risk forecasts, delivery confidence |

### Admin Governance

A command center for full organizational visibility, cycle control, and enterprise-grade governance.

| Feature | Detail |
|---|---|
| Executive Analytics Dashboard | 9 KPI cards · area charts · predictive risk · dept performance · grade distribution |
| Org Completion Dashboard | Per-employee completion rates, department leaderboard, manager effectiveness |
| Performance Cycle Management | Create, activate, and archive quarterly / annual cycles |
| User Management | Employee directory with role assignment, manager hierarchy, active/inactive toggle |
| Governance Controls | Cycle Lock · Freeze Submissions · Review Window toggles |
| Goal Unlock Engine | Approved goals are locked by default; admins unlock with mandatory justified reasoning |
| Immutable Audit Trail | Searchable log of every critical state change — actor, action, timestamp, target |
| Export Center | 5 report types in CSV · Excel · PDF: Executive Snapshot, Employee Performance, Goal Tracking, Dept, Manager |
| In-App Notifications | Platform-wide notification delivery with mark-as-read support |

### Predictive Analytics Engine

All intelligence is **deterministic and purely derived from live check-in data** — no external APIs, no probabilistic black boxes.

```
quarterly/utils/
├── forecast.ts    → velocity → estimated final progress → delivery risk classification
├── trends.ts      → momentum shift detection (Accelerating / Stable / Stalling)
├── insights.ts    → master aggregator: goal, team, strategic, forecast, momentum insights
├── analytics.ts   → cross-team progress averages, at-risk counts, health scores
├── alerts.ts      → threshold-based critical alert generation
├── health.ts      → goal health: on_track / at_risk / stalled / completed
└── scoring.ts     → weighted performance score per employee
```

**Insight categories surfaced:**
- **Goal-level** — stalled/overdue, near-deadline low progress, completions
- **Team-level** — highest momentum performer, stagnating team member
- **Strategic** — weakest and strongest thrust area by average execution
- **Forecast** — quarter-wide slowdown, accelerated delivery signals
- **Momentum** — widespread stalling, strong cadence detection
- **Delivery** — low check-in frequency flagged as low confidence

> **Demo Data Notice**
>
> Certain enterprise analytics, predictive KPI distributions, executive insights, and organization-scale performance metrics are intentionally seeded demo datasets designed to simulate large-scale enterprise deployments during hackathon evaluation and live demonstrations.
>
> All core workflow systems — including goal creation, approval lifecycle, revision handling, quarterly tracking, hierarchy mapping, RBAC enforcement, and manager-review flows — operate on real application state and database-driven interactions.

---

## Why This Project Stands Out

| Dimension | Implementation |
|---|---|
| **Workflow Correctness** | Full lifecycle: draft → submit → review → approve/revise → track → close |
| **Auditability** | PostgreSQL trigger-backed immutable audit trail on every critical mutation |
| **Governance** | Approved goals are locked at the DB layer; only admins can unlock with a reason |
| **Predictive Intelligence** | Velocity, momentum, and forecast risk derived from live data — not static rules |
| **Production Architecture** | Server Components, SSR auth, RPC-backed mutations, RLS at DB layer |
| **Optimistic UX** | Approval actions apply immediately in the UI; no wait for server round-trip |
| **Business Relevance** | Solves a real, daily enterprise pain — not a toy CRUD application |

---

## Architecture

### Architectural Principles

| Principle | Decision |
|---|---|
| **Server-first** | All page data is fetched in RSC before any HTML is sent; no client-side waterfalls |
| **RBAC at the DB layer** | Row-Level Security policies in PostgreSQL enforce data isolation per role |
| **Feature modularity** | Each domain owns its components, services, actions, schemas, types, and utils |
| **Optimistic UX** | State is updated immediately on action; rollback on server error |
| **Deterministic analytics** | All insights derived from real check-in data — no external AI services |

### App Router Route Structure

```
app/
├── (auth)/                    # Unauthenticated shell
│   └── layout.tsx
└── (dashboard)/               # Single DashboardShell — rendered ONCE
    ├── layout.tsx             ← Auth guard + sidebar/header shell
    ├── employee/              # Employee workspace
    ├── manager/               # Manager workspace
    └── admin/                 # RBAC guard only — no duplicate shell
        ├── layout.tsx         ← Checks role, passes children through
        ├── analytics/
        ├── cycles/
        ├── governance/
        ├── reports/
        └── users/
```

> **Key decision:** The admin sub-layout only enforces role access (admin/hr) and returns `{children}` directly — it never re-wraps in another shell. This prevents duplicate sidebar rendering across all admin routes.

### Server-First Data Flow

```
Browser Request
    │
    ▼
RSC (Server Component)
    │  ← Supabase SSR client (cookie-based auth)
    │  ← All data fetched here before render
    ▼
HTML streamed to browser
    │
    ▼
Client Components hydrate
    │  ← Only interactivity (modals, search, optimistic state)
    │  ← No data fetching waterfalls
    ▼
User interaction → Server Action (RPC) → Optimistic update
```

### Feature Module Layout

```
src/features/
├── auth/           # Auth service, role utilities, SSR redirect
├── goals/          # Employee goal planning engine
│   ├── components/ # GoalCreationDashboard, GoalFormRow, TrackerBanner
│   ├── schemas/    # Zod — loose draft schema + strict submission schema
│   ├── services/   # getDraftGoals, saveDraft, submitGoals
│   └── actions/    # Server Actions wrapping service calls
├── manager/        # Manager approval workflow
│   ├── components/ # ManagerApprovalDashboard, ReviewPanel, ApprovalModal
│   ├── services/   # computeStats, RPC wrappers
│   └── actions/    # approve, reject, requestRevision, approveAll
├── admin/          # Admin control center
│   ├── components/ # Analytics, Governance, Users, Cycles, Export
│   └── services/   # exportService, orgService
├── quarterly/      # Quarterly tracking + predictive engine
│   ├── components/ # CheckinForm, QuarterlyDashboard
│   └── utils/      # forecast, trends, insights, health, scoring
├── notifications/  # Notification service (create, fetch, mark-read)
└── scoring/        # Weighted performance score engine
```

---

## Goal Lifecycle Flows

### End-to-End Workflow

```
Employee                Manager               Admin
   │                       │                    │
   ├─ Drafts goals          │                    │
   ├─ Autosave (JSONB)      │                    │
   ├─ Submits for review    │                    │
   │                        │                    │
   │         ┌──────────────┤                    │
   │         │ Reviews goals│                    │
   │         ├─ Approves ───┼────────────────────┤
   │         │              │    Goal locked ─────┤
   │         ├─ Requests    │                    │
   │           Revision     │                    │
   │◄─ Notified ────────────┤                    │
   ├─ Revises & resubmits   │                    │
   │                        │                    │
   ├─ Logs Q1–Q4 check-ins  │                    │
   │                        │                    │
   │         ├─ Monitors ───┤                    │
   │         │  execution   │                    │
   │         │  velocity    │                    │
   │                        │                    │
   │                        │   Analytics ───────┤
   │                        │   Audit trail ──────┤
   │                        │   Export reports ───┤
```

### Quarterly Tracking Lifecycle

```
Goal Approved (Locked)
    │
    ├─ Q1 Check-in logged → progress_pct recorded
    ├─ Q2 Check-in logged → velocity calculated
    ├─ Q3 Check-in logged → forecast risk assessed
    └─ Q4 Check-in logged → final score computed
                                │
                                ▼
                    Planned vs Actual Table
                    Manager Insight Engine
                    Admin Analytics Dashboard
```

### Goal Revision Loop

```
Employee submits
    │
    ▼
Manager: "Request Revision" + mandatory note
    │
    ▼
Employee notified → edits goals → resubmits
    │
    ▼
Manager reviews revised goals → Approves
    │
    ▼
Goals locked → Audit record written
```

---

## Database Design

### Schema Philosophy

The PostgreSQL schema is designed around **immutability after approval**. Approved goals are write-locked at the DB layer — the only escape is an admin-initiated unlock with a mandatory reason, which is written to the audit log.

**Core tables:**

| Table | Purpose |
|---|---|
| `profiles` | User directory with role, department, manager FK |
| `performance_cycles` | Quarterly/annual goal cycles with status lifecycle |
| `goals` | Approved goal records (7 canonical fields + lifecycle status) |
| `goal_drafts` | JSONB anchor record per employee per cycle — supports partial saves |
| `quarterly_checkins` | Progress entries (Q1–Q4) per goal with progress_pct |
| `notifications` | In-app notification records per profile |
| `audit_logs` | Immutable trigger-written log of all critical mutations |

### Approval Lifecycle States

```
draft → submitted → under_review → approved (locked)
                               └──→ rejected
                               └──→ revision_requested → submitted (loop)
```

### RBAC via PostgreSQL RLS

Every table has Row-Level Security policies enforced at the database layer — not in application code:

- **Employees** — read/write only their own goals and check-ins
- **Managers** — read goals of their direct reports; write approval decisions
- **Admins/HR** — org-wide read access; privileged mutations via `SECURITY DEFINER` RPCs

This means even if application-layer auth is bypassed, data isolation holds.

---

## Key Engineering Decisions

**Why JSONB autosave for drafts?**
Partial goal planning (e.g., title filled, weightage not yet set) cannot satisfy `NOT NULL` constraints on the relational `goals` table. A single JSONB anchor record accepts any partial state, enabling continuous autosave without breaking schema constraints. On submission, the JSONB blob is atomically replaced by strict relational records.

**Why optimistic UI updates for manager approvals?**
Each approval action involves an RPC round-trip. Optimistic updates make the UI feel instant — state reflects the new goal status immediately. On error, a toast notification informs the user and the state can be refreshed. This mirrors the pattern used in Linear, Notion, and Vercel's own dashboards.

**Why Server Components over client-side fetching?**
Page-level data is fully resolved server-side before HTML is sent. This eliminates loading spinners, prevents layout shift, and means the page is useful on first render. Client components handle only interactivity — they never fetch data directly.

**Why deterministic analytics instead of external AI APIs?**
Forecasts based on velocity, momentum, and threshold rules are fully reproducible, zero-latency, and require no API budget. Every insight can be traced to the exact check-in data that produced it. This is more trustworthy for an enterprise audit context than probabilistic outputs from a language model.

**Why RLS instead of application-layer authorization guards only?**
Application guards are defense-in-depth — they can be misconfigured or bypassed. RLS runs at the PostgreSQL execution layer, meaning no query can succeed regardless of how it originates (REST, RPC, direct connection) unless it satisfies the policy. This is the same pattern used by Supabase's own internal platform.

---

## Project Structure

```
atomquest-goal-portal/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, Register
│   │   ├── (dashboard)/        # Protected workspace routes
│   │   ├── api/admin/export/   # Report generation API
│   │   ├── globals.css         # Design tokens
│   │   ├── layout.tsx          # Root layout + providers
│   │   ├── error.tsx           # Global error boundary
│   │   └── loading.tsx         # Suspense fallback
│   ├── components/
│   │   ├── layout/             # DashboardShell, Sidebar, Header
│   │   ├── ui/                 # shadcn/ui component library
│   │   ├── shared/             # Cross-feature reusable UI
│   │   └── providers/          # QueryClient, ThemeProvider
│   ├── features/               # Domain feature modules (see above)
│   ├── lib/                    # Supabase client factory, toast, query config
│   ├── types/                  # Centralized domain contracts
│   ├── hooks/                  # Global hooks (useDebounce, etc.)
│   ├── constants/              # Routes, limits, defaults
│   └── utils/                  # Shared utility functions
└── supabase/
    ├── schema.sql              # Canonical full schema
    └── migrations/             # 10 incremental migrations
```

---

## Demo Access

| Role | Email | Password |
|---|---|---|
| Employee | `employee@demo.quartiq.com` | `Demo@1234` |
| Manager | `manager@demo.quartiq.com` | `Demo@1234` |
| Admin / HR | `admin@demo.quartiq.com` | `Demo@1234` |

> All three roles are pre-seeded with realistic goal data, check-ins, and approval history.

---

## Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier sufficient)

### 1. Clone & Install

```bash
git clone https://github.com/devsivv/atomquest-goal-portal.git
cd atomquest-goal-portal
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Initialize Database

In your Supabase project's **SQL Editor**, run `supabase/schema.sql` for the full schema, or apply the 10 migrations in order from `supabase/migrations/`.

### 4. Run Locally

```bash
npm run dev        # http://localhost:3000
npm run build      # Production build
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (safe for client) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Deployed app URL for auth redirects |
| `NEXT_PUBLIC_APP_NAME` | Optional | Platform display name |

> The anon key is intentionally public — all data access is controlled by PostgreSQL RLS policies, not by keeping credentials secret.

---

## Tech Stack

**Framework & Language**
Next.js 16 (App Router) · React 19 · TypeScript 5 (strict)

**Backend & Auth**
Supabase (PostgreSQL + Auth + RLS) · `@supabase/ssr` (SSR cookie sessions)

**UI**
Tailwind CSS v4 · shadcn/ui · Radix UI · Lucide React · next-themes

**Forms & Validation**
React Hook Form 7 · Zod 4 · `@hookform/resolvers`

**Data & State**
TanStack Query 5 · TanStack Table 8

**Visualization**
Recharts 3 (Area, Bar, Line, Pie charts)

**Utilities**
date-fns 4 · xlsx 0.18 (Excel export) · sonner 2 (toasts)

---

## Deployment

**Vercel** — Import the repository, add environment variables, deploy. Next.js is auto-detected.

Live deployment: [https://atomquest-goal-portal-mu.vercel.app](https://atomquest-goal-portal-mu.vercel.app)

**Supabase** — Fully managed PostgreSQL. Auth via SSR cookies. Privileged operations use `SECURITY DEFINER` RPCs. Audit mutations are written by PostgreSQL triggers — the application layer cannot bypass them.

---

## Screenshots

> **[→ Explore the live demo](https://atomquest-goal-portal-mu.vercel.app/login)** to see all views in action.

| View | Path |
|---|---|
| Employee Goal Planning | `/employee/plan` |
| Manager Review Dashboard | `/manager` |
| Executive Analytics | `/admin/analytics` |
| Governance & Audit Trail | `/admin/governance` |
| Export Center | `/admin/reports` |
| User Management | `/admin/users` |
| Quarterly Tracking | `/employee/tracking` |

---

## Roadmap

- **Real-time notifications** via Supabase Realtime WebSocket subscriptions
- **OKR cascade** — org-level objectives cascading to teams and individuals
- **360° peer feedback** linked to goal cycles
- **HRIS sync** — roster import from Workday / BambooHR
- **Historical cycle benchmarking** — year-over-year performance comparisons
- **Slack / Teams integration** — approval requests and check-in reminders

---

<div align="center">

Built for the **AtomQuest Hackathon** by **Shivam Dubey**

[![GitHub](https://img.shields.io/badge/GitHub-devsivv-black?style=flat-square&logo=github)](https://github.com/devsivv)

*Quartiq demonstrates what enterprise performance management looks like when built with workflow correctness, production architecture, and real business discipline, not just UI aesthetics.*

</div>
