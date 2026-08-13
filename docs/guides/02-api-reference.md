# Complete API Reference Catalog

This document is the master catalog of key API endpoints and resource route patterns across all 14 development phases for the Adaptive Examination & AI Learning Platform. All resource endpoints follow the standardized CRUD, pagination, filtering, and versioning patterns detailed herein.

## 1. Global Conventions

### Response Envelope Format
All APIs MUST return data wrapped in standard JSend-like envelopes:
```json
{
  "status": "success", // 'success' | 'fail' | 'error'
  "data": { ... },     // Only present on success/fail
  "message": "...",    // Optional human-readable message
  "meta": { ... }      // Optional pagination/rate-limit data
}
```

### Error Response
```json
{
  "status": "error",
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": []
  }
}
```

### Authentication Header
`Authorization: Bearer <JWT_ACCESS_TOKEN>`

### Pagination, Filtering, Sorting
- `?page=1&limit=20`
- `?sort_by=created_at&sort_order=desc`
- `?filter[status]=ACTIVE`

---

## 2. API Catalog by Module

### Auth Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Authenticate user | No | - | `{ email, password }` | Tokens + User | 1 |
| POST | `/api/v1/auth/refresh` | Get new access token | No | - | `{ refresh_token }` | Tokens | 1 |
| POST | `/api/v1/auth/logout` | Revoke refresh token | Yes | - | `{ refresh_token }` | Success msg | 1 |
| POST | `/api/v1/auth/change-password` | Change password | Yes | - | `{ old, new }` | Success msg | 1 |
| POST | `/api/v1/auth/setup` | Initial admin setup | No | - | `{ email, password }` | Tokens | 1 |

### Users Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/users` | List users | Yes | `users.read` | - | `User[]` | 1 |
| POST | `/api/v1/users` | Create user | Yes | `users.create` | `UserCreateDTO` | `User` | 1 |
| GET | `/api/v1/users/:id` | Get user details | Yes | `users.read` | - | `User` | 1 |
| PATCH| `/api/v1/users/:id` | Update user | Yes | `users.update` | `UserUpdateDTO` | `User` | 1 |
| PATCH| `/api/v1/users/:id/status`| Change user status | Yes | `users.update` | `{ status }` | `User` | 1 |
| PUT | `/api/v1/users/:id/roles` | Assign user roles | Yes | `roles.update` | `{ role_ids }` | `User` | 1 |
| POST | `/api/v1/users/:id/revert` | Revert user profile | Yes | `users.update` | `{ targetVersionId }` | `User` | 1 |
| POST | `/api/v1/users/:id/restore` | Restore archived user | Yes | `users.update` | `{ reason }` | `User` | 1 |

### Roles & Permissions Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/roles` | List roles | Yes | `roles.read` | - | `Role[]` | 1 |
| POST | `/api/v1/roles` | Create role | Yes | `roles.create` | `RoleCreateDTO` | `Role` | 1 |
| GET | `/api/v1/roles/:id` | Get role details | Yes | `roles.read` | - | `Role` | 1 |
| PUT | `/api/v1/roles/:id` | Update role | Yes | `roles.update` | `RoleUpdateDTO` | `Role` | 1 |
| PUT | `/api/v1/roles/:id/permissions`| Update role perms| Yes| `roles.update`| `{ permission_ids }`| `Role` | 1 |
| DELETE| `/api/v1/roles/:id` | Delete custom role | Yes | `roles.delete` | - | Success msg | 1 |
| GET | `/api/v1/permissions` | List all permissions | Yes | `permissions.read` | - | `Permission[]` | 1 |

### Courses & Enrollment Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/courses` | List courses | Yes | `courses.read` | - | `Course[]` | 2 |
| POST | `/api/v1/courses` | Create course | Yes | `courses.create` | `CourseCreateDTO` | `Course` | 2 |
| GET | `/api/v1/courses/:id` | Get course | Yes | `courses.read` | - | `Course` | 2 |
| PATCH| `/api/v1/courses/:id` | Update course | Yes | `courses.update` | `CourseUpdateDTO` | `Course` | 2 |
| POST | `/api/v1/enrollments` | Enroll student | Yes | `enrollments.create`| `{ user_id, course_id }`| `Enrollment` | 2 |

