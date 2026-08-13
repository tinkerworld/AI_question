# Security Architect — Developer Guidelines & Responsibilities

## 1. Role Overview
The Security Architect is the strategic owner of the overall security architecture for the Adaptive Examination & AI Learning Platform. You design the security patterns, conduct threat modeling, and ensure that the JWT token architecture, RBAC design, AI Gateway authentication, and exam data protection models are robust and scalable.

## 2. Core Responsibilities
1. Own the high-level security architecture of the platform.
2. Conduct threat modeling for all major components and features.
3. Design and review the JWT token architecture and session management.
4. Architect the Role-Based Access Control (RBAC) system.
5. Design secure authentication flows for the AI Gateway.
6. Define data protection and encryption models for sensitive exam data.
7. Establish security standards and reference architectures.
8. Guide and mentor security and engineering teams.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Security Architecture Design | OWNS |
| Threat Modeling | OWNS |
| JWT/RBAC Architecture | OWNS |
| Exam Data Protection Model | OWNS |
| Code Implementation | OUT OF SCOPE |
| Cloud Security Implementation| CONSULTS |
| Penetration Testing | CONSULTS |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Design the JWT-based Authentication System (1.6) and the system-wide RBAC architecture (1.8).
- Definition of done: Security architecture blueprint for Auth, DB, and API middleware is documented and approved.

### Phase 2 — Academic Structure
- Model threats around RBAC data isolation and syllabus visibility.
- Definition of done: Data isolation strategy is defined for academic structure.

### Phase 3 — Question Bank
- Design the Question Versioning (3.3) security and audit trail for question lifecycle states.
- Definition of done: Question state machine architecture is resilient to manipulation.

### Phase 4 — Exam Pattern
- Architect secure handling of exam blueprints and Exam Pattern Validation Engine.
- Definition of done: Threat model for exam patterns is completed.

### Phase 5 — Exam Generator
- Architect the Exam Generation Engine to prevent predictable random number generation or selection biases.
- Definition of done: Generation architecture ensures cryptographically secure randomness where required.

### Phase 6 — Exam System
- Design anti-tampering mechanisms for the Student Exam Access (6.1) and Answer Submission (6.3) to prevent offline tampering or payload spoofing.
- Definition of done: Exam delivery architecture prevents cheating via API manipulation.

### Phase 7 — Exam Archive
- Architect the Historical Exam Integrity (7.5) model.
- Definition of done: Archival architecture guarantees published exams are immutable.

### Phase 8 — Student Analytics
- Design data anonymization and access control for the Mastery Engine and Teacher/Admin Analytics View (8.7).
- Definition of done: Analytics architecture protects PII.

### Phase 9 — Personalized Practice
- Secure the data pipeline feeding Weakness Pool Generation to avoid cross-tenant data leaks.
- Definition of done: Practice architecture is isolated per student.

### Phase 10 — Preview System
- Architect the Impersonation System (10.3) and Preview Audit Trail (10.5) to ensure preview mode cannot mutate production state.
- Definition of done: Preview architecture provides strict sandboxing.

### Phase 11 — AI Question System
- Design secure authentication and data flow for the AI Gateway (11.1) and AI Worker Queue System (11.6).
- Definition of done: AI Gateway architecture prevents unauthorized access and prompt injection.

### Phase 12 — AI Interview
- Architect end-to-end encryption and ephemeral processing for Interview Assessment Engine and audio streams.
- Definition of done: Interview data flow architecture is secure and compliant.

### Phase 13 — Subscriptions
- Review PCI-DSS compliance architecture for Billing Integration (13.5) and AI Credit System logic.
- Definition of done: Payment architecture minimizes compliance scope and prevents credit fraud.

### Phase 14 — Production Hardening
- Own Security Hardening (14.1) patterns and Abuse Protection (14.7) strategies. Final review of implemented security architecture.
- Definition of done: Final security architecture review completed.

## 5. Key Guidelines
### 5.1 Technical Standards
- Use industry-standard threat modeling methodologies (STRIDE).
- Enforce zero-trust architecture principles where feasible.
- Ensure all cryptographic designs use modern, proven algorithms.
### 5.2 Collaboration Model
- Work closely with the Tech Lead to ensure security designs are implementable.
- Guide Application and Cloud Security Engineers on implementation.
### 5.3 Tools & Processes
- Threat modeling tools (e.g., OWASP Threat Dragon).
- Architecture diagramming tools (Lucidchart, Draw.io).

## 6. Do's ✅
1. Do conduct threat modeling during the design phase of every major feature.
2. Do use STRIDE or similar frameworks for structured threat modeling.
3. Do design for defense in depth.
4. Do prioritize zero-trust principles.
5. Do define clear boundaries for trust domains.
6. Do require strong authentication (MFA) for administrative access.
7. Do design RBAC to default to deny.
8. Do document all security architectural decisions (ADRs).
9. Do review JWT implementation details (signing algorithms, expiration, revocation).
10. Do ensure AI Gateway interactions are authenticated and authorized.
11. Do design robust logging and auditing mechanisms.
12. Do consider the security implications of third-party integrations.
13. Do advocate for security as a primary non-functional requirement.
14. Do stay informed about emerging threats and attack vectors.
15. Do align security architecture with business compliance requirements.

## 7. Don'ts ❌
1. Don't design custom cryptographic protocols.
2. Don't rely on security by obscurity.
3. Don't treat the internal network as a trusted zone.
4. Don't approve architectures that lack proper audit logging.
5. Don't ignore the operational overhead of security designs.
6. Don't assume developers will handle security without clear guidance.
7. Don't use stateless JWTs without a revocation strategy for critical sessions.
8. Don't expose internal AI Gateway endpoints directly to the frontend.
9. Don't allow broad IAM permissions in the architectural design.
10. Don't design monolithic authorization logic; keep it modular.
11. Don't neglect rate limiting in architectural designs.
12. Don't store sensitive exam data in plaintext anywhere in the architecture.
13. Don't skip threat modeling for "small" features that touch sensitive data.
14. Don't rely solely on perimeter defenses.
15. Don't ignore the security of CI/CD pipelines in the overall architecture.

## 8. Quality Gates
- Threat model completed and documented for all Phase 1-6 features.
- Security ADRs approved by Tech Lead and Engineering Manager.
- Architecture blueprints pass peer review from external security consultants (if applicable).

## 9. Escalation Path
- Escalate architectural flaws or significant security risks directly to the Engineering Manager and CTO.

## 10. KPIs & Success Metrics
- Percentage of features with completed threat models.
- Number of critical architectural vulnerabilities found post-deployment (target: 0).
- Timely completion of security architecture reviews.
