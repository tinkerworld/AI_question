# Monitoring & Alerting Strategy

This document outlines the observability strategy to ensure the reliability, performance, and security of the Adaptive Examination & AI Learning Platform.

## 1. Metrics to Collect

We collect metrics across multiple dimensions to gain a holistic view of system health.

### Application API Metrics
-   **Request Count**: Total HTTP requests per endpoint.
-   **Latency**: Response times measured at p50, p95, and p99 percentiles.
-   **Error Rate**: Percentage of 4xx and 5xx HTTP status codes.
-   **Active Connections**: Number of concurrent connections to the API servers.

### Database (PostgreSQL/Prisma) Metrics
-   **Query Time**: Average and slow query durations.
-   **Connection Pool Usage**: Active vs. idle connections, queue length.
-   **Transaction Rollbacks**: Rate of aborted transactions.

### AI Gateway Metrics
-   **Request Volume**: Number of AI generations requested.
-   **Provider Latency**: Response times broken down by provider (OpenAI, Ollama, etc.).
-   **Fallback Rate**: Frequency of switching from primary to fallback provider due to errors.
-   **Cost Estimation**: Calculated token usage and estimated cost per request.

### Authentication & Security Metrics
-   **Login Attempts**: Success vs. failure rates.
-   **Token Refreshes**: Volume of JWT refresh operations.
-   **Rate Limit Hits**: Frequency of users hitting API or AI rate limits (429s).
-   **Active Sessions**: Concurrent authenticated users.

### Business & Exam Metrics
-   **Concurrent Exam Attempts**: Number of active test-takers at any given time.
-   **Submission Rate**: Completed vs. abandoned exams.
-   **Timer Accuracy**: Drift between client-side submissions and server expectations.
-   **Questions Created/Published**: Throughput of the content generation pipeline.

## 2. Dashboards

We utilize centralized dashboards (e.g., Grafana, Datadog) categorized by persona and focus area:

-   **Application Health**: High-level overview of API uptime, error rates, and latency. Intended for daily engineering checks.
-   **Database Performance**: Deep dive into query execution times, indexing efficiency, and connection pool saturation. Intended for DBAs.
-   **AI Gateway Operations**: Tracks provider health, costs, and output quality metrics. Crucial for managing LLM vendor performance.
-   **Security & Audit**: Monitors authentication spikes, rate limits, and failed permission checks. Intended for SecOps.
-   **Business KPIs**: DAU (Daily Active Users), completed exams, subscription limit checks. Intended for Product Managers.

## 3. Alerts & Thresholds

Alerts are configured to notify the on-call team via Slack/PagerDuty based on severity.

| Severity | Condition | Action |
| :--- | :--- | :--- |
| **CRITICAL** | API Error Rate > 5% for 5 mins | PagerDuty immediately. |
| **CRITICAL** | DB Connection Pool Exhausted (100%) | PagerDuty immediately. |
| **CRITICAL** | Core Service Down (Healthcheck failing) | PagerDuty immediately. |
| **WARNING** | API Latency p95 > 500ms for 10 mins | Slack alert to #eng-alerts. |
| **WARNING** | AI Provider Fallback Triggered | Slack alert to #eng-alerts. |
| **WARNING** | High rate of 401/403 (Potential attack) | Slack alert to #sec-alerts. |
| **INFO** | Successful deployment | Slack notification to #releases. |
| **INFO** | Configuration change detected | Slack notification to #ops-logs. |

## 4. Tools & Implementation

-   **Logging**: Structured JSON logging using `pino`. Avoid logging any sensitive data (PII, tokens, passwords).
-   **Health Checks**: `/health` endpoint validates API status, DB connectivity, and Redis availability.
-   **Tracing**: Request correlation IDs passed through all services to trace user journeys across the monolith and AI gateway.
-   **Metrics Export**: Exposing a `/metrics` endpoint (Prometheus format) scraped by the observability stack.

## 5. Incident Response & On-call

-   **On-call Rotation**: Weekly rotation for engineering team members.
-   **Response Times**: 
    -   Critical alerts require acknowledgement within 15 minutes.
    -   Warning alerts require review within next business day.
-   **Post-Mortems**: Any Critical incident requires a blameless post-mortem document detailing root cause, timeline, and preventative action items.