### Syllabus Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/syllabus/subject/:id` | Get syllabus tree | Yes | `syllabus.read`| - | `SyllabusNode[]`| 2 |
| POST | `/api/v1/syllabus` | Create node | Yes | `syllabus.create`| `NodeCreateDTO` | `SyllabusNode` | 2 |
| POST | `/api/v1/syllabus/reorder` | Reorder nodes | Yes | `syllabus.update`| `{ orders: [] }` | Success msg | 2 |

### Questions Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/questions` | List questions | Yes | `questions.read`| - | `Question[]` | 3 |
| POST | `/api/v1/questions` | Create question | Yes | `questions.create`| `QuestionDTO` | `Question` | 3 |
| GET | `/api/v1/questions/:id` | Get question | Yes | `questions.read`| - | `Question` | 3 |
| PATCH| `/api/v1/questions/:id` | Update question | Yes | `questions.update`| `QuestionDTO` | `Question` | 3 |
| GET | `/api/v1/questions/:id/versions`| List versions | Yes | `questions.read`| - | `Version[]` | 3 |

### Exam Patterns Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/exam-patterns` | List patterns | Yes | `exam_patterns.read` | - | `Pattern[]` | 4 |
| POST | `/api/v1/exam-patterns` | Create pattern | Yes | `exam_patterns.create`| `PatternDTO` | `Pattern` | 4 |
| POST | `/api/v1/exam-patterns/:id/validate`| Validate rules | Yes | `exam_patterns.validate` | - | `ValidationRes` | 4 |

### Exam Generator & Management Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/exams` | List exams | Yes | `exams.read` | - | `Exam[]` | 5 |
| POST | `/api/v1/exams/generate`| Generate from pattern| Yes | `exams.generate` | `{ pattern_id }` | `Exam` | 5 |
| POST | `/api/v1/exams` | Create manual exam | Yes | `exams.create` | `ExamDTO` | `Exam` | 5 |
| POST | `/api/v1/exams/:id/publish`| Publish exam | Yes | `exams.publish` | - | `Exam` | 5 |

### Exam System & Attempts Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/exams/active` | List student exams | Yes | `exams.read` | - | `Exam[]` | 6 |
| POST | `/api/v1/attempts/start`| Start exam attempt| Yes | `exams.attempt` | `{ exam_id }` | `Attempt` | 6 |
| PUT | `/api/v1/attempts/:id/sync`| Sync attempt answers| Yes | `exams.attempt` | `AnswerDTO` | `Success` | 6 |
| POST | `/api/v1/attempts/:id/submit`| Finalize attempt | Yes | `exams.attempt` | - | `Result` | 6 |
| GET | `/api/v1/attempts/:id/results`| View attempt result| Yes | `results.read_own` | - | `Result` | 6 |
| POST | `/api/v1/attempts/:id/flag` | Flag result for review | Yes | `results.flag` | `{ reason }` | Audit Log | 6 |

### Exam Archive Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/archive/exams` | Search published archive | Yes | `archive.read` | Query params | `ExamArchive[]` | 7 |
| GET | `/api/v1/archive/exams/:id/snapshot` | Get frozen snapshot | Yes | `archive.read` | - | `SnapshotJSON` | 7 |

### Mastery & Analytics Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/mastery/map` | Get student proficiency tree | Yes | `mastery.read` | - | `ProficiencyMap` | 8 |
| GET | `/api/v1/mastery/student/:id`| Get student profile| Yes| `mastery.read` | - | `MasteryProfile`| 8 |
| GET | `/api/v1/mastery/strengths` | Get strengths | Yes| `mastery.read` | - | `Strength[]` | 8 |
| GET | `/api/v1/mastery/weaknesses` | Get weaknesses | Yes| `mastery.read` | - | `Weakness[]` | 8 |

### Practice Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/practice/generate` | Gen custom paper | Yes | `practice.create`| `PracticePref` | `PracticePaper` | 9 |
| GET | `/api/v1/practice/:id` | Fetch practice paper | Yes | `practice.read` | - | `PracticePaper` | 9 |

