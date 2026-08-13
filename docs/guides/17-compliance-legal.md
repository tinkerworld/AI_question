# Compliance & Legal Requirements

This document outlines the essential compliance, legal, and ethical standards the Adaptive Examination & AI Learning Platform must adhere to.

## 1. Data Privacy & Protection

*   **GDPR (General Data Protection Regulation) / CCPA**:
    *   **Data Subject Rights**: Automated workflows for Right to Access (data export), Right to Rectification, and Right to Erasure (data deletion).
    *   **Consent Management**: Explicit opt-in for marketing, cookies, and AI data processing.
    *   **Anonymization**: Hard deletion of user accounts replaces PII with pseudo-random hashes while retaining non-identifying aggregate data for analytics.
*   **Education Specific (e.g., FERPA in US)**:
    *   Strict access controls ensuring only authorized personnel (Teachers assigned to the student's cohort, Admins) can view academic records.
    *   Audit logging of all accesses to student records.

## 2. Accessibility (a11y)

*   **Standard**: WCAG 2.1 Level AA compliance.
*   **Requirements**:
    *   Full keyboard navigability for the exam interface.
    *   Screen reader compatibility (ARIA labels, semantic HTML).
    *   High contrast modes and scalable fonts.
    *   Alternative text for all images and mathematical formulas (MathML/LaTeX support).
*   **Testing**: Automated accessibility checks in CI pipeline (e.g., `axe-core`) and manual testing.

## 3. Exam Integrity & Security

*   **Confidentiality**: Exam papers are encrypted at rest. Decryption keys are only accessible to the exam service right before the exam start time.
*   **Anti-Cheating Mechanisms**:
    *   Secure browser lockdown (prevents tab switching, disables copy-paste).
    *   Randomization of question order and option order.
    *   Watermarking of exam screens with student ID to trace leaks.
*   **Proctoring Considerations**: The system is designed to integrate with third-party proctoring APIs (video/audio recording, AI anomaly detection) in the future.

## 4. AI Ethics & Transparency

*   **Content Labeling**: All AI-generated content (questions, explanations, interview feedback) must be clearly labeled as "AI-Assisted" or "AI-Generated" in the UI.
*   **Bias Monitoring**: Regular audits of AI-generated questions to ensure they do not exhibit cultural, gender, or racial bias.
*   **Human-in-the-Loop (HITL)**: All AI-generated exam content must be reviewable and editable by human Teachers before being assigned to Students.
*   **Data Usage**: Clear terms defining whether user prompts and responses are used to fine-tune models (default: opt-out).

## 5. Content Licensing & Intellectual Property

*   **User-Generated Content**: Teachers retain ownership of original questions they input, but grant the platform a license to process them.
*   **AI Content**: Terms of Service clarify that AI-generated questions derived from the platform's proprietary syllabus structures are owned by the platform.
*   **Third-Party Assets**: Strict auditing to ensure no copyrighted material is scraped or ingested into the system without permission.

## 6. Data Localization & Hosting

*   **Storage Location**: Data is stored in geographical regions compliant with local laws (e.g., data of Indian users hosted on servers physically located in India).
*   **Cross-Border Transfer**: Strict minimization and encryption protocols if data must cross borders for specific AI processing APIs.

## 7. Required Legal Documents

The platform must publicly host and maintain:
*   Terms of Service (ToS)
*   Privacy Policy
*   Cookie Policy
*   Acceptable Use Policy (AUP)
