# Phase Dependency Map & Feature Index

## Phase Dependency Graph

```mermaid
graph TD
    P1["Phase 1: Foundation<br/>Auth, Users, RBAC, Audit"]
    P2["Phase 2: Academic Structure<br/>Courses, Subjects, Syllabus"]
    P3["Phase 3: Question Bank<br/>Questions, Types, Versioning"]
    P4["Phase 4: Exam Pattern<br/>Blueprints, Sections, Rules"]
    P5["Phase 5: Exam Generator<br/>Paper Generation, Balancing"]
    P6["Phase 6: Exam System<br/>Attempts, Timer, Evaluation"]
    P7["Phase 7: Exam Archive<br/>Snapshots, Immutability"]
    P8["Phase 8: Student Analytics<br/>Mastery, Strengths, Weaknesses"]
    P9["Phase 9: Personalized Practice<br/>Weakness Pool, Adaptive"]
    P10["Phase 10: Preview System<br/>Impersonation, Plan Simulation"]
    P11["Phase 11: AI Questions<br/>Gateway, Modification, Generation"]
    P12["Phase 12: AI Interview<br/>STT, TTS, Conversation Engine"]
    P13["Phase 13: Subscriptions<br/>Plans, Entitlements, Credits"]
    P14["Phase 14: Production Hardening<br/>Security, Monitoring, Deploy"]

    P1 --> P2
    P1 --> P10
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P6 --> P8
    P8 --> P9
    P9 --> P11
    P3 --> P11
    P11 --> P12
    P10 --> P13
    P8 --> P13
    P12 --> P13
    P13 --> P14
end
```

---

## Phase Build Order (Critical Path)

```
Phase 1 ─────────────────────────────────────────────────────────┐
  │                                                               │
  ├── Phase 2 ──── Phase 3 ──── Phase 4 ──── Phase 5            │
  │                   │                         │                 │
  │                   │                     Phase 6               │
  │                   │                      │    │               │
  │                   │                   Phase 7  Phase 8        │
  │                   │                              │            │
  │                   │                           Phase 9         │
  │                   │                              │            │
  │                   └── Phase 11 ──── Phase 12     │            │
  │                                        │         │            │
  ├── Phase 10 ────────────────────────────┴─────────┤            │
  │                                                   │            │
  │                                              Phase 13          │
  │                                                   │            │
  └───────────────────────────────────────────── Phase 14 ────────┘
```

---

## Complete Feature Index

### Phase 1 — Foundation (12 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 1.1 | Monorepo Setup & Infrastructure | Infrastructure | 8+ |
| 1.2 | Database Package (@repo/database) | Infrastructure | 10+ |
| 1.3 | Shared Types Package (@repo/types) | Package | 6+ |
| 1.4 | Validation Package (@repo/validation) | Package | 15+ |
| 1.5 | Permissions Package (@repo/permissions) | Package | 12+ |
| 1.6 | Authentication System | API + Security | 20+ |
| 1.7 | User Management (CRUD) | API + Frontend | 25+ |
| 1.8 | Role & Permission Management | API + Frontend | 15+ |
| 1.9 | Audit Logging | API + Middleware | 12+ |
| 1.10 | API Middleware Stack | Infrastructure | 15+ |
| 1.11 | Frontend Foundation | Frontend | 20+ |
| 1.12 | 3-Theme Switcher & Multilingual Engine | API + Frontend | 12+ |

### Phase 2 — Academic Structure (6 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 2.1 | Course Management | API + Frontend | 18+ |
| 2.2 | Subject Management | API + Frontend | 12+ |
| 2.3 | Syllabus Tree (Hierarchical) | API + Frontend | 20+ |
| 2.4 | Syllabus Node Metadata | API | 10+ |
| 2.5 | Course-Subject-Syllabus Frontend | Frontend | 15+ |
| 2.6 | Student Course Enrollment | API + Frontend | 12+ |

