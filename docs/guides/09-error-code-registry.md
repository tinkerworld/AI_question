# Error Code Registry

This document serves as the centralized registry for all application error codes. Standardizing error codes allows for consistent error handling on the frontend and easier debugging.

**Format**: `{MODULE}_{NUMBER}`

## AUTH (001-099) - Authentication Errors
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| AUTH_001 | 400 | Invalid Credentials | Email or password incorrect. | Check credentials and retry. |
| AUTH_002 | 401 | Token Expired | The access token has expired. | Use refresh token to get a new access token. |
| AUTH_003 | 401 | Invalid Token | The token signature or format is invalid. | Re-authenticate. |
| AUTH_004 | 401 | Token Blacklisted | The token has been revoked (e.g., logged out). | Re-authenticate. |
| AUTH_005 | 403 | Missing Permissions | User lacks required RBAC permissions. | Contact administrator for access. |
| AUTH_006 | 403 | Account Suspended | User account is inactive or banned. | Contact support. |
| AUTH_007 | 429 | Too Many Login Attempts | Rate limit exceeded for login. | Wait and try again later. |
| AUTH_008 | 400 | Refresh Token Invalid | Provided refresh token is invalid/expired. | Re-authenticate. |
| AUTH_009 | 403 | Concurrent Session Limit | Maximum active sessions reached. | Log out of other devices. |
| AUTH_010 | 400 | Password Too Weak | Password does not meet security policy. | Choose a stronger password. |

## USER (100-199) - User Management Errors
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| USER_100 | 404 | User Not Found | Specified user ID does not exist. | Verify user ID. |
| USER_101 | 409 | Email Already Exists | Attempt to register with an existing email. | Use a different email or recover account. |
| USER_102 | 400 | Invalid User Data | Provided user profile data failed validation. | Check payload against schema. |
| USER_103 | 403 | Cannot Modify Higher Role | A Sub-Admin cannot modify a Main Admin. | Escalate to Main Admin. |

## ROLE (200-249) - Role & Permission Errors
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| ROLE_200 | 404 | Role Not Found | Specified role does not exist. | Verify role identifier. |
| ROLE_201 | 400 | Invalid Permission Assignment | Cannot assign this permission to this role. | Review role constraints. |

## COURSE & SYLLABUS (250-399)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| COURSE_250 | 404 | Course Not Found | Course ID does not exist. | Verify course ID. |
| COURSE_251 | 409 | Duplicate Course Code | Course code already in use. | Choose a unique code. |
| SYLLABUS_350 | 404 | Topic Not Found | Syllabus topic ID missing. | Verify topic ID. |
| SYLLABUS_351 | 400 | Invalid Hierarchy | Parent topic cannot be a child of itself. | Correct syllabus structure. |

## QUESTION (400-499) - Question Bank Errors
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| QUESTION_400 | 404 | Question Not Found | Question ID does not exist. | Verify question ID. |
| QUESTION_401 | 400 | Invalid Question Format | Missing options or answer key. | Provide complete question data. |
| QUESTION_402 | 409 | Question Cannot Be Edited | Question is published and cannot be modified. | Create a new version/draft. |
| QUESTION_403 | 400 | Invalid Difficulty | Difficulty level is out of bounds. | Set difficulty 1-5. |

## PATTERN & EXAM (500-649)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| PATTERN_500 | 404 | Pattern Not Found | Exam pattern ID does not exist. | Verify pattern ID. |
| EXAM_550 | 404 | Exam Not Found | Exam ID does not exist. | Verify exam ID. |
| EXAM_551 | 400 | Exam Not Published | Cannot start an unpublished exam. | Wait for publication. |
| EXAM_552 | 409 | Exam Already Active | Cannot modify an exam currently being taken. | Wait for completion or archive. |
| EXAM_553 | 400 | Insufficient Questions | Bank lacks questions to satisfy pattern. | Add questions or adjust pattern. |

