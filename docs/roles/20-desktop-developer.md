# Desktop Developer (Web-Based) — Developer Guidelines & Responsibilities
## 1. Role Overview
The Desktop Developer ensures the web application functions flawlessly as a Progressive Web App (PWA) and plans for future Electron-based desktop application wrappers, focusing on offline capabilities and desktop integrations.

## 2. Core Responsibilities
1. Implement and verify Progressive Web App (PWA) support.
2. Plan and design offline exam capabilities.
3. Implement desktop notification integrations.
4. Plan file system access strategies for secure exports.
5. Plan the future Electron wrapper architecture.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| PWA Implementation | OWNS |
| Electron Wrapper Planning | OWNS |
| Offline Storage Strategy (Desktop) | OWNS |
| General Web UI | COLLABORATES |
| Backend APIs | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **1.11 Frontend Foundation:** Establish PWA baseline (manifest, service workers) in the Next.js setup.
- **1.6 Authentication System:** Ensure JWT persists securely in PWA/Desktop environments.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- **2.3 Syllabus Tree:** Implement service worker caching for the academic syllabus tree.

### Phase 3 — Question Bank
- **3.1 Pluggable Question Type System:** Ensure all question UI components render correctly offline via PWA.

### Phase 4 — Exam Pattern
- **4.1 Exam Pattern CRUD:** No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- **5.1 Exam Generation Engine:** No primary deliverables. Support other teams as needed.

### Phase 6 — Exam System
- **6.2 Exam Attempt Session & 6.3 Answer Submission:** Design and implement IndexedDB/LocalForage offline exam taking architecture.

### Phase 7 — Exam Archive
- **7.4 Exam Archive & Search:** Plan background caching of historical exams for offline viewing.
- **7.6 Exam File Storage:** Plan local file system access for exam attachment exports.

### Phase 8 — Student Analytics
- **8.6 Student Analytics Dashboard:** Implement background sync for analytics events generated offline.

### Phase 9 — Personalized Practice
- **9.2 Personalized Practice Paper Generation:** Ensure practice questions can be cached locally.

### Phase 10 — Preview System
- **10.3 Impersonation System:** Ensure PWA caching does not leak data across impersonation contexts.

### Phase 11 — AI Question System
- **11.7 Local AI Model Support:** Plan future Electron integration with local AI models (e.g. Ollama, LM Studio).

### Phase 12 — AI Interview
- **12.4 Speech-to-Text (STT) Integration:** Plan desktop-level (Electron) permissions for microphone/audio.

### Phase 13 — Subscriptions
- **13.1 Entitlement Engine:** Ensure offline functionality degrades gracefully based on cached entitlements.

### Phase 14 — Production Hardening
- **14.9 Deployment Configuration:** Finalize Electron build processes, PWA installability audits, and distribution pipelines.

## 5. Key Guidelines
### 5.1 Technical Standards
- PWA must pass Lighthouse installability audits.
- Offline-first approach for critical exam taking paths.
### 5.2 Collaboration Model
- Works closely with Web Frontend developers to ensure PWA compatibility.
### 5.3 Tools & Processes
- Uses Workbox for service workers.
- Uses Electron Forge for desktop planning.

## 6. Do's ✅
1. Do prioritize offline exam resilience.
2. Do ensure the PWA is easily installable.
3. Do use background sync for data uploads.
4. Do secure local storage (IndexedDB) for sensitive exam data.
5. Do leverage Web APIs (Notifications, File System Access).
6. Do plan for seamless updates of the desktop app.
7. Do test on multiple desktop OS (Windows, macOS, Linux).
8. Do monitor service worker lifecycle carefully.
9. Do ensure graceful degradation when offline.
10. Do optimize asset caching.
11. Do plan for IPC (Inter-Process Communication) in Electron.
12. Do consider security implications of nodeIntegration in Electron.
13. Do provide clear offline status indicators in the UI.
14. Do handle file system paths correctly across OS platforms.
15. Do follow web standards for desktop integration.

## 7. Don'ts ❌
1. Don't rely solely on constant internet connection.
2. Don't store unencrypted sensitive data in local storage.
3. Don't block the main thread with heavy offline sync tasks.
4. Don't ignore service worker update lifecycles.
5. Don't abuse desktop notifications.
6. Don't assume all web APIs are available in Electron without configuration.
7. Don't write backend APIs.
8. Don't enable nodeIntegration in Electron renderer processes.
9. Don't forget about OS-level proxy settings.
10. Don't ignore application signing and notarization for desktop.
11. Don't overcomplicate the initial PWA setup.
12. Don't forget to test offline scenarios rigorously.
13. Don't ignore the install prompt UX.
14. Don't leave large amounts of stale data in cache.
15. Don't bypass the AI Gateway for local AI processing without architecture approval.

## 8. Quality Gates
- PWA must pass 100% Lighthouse PWA audit.
- Offline exam synchronization must pass rigorous fault-tolerance testing.

## 9. Escalation Path
- Escalate service worker caching issues to Web Architect.
- Escalate desktop API limitations to Solution Architect.

## 10. KPIs & Success Metrics
- PWA install rate.
- Zero data loss incidents during offline-to-online sync.
