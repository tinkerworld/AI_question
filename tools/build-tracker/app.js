let stateData = null;
let currentPhaseId = 1;
let pollTimer = null;

// DOM Elements
const sidebarList = document.getElementById('sidebar-phase-list');
const sidebarPhasesDone = document.getElementById('sidebar-phases-done');
const globalProgressText = document.getElementById('global-progress-text');
const globalProgressFill = document.getElementById('global-progress-fill');
const activePhaseTag = document.getElementById('active-phase-tag');
const syncText = document.getElementById('sync-text');

const phaseBadgeId = document.getElementById('phase-badge-id');
const phaseTitleText = document.getElementById('phase-title-text');
const phaseDescText = document.getElementById('phase-desc-text');
const phasePrereqText = document.getElementById('phase-prereq-text');
const btnCompletePhase = document.getElementById('btn-complete-phase');

const pillPending = document.getElementById('pill-pending');
const pillApproved = document.getElementById('pill-approved');
const pillTested = document.getElementById('pill-tested');
const pillDone = document.getElementById('pill-done');

const gridPlanTasks = document.getElementById('grid-plan-tasks');
const gridAiTasks = document.getElementById('grid-ai-tasks');
const gridUserTasks = document.getElementById('grid-user-tasks');

const countPlan = document.getElementById('count-plan');
const countAi = document.getElementById('count-ai');
const countUser = document.getElementById('count-user');

const userAddTaskForm = document.getElementById('user-add-task-form');
const inputTaskTitle = document.getElementById('new-task-title');
const inputTaskNote = document.getElementById('new-task-note');
const btnSubmitTask = document.getElementById('btn-submit-task');

// Toast notification helper
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderColor = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#06b6d4');
  toast.innerHTML = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Fetch State from Server
async function fetchState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    stateData = data;
    renderApp();
    syncText.textContent = 'LIVE SYNCED';
  } catch (err) {
    console.error('Fetch state error:', err);
    syncText.textContent = 'DISCONNECTED (OFFLINE)';
  }
}

// Update Task State on Server
async function updateTaskState(taskId, newState) {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState })
    });
    const result = await res.json();
    if (result.success) {
      stateData = result.state;
      renderApp();
      showToast(`Task <strong>${taskId}</strong> moved to state <strong>${newState.toUpperCase()}</strong>`, 'success');
    } else {
      showToast(`Error updating task: ${result.error}`, 'error');
    }
  } catch (err) {
    showToast(`Server communication failed`, 'error');
  }
}

// Delete Task on Server
async function deleteTask(taskId) {
  if (!confirm(`Are you sure you want to delete task ${taskId}?`)) return;
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      stateData = result.state;
      renderApp();
      showToast(`Task ${taskId} deleted`, 'info');
    }
  } catch (err) {
    showToast(`Failed to delete task`, 'error');
  }
}

// Add New Ad-hoc Task
async function addTask(source) {
  const title = inputTaskTitle.value.trim();
  const note = inputTaskNote.value.trim();

  if (!title) {
    showToast('Task title cannot be empty', 'error');
    return;
  }

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phase: currentPhaseId,
        title: title,
        source: source,
        note: note
      })
    });
    const result = await res.json();
    if (result.success) {
      stateData = result.state;
      inputTaskTitle.value = '';
      inputTaskNote.value = '';
      renderApp();
      showToast(`Task <strong>${result.task.id}</strong> added under User-Added Tasks`, 'success');
    } else {
      showToast(`Failed to add task: ${result.error}`, 'error');
    }
  } catch (err) {
    showToast('Server communication failed', 'error');
  }
}

