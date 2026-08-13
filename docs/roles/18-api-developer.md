# API Developer — Developer Guidelines & Responsibilities
## 1. Role Overview
As an API Developer on the Adaptive Examination & AI Learning Platform, you specialize in the design, documentation, and standardization of the platform's RESTful APIs. You ensure that APIs are intuitive, consistent, secure, and rigorously documented using OpenAPI/Swagger. You are the custodian of the `module-api-spec.md` rules and the API-first product philosophy.

## 2. Core Responsibilities
1. Design RESTful APIs prioritizing developer experience and client consumption.
2. Maintain comprehensive and accurate OpenAPI/Swagger documentation for all endpoints.
3. Enforce the consistent API response envelope across all modules.
4. Manage API versioning strategy (e.g., `/api/v1/`).
5. Standardize pagination, filtering, and search implementations across the API.
6. Ensure strict adherence to the `module-api-spec.md` guidelines.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| API Design & Specifications | OWNS |
| OpenAPI/Swagger Documentation | OWNS |
| Response Standardization | OWNS |
| API Implementation | COLLABORATES |
| API Security Design | COLLABORATES |
| Frontend Consumption | CONSULTS |
| Database Schema | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **1.3 Shared Types Package & 1.10 API Middleware Stack:** Define the global API response envelope, DTOs, and error schemas.
- **1.6 Authentication System:** Document JWT and refresh token endpoints in OpenAPI.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- **2.1 Course Management to 2.4 Syllabus Node Metadata:** Design RESTful contracts for hierarchical syllabus tree operations and metadata.

### Phase 3 — Question Bank
- **3.1 Pluggable Question Type System & 3.2 Question CRUD:** Document polymorphic API requests for varied question types and rich text payloads.

### Phase 4 — Exam Pattern
- **4.1 Exam Pattern CRUD to 4.8 Exam Pattern Validation Engine:** Standardize complex payloads for exam pattern blueprints, sections, and rules.

### Phase 5 — Exam Generator
- **5.1 Exam Generation Engine:** Design APIs for initiating asynchronous exam generation and fetching draft exams.

### Phase 6 — Exam System
- **6.2 Exam Attempt Session & 6.3 Answer Submission:** Design idempotent, high-performance API contracts for answer submissions and exam state.

### Phase 7 — Exam Archive
- **7.1 Exam Publication Workflow & 7.4 Exam Archive & Search:** Document endpoints for retrieving immutable exam snapshots and search parameters.

### Phase 8 — Student Analytics
- **8.1 Mastery Engine & 8.4 Syllabus Proficiency Map:** Design efficient aggregation endpoints for mastery score retrieval and tracking.

### Phase 9 — Personalized Practice
- **9.1 Weakness Pool Generation:** Document endpoints for requesting personalized practice metadata.

### Phase 10 — Preview System
- **10.3 Impersonation System:** Standardize preview headers and authentication token payloads for impersonation modes.

### Phase 11 — AI Question System
- **11.1 AI Gateway Architecture & 11.2 AI Client Package:** Design the OpenAPI contracts for internal AI gateway communication.

### Phase 12 — AI Interview
- **12.1 Interview Template Management & 12.10 Interview Session Management:** Document streaming or polling APIs for interview state and templates.

### Phase 13 — Subscriptions
- **13.1 Entitlement Engine & 13.5 Billing Integration:** Design secure payment webhooks and entitlement verification endpoints.

### Phase 14 — Production Hardening
- **14.10 Documentation:** Conduct a final audit of all APIs against the OpenAPI spec. Ensure 100% Swagger coverage.

## 5. Key Guidelines
### 5.1 Technical Standards
- Strict REST API design principles.
- OpenAPI 3.0+ for all documentation.
- All endpoints must be versioned (e.g., `/api/v1/resource`).
- Implement the standard response envelope: `{ success: boolean, data?: any, error?: { code, message, details } }`.
- Standardize pagination (e.g., `?page=1&limit=10` or cursor-based) and filtering.
- Must follow all rules laid out in `module-api-spec.md`.

### 5.2 Collaboration Model
- Lead API design reviews with Backend and Frontend Engineers before implementation begins.
- Act as the ultimate authority on endpoint naming and structure.

### 5.3 Tools & Processes
- Use Swagger UI for API exploration.
- Implement automated OpenAPI spec validation in CI/CD.

## 6. Do's ✅
1. Adopt an API-first approach: design and document the API before coding.
2. Use clear, predictable, and resource-oriented URLs (nouns, not verbs).
3. Enforce the standard API response envelope rigorously.
4. Use standard HTTP methods correctly (GET, POST, PUT, PATCH, DELETE).
5. Use appropriate HTTP status codes for success and errors.
6. Implement and document API versioning (`/api/v1/`) from day one.
7. Standardize pagination, sorting, and filtering query parameters globally.
8. Define precise JSON schemas for all request bodies and responses in OpenAPI.
9. Review and approve all API changes proposed by Backend Engineers.
10. Ensure error responses are helpful, providing specific details without leaking sensitive data.
11. Keep the `module-api-spec.md` updated with any new conventions.
12. Use idempotency keys for critical POST operations (e.g., payments, exam submissions).
13. Document security requirements (e.g., Bearer auth, roles) for every endpoint.
14. Provide meaningful descriptions and examples in the Swagger documentation.
15. Ensure API specs are machine-readable for generating typed client SDKs.

## 7. Don'ts ❌
1. Do not allow APIs to break the standard response envelope.
2. Do not use verbs in URLs (e.g., use `POST /users`, not `POST /createUser`).
3. Do not release unversioned APIs.
4. Do not allow implementation to drift from the OpenAPI documentation.
5. Do not use generic HTTP 200 for all responses; utilize 201, 204, etc.
6. Do not return stack traces or internal database errors in the API response.
7. Do not allow inconsistent pagination parameter names across different modules.
8. Do not design deep, complex nested resource URLs (e.g., avoid `/a/:id/b/:id/c/:id`).
9. Do not bypass the design review process for new endpoints.
10. Do not document endpoints that are not actually implemented.
11. Do not use inconsistent casing in JSON payloads (enforce camelCase).
12. Do not design stateful APIs; adhere to REST statelessness.
13. Do not ignore rate limiting and throttling considerations in the design.
14. Do not create APIs that require excessive chaining by the client.
15. Do not violate the boundaries established in `module-api-spec.md`.

## 8. Quality Gates
- OpenAPI specification is valid and passes linting (e.g., Spectral).
- Zero discrepancies between API implementation and documentation.
- Approval of API designs by the Technical Architect and Frontend Lead.

## 9. Escalation Path
- Disagreement on API standards with Backend -> Escalate to Technical Architect.
- Frontend unable to consume API efficiently -> Collaborate on redesign, escalate if blocked.
- Breaking changes required -> Escalate to all stakeholders for coordinated release.

## 10. KPIs & Success Metrics
- 100% endpoint documentation coverage.
- Zero breaking changes introduced in a major version (v1).
- Time to resolve API contract disputes.
- Frontend team satisfaction with API usability and client generation.