### Phase 3 — Question Bank (8 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 3.1 | Pluggable Question Type System | Package | 25+ |
| 3.2 | Question CRUD | API + Frontend | 20+ |
| 3.3 | Question Versioning | API | 15+ |
| 3.4 | Question Tags | API + Frontend | 12+ |
| 3.5 | Question Lifecycle | API | 15+ |
| 3.6 | Previous Exam Tracking | API | 10+ |
| 3.7 | Question Bank Frontend | Frontend | 18+ |
| 3.8 | Question Bank Analytics | API + Frontend | 10+ |

### Phase 4 — Exam Pattern (10 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 4.1 | Exam Pattern CRUD | API | 15+ |
| 4.2 | Exam Pattern Sections | API | 12+ |
| 4.3 | Section Question Rules | API | 15+ |
| 4.4 | Topic Distribution | API | 10+ |
| 4.5 | Difficulty Distribution | API | 10+ |
| 4.6 | Negative Marking Configuration | API | 10+ |
| 4.7 | Multi-Subject Allocation | API | 10+ |
| 4.8 | Exam Pattern Validation Engine | Package | 20+ |
| 4.9 | Exam Pattern Versioning | API | 10+ |
| 4.10 | Exam Pattern Frontend | Frontend | 15+ |

### Phase 5 — Exam Generator (4 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 5.1 | Exam Generation Engine | Package | 25+ |
| 5.2 | Draft Exam Inspection | API + Frontend | 15+ |
| 5.3 | Exam Metadata | API | 10+ |
| 5.4 | Manual Exam Creation | API + Frontend | 12+ |

### Phase 6 — Exam System (8 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 6.1 | Student Exam Access | API + Frontend | 12+ |
| 6.2 | Exam Attempt Session | API + Frontend | 20+ |
| 6.3 | Answer Submission & Types | API | 18+ |
| 6.4 | Exam Completion | API + Frontend | 12+ |
| 6.5 | Auto-Evaluation Engine | Package | 25+ |
| 6.6 | Result Generation | API | 15+ |
| 6.7 | Result Display & Review | Frontend | 12+ |
| 6.8 | Exam-Taking Frontend | Frontend | 20+ |

### Phase 7 — Published Exam Archive (7 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 7.1 | Exam Publication Workflow | API | 15+ |
| 7.2 | Published Exam Snapshot | API | 20+ |
| 7.3 | Answer Key Preservation | API | 15+ |
| 7.4 | Exam Archive & Search | API + Frontend | 15+ |
| 7.5 | Historical Exam Integrity | API | 12+ |
| 7.6 | Exam File Storage | API + Infrastructure | 12+ |
| 7.7 | Archive Frontend | Frontend | 10+ |

### Phase 8 — Student Analytics (7 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 8.1 | Mastery Engine (@repo/mastery-engine) | Package | 25+ |
| 8.2 | Strengths Identification | API | 12+ |
| 8.3 | Weakness Identification | API | 12+ |
| 8.4 | Syllabus Proficiency Map | API | 15+ |
| 8.5 | Progress Tracking | API | 10+ |
| 8.6 | Student Analytics Dashboard | Frontend | 15+ |
| 8.7 | Teacher/Admin Analytics View | API + Frontend | 12+ |

### Phase 9 — Personalized Practice (5 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 9.1 | Weakness Pool Generation | API + Package | 15+ |
| 9.2 | Personalized Practice Paper Generation | API | 18+ |
| 9.3 | Adaptive Mastery Confirmation | Package | 15+ |
| 9.4 | Practice Attempt Tracking | API | 10+ |
| 9.5 | Practice Paper Frontend | Frontend | 12+ |

### Phase 10 — Preview System (7 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 10.1 | Preview Student Profile | API | 12+ |
| 10.2 | Preview Configuration UI | Frontend | 10+ |
| 10.3 | Impersonation System | API + Middleware | 18+ |
| 10.4 | Entitlement Integration | API | 15+ |
| 10.5 | Preview Audit Trail | API | 10+ |
| 10.6 | Preview Workflow | Integration | 12+ |
| 10.7 | Preview Frontend | Frontend | 10+ |

