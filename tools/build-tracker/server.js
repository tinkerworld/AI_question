const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3050;
const STATE_FILE = path.join(__dirname, 'state.json');
const EXAMPLE_FILE = path.join(__dirname, 'state.example.json');

// Ensure state.json exists, copy from state.example.json if not
function ensureStateFile() {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STATE_FILE)) {
    if (fs.existsSync(EXAMPLE_FILE)) {
      const exampleData = fs.readFileSync(EXAMPLE_FILE, 'utf8');
      fs.writeFileSync(STATE_FILE, exampleData, 'utf8');
      console.log('[Server] Initialized state.json from state.example.json');
    } else {
      console.error('[Server] ERROR: state.example.json missing!');
    }
  }
}

function readState() {
  ensureStateFile();
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Server] Error reading state.json:', err);
    if (fs.existsSync(EXAMPLE_FILE)) {
      const rawExample = fs.readFileSync(EXAMPLE_FILE, 'utf8');
      return JSON.parse(rawExample);
    }
    return { phases: [], activePhase: 1 };
  }
}

function writeState(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(STATE_FILE, content, 'utf8');
    return true;
  } catch (err) {
    console.error('[Server] Error writing state.json:', err);
    return false;
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    }
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // API Endpoints
  if (pathname === '/api/state' || pathname === '/state') {
    if (method === 'GET') {
      const state = readState();
      return sendJSON(res, state);
    }
    if (method === 'POST' || method === 'PUT') {
      try {
        const body = await parseBody(req);
        if (writeState(body)) {
          return sendJSON(res, { success: true, state: body });
        } else {
          return sendJSON(res, { error: 'Failed to write state' }, 500);
        }
      } catch (err) {
        return sendJSON(res, { error: 'Invalid JSON body' }, 400);
      }
    }
  }

  if (pathname === '/api/tasks' || pathname === '/tasks') {
    if (method === 'POST') {
      try {
        const body = await parseBody(req);
        const { phase, title, source, note } = body;

        if (!phase || !title || !source) {
          return sendJSON(res, { error: 'Missing required fields: phase, title, source' }, 400);
        }

        if (source === 'ai-suggested' && (!note || !note.trim())) {
          return sendJSON(res, { error: 'ai-suggested tasks require a note explaining why the task is proposed' }, 400);
        }

        const stateData = readState();
        const targetPhase = stateData.phases.find(p => p.id === Number(phase));

        if (!targetPhase) {
          return sendJSON(res, { error: `Phase ${phase} not found` }, 404);
        }

        // Generate task ID e.g. "1.13"
        const existingIds = targetPhase.tasks.map(t => {
          const parts = t.id.split('.');
          return parts.length > 1 ? parseInt(parts[1], 10) : 0;
        }).filter(n => !isNaN(n));

        const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : targetPhase.tasks.length;
        const newTaskId = `${phase}.${maxNum + 1}`;

        const newTask = {
          id: newTaskId,
          phase: Number(phase),
          title: title.trim(),
          source: source, // "plan", "ai-suggested", or "user-added"
          state: 'pending',
          addedAt: new Date().toISOString(),
          note: note ? note.trim() : ''
        };

        targetPhase.tasks.push(newTask);
        writeState(stateData);

        return sendJSON(res, { success: true, task: newTask, state: stateData }, 201);
      } catch (err) {
        return sendJSON(res, { error: err.message || 'Internal server error' }, 500);
      }
    }
  }

  if (pathname.startsWith('/api/tasks/') || pathname.startsWith('/tasks/')) {
    const parts = pathname.split('/');
    const taskId = parts[parts.length - 1];

    if (method === 'PATCH' || method === 'PUT' || method === 'POST') {
      try {
        const body = await parseBody(req);
        const stateData = readState();

        let foundTask = null;
        for (const p of stateData.phases) {
          const t = p.tasks.find(x => x.id === taskId);
          if (t) {
            foundTask = t;
            if (body.state) t.state = body.state;
            if (body.title) t.title = body.title;
            if (body.note !== undefined) t.note = body.note;
            break;
          }
        }

        if (!foundTask) {
          return sendJSON(res, { error: `Task ${taskId} not found` }, 404);
        }

        writeState(stateData);
        return sendJSON(res, { success: true, task: foundTask, state: stateData });
      } catch (err) {
        return sendJSON(res, { error: err.message || 'Internal server error' }, 500);
      }
    }

    if (method === 'DELETE') {
      const stateData = readState();
      let deleted = false;

      for (const p of stateData.phases) {
        const idx = p.tasks.findIndex(x => x.id === taskId);
        if (idx !== -1) {
          p.tasks.splice(idx, 1);
          deleted = true;
          break;
        }
      }

      if (deleted) {
        writeState(stateData);
        return sendJSON(res, { success: true, deletedId: taskId, state: stateData });
      } else {
        return sendJSON(res, { error: `Task ${taskId} not found` }, 404);
      }
    }
  }

  if (pathname.startsWith('/api/phases/')) {
    const parts = pathname.split('/');
    const phaseId = parseInt(parts[3], 10);
    const action = parts[4];

    if (action === 'unlock' && method === 'POST') {
      const stateData = readState();
      const p = stateData.phases.find(x => x.id === phaseId);
      if (p) {
        p.unlocked = true;
        writeState(stateData);
        return sendJSON(res, { success: true, phase: p, state: stateData });
      }
      return sendJSON(res, { error: `Phase ${phaseId} not found` }, 404);
    }

    if (action === 'complete' && method === 'POST') {
      const stateData = readState();
      const p = stateData.phases.find(x => x.id === phaseId);
      if (!p) {
        return sendJSON(res, { error: `Phase ${phaseId} not found` }, 404);
      }

      // Check if all tasks are done
      const unfinished = p.tasks.filter(t => t.state !== 'done');
      if (unfinished.length > 0) {
        return sendJSON(res, {
          error: `Cannot complete phase ${phaseId}: ${unfinished.length} tasks are not done yet. All tasks across Planned, AI-Suggested, and User-Added lists must be done.`,
          unfinishedCount: unfinished.length
        }, 400);
      }

      p.completed = true;

      // Unlock next dependent phase(s)
      const nextPhase = stateData.phases.find(x => x.id === phaseId + 1);
      if (nextPhase) {
        nextPhase.unlocked = true;
      }
      // Also check DAG dependencies
      stateData.phases.forEach(ph => {
        if (ph.prerequisites && ph.prerequisites.includes(phaseId)) {
          const allPrereqsDone = ph.prerequisites.every(reqId => {
            const reqP = stateData.phases.find(x => x.id === reqId);
            return reqP && reqP.completed;
          });
          if (allPrereqsDone) ph.unlocked = true;
        }
      });

      stateData.activePhase = Math.min(phaseId + 1, 14);
      writeState(stateData);

      return sendJSON(res, { success: true, phase: p, state: stateData });
    }
  }

  // Static files serving
  let targetPath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'text/plain';

  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    sendFile(res, targetPath, contentType);
  } else {
    // Fallback to index.html for SPA/routes
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      sendFile(res, indexPath, 'text/html; charset=utf-8');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

ensureStateFile();

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  ExamOS Kanban Build Tracker Running!`);
  console.log(`  Access URL: http://localhost:${PORT}`);
  console.log(`  State File: ${STATE_FILE}`);
  console.log(`====================================================`);
});