// Complete & Unlock Phase
async function completePhase(phaseId) {
  try {
    const res = await fetch(`/api/phases/${phaseId}/complete`, { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      stateData = result.state;
      currentPhaseId = Math.min(phaseId + 1, 14);
      renderApp();
      showToast(`🎉 Phase ${phaseId} Approved & Next Phase Unlocked!`, 'success');
    } else {
      showToast(result.error || 'Cannot complete phase', 'error');
    }
  } catch (err) {
    showToast('Server communication error', 'error');
  }
}

// Render Main Application UI
function renderApp() {
  if (!stateData || !stateData.phases) return;

  // Global Progress Calculation across all tasks in all phases
  let totalTasksAll = 0;
  let doneTasksAll = 0;
  let completedPhasesCount = 0;

  stateData.phases.forEach(p => {
    if (p.completed) completedPhasesCount++;
    p.tasks.forEach(t => {
      totalTasksAll++;
      if (t.state === 'done') doneTasksAll++;
    });
  });

  const overallPct = totalTasksAll > 0 ? Math.round((doneTasksAll / totalTasksAll) * 100) : 0;
  globalProgressText.textContent = `${doneTasksAll} / ${totalTasksAll} Tasks (${overallPct}%)`;
  globalProgressFill.style.width = `${overallPct}%`;
  sidebarPhasesDone.textContent = `${completedPhasesCount}/14 PHASES`;

  // Render Sidebar
  renderSidebar();

  // Render Current Selected Phase View
  renderPhaseDetail();
}

function renderSidebar() {
  sidebarList.innerHTML = '';

  stateData.phases.forEach(p => {
    const totalCount = p.tasks.length;
    const doneCount = p.tasks.filter(t => t.state === 'done').length;
    const isCurrent = p.id === currentPhaseId;

    const item = document.createElement('div');
    item.className = `sidebar-item ${isCurrent ? 'active' : ''} ${p.completed ? 'completed' : ''} ${!p.unlocked ? 'locked' : ''}`;

    let statusIcon = '🔒';
    if (p.completed) statusIcon = '✓';
    else if (p.unlocked) statusIcon = '🔓';

    item.innerHTML = `
      <div class="phase-item-left">
        <span class="phase-badge">P${p.id < 10 ? '0' + p.id : p.id}</span>
        <div>
          <div class="phase-item-name">${p.name}</div>
          <div class="phase-item-sub">${doneCount}/${totalCount} Done</div>
        </div>
      </div>
      <div class="phase-item-right">
        <span class="phase-status-icon">${statusIcon}</span>
        <span class="phase-count-tag">${doneCount}/${totalCount}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      currentPhaseId = p.id;
      renderApp();
    });

    sidebarList.appendChild(item);
  });
}

function renderPhaseDetail() {
  const phase = stateData.phases.find(p => p.id === currentPhaseId);
  if (!phase) return;

  activePhaseTag.textContent = `PHASE ${phase.id < 10 ? '0' + phase.id : phase.id}`;
  phaseBadgeId.textContent = `P${phase.id < 10 ? '0' + phase.id : phase.id}`;
  phaseTitleText.textContent = `PHASE ${phase.id}: ${phase.name.toUpperCase()}`;
  phaseDescText.textContent = phase.description || '';

  // Prerequisites string
  if (phase.prerequisites && phase.prerequisites.length > 0) {
    const prereqNames = phase.prerequisites.map(id => `Phase ${id}`).join(', ');
    phasePrereqText.textContent = `PREREQUISITES: ${prereqNames.toUpperCase()}`;
  } else {
    phasePrereqText.textContent = `PREREQUISITES: NONE`;
  }

  // Count breakdown for active phase
  const pendingCount = phase.tasks.filter(t => t.state === 'pending').length;
  const approvedCount = phase.tasks.filter(t => t.state === 'approved').length;
  const testedCount = phase.tasks.filter(t => t.state === 'tested').length;
  const doneCount = phase.tasks.filter(t => t.state === 'done').length;

  pillPending.textContent = `PENDING: ${pendingCount}`;
  pillApproved.textContent = `APPROVED: ${approvedCount}`;
  pillTested.textContent = `TESTED: ${testedCount}`;
  pillDone.textContent = `DONE: ${doneCount}`;

  // Complete phase button logic: require ALL tasks across all 3 lists to be 'done'
  const isAllDone = phase.tasks.length > 0 && phase.tasks.every(t => t.state === 'done');
  
  if (phase.completed) {
    btnCompletePhase.disabled = true;
    btnCompletePhase.innerHTML = `<span>✓ PHASE COMPLETED</span>`;
    btnCompletePhase.style.background = 'var(--color-done-bg)';
    btnCompletePhase.style.color = 'var(--color-done-text)';
  } else if (!phase.unlocked) {
    btnCompletePhase.disabled = true;
    btnCompletePhase.innerHTML = `<span>🔒 PHASE LOCKED</span>`;
  } else if (isAllDone) {
    btnCompletePhase.disabled = false;
    btnCompletePhase.innerHTML = `<span>✓ APPROVE PHASE & UNLOCK NEXT</span>`;
    btnCompletePhase.onclick = () => completePhase(phase.id);
  } else {
    btnCompletePhase.disabled = true;
    const remaining = phase.tasks.length - doneCount;
    btnCompletePhase.innerHTML = `<span>🔒 ALL TASKS MUST BE DONE (${remaining} REMAINING)</span>`;
  }

  // Form visibility for adding user tasks: visible only on active/unlocked phase
  if (phase.unlocked && !phase.completed) {
    userAddTaskForm.style.display = 'flex';
  } else {
    userAddTaskForm.style.display = 'none';
  }

  // Filter tasks into three distinct lists
  const planTasks = phase.tasks.filter(t => t.source === 'plan');
  const aiTasks = phase.tasks.filter(t => t.source === 'ai-suggested');
  const userTasks = phase.tasks.filter(t => t.source === 'user-added');

  countPlan.textContent = planTasks.length;
  countAi.textContent = aiTasks.length;
  countUser.textContent = userTasks.length;

  renderTaskList(gridPlanTasks, planTasks, 'No planned tasks in this phase.');
  renderTaskList(gridAiTasks, aiTasks, 'No AI-suggested tasks proposed for this phase yet.');
  renderTaskList(gridUserTasks, userTasks, 'No ad-hoc user tasks added to this phase yet.');
}

function renderTaskList(container, tasks, emptyMsg) {
  container.innerHTML = '';
  if (tasks.length === 0) {
    container.innerHTML = `<div class="empty-task-notice">${emptyMsg}</div>`;
    return;
  }

  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card state-${task.state}`;

    const isChecked = task.state !== 'pending';

    // Note section (prominently shown for AI and User tasks if present)
    let noteHtml = '';
    if (task.note && task.note.trim()) {
      const isUserNote = task.source === 'user-added';
      noteHtml = `
        <div class="task-note-box ${isUserNote ? 'user-note' : ''}">
          <span class="task-note-label">${task.source === 'ai-suggested' ? 'AI Proposal Rationale' : 'Supervisor Note'}:</span>
          ${escapeHtml(task.note)}
        </div>
      `;
    }

    // Action button logic
    let actionButtonsHtml = '';
    
    if (task.state === 'pending') {
      actionButtonsHtml = `<button class="btn-action approve-btn" data-action="approve">✓ Approve Task</button>`;
    } else if (task.state === 'approved') {
      actionButtonsHtml = `
        <button class="btn-action test-btn" data-action="test">🧪 Mark Tested</button>
        <button class="btn-action undo-btn" data-action="undo">↺ Undo</button>
      `;
    } else if (task.state === 'tested') {
      actionButtonsHtml = `
        <button class="btn-action done-btn" data-action="done">✅ Approve & Complete</button>
        <button class="btn-action undo-btn" data-action="undo">↺ Undo</button>
      `;
    } else if (task.state === 'done') {
      actionButtonsHtml = `<button class="btn-action undo-btn" data-action="undo">↺ Reopen / Undo</button>`;
    }

    if (task.source !== 'plan') {
      actionButtonsHtml += `<button class="btn-action delete-btn" data-action="delete">🗑</button>`;
    }

    const addedTimeStr = task.addedAt ? new Date(task.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    card.innerHTML = `
      <div class="task-left">
        <label class="task-checkbox-wrap">
          <input type="checkbox" class="task-checkbox" ${isChecked ? 'checked' : ''} />
        </label>
        <div class="task-info">
          <div class="task-header-line">
            <span class="task-id">${task.id}</span>
            <span class="task-title">${escapeHtml(task.title)}</span>
          </div>
          ${noteHtml}
          <div class="task-meta-line">
            <span>Added ${addedTimeStr || 'at phase start'}</span>
          </div>
        </div>
      </div>

      <div class="task-right">
        <span class="task-state-badge ${task.state}">${task.state}</span>
        <div class="task-actions">
          ${actionButtonsHtml}
        </div>
      </div>
    `;

    // Event Listeners
    const checkbox = card.querySelector('.task-checkbox');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      if (task.state === 'pending') {
        updateTaskState(task.id, 'approved');
      } else {
        // Ticking checkbox when already past pending does NOT uncheck/revert
        checkbox.checked = true;
      }
    });

    const approveBtn = card.querySelector('[data-action="approve"]');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => updateTaskState(task.id, 'approved'));
    }

    const testBtn = card.querySelector('[data-action="test"]');
    if (testBtn) {
      testBtn.addEventListener('click', () => updateTaskState(task.id, 'tested'));
    }

    const doneBtn = card.querySelector('[data-action="done"]');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => updateTaskState(task.id, 'done'));
    }

    const undoBtn = card.querySelector('[data-action="undo"]');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        let prevState = 'pending';
        if (task.state === 'done') prevState = 'tested';
        else if (task.state === 'tested') prevState = 'approved';
        else if (task.state === 'approved') prevState = 'pending';
        updateTaskState(task.id, prevState);
      });
    }

    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteTask(task.id));
    }

    container.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Add task form event listeners
btnSubmitTask.addEventListener('click', () => addTask('user-added'));
inputTaskTitle.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask('user-added');
});

// Initialization & Auto-Polling (Every 2000 ms)
fetchState();
pollTimer = setInterval(fetchState, 2000);
