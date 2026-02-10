/**
 * OPERATIONS — WhatsApp Log UI (terminal log only)
 * Fetches last WhatsApp run log from GET /order/last-run/whatsapp and shows it.
 */

const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '';
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

function renderRunLog(runLog) {
  if (!runLog || !runLog.length) {
    runInfo.textContent = 'No WhatsApp run log yet.';
    terminalOutput.innerHTML = '<span class="muted">(empty)</span>';
    return;
  }
  runInfo.textContent = runLog.length + ' lines from last WhatsApp order';
  terminalOutput.innerHTML = runLog.map(entry => {
    const cls = entry.type === 'error' ? 'error' : entry.type === 'warn' ? 'warn' : '';
    return `<span class="line ${cls}">${escapeHtml(entry.text)}</span>`;
  }).join('\n');
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

async function loadLastRun() {
  try {
    const base = API_BASE || '';
    const res = await fetch(`${base}/order/last-run/whatsapp`.replace(/^\/+/, '/'));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load last WhatsApp run');

    const runLog = data.runLog || [];
    renderRunLog(runLog);
    terminalOutput.hidden = toggleLogBtn.getAttribute('aria-expanded') !== 'true';
  } catch (err) {
    runInfo.textContent = '';
    terminalOutput.innerHTML = `<span class="line error">${escapeHtml(err.message)}</span>`;
    terminalOutput.hidden = false;
  }
}

refreshBtn.addEventListener('click', loadLastRun);

function toggleTerminalLog() {
  const expanded = toggleLogBtn.getAttribute('aria-expanded') === 'true';
  toggleLogBtn.setAttribute('aria-expanded', !expanded);
  toggleLogBtn.textContent = expanded ? 'Show terminal log' : 'Hide terminal log';
  terminalOutput.hidden = expanded;
}
toggleLogBtn.addEventListener('click', toggleTerminalLog);

loadLastRun();
document.getElementById('api-base').textContent = API_BASE || window.location.origin || 'http://localhost:3000';
