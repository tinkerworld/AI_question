# Third-Party Integration Guide

This guide details the integration strategies for third-party services within the Adaptive Examination & AI Learning Platform. We strictly employ the **Adapter Pattern** to ensure the core application remains decoupled from specific vendor implementations, allowing for easy swapping of providers.

## Core Architectural Principle: Adapter Pattern

All third-party interactions must happen through abstract interfaces defined in the domain layer. The concrete implementations (adapters) reside in the infrastructure layer.

```typescript
// Example Interface
export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
  sendTemplate(to: string, templateId: string, data: any): Promise<boolean>;
}
```

## 1. Payment Gateway

*   **Purpose**: Handle subscription billing, one-off purchases, and refunds.
*   **Primary Adapters**: Razorpay, Stripe.
*   **Key Responsibilities**:
    *   Generating payment links/intents.
    *   Webhook handling for asynchronous payment success/failure events.
    *   Subscription lifecycle management (create, pause, cancel, renew).
*   **Error Handling**: Retry mechanisms for webhooks, idempotent processing to handle duplicate webhooks.
*   **Fallback**: Manual bank transfer workflow for institutional clients if automated gateways fail.

## 2. Email Service

*   **Purpose**: Transactional emails (Welcome, OTP, Password Reset, Exam Scheduled, Results Available).
*   **Primary Adapters**: SendGrid, Resend, AWS SES.
*   **Key Responsibilities**:
    *   Sending HTML and plain text emails.
    *   Managing email templates.
    *   Tracking bounce rates and delivery status via webhooks.
*   **Error Handling**: Dead Letter Queue (DLQ) for failed emails with exponential backoff retries.

## 3. File Storage

*   **Purpose**: Storing exam question images, candidate profile pictures, audio files for oral exams, and system exports (CSV/PDF).
*   **Primary Adapters**: AWS S3, Google Cloud Storage (GCS).
*   **Key Responsibilities**:
    *   Generating pre-signed URLs for secure, direct-to-cloud client uploads.
    *   Serving assets via CDN.
*   **Error Handling**: Upload retry on client-side, structured logging for missing assets.

## 4. SMS & Push Notifications

*   **Purpose**: High-priority alerts (OTP, impending exam reminders, critical system updates).
*   **Primary Adapters**: Twilio (SMS), Firebase Cloud Messaging (FCM) (Web/Mobile Push).
*   **Key Responsibilities**:
    *   Formatting messages for character limits.
    *   Managing user notification preferences (opt-in/opt-out).

## 5. Analytics & Monitoring

*   **Purpose**: Tracking user behavior, application performance, and system health.
*   **Primary Adapters**: PostHog/Mixpanel (Product Analytics), Sentry (Error Tracking), Datadog/New Relic (APM).
*   **Key Responsibilities**:
    *   Asynchronous event tracking to avoid blocking API responses.
    *   Sanitizing PII before sending data to analytics providers.

## 6. LMS Integration (Future)

*   **Purpose**: Seamlessly integrate the examination platform with external Learning Management Systems (e.g., Moodle, Canvas).
*   **Planned Support**: SCORM 1.2 / 2004 compliance, LTI (Learning Tools Interoperability) v1.3 standard.
*   **Key Responsibilities**:
    *   Single Sign-On (SSO) from LMS.
    *   Syncing grades and attempt metadata back to the LMS gradebook.

## Testing Strategy for Integrations

1.  **Unit Tests**: Mock the adapter interface to ensure business logic behaves correctly without calling external APIs.
2.  **Integration Tests**: Use vendor-provided sandbox/test environments to verify the adapter implementation against actual API endpoints.
3.  **Webhook Simulation**: Use tools like `ngrok` or internal mock servers to simulate webhook payloads during testing.