### Phase 11 — AI Question System (9 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 11.1 | AI Gateway Architecture | Infrastructure | 15+ |
| 11.2 | AI Client Package (@repo/ai-client) | Package | 10+ |
| 11.3 | AI Question Modification Worker | AI Server | 15+ |
| 11.4 | AI Question Generation Worker | AI Server | 15+ |
| 11.5 | AI Usage Tracking | API | 12+ |
| 11.6 | AI Worker Queue System | Infrastructure | 12+ |
| 11.7 | Local AI Model Support | AI Server | 10+ |
| 11.8 | Cloud AI Integration | AI Server | 10+ |
| 11.9 | AI Question Frontend | Frontend | 12+ |

### Phase 12 — AI Interview System (11 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 12.1 | Interview Template Management | API | 12+ |
| 12.2 | Interview Topic Engine | API | 10+ |
| 12.3 | Controlled Natural Conversation Engine | AI Server | 20+ |
| 12.4 | Speech-to-Text (STT) Integration | AI Server | 10+ |
| 12.5 | Text-to-Speech (TTS) Integration | AI Server | 10+ |
| 12.6 | Interview Assessment Engine | AI Server | 15+ |
| 12.7 | Interview Feedback Generation | AI Server | 10+ |
| 12.8 | Interview Skill Focus | API | 10+ |
| 12.9 | Practice vs Exam Mode | API | 12+ |
| 12.10 | Interview Session Management | API | 12+ |
| 12.11 | Interview Frontend | Frontend | 15+ |

### Phase 13 — Subscriptions & Entitlements (8 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 13.1 | Entitlement Engine (@repo/entitlement-engine) | Package | 20+ |
| 13.2 | Subscription Management | API | 15+ |
| 13.3 | AI Credit System | API | 15+ |
| 13.4 | AI Usage Tracking & Limits | API | 12+ |
| 13.5 | Billing Integration (Pluggable) | API | 10+ |
| 13.6 | Preview Mode Billing | API | 10+ |
| 13.7 | Free Tier Experience | Integration | 12+ |
| 13.8 | Subscription Frontend | Frontend | 12+ |

### Phase 14 — Production Hardening (10 Features)
| ID | Feature | Type | Tests |
|---|---|---|---|
| 14.1 | Security Hardening | Security | 20+ |
| 14.2 | Audit System Enhancement | API | 10+ |
| 14.3 | Backup & Recovery | Infrastructure | 10+ |
| 14.4 | Monitoring & Alerting | Infrastructure | 10+ |
| 14.5 | Performance Optimization | Performance | 15+ |
| 14.6 | AI Queue & Rate Management | Infrastructure | 12+ |
| 14.7 | Abuse Protection | Security | 12+ |
| 14.8 | Data Privacy & Compliance | Security | 10+ |
| 14.9 | Deployment Configuration | Infrastructure | 10+ |
| 14.10 | Documentation | Documentation | 5+ |

---

## Totals

| Metric | Count |
|---|---|
| **Total Phases** | 14 |
| **Total Features** | 112 |
| **Total Estimated Tests** | 1,600+ |
| **Shared Packages** | 9 |
| **API Modules** | 17 |
| **Frontend Page Groups** | 14 |

> [!NOTE]
> **Platform Strategy Scope**: Native mobile app is out of scope for the current build (Phases 1–14). The delivery sequence is (1) full desktop web [Phases 1–14 Scope], (2) mobile-responsive/bootstrap web, (3) native mobile app — to be scoped only after (1) and (2) are complete.

---

## Cross-Phase Test Regression Strategy

After completing each phase, ALL previous phase tests must pass:

| After Phase | Run Tests For |
|---|---|
| Phase 2 | Phase 1 + Phase 2 |
| Phase 3 | Phase 1 + 2 + 3 |
| Phase 4 | Phase 1 + 2 + 3 + 4 |
| Phase 5 | Phase 1-5 |
| Phase 6 | Phase 1-6 |
| Phase 7 | Phase 1-7 |
| Phase 8 | Phase 1-8 |
| Phase 9 | Phase 1-9 |
| Phase 10 | Phase 1-10 |
| Phase 11 | Phase 1-11 |
| Phase 12 | Phase 1-12 |
| Phase 13 | Phase 1-13 |
| Phase 14 | Phase 1-14 (FULL SUITE) |

**Zero tolerance for regression failures.** Any failing test from a previous phase blocks the current phase.
