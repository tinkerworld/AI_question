# Performance Benchmarks & SLAs

This document outlines the performance targets, Service Level Agreements (SLAs), and capacity planning guidelines for the Adaptive Examination & AI Learning Platform.

## 1. API Response Time Targets

All response times are measured from the API gateway down to the service and database, excluding network latency to the client.

| Category | Target (p95) | Max (p99) | Notes |
|----------|--------------|-----------|-------|
| **Auth Endpoints** | < 100ms | < 200ms | Includes JWT generation/bcrypt |
| **CRUD Reads (Single)** | < 100ms | < 200ms | E.g., Get User by ID |
| **CRUD Writes** | < 200ms | < 500ms | Validations, DB transactions |
| **List/Search** | < 200ms | < 500ms | Paginated queries, filters |
| **Exam Generation** | < 2s | < 5s | Adaptive algorithm processing |
| **AI Question Modification** | < 5s | < 15s | Varies by AI Provider latency |
| **AI Interview Response** | < 3s | < 8s | Time to first token (streaming) |
| **STT (Speech-to-Text)** | < 2s | < 5s | Transcription processing |
| **TTS (Text-to-Speech)** | < 1s | < 3s | Synthesis processing |

## 2. Concurrent User Targets

The platform architecture is designed to scale across the development phases.

| Phase Range | Concurrent Users | Expected TPS (API) | Notes |
|-------------|------------------|--------------------|-------|
| **Phase 1-6** | 100 | ~20 | Foundation & Admin tooling |
| **Phase 7-10** | 500 | ~100 | Early student access |
| **Phase 11-14** | 1,000+ | ~250+ | Full platform launch |
| **Live Exam Window** | 2,000+ | ~1,000+ | High-burst read/write operations during exam start and submissions |

## 3. Database Performance (PostgreSQL 16)

To maintain API SLAs, the Prisma ORM queries must adhere to strict performance bounds:
- **Simple Queries** (PK lookups): < 10ms
- **Complex Queries** (Multiple Joins, RBAC checks): < 50ms
- **Report Aggregation**: < 500ms (Must utilize materialized views if slower)
- **Hard Limit**: No synchronous query should exceed 1 second. Long-running reports must be processed asynchronously.

## 4. Frontend Performance (Next.js 15)

Targeting Core Web Vitals to ensure a smooth experience for Students and Admins:
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Bundle Size Budget**: < 200KB initial JavaScript payload (gzipped) for core routes.

## 5. Load Test Scenarios

To validate our targets, Playwright and Artillery/k6 will execute the following scenarios during the CI/CD E2E stage prior to major releases:

1. **Login Storm**: 1,000 users attempting to authenticate within 60 seconds.
2. **Exam Start Rush**: 2,000 users requesting an adaptive exam generation simultaneously at a scheduled time.
3. **Concurrent Submissions**: 500 users submitting exam answers with rich media (code, files) in a 2-minute window.
4. **AI Request Burst**: 100 concurrent AI streaming requests to test the AI Gateway rate-limiting and fallback mechanisms.

## 6. Capacity Planning & Scaling

- **Auto-Scaling**: Node.js API containers scale based on CPU utilization > 70% or Event Loop Lag > 50ms.
- **Database**: PostgreSQL connection pooling (PgBouncer or Prisma Accelerate) handles connection spikes. Read replicas will be introduced in Phase 11 for reporting queries.
- **AI Gateway**: Rate limits are set per user. If OpenAI/Anthropic rate limits are hit, the system automatically falls back to secondary providers (e.g., Azure or local Ollama) based on priority configuration.
