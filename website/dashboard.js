/**
 * OPERATIONS — Dashboard
 * Fetches last-run summary and runLog; renders structured cards + optional terminal log
 */

const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '';
const summaryContainer = document.getElementById('summary-container');
const emptyState = document.getElementById('empty-state');
const terminalOutput = document.getElementById('terminal-output');
const refreshBtn = document.getElementById('refresh-run');
const runInfo = document.getElementById('run-info');
const toggleLogBtn = document.getElementById('toggle-log');

function escapeHtml(s) {
  if (s == null || s === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

function renderOverview(summary) {
  const el = document.getElementById('summary-overview');
  if (!summary || !summary.channel) {
    el.innerHTML = '<p class="muted">No order data.</p>';
    return;
  }
  const status = summary.status || '—';
  const statusClass = status === 'success' ? 'success' : status === 'rejected' || status === 'plan_rejected' ? 'error' : status === 'partial' ? 'warn' : '';
  const isRejectedStock = status === 'rejected' && summary.inventory && /insufficient|stock|NOT_AVAILABLE/i.test(summary.inventory.reason || '');
  const customerServiceMsg = isRejectedStock ? '<p class="customer-service-dashboard">Call customer service: 9822961688</p>' : '';
  el.innerHTML = `
    <dl class="summary-dl">
      <dt>Channel</dt><dd>${escapeHtml(summary.channel)}</dd>
      <dt>Time</dt><dd>${escapeHtml(formatTimestamp(summary.timestamp))}</dd>
      <dt>Status</dt><dd><span class="badge badge-${statusClass}">${escapeHtml(status)}</span></dd>
      ${summary.orderId ? `<dt>Order ID</dt><dd>${escapeHtml(summary.orderId)}</dd>` : ''}
      ${summary.orderIntentId ? `<dt>Intent ID</dt><dd>${escapeHtml(summary.orderIntentId)}</dd>` : ''}
      ${summary.customerName ? `<dt>Customer</dt><dd>${escapeHtml(summary.customerName)}</dd>` : ''}
      ${summary.productName ? `<dt>Product</dt><dd>${escapeHtml(summary.productName)}</dd>` : ''}
      ${summary.quantity != null ? `<dt>Quantity</dt><dd>${escapeHtml(summary.quantity)} ${escapeHtml(summary.unit || '')}</dd>` : ''}
      ${summary.inventory ? `<dt>Inventory</dt><dd><span class="badge badge-${summary.inventory.status === 'AVAILABLE' ? 'success' : 'error'}">${escapeHtml(summary.inventory.status)}</span>${summary.inventory.reason ? ' ' + escapeHtml(summary.inventory.reason) : ''}</dd>` : ''}
      ${summary.delayRisk ? `<dt>Delay Risk</dt><dd><span class="badge badge-${summary.delayRisk.delayed ? 'error' : 'success'}">${(summary.delayRisk.risk * 100).toFixed(0)}%</span> ${summary.delayRisk.delayed ? 'Likely delayed' : 'On track'}</dd>` : ''}
    </dl>
    ${customerServiceMsg}
    ${summary.delayRisk && summary.delayRisk.message ? `<p class="delay-risk-msg">${escapeHtml(summary.delayRisk.message)}</p>` : ''}
  `;
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (_) {
    return ts;
  }
}

function renderSteps(summary) {
  const el = document.getElementById('summary-steps');
  const steps = summary?.steps;
  if (!steps || !steps.length) {
    el.innerHTML = '<p class="muted">No steps recorded.</p>';
    return;
  }
  el.innerHTML = steps.map(s => {
    const statusClass = s.status === 'ok' ? 'success' : s.status === 'rejected' ? 'error' : 'warn';
    const issues = s.issues && s.issues.length ? `<ul class="step-issues"><li>${s.issues.map(i => escapeHtml(i)).join('</li><li>')}</li></ul>` : '';
    return `
      <div class="step-card step-${s.step}">
        <span class="step-num">${s.step}</span>
        <div class="step-content">
          <strong>${escapeHtml(s.name)}</strong>
          <span class="badge badge-${statusClass}">${escapeHtml(s.status)}</span>
          ${s.detail ? `<p class="step-detail">${escapeHtml(s.detail)}</p>` : ''}
          ${issues}
        </div>
      </div>
    `;
  }).join('');
}

function renderTasks(summary) {
  const el = document.getElementById('summary-tasks');
  const tasks = summary?.tasks;
  const timeRequired = summary?.timeRequiredHours;
  const deadline = summary?.deadline;
  const feasible = summary?.deadlineFeasible;
  const estimatedCompletion = summary?.estimatedCompletion;
  const sequence = summary?.sequence;

  if (!tasks && timeRequired == null && !deadline) {
    el.innerHTML = '<p class="muted">No task or time data.</p>';
    return;
  }

  let html = '';
  if (sequence && sequence.length) {
    html += `<p class="sequence"><strong>Sequence:</strong> ${escapeHtml(sequence.join(' → '))}</p>`;
  }
  if (tasks && tasks.length) {
    html += '<ul class="task-list">';
    tasks.forEach(t => {
      html += `<li><code>${escapeHtml(t.taskId)}</code> ${escapeHtml(t.taskType || '')} — ${escapeHtml(t.estimatedDuration ?? '')}h</li>`;
    });
    html += '</ul>';
  }
  if (timeRequired != null) {
    html += `<p><strong>Time required:</strong> ${Number(timeRequired).toFixed(2)}h total</p>`;
  }
  if (deadline) {
    const feasibleStr = feasible === true ? 'Yes' : feasible === false ? 'No' : '—';
    html += `<p><strong>Deadline:</strong> ${escapeHtml(formatTimestamp(deadline))} · Feasible: <span class="badge badge-${feasible === true ? 'success' : feasible === false ? 'error' : ''}">${feasibleStr}</span></p>`;
  }
  if (estimatedCompletion) {
    html += `<p><strong>Est. completion:</strong> ${escapeHtml(formatTimestamp(estimatedCompletion))}</p>`;
  }
  if (summary?.timeBreakdown && summary.timeBreakdown.length) {
    html += '<details class="time-breakdown"><summary>Breakdown</summary><ul>';
    summary.timeBreakdown.forEach(b => {
      html += `<li>${escapeHtml(b.taskId)} (${escapeHtml(b.taskType || '')}): ${Number(b.hours).toFixed(2)}h</li>`;
    });
    html += '</ul></details>';
  }
  el.innerHTML = html || '<p class="muted">No task or time data.</p>';
}

function renderWorkforce(summary) {
  const el = document.getElementById('summary-workforce');
  const candidates = summary?.candidates;
  const selected = summary?.selectedStaff;
  const coordination = summary?.coordination;

  if (!candidates?.length && !selected && !coordination) {
    el.innerHTML = '<p class="muted">No workforce data.</p>';
    return;
  }

  let html = '';
  if (selected) {
    html += `<p class="selected-staff"><strong>Selected:</strong> ${escapeHtml(selected.name)} (${escapeHtml(selected.staffId)})</p>`;
    if (selected.reason) html += `<p class="reason">${escapeHtml(selected.reason)}</p>`;
  }
  if (coordination) {
    html += `<p><strong>Assigned:</strong> ${escapeHtml(coordination.assignedStaffName)} · New workload: ${escapeHtml(coordination.newWorkload)}h</p>`;
  }
  if (candidates && candidates.length) {
    html += '<details class="candidates-list"><summary>Candidates</summary><ul>';
    candidates.forEach(c => {
      const mark = selected && c.staffId === selected.staffId ? ' ← selected' : '';
      html += `<li>${escapeHtml(c.name)} (${escapeHtml(c.staffId)}): ${c.currentWorkload}h current, ${c.freeCapacity}h free${escapeHtml(mark)}</li>`;
    });
    html += '</ul></details>';
  }
  if (summary?.critic) {
    const c = summary.critic;
    html += `<p class="critic"><strong>Critic:</strong> ${c.approved ? 'Approved' : 'Rejected'} — ${escapeHtml(c.reason || '')}</p>`;
    if (c.issues && c.issues.length) {
      html += '<ul class="step-issues"><li>' + c.issues.map(i => escapeHtml(i)).join('</li><li>') + '</li></ul>';
    }
  }
  el.innerHTML = html || '<p class="muted">No workforce data.</p>';
}

function renderSummary(summary) {
  if (!summary) return;
  renderOverview(summary);
  renderSteps(summary);
  renderTasks(summary);
  renderWorkforce(summary);
}

function renderRunLog(runLog) {
  if (!runLog || !runLog.length) {
    runInfo.textContent = 'No run log yet. Place an order from Shop to see the terminal output here.';
    terminalOutput.innerHTML = '<span class="muted">(empty)</span>';
    terminalOutput.hidden = false;
    return;
  }
  runInfo.textContent = `${runLog.length} lines from last order processing`;
  terminalOutput.innerHTML = runLog.map(entry => {
    const cls = entry.type === 'error' ? 'error' : entry.type === 'warn' ? 'warn' : '';
    return `<span class="line ${cls}">${escapeHtml(entry.text)}</span>`;
  }).join('\n');
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

async function loadLastRun() {
  try {
    const base = API_BASE || '';
    const res = await fetch(`${base}/order/last-run`.replace(/^\/+/, '/'));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load last run');

    const summary = data.summary ?? null;
    const runLog = data.runLog || [];

    if (summary && (summary.channel || summary.steps?.length)) {
      summaryContainer.setAttribute('aria-hidden', 'false');
      summaryContainer.style.display = 'grid';
      emptyState.style.display = 'none';
      renderSummary(summary);
    } else {
      summaryContainer.setAttribute('aria-hidden', 'true');
      summaryContainer.style.display = 'none';
      emptyState.style.display = 'block';
    }

    renderRunLog(runLog);
    terminalOutput.hidden = toggleLogBtn.getAttribute('aria-expanded') !== 'true';
  } catch (err) {
    summaryContainer.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.innerHTML = `<p class="error">Failed to load: ${escapeHtml(err.message)}</p>`;
    runInfo.textContent = '';
    terminalOutput.innerHTML = `<span class="line error">${escapeHtml(err.message)}</span>`;
    terminalOutput.hidden = false;
  }
}

function toggleTerminalLog() {
  const expanded = toggleLogBtn.getAttribute('aria-expanded') === 'true';
  toggleLogBtn.setAttribute('aria-expanded', !expanded);
  toggleLogBtn.textContent = expanded ? 'Show terminal log' : 'Hide terminal log';
  terminalOutput.hidden = expanded;
}

refreshBtn.addEventListener('click', loadLastRun);
toggleLogBtn.addEventListener('click', toggleTerminalLog);

loadLastRun();
document.getElementById('api-base').textContent = API_BASE || window.location.origin || 'http://localhost:3000';
