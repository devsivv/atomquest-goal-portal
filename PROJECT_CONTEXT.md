# Project Context: AtomQuest Enterprise Goal Portal

## 1. Project Overview
AtomQuest is an enterprise-grade performance management platform designed for structured goal setting, tracking, and manager approval workflows. The system prioritizes strict business rules (BRD compliance) while offering a seamless "autosave-first" user experience.

## 2. Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: PostgreSQL (Supabase)
- **UI System**: Tailwind CSS + shadcn/ui
- **Form Management**: React Hook Form
- **Validation**: Zod
- **Authentication**: Supabase Auth (SSR)

## 3. Directory Architecture (Current)
- `src/types/goals/`: Centralized domain contracts.
  - `enums.ts`: Goal lifecycle and UOM definitions.
  - `entities.ts`: Database row representations.
  - `payloads.ts`: Tiered structures (Draft vs. Submission).
- `src/features/goals/`: Feature-encapsulated logic.
  - `components/`: Modular UI (Dashboard, Banner, Row, etc.).
  - `schemas/`: Atomic and composite Zod validation engine.
  - `services/`: Supabase data access layer (Persistence).
  - `constants/`: Default values and limits.
  - `utils/`: Label mappers and calculations.
- `supabase/`: Canonical SQL schema and audit triggers.

## 4. Completed Phases
- **Phase 1: Core Foundation**: RBAC redirection, Auth integration, and Role-based routing (`/employee`, `/manager`, `/admin`).
- **Phase 2: Enterprise Goal Engine**: Refactored domain architecture, Autosave JSONB implementation, Tiered Zod validation, and Dynamic Goal Creation UI.

## 5. Canonical Domain Model (The "7 Fields")
The platform enforces a strict set of 7 canonical fields for every goal:
1. `thrust_area` (Strategic grouping)
2. `title` (Short objective)
3. `description` (Detailed context)
4. `uom_type` (Unit of Measurement strategy)
5. `target_value` (Numeric/Percentage target)
6. `weightage` (Percentage of total cycle)
7. `deadline_date` (Specific completion milestone)

**DEPRECATED FIELDS (NEVER USE)**: `priority`, `category`, `due_date`.

## 6. Persistence & Workflow Architecture

### Autosave JSONB Strategy
To support a high-productivity "drafting" experience without triggering strict database constraints (NOT NULL, FKs), we use a **JSONB Anchor Pattern**:
- **Anchor Record**: A single row in the `goals` table (per `profile_id`, `cycle_id`) holds the entire planning state in the `draft_content` JSONB column.
- **Permissive Schema**: Drafts use `Partial<GoalFormPayload>` to allow saving incomplete fields (e.g., just a title without a weightage).

### Validation Architecture
- **Loose Draft Validation**: Allows typing and partial saves.
- **Strict Submission Validation**: Enforced via `zodResolver` on `handleSubmit`.
  - **Rule 1**: Total weightage across all goals must equal exactly 100%.
  - **Rule 2**: Each goal must have a minimum weightage of 10%.
  - **Rule 3**: Maximum of 8 goals per cycle.

### UI Orchestration (React Hook Form)
- **Parent**: `GoalCreationDashboard.tsx` (Orchestrates form state and autosave effect).
- **Banner**: `GoalTrackerBanner.tsx` (Live progress calculation and UX feedback).
- **Array**: `GoalFormArray.tsx` (Manages dynamic row addition/removal via `useFieldArray`).
- **Row**: `GoalFormRow.tsx` (Isolated field rendering).

## 7. Service Layer Methods (`goals.service.ts`)
- `getDraftGoals`: Retrieves the JSONB collection for a specific cycle.
- `saveDraft`: Upserts the JSONB anchor record with current form state.
- `submitGoals`: 
  1. Deletes any existing goals/drafts for the cycle.
  2. Inserts strict relational records for each goal.
  3. Sets `status = "submitted"` and populates `submitted_at`.

## 8. Engineering Constraints & Rules
- **No Inline Business Logic**: Keep weightage calculations and validation rules inside schemas or utility files.
- **Preserve Aesthetic**: Maintain the enterprise SaaS dashboard aesthetic (polished spacing, subtle micro-interactions).
- **Type Integrity**: Never cast to `any` unless absolutely necessary for complex RHF-to-Zod generic mismatches (already handled in the Dashboard).
- **Clean Slate Submission**: Submission should always resolve the "Draft" vs "Relational" state by converting the JSONB blob into formal rows.

## 9. Next Objectives (Phase 3)
- **Manager Approval Workflow**: Implementation of `/manager` dashboard to review, approve, or request revisions for submitted goals.
- **Cycle Locking**: Enforcing the `is_locked` flag on approved goals.
- **Quarterly Check-ins**: Transitioning goals from "Submitted/Approved" to "Progress Tracking".

## 10. Current UI/UX Status
- **Enterprise SaaS Aesthetic**: Polished card-based layouts, modern typography, and vibrant status indicators.
- **Responsive Planning Workflow**: Dynamic goal addition/removal optimized for both desktop and tablet views.
- **Live Weightage Tracking**: Real-time visual feedback on total weightage distribution (Yellow/Green/Red states).
- **Autosave UX**: Discreet status indicators (Saving/Saved) ensuring data persistence without intrusive loaders.
- **Validation-Driven UX**: Inline field validation and submission gating based on strict business logic.

## 11. Stable Architecture Decisions (MUST PRESERVE)
Future development must adhere to these established patterns to maintain stability:
- **RHF Field Array Architecture**: All dynamic goal collections must use `useFieldArray` for state management.
- **Centralized Zod Validation**: Business logic and field constraints reside exclusively in schemas, never in component event handlers.
- **JSONB Autosave Anchor Pattern**: Partial state persistence must continue using the single-record `draft_content` strategy.
- **Supabase Client Injection**: Services must remain stateless, accepting the Supabase client as a parameter for SSR compatibility.
- **Modular Component Separation**: Keep `GoalTrackerBanner`, `GoalFormArray`, and `GoalFormRow` decoupled.
- **No Global State Overkill**: Avoid introducing Redux or Zustand; local RHF state is sufficient for this workflow.
- **Canonical 7-Field Model**: Do not re-introduce `priority`, `category`, or `due_date`.

## 12. Demo & Hackathon Priorities
- **Workflow Stability**: Prioritize bug-free, end-to-end user journeys over adding new secondary features.
- **Lifecycle Storytelling**: Ensure the path from "Employee Planning" to "Manager Review" is polished and demo-ready.
- **Risk Mitigation**: Avoid architectural rewrites or major dependency changes before the final submission.
- **Manager Approval Next**: The primary objective is now the Manager review interface and approval/rejection state transitions.