## ATTEMPT & MASTERY (650-799)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| ATTEMPT_650 | 404 | Attempt Not Found | Attempt ID does not exist. | Verify attempt ID. |
| ATTEMPT_651 | 403 | Max Attempts Reached | User has exhausted allowed attempts. | Contact support for reset. |
| ATTEMPT_652 | 400 | Attempt Already Submitted | Cannot autosave to a submitted attempt. | Review submission. |
| ATTEMPT_653 | 400 | Time Expired | Cannot submit answers after timer ends. | Exam auto-submits. |
| ATTEMPT_654 | 503 | Network Sync Error | Auto-save network sync failed. | Retrying background sync. |
| ATTEMPT_655 | 403 | Exam Closed Error | Cannot start or submit attempt outside allowed window. | Check exam schedule. |
| ATTEMPT_656 | 409 | Result Already Flagged | Result has already been flagged for teacher review. | Check review queue. |
| ATTEMPT_657 | 403 | Attempt Expired | Server closed attempt upon duration expiry. | View attempt result. |
| MASTERY_750 | 404 | Profile Not Found | Mastery profile does not exist. | Take an exam to generate profile. |

## SUBSCRIPTIONS, BILLING & REFUNDS (800-849)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| BILLING_800 | 502 | Payment Gateway Error | Payment gateway webhook processing failed. | Retry payment webhook processing. |
| BILLING_801 | 400 | Refund Failed Error | Refund transaction failed or requested amount exceeds payment limit. | Check payment gateway logs and balance. |
| BILLING_802 | 404 | Transaction Not Found | Payment/refund transaction ID does not exist. | Verify transaction reference. |

## ENTITLEMENTS & AI CREDITS (850-899)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| CREDIT_850 | 402 | Insufficient AI Credits | User has zero or insufficient AI credits for feature execution. | Purchase credit top-up or upgrade plan. |
| CREDIT_851 | 403 | Feature Not Entitled | Active subscription tier does not permit access to this feature. | Upgrade subscription tier. |

## PREVIEW SYSTEM (900-929)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| PREVIEW_900 | 404 | Preview Profile Not Found | Preview persona profile ID does not exist. | Create preview persona session. |
| PREVIEW_901 | 403 | Impersonation Denied | Staff user lacks permission to initiate persona preview mode. | Check staff roles. |

## VERSIONING & ROLLBACK (930-959)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| VERSION_930 | 404 | Version Not Found | Target entity version ID does not exist in commit history. | Verify entity version ID. |
| VERSION_931 | 409 | Version Revert Conflict | Target entity version snapshot conflicts with current schema rules. | Inspect version diff. |

## AUDIT LOGGING (960-979)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| AUDIT_960 | 500 | Audit Log Query Failed | Database query failed while reading immutable audit trails. | Check DB connection pool. |
| AUDIT_961 | 400 | Audit Log Export Error | Requested audit log timeframe exceeds export row limits. | Narrow query filter range. |

## NOTIFICATIONS (980-984)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| NOTIF_980 | 503 | Notification Delivery Failed | System notification dispatcher failed to deliver alert. | Retry notification worker. |

## LOCALIZATION & PREFERENCES (985-989)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| I18N_985 | 400 | Unsupported Language Code | Requested language code is not supported or inactive. | Select valid language code. |
| I18N_986 | 409 | Translation Key Conflict | Translation key already exists in namespace. | Update existing translation key. |
| I18N_987 | 404 | Translation Key Not Found | Requested translation key does not exist. | Verify key ID or namespace. |
| I18N_988 | 400 | Invalid Theme Mode | Theme mode must be LIGHT, GRAY, or DARK. | Pass valid theme mode enum. |

## AI (990-999) - AI Gateway Errors
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| AI_990 | 502 | Provider Unavailable | Primary AI provider is down and no fallback available. | Try again later. |
| AI_991 | 429 | AI Rate Limit Exceeded | User exceeded AI usage limits. | Upgrade plan or wait. |
| AI_992 | 400 | Invalid Prompt | Prompt violates safety guidelines. | Revise prompt content. |
| AI_993 | 500 | Malformed AI Output | AI returned data that failed JSON/Zod parsing. | Retry request. |

## SYSTEM & VALIDATION (1000+)
| Code | HTTP Status | Message | Description | Resolution |
| :--- | :--- | :--- | :--- | :--- |
| SYSTEM_1000 | 500 | Internal Server Error | Unexpected error occurred. | Contact engineering. |
| SYSTEM_1001 | 400 | Validation Error | Request body failed schema validation. | Check API documentation. |
| SYSTEM_1002 | 503 | Service Unavailable | Database or cache unreachable. | Check infrastructure status. |

*(Note: This is a representative sample. The full registry scales to 100+ codes covering edge cases across all modules.)*
