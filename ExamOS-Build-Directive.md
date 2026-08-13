# ExamOS — Build Directive for AgentOS

## Role & Objective

You are building ExamOS, an adaptive exam and AI learning platform, from the documentation in `docs/`. This is a single-tenant, direct-service platform (not multi-tenant SaaS) built by one supervising engineer using autonomous agent-assisted development. Follow this directive exactly — it defines entry point, execution order, source-of-truth hierarchy, locked scope decisions, and the state-tracking protocol you must maintain throughout.

---

## 1. Entry Point — Read in This Order Before Writing Any Code

1. `README.md` — project overview, tech stack, monorepo structure, Architecture Decision Summary (13 items)
2. `docs/architecture.md` — all 13 ADRs, especially:
   - ADR-005 (Permission-Based Authorization — permissions are checked, never role names)
   - ADR-008 (Entitlement Engine)
   - ADR-010 (Entity Versioning & Rollback)
   - ADR-011 (Financial Audit & Refund Adapter)
   - ADR-012 (`guides/02-api-reference.md` is the single source of truth for endpoints/permissions)
   - ADR-013 (3-Theme Switcher & Database-Driven Multilingual Engine — foundational, built in Phase 1)
3. `docs/phase-dependency-map.md` — the 14-phase build DAG, 112 total features across all phases
4. `docs/guides/01-database-schema-erd.md` — full schema, all 15 modules (Section 3.1–3.15)
5. `docs/guides/02-api-reference.md` — canonical endpoint/permission catalog

Do not begin Phase 1 implementation until you have read all five.

---

## 2. Execution Order

Follow `docs/phase-dependency-map.md`'s 14-phase sequence strictly. Do not start work on a phase whose upstream dependencies (per the DAG) are not yet built and verified. If you believe a dependency is missing or the DAG is wrong, stop and flag it — do not silently reorder or skip.

**Note on Feature 1.12 (3-Theme Switcher & i18n Engine):** this is deliberately placed in Phase 1, not deferred, because it is cross-cutting — every screen built in every subsequent phase consumes `ThemeSwitcher`, `LanguageSelector`, and `I18nProvider`. Build it alongside the rest of Phase 1 foundation, before any screens in Phase 2 onward are built, to avoid retrofitting theme/i18n into already-built UI.

---

## 3. Source-of-Truth Hierarchy

Documentation conflicts will happen across 128 files. When a spec (`docs/specs/*.md`) or role doc (`docs/roles/*.md`) disagrees with one of the following, **the canonical doc wins**:

- **Schema/data model** → `docs/guides/01-database-schema-erd.md`
- **Endpoints, permission strings, request/response shapes** → `docs/guides/02-api-reference.md`
- **Architecture decisions, module boundaries** → `docs/architecture.md`

If you hit a genuine conflict (not just missing detail — an actual contradiction), do not silently pick one side. Log it in `STATE.md` under "Open Conflicts" and continue with the canonical doc's version.

---

## 4. Locked Scope Decisions — Do Not Re-litigate

These are final. Do not build toward alternatives, do not add scaffolding "just in case":

