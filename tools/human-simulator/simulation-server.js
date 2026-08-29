/**
 * QA Dashboard Bridge & Simulation API Server
 * Exposes REST and SSE endpoints for launching simulations (Exam Hall & AI Interview/Viva Voce)
 * and streaming live telemetry to the QA Dashboard.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PERSONAS } = require('./personas');
const { runSimulation } = require('./exam-simulation-agent');
const { runInterviewSimulation } = require('./interview-simulation-agent');

const app = express();
const PORT = process.env.SIM_PORT || 5050;

app.use(cors());
app.use(express.json());

// In-memory store for active simulations and SSE client connections
const activeSimulations = new Map();
const sseClients = new Map();

/**
 * 1. Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ExamOS Human Simulation API', uptime: process.uptime() });
});

/**
 * 2. List available personas for dashboard dropdown
 */
app.get('/api/personas', (req, res) => {
  res.json(Object.values(PERSONAS));
});

/**
 * 3. Start a new simulation from QA Dashboard (Exam or AI Interview / Viva)
 */
app.post('/api/simulations/start', async (req, res) => {
  const {
    type = 'EXAM', // 'EXAM' | 'INTERVIEW'
    targetUrl = 'http://localhost:3000',
    personaId = 'careful',
    headless = true,
    email = 'student@examos.com',
    password = 'Student@123',
    maxQuestions = 5
  } = req.body;

  const prefix = type === 'INTERVIEW' ? 'sim_interview' : 'sim_exam';
  const simId = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Register in active store
  activeSimulations.set(simId, {
    simId,
    type,
    personaId,
    targetUrl,
    status: 'STARTING',
    startedAt: new Date().toISOString(),
    events: [],
    report: null
  });

  res.status(202).json({
    message: `${type === 'INTERVIEW' ? 'AI Interview / Viva' : 'Exam'} simulation triggered successfully`,
    simulationId: simId,
    simulationType: type,
    streamUrl: `/api/simulations/${simId}/events`,
    reportUrl: `/api/simulations/${simId}/report`
  });

  const onEventCallback = (event) => {
    const sim = activeSimulations.get(simId);
    if (sim) {
      sim.events.push(event);
    }

    // Stream to connected SSE client if any
    const clientRes = sseClients.get(simId);
    if (clientRes) {
      clientRes.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  const runner = type === 'INTERVIEW' ? runInterviewSimulation : runSimulation;

  runner({
    simId,
    targetUrl,
    personaId,
    headless,
    email,
    password,
    maxQuestions,
    onEvent: onEventCallback
  }).then((finalReport) => {
    const sim = activeSimulations.get(simId);
    if (sim) {
      sim.status = finalReport.status;
      sim.report = finalReport;
    }
  }).catch((err) => {
    const sim = activeSimulations.get(simId);
    if (sim) {
      sim.status = 'FAILED';
      sim.error = err.message;
    }
  });
});

/**
 * 4. Server-Sent Events (SSE) endpoint for live Dashboard streaming
 */
app.get('/api/simulations/:id/events', (req, res) => {
  const simId = req.params.id;
  const sim = activeSimulations.get(simId);

  if (!sim) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send historical events first
  for (const ev of sim.events) {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  }

  // Register live client
  sseClients.set(simId, res);

  req.on('close', () => {
    sseClients.delete(simId);
  });
});

/**
 * 5. Get final simulation report
 */
app.get('/api/simulations/:id/report', (req, res) => {
  const simId = req.params.id;
  const sim = activeSimulations.get(simId);

  if (sim && sim.report) {
    return res.json(sim.report);
  }

  // Check on disk if not in memory
  const reportPath = path.join(__dirname, 'reports', simId, 'report.json');
  if (fs.existsSync(reportPath)) {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    return res.json(data);
  }

  if (sim) {
    return res.json({ status: sim.status, events: sim.events, message: 'Simulation still in progress' });
  }

  res.status(404).json({ error: 'Report not found for given simulation ID' });
});

/**
 * 6. Serve simulation screenshots & media assets
 */
app.use('/reports', express.static(path.join(__dirname, 'reports')));

app.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`  ExamOS Human Simulation API Server`);
  console.log(`  Listening on: http://localhost:${PORT}`);
  console.log(`  Trigger API:  POST http://localhost:${PORT}/api/simulations/start`);
  console.log(`====================================================\n`);
});
