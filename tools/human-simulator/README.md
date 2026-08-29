# ExamOS Human Simulation Agent & QA Dashboard Bridge

A dedicated synthetic human simulation engine and API bridge for QA testing dashboards.

---

## 📁 Architecture Overview

- [**`personas.js`**](file:///home/ubuntu/exam_shekhar/AI_question/tools/human-simulator/personas.js): Pre-configured synthetic user archetypes (`speedrunner`, `careful`, `hesitant`, `erratic_cheater`, `keyboard_a11y`).
- [**`humanizer.js`**](file:///home/ubuntu/exam_shekhar/AI_question/tools/human-simulator/humanizer.js): Core realistic human interaction primitives (Cubic Bézier mouse trajectories, natural typing with typos/backspaces, WPM-based reading pauses, and anti-cheating blur triggers).
- [**`exam-simulation-agent.js`**](file:///home/ubuntu/exam_shekhar/AI_question/tools/human-simulator/exam-simulation-agent.js): End-to-end exam & portal simulation driver with defect detection and reporting.
- [**`simulation-server.js`**](file:///home/ubuntu/exam_shekhar/AI_question/tools/human-simulator/simulation-server.js): REST + SSE (Server-Sent Events) API bridge that connects directly to any QA Dashboard frontend.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd tools/human-simulator
npm install
npm run install-browser
```

### 2. Run Direct CLI Simulation
```bash
# Run careful persona in headless mode
node exam-simulation-agent.js --persona=careful --target=http://localhost:3000

# Run proctoring/cheater stress test in visible (headful) mode
node exam-simulation-agent.js --persona=erratic_cheater --target=http://localhost:3000 --headful
```

### 3. Run QA Dashboard API Server
```bash
npm start
# Server listens on http://localhost:5050
```

---

## 📡 QA Dashboard API Integration Reference

### A. List Available Personas
`GET http://localhost:5050/api/personas`

### B. Trigger a Simulation from Dashboard
`POST http://localhost:5050/api/simulations/start`
```json
{
  "targetUrl": "http://localhost:3000",
  "personaId": "careful",
  "headless": true,
  "email": "student@examos.com",
  "password": "Student@123",
  "maxQuestions": 5
}
```
**Response (202 Accepted):**
```json
{
  "message": "Simulation triggered successfully",
  "simulationId": "sim_1724682000_abcde",
  "streamUrl": "/api/simulations/sim_1724682000_abcde/events",
  "reportUrl": "/api/simulations/sim_1724682000_abcde/report"
}
```

### C. Live Event Streaming in Dashboard (SSE)
Connect via JavaScript `EventSource`:
```javascript
const eventSource = new EventSource('http://localhost:5050/api/simulations/sim_1724682000_abcde/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`[${data.type}] ${data.message}`);
  // Update dashboard live action log or timeline UI
};
```

### D. Fetch Completed Report
`GET http://localhost:5050/api/simulations/:id/report`