- **Single-tenant, direct-service model.** No `orgId`/`tenantId` scoping anywhere in the schema, API, or middleware. Any doc still referencing multi-tenancy as a current requirement (rather than an explicitly-marked future phase, per `phase-14-production-hardening.md`) is stale — treat it as single-tenant and flag it in `STATE.md` rather than implementing tenant isolation.
- **Mobile app is deferred.** Build sequence is (1) full desktop web, (2) mobile-responsive/bootstrap web, (3) native mobile app — native mobile is out of scope for all 14 phases in this directive.
- **Deployment target: self-hosted VPS via `docker-compose.prod.yml`** as the default (per `docs/guides/11-cicd-pipeline.md`'s single-tenant deployment note). Helm/Kubernetes paths in that doc are optional future scale-up, not the current target — do not build Helm charts unless explicitly instructed later.
- **Permission strings are lowercase dot-notation, plural resource: `resource.action`** (e.g. `courses.create`, `exams.publish`, `i18n.manage`, `preferences.update`). Never role-name checks (`if role === 'teacher'`) — always permission checks via middleware, per ADR-005.
- **Theme & i18n are foundational (Feature 1.12), not optional polish.** 3 theme modes (`LIGHT`, `GRAY`, `DARK`) and 23-language database-driven translation (22 official Indian languages + English) are built in Phase 1, per ADR-013.

---

## 5. State File Protocol (Mandatory — Layer 3 Requirement)

Before starting Phase 1, create `STATE.md` at the project root. This is the resumability anchor — any session (yours or a human's) must be able to read it and know exactly where the project stands in under 5 minutes.

**`STATE.md` must contain, updated after every phase and every significant milestone:**

```markdown
# ExamOS Build State

**Last updated:** [ISO timestamp]
**Current phase:** [N — phase name]

## Completed Phases
- Phase N: [one-line summary] — verified against spec on [date]

## In Progress
- [what's actively being built, which files/modules]

## Next Action
- [the single next concrete step]

## Blockers
- [anything stopping progress, or "none"]

## Open Conflicts
- [doc contradictions found, which source-of-truth doc was followed, date flagged]

## Deviations From Docs
- [anywhere implementation intentionally differs from what a doc says, and why]
```

Update this file before ending any work session, not just at phase boundaries. Never let it go stale — a stale `STATE.md` is worse than none, because it will be trusted.

---

## 6. Verification Gate — Per Phase, Not Just at the End

After completing each phase's implementation:

1. Cross-check the built code against that phase's entry in `docs/phases/phase-XX-*.md`
2. Cross-check schema usage against `docs/guides/01-database-schema-erd.md`
3. Cross-check endpoints against `docs/guides/02-api-reference.md`
4. Cross-check error handling against `docs/guides/09-error-code-registry.md` for that phase's modules
5. Run the test cases specified for that phase in `docs/test-strategy.md`
6. Only then update `STATE.md` to mark the phase complete and move to the next

Do not batch verification to the end of the project. A phase is not "done" until it passes this gate.

---

## 7. Security-Critical Checks — Mandatory at End of Phase 1 and Every Phase Touching Auth/Data Access

A prior security audit on this codebase found three specific failure classes: IDOR (missing ownership checks), broken JWT role propagation, and missing validation pipeline wiring. These are not hypothetical — they are the actual bug classes that occurred before under this same architecture (ADR-005, decentralized permission checks per endpoint). Treat these as standing requirements, not one-time fixes:

1. **Ownership vs. permission are two separate checks, both required.** Every `GET/PATCH/DELETE /resource/:id`-style endpoint must verify both: (a) the caller has the relevant permission, AND (b) the resource actually belongs to/is accessible by the caller. A permission check alone (e.g. `users.update`) is not sufficient to prevent one user editing another user's resource by ID — that is IDOR. Do not consider an endpoint complete until both checks are demonstrated.
2. **JWT/session invalidation on role or permission change.** When a user's role or permissions are modified, confirm whether existing issued tokens are invalidated immediately or continue operating on stale permissions until expiry. State the actual behavior explicitly in `STATE.md` under Phase 1 — do not leave this undocumented or assumed.
3. **Validation pipeline coverage must be total, not partial.** Every DTO/request body must run through the validation pipeline before reaching a controller — no exceptions for "simple" or "internal" endpoints. When completing a phase, explicitly confirm in your phase summary that 100% of that phase's endpoints have validation wired, not just "most" or "the main ones."

At the end of Phase 1 (and any later phase introducing new auth/data-access surface), produce a short written confirmation of all three items before marking the phase complete in `STATE.md`. Do not proceed to the next phase without this confirmation.

---

## 8. No Hedge Language — Flag Silent Scope Decisions Explicitly

If your own summary of completed work contains words like "assumed," "likely," "for now," "simplified," or "for the sake of," that is a signal you made an undocumented scope decision. Do not let this pass silently:

- Every such instance must be written explicitly into `STATE.md` under "Deviations From Docs," including what was assumed and why.
- Do not resolve ambiguity by picking the easier interpretation without flagging it — flag first, then proceed with the source-of-truth hierarchy (Section 3).

---

## 9. Session Resume Protocol

At the start of every new session on this project, before taking any action:

1. Read `STATE.md` in full.
2. Summarize: current phase, what's done, what's next, any open conflicts or blockers.
3. Do not begin new work until this summary has been produced.

If `STATE.md` is missing, stale (not updated at the last phase boundary), or contradicts the actual state of the codebase, stop and flag this before proceeding — do not silently reconstruct state from the code alone.

---

## 10. What to Do When You Find a Doc Gap

This documentation set has been through an extensive multi-round correction process — schema completeness (15 modules), RBAC/permission consistency (ADR-012), API reference accuracy, phase DAG integrity, error-code coverage (15 ranges, no collisions), single-tenant consistency across specs/roles/phases, and feature-count integrity (112 features, independently verified) have all been checked and re-verified. It is not expected to be flawless. If you find a genuine gap or contradiction during implementation:

1. Do not silently invent a resolution that isn't traceable to a canonical doc
2. Log it in `STATE.md` under "Open Conflicts" or "Deviations From Docs"
3. Apply the source-of-truth hierarchy (Section 3) to proceed
4. Flag it clearly in your session summary so the supervising engineer can review

---

## Start

Begin with Section 1 (Entry Point reading), then create `STATE.md`, then begin Phase 1 per `docs/phases/phase-01-foundation.md` — including Feature 1.12 (Theme & i18n) as part of the Phase 1 foundation, not a later add-on. Do not skip Section 7's security confirmation at the end of Phase 1.