### Preview System Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/preview/profiles` | Create preview persona | Yes | `preview.create` | `{ simulated_tier }` | `PreviewProfile` | 10 |
| POST | `/api/v1/preview/impersonate` | Start impersonation | Yes | `preview.impersonate` | `{ target_user_id }` | `ImpersonateToken` | 10 |

### AI Gateway Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/ai/generate` | AI Question Gen | Yes | `ai.generate` | `PromptDTO` | `AIQuestion` | 11 |
| POST | `/api/v1/ai/modify` | AI Question Rephrase | Yes | `ai.modify` | `{ question_id }` | `AIQuestion` | 11 |

### AI Interview Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| POST | `/api/v1/interviews/sessions`| Start AI interview| Yes | `interviews.create`| `{ template_id }`| `Session` | 12 |
| POST | `/api/v1/interviews/messages`| Send interview response | Yes | `interviews.interact`| `{ session_id, message }` | `AIResponse` | 12 |
| POST | `/api/v1/interviews/assess` | Generate report | Yes | `interviews.assess`| `{ session_id }` | `Assessment` | 12 |

### Subscriptions, Entitlements & Billing Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/subscriptions/plans` | List active plans | Yes | `subscriptions.read` | - | `Plan[]` | 13 |
| GET | `/api/v1/subscriptions/me` | Current user plan | Yes | `subscriptions.read` | - | `Subscription` | 13 |
| GET | `/api/v1/entitlements/check` | Check feature access | Yes | `entitlements.check` | `{ key }` | `{ allowed: true }` | 13 |
| GET | `/api/v1/ai-credits/balance` | Get credit balance | Yes | `credits.read` | - | `{ balance }` | 13 |
| POST | `/api/v1/ai-credits/purchase` | Purchase AI credits | Yes | `credits.purchase` | `{ package_id }` | `Invoice` | 13 |
| GET | `/api/v1/billing/transactions` | Financial Audit Logs | Yes | `billing.manage` | Query params | `Array<Log>` | 13 |
| POST | `/api/v1/billing/refunds` | Process Refund ("Return Money") | Yes | `billing.manage` | `{ gateway_payment_id, amount, reason }` | `RefundResult` | 13 |

### Git-Like Versioning & Rollback Module (`@repo/versioning-engine`)
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/versioning/:type/:id/history` | Entity Version History | Yes | `versioning.read` | None | `Array<Version>` | All |
| GET | `/api/v1/versioning/:type/:id/diff` | Entity Version Diff | Yes | `versioning.read` | Query params | `DiffResult` | All |
| POST | `/api/v1/versioning/:type/:id/revert` | Revert Entity Version | Yes | `versioning.revert` | `{ targetVersionId, reason }` | `NewVersion` | All |
| POST | `/api/v1/versioning/:type/:id/restore` | Restore Soft-Deleted Entity | Yes | `versioning.restore` | `{ reason }` | `Entity` | All |

### Audit Logging Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/audit-logs` | Query audit logs | Yes | `audit.read` | Query params | `AuditLog[]` | All |
| GET | `/api/v1/audit-logs/export` | Export CSV audit logs | Yes | `audit.export` | Query params | `CSV Stream` | All |

### Notifications Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/notifications` | List user alerts | Yes | `notifications.read` | - | `Notification[]` | All |
| PATCH| `/api/v1/notifications/:id/read` | Mark as read | Yes | `notifications.update` | - | `Notification` | All |

### Localization & User Preferences Module
| Method | Path | Description | Auth | Permission | Request Body | Response | Phase |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/i18n/languages` | List supported languages | No | - | - | `Language[]` | 1 |
| GET | `/api/v1/i18n/translations/:langCode` | Get translation dictionary | No | - | - | `DictionaryJSON` | 1 |
| POST | `/api/v1/i18n/languages` | Add new language | Yes | `i18n.manage` | `LanguageDTO` | `Language` | 1 |
| POST | `/api/v1/i18n/translations` | Add/update translations | Yes | `i18n.manage` | `TranslationDTO` | `Success` | 1 |
| GET | `/api/v1/users/me/preferences` | Get user theme & language | Yes | `preferences.read` | - | `UserPreferences` | 1 |
| PATCH| `/api/v1/users/me/preferences` | Update theme & language | Yes | `preferences.update` | `{ theme_mode, preferred_lang_code }` | `UserPreferences` | 1 |
