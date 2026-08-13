# Disaster Recovery & Backup Plan

This document outlines the disaster recovery (DR) and backup strategies for the Adaptive Examination & AI Learning Platform to ensure data integrity and business continuity.

## 1. Backup Strategy

### Database Backups (PostgreSQL)
*   **Daily Full Backups**: Taken at 02:00 AM (server time) during low-traffic periods. Stored in geo-redundant cloud storage.
*   **Hourly Incremental Backups**: Continuous archiving of Write-Ahead Logs (WAL) to allow Point-in-Time Recovery (PITR).
*   **Retention Policy**: 
    *   Daily backups kept for 30 days.
    *   Weekly backups kept for 12 weeks.
    *   Monthly backups kept for 12 months.

### File Storage Backups (S3/GCS)
*   Versioning enabled on all storage buckets (exam images, audio files).
*   Cross-region replication to a secondary region for critical buckets.

## 2. Recovery Objectives

*   **RTO (Recovery Time Objective)**: 
    *   Critical Services (Core API, Database, Exam System): < 1 hour
    *   Full Platform (Analytics, Batch processing): < 4 hours
*   **RPO (Recovery Point Objective)**: 
    *   < 1 hour (Targeting zero data loss for active exam sessions via real-time sync, but system-wide RPO is capped at 1 hour for disaster scenarios).

## 3. Failover Procedures

### Database Failover
*   **Primary/Replica Setup**: PostgreSQL deployed with at least one read replica in a different availability zone.
*   **Automatic Failover**: Handled by the managed database service (e.g., RDS Multi-AZ, Cloud SQL HA). If the primary node fails, the replica is automatically promoted.

### API & Frontend Failover
*   Stateless architecture allows immediate spinning up of new instances.
*   Auto-scaling groups span multiple availability zones.
*   If an entire region goes down, DNS routing (e.g., Route53) redirects traffic to the standby region.

### AI Gateway Failover
*   The AI Gateway is provider-agnostic. If a primary provider (e.g., OpenAI) experiences an outage, requests automatically fail over to a configured secondary provider (e.g., Anthropic, Azure OpenAI) or local fallback (e.g., Ollama/vLLM) based on latency and cost rules.

## 4. Exam-in-Progress Recovery

Handling server crashes mid-exam is critical:
*   **Auto-Save**: The frontend auto-saves student responses to `localStorage`/`IndexedDB` every 30 seconds and attempts to sync with the backend.
*   **State Reconstruction**: When the server recovers, the frontend pushes the locally cached state. The backend uses event sourcing (`ExamAttemptEvent` logs) to rebuild the exact state of the exam.
*   **Time Compensation**: The system calculates the downtime and grants equivalent compensatory time to affected students.

## 5. Data Retention Policy

*   **User PII**: Kept as long as the account is active. Anonymized 30 days after account deletion.
*   **Exam Results**: Kept indefinitely for academic records, unless regulatory deletion is requested.
*   **Audit Logs**: Retained for 1 year in hot storage, then archived to cold storage for 5 years.
*   **System Logs**: Retained for 14 days in observability platforms (e.g., Datadog, ELK).

## 6. Geo-Redundancy Planning

*   **Primary Region**: Chosen based on the primary user base (e.g., ap-south-1).
*   **Secondary Region**: A geographically distant region (e.g., eu-central-1) serving as the disaster recovery site.
*   **Data Sync**: Asynchronous replication of the database and object storage from Primary to Secondary.

## 7. Runbooks & Testing

*   **Runbook**: Detailed, step-by-step procedures documented in the internal wiki for scenarios like "Database Corruption", "Complete Region Failure", "AI Provider Outage", and "Ransomware Attack".
*   **Backup Verification**: Automated weekly tests where a recent backup is restored to an isolated staging environment and sanity checks are run.
*   **DR Drills**: Bi-annual tabletop exercises and simulated failovers to ensure the team is prepared.
