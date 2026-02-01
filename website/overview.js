/**
 * KALPANIK OPERATIONS AI — Dashboard Overview
 * Fetches GET /order/dashboard and renders KPIs, Live Orders, Workforce, Stock.
 * Updates in sync with backend/terminal: same state (orders, staff, inventory) after each order or run.
 */

// Use same origin when served from backend (e.g. http://localhost:3000); fallback for file://
function getApiBase() {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (origin && origin !== 'null' && (origin.startsWith('http:') || origin.startsWith('https:')))
    return origin;
  return 'http://localhost:3000';
}

async function fetchDashboard() {
  const base = getApiBase();
  const url = base ? `${base}/order/dashboard` : '/order/dashboard';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Backend returned ' + res.status);
  return res.json();
}

function escapeHtml(s) {
  if (s == null || s === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function renderKPIs(summary) {
  if (!summary) return;
  document.getElementById('kpi-total-orders').textContent = summary.totalOrders ?? 0;
  document.getElementById('kpi-active-staff').textContent = `${summary.activeStaff ?? 0} / ${summary.totalStaff ?? 0}`;
  document.getElementById('kpi-low-stock').textContent = summary.lowStockCount ?? 0;
  document.getElementById('kpi-efficiency').textContent = (summary.efficiencyPercent != null ? summary.efficiencyPercent : '—') + '%';
  document.getElementById('kpi-orders-change').textContent = summary.totalOrders > 0 ? '+12.5%' : '—';
  document.getElementById('kpi-eff-change').textContent = summary.efficiencyPercent != null ? '+2.4%' : '—';
  document.getElementById('kpi-stock-badge').style.display = (summary.lowStockCount > 0) ? 'inline-block' : 'none';
  document.getElementById('util-percent').textContent = summary.utilizationPercent ?? 0;
  document.getElementById('util-fill').style.width = `${Math.min(100, summary.utilizationPercent || 0)}%`;
}

function renderLiveOrders(orders) {
  const el = document.getElementById('live-orders-list');
  if (!orders || orders.length === 0) {
    el.innerHTML = '<p class="muted empty-msg">No orders yet. Place an order from Shop.</p>';
    return;
  }
  const slice = orders.slice(0, 8);
  el.innerHTML = slice.map(o => {
    const source = (o.channel || 'website').toUpperCase();
    const sourceClass = source === 'WHATSAPP' ? 'whatsapp' : '';
    const priority = (o.priority || 'STANDARD').toUpperCase();
    const qty = `${o.totalQuantity || 0} ${o.unit || 'units'}`;
    return `
      <div class="order-card">
        <div class="order-icon">📦</div>
        <div class="order-meta">
          <p class="order-title">${escapeHtml(o.productName)}</p>
          <p class="order-detail">
            <span>${escapeHtml(o.orderId)}</span>
            ${o.assignedStaffName ? `<span>• ${escapeHtml(o.assignedStaffName)}</span>` : ''}
          </p>
          <div class="order-badges">
            <span class="badge-source ${sourceClass}">${escapeHtml(source)}</span>
            <span class="badge-priority ${priority}">${escapeHtml(priority)}</span>
          </div>
          <p class="order-time">${escapeHtml(qty)} · ${timeAgo(o.createdAt)}</p>
        </div>
      </div>
    `;
  }).join('');
}

function renderWorkforce(staff) {
  const el = document.getElementById('workforce-list');
  if (!staff || staff.length === 0) {
    el.innerHTML = '<p class="muted empty-msg">No staff data.</p>';
    return;
  }
  const roleLabel = (r) => (r && r !== 'PRODUCTION') ? r.replace('_', ' ') : 'Packer';
  el.innerHTML = staff.map(s => {
    const status = (s.status || 'OFFLINE').toUpperCase();
    const avatarClass = status === 'ONLINE' ? 'available' : status === 'BUSY' ? 'busy' : 'offline';
    const initial = (s.name && s.name[0]) ? s.name[0].toUpperCase() : '?';
    const workload = `${s.currentWorkload || 0}h workload`;
    return `
      <div class="staff-row">
        <div class="staff-avatar ${avatarClass}">${escapeHtml(initial)}</div>
        <div class="staff-info">
          <p class="staff-name">${escapeHtml(s.name)}</p>
          <p class="staff-role">${escapeHtml(roleLabel(s.role))}</p>
          <span class="staff-status ${status}">${escapeHtml(status)}</span>
          <p class="staff-workload">${escapeHtml(workload)}</p>
        </div>
      </div>
    `;
  }).join('');
}

function renderStock(inventory) {
  const el = document.getElementById('stock-list');
  if (!inventory || inventory.length === 0) {
    el.innerHTML = '<p class="muted empty-msg">No inventory data.</p>';
    return;
  }
  el.innerHTML = inventory.map(i => {
    const total = i.currentStock || 1;
    const avail = i.availableStock ?? i.currentStock ?? 0;
    const pct = Math.min(100, Math.round((avail / total) * 100));
    const barClass = i.needsRestock ? (avail === 0 ? 'critical' : 'low') : 'ok';
    const iconClass = barClass;
    return `
      <div class="stock-row">
        <div class="stock-icon ${iconClass}">${i.needsRestock ? '⚠' : '📦'}</div>
        <div class="stock-info">
          <p class="stock-name">${escapeHtml(i.productName)}</p>
          <p class="stock-qty">${avail} / ${total} ${escapeHtml(i.unit || '')}</p>
        </div>
        <div class="stock-bar-wrap">
          <div class="stock-bar ${barClass}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderError(message) {
  const hint = 'Open this page from http://localhost:3000/overview.html and ensure the backend is running (npm start in backend folder).';
  const full = message + '. ' + hint;
  document.getElementById('live-orders-list').innerHTML = `<p class="error">${escapeHtml(full)}</p>`;
  document.getElementById('workforce-list').innerHTML = `<p class="error">${escapeHtml(message)}</p>`;
  document.getElementById('stock-list').innerHTML = `<p class="error">${escapeHtml(message)}</p>`;
}

async function loadDashboard() {
  try {
    var data = await fetchDashboard();
    cachedDashboard = data;
    renderKPIs(data.summary);
    renderLiveOrders(data.orders);
    renderWorkforce(data.staff);
    renderStock(data.inventory);
  } catch (err) {
    console.error(err);
    renderKPIs({ totalOrders: 0, activeStaff: 0, totalStaff: 0, lowStockCount: 0, utilizationPercent: 0 });
    renderError(err.message || 'Failed to load dashboard.');
  }
}

// Initial load
loadDashboard();
// Poll every 5s so dashboard stays in sync with terminal/backend (orders, staff, inventory)
setInterval(loadDashboard, 5000);

var refreshBtn = document.getElementById('refresh-dashboard');
if (refreshBtn) {
  refreshBtn.addEventListener('click', function () {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '…';
    loadDashboard().finally(function () {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '↻ Refresh';
    });
  });
}

// --- Manage & Restock modals ---
var cachedDashboard = null;

function openModal(id) {
  var modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeModal(id) {
  var modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function getBase() {
  var o = typeof window !== 'undefined' && window.location.origin;
  if (o && o !== 'null' && (o.startsWith('http:') || o.startsWith('https:')))
    return o;
  return 'http://localhost:3000';
}

function parseApiResponse(r) {
  return r.text().then(function (t) { return { ok: r.ok, status: r.status, text: t }; });
}

function handleApiJson(p) {
  var data;
  try { data = JSON.parse(p.text); } catch (e) {
    throw new Error('Server returned invalid response (status ' + p.status + '). Restart the backend (npm start in backend folder) and try again.');
  }
  if (!p.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function renderManageStaffList(staff) {
  var list = document.getElementById('manage-staff-list');
  if (!staff || staff.length === 0) {
    list.innerHTML = '<p class="muted">No staff yet. Add staff above.</p>';
    return;
  }
  list.innerHTML = staff.map(function (s) {
    var status = (s.status || 'ONLINE').toUpperCase();
    var workload = s.currentWorkload != null ? s.currentWorkload : 0;
    return (
      '<div class="manage-item" data-staff-id="' + escapeHtml(s.staffId) + '">' +
      '<div class="name">' + escapeHtml(s.name) + ' (' + escapeHtml(s.staffId) + ')</div>' +
      '<div class="manage-item-row">' +
      '<div><label>Status</label><select class="manage-status">' +
      '<option value="ONLINE"' + (status === 'ONLINE' ? ' selected' : '') + '>ONLINE</option>' +
      '<option value="BUSY"' + (status === 'BUSY' ? ' selected' : '') + '>BUSY</option>' +
      '<option value="OFFLINE"' + (status === 'OFFLINE' ? ' selected' : '') + '>OFFLINE</option>' +
      '</select></div>' +
      '<div><label>Workload (h)</label><input type="number" class="manage-workload" min="0" max="24" step="0.5" value="' + workload + '" /></div>' +
      '<button type="button" class="btn-save manage-save">Save</button>' +
      '<button type="button" class="btn-remove manage-remove" title="Remove">Remove</button>' +
      '</div></div>'
    );
  }).join('');
}

function wireManageModalHandlers() {
  var list = document.getElementById('manage-staff-list');
  if (!list) return;
  list.querySelectorAll('.manage-save').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.manage-item');
      var staffId = item.dataset.staffId;
      var status = item.querySelector('.manage-status').value;
      var workloadEl = item.querySelector('.manage-workload');
      var workload = parseFloat(workloadEl.value, 10);
      if (Number.isNaN(workload) || workload < 0) workload = 0;
      btn.disabled = true;
      fetch(getBase() + '/order/staff/' + encodeURIComponent(staffId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status, currentWorkload: workload })
      })
        .then(parseApiResponse)
        .then(function (p) { handleApiJson(p); loadDashboard(); cachedDashboard = null; closeModal('modal-manage'); })
        .catch(function (err) { alert('Update failed: ' + err.message); })
        .finally(function () { btn.disabled = false; });
    });
  });
  list.querySelectorAll('.manage-remove').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.manage-item');
      var staffId = item.dataset.staffId;
      var name = item.querySelector('.name').textContent;
      if (!confirm('Remove ' + name + ' from workforce?')) return;
      btn.disabled = true;
      fetch(getBase() + '/order/staff/' + encodeURIComponent(staffId), { method: 'DELETE' })
        .then(parseApiResponse)
        .then(function (p) {
          handleApiJson(p);
          loadDashboard();
          cachedDashboard = null;
          return fetchDashboard();
        })
        .then(function (data) {
          cachedDashboard = data;
          renderManageStaffList(data.staff || []);
          wireManageModalHandlers();
        })
        .catch(function (err) { alert('Remove failed: ' + err.message); })
        .finally(function () { btn.disabled = false; });
    });
  });
}

// Manage: open modal with staff list, add/remove, update status and workload
document.getElementById('btn-manage').addEventListener('click', async function () {
  try {
    var data = cachedDashboard || await fetchDashboard();
    cachedDashboard = data;
    renderManageStaffList(data.staff || []);
    wireManageModalHandlers();
    openModal('modal-manage');
  } catch (err) {
    alert('Failed to load staff: ' + err.message);
  }
});

document.getElementById('btn-add-staff').addEventListener('click', async function () {
  var nameEl = document.getElementById('add-staff-name');
  var name = nameEl && nameEl.value ? nameEl.value.trim() : '';
  if (!name) {
    alert('Enter staff name.');
    return;
  }
  var roleEl = document.getElementById('add-staff-role');
  var capacityEl = document.getElementById('add-staff-capacity');
  var role = roleEl ? roleEl.value : 'PRODUCTION';
  var capacity = capacityEl ? parseInt(capacityEl.value, 10) : 8;
  if (isNaN(capacity) || capacity < 1) capacity = 8;
  var btn = document.getElementById('btn-add-staff');
  btn.disabled = true;
  try {
    var r = await fetch(getBase() + '/order/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, role: role, maxCapacity: capacity, status: 'ONLINE' })
    });
    var p = await parseApiResponse(r);
    handleApiJson(p);
    loadDashboard();
    cachedDashboard = null;
    var data = await fetchDashboard();
    cachedDashboard = data;
    renderManageStaffList(data.staff || []);
    wireManageModalHandlers();
    nameEl.value = '';
  } catch (err) {
    alert('Add staff failed: ' + err.message);
  } finally {
    btn.disabled = false;
  }
});

// Restock: open modal with inventory, allow adding stock
document.getElementById('btn-restock').addEventListener('click', async function () {
  try {
    var data = cachedDashboard || await fetchDashboard();
    cachedDashboard = data;
    var inventory = data.inventory || [];
    var list = document.getElementById('restock-list');
    if (!inventory.length) {
      list.innerHTML = '<p class="muted">No inventory data.</p>';
    } else {
      list.innerHTML = inventory.map(function (i) {
        var avail = i.availableStock ?? i.currentStock ?? 0;
        return (
          '<div class="restock-item" data-product-id="' + escapeHtml(i.productId) + '">' +
          '<div class="name">' + escapeHtml(i.productName) + '</div>' +
          '<div class="muted" style="font-size:0.8rem;margin-bottom:0.35rem">Current: ' + avail + ' / ' + (i.currentStock || 0) + ' ' + escapeHtml(i.unit || '') + '</div>' +
          '<div class="restock-item-row">' +
          '<div><label>Quantity to add</label><input type="number" class="restock-qty" min="1" value="50" /></div>' +
          '<button type="button" class="btn-save restock-add">Add</button>' +
          '</div></div>'
        );
      }).join('');
      list.querySelectorAll('.restock-add').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.restock-item');
          var productId = item.dataset.productId;
          var qtyEl = item.querySelector('.restock-qty');
          var qty = parseInt(qtyEl.value, 10);
          if (isNaN(qty) || qty < 1) {
            alert('Enter a valid quantity (at least 1).');
            return;
          }
          btn.disabled = true;
          fetch(getBase() + '/order/restock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: productId, quantity: qty })
          })
            .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, text: t }; }); })
            .then(function (p) {
              var data;
              try { data = JSON.parse(p.text); } catch (e) {
                throw new Error('Server returned invalid response (status ' + p.status + '). Restart the backend (npm start in backend folder) and try again.');
              }
              if (!p.ok) throw new Error(data.error || 'Restock failed');
              loadDashboard();
              cachedDashboard = null;
            })
            .then(function () { closeModal('modal-restock'); })
            .catch(function (err) { alert('Restock failed: ' + err.message); })
            .finally(function () { btn.disabled = false; });
        });
      });
    }
    openModal('modal-restock');
  } catch (err) {
    alert('Failed to load inventory: ' + err.message);
  }
});

// Close modals on backdrop or close button
['modal-manage', 'modal-restock'].forEach(function (id) {
  var modal = document.getElementById(id);
  if (modal) {
    modal.querySelector('.modal-backdrop').addEventListener('click', function () { closeModal(id); });
    modal.querySelector('.modal-close').addEventListener('click', function () { closeModal(id); });
  }
});
