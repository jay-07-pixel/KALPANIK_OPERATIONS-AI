/**
 * OPERATIONS — E-commerce
 * Products listed → Select product → Quantity → Place order → Agents handle the rest
 */

const API_BASE = '';

let selectedProduct = null; // { productId, productName, unit, availableStock }

const productsGrid = document.getElementById('products-grid');
const cartSection = document.getElementById('cart-section');
const cartSummary = document.getElementById('cart-summary');
const quantityInput = document.getElementById('quantity');
const customerNameInput = document.getElementById('customerName');
const prioritySelect = document.getElementById('priority');
const placeOrderBtn = document.getElementById('place-order-btn');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const resultSection = document.getElementById('result-section');
const resultContent = document.getElementById('result-content');
const ordersList = document.getElementById('orders-list');
const refreshOrdersBtn = document.getElementById('refresh-orders');

// Load products on page load
loadProducts();

async function loadProducts() {
  try {
    const base = API_BASE || '';
    const res = await fetch(`${base}/order/products`.replace(/^\/+/, '/'));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load products');
    const products = data.products || [];
    if (products.length === 0) {
      productsGrid.innerHTML = '<div class="muted">No products in catalog.</div>';
      return;
    }
    productsGrid.innerHTML = products.map(p => `
      <div class="product-card" data-product-id="${p.productId}" data-product-name="${p.productName}" data-unit="${p.unit}" data-available="${p.availableStock}">
        <div class="product-name">${p.productName}</div>
        <div class="product-meta">${p.unit} · ${p.availableStock} available</div>
        <button type="button" class="btn-select">Select</button>
      </div>
    `).join('');
    productsGrid.querySelectorAll('.product-card .btn-select').forEach(btn => {
      btn.addEventListener('click', () => selectProduct(btn.closest('.product-card')));
    });
  } catch (err) {
    productsGrid.innerHTML = `<span class="error">${err.message}</span>`;
  }
}

function selectProduct(card) {
  if (!card) return;
  selectedProduct = {
    productId: card.dataset.productId,
    productName: card.dataset.productName,
    unit: card.dataset.unit,
    availableStock: parseInt(card.dataset.available, 10) || 0
  };
  quantityInput.max = selectedProduct.availableStock;
  quantityInput.value = Math.min(1, selectedProduct.availableStock);
  cartSummary.innerHTML = `
    <strong>Selected:</strong> ${selectedProduct.productName} (${selectedProduct.unit})
    <br><span class="muted">Max: ${selectedProduct.availableStock} ${selectedProduct.unit}</span>
  `;
  cartSection.hidden = false;
  resultSection.hidden = true;
  document.querySelector('.product-card.selected')?.classList.remove('selected');
  card.classList.add('selected');
}

clearSelectionBtn.addEventListener('click', () => {
  selectedProduct = null;
  cartSection.hidden = true;
  cartSummary.innerHTML = '';
  resultSection.hidden = true;
  document.querySelector('.product-card.selected')?.classList.remove('selected');
});

placeOrderBtn.addEventListener('click', async () => {
  if (!selectedProduct) return;
  const qty = parseInt(quantityInput.value, 10);
  if (isNaN(qty) || qty < 1) {
    alert('Enter a valid quantity (at least 1).');
    return;
  }
  if (qty > selectedProduct.availableStock) {
    alert(`Only ${selectedProduct.availableStock} ${selectedProduct.unit} available.`);
    return;
  }
  placeOrderBtn.disabled = true;
  resultSection.hidden = true;

  const payload = {
    userId: 'user123',
    customerName: customerNameInput.value.trim(),
    productId: selectedProduct.productId,
    productName: selectedProduct.productName,
    quantity: qty,
    unit: selectedProduct.unit,
    priority: prioritySelect.value,
    deadline: null,
    notes: ''
  };

  try {
    const base = API_BASE || '';
    const res = await fetch(`${base}/order/website`.replace(/^\/+/, '/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    resultSection.hidden = false;
    resultContent.innerHTML = formatResult(data, res.ok);
    resultSection.scrollIntoView({ behavior: 'smooth' });
    loadOrdersList();
    loadProducts(); // refresh stock
  } catch (err) {
    resultSection.hidden = false;
    resultContent.innerHTML = `<span class="error">Request failed: ${err.message}</span>`;
  } finally {
    placeOrderBtn.disabled = false;
  }
});

function formatResult(data, ok) {
  const lines = [];
  if (!ok) {
    lines.push(`<span class="error">Error: ${data.error || data.message || 'Unknown'}</span>`);
    return lines.map(l => `<div class="line">${l}</div>`).join('');
  }

  lines.push(`<span class="${data.success ? 'success' : 'muted'}">${data.message || data.rawStatus}</span>`);
  if (data.orderId) {
    lines.push(`<span class="label">Order ID:</span> ${data.orderId}`);
    lines.push(`<span class="label">Status:</span> ${data.orderStatus || data.rawStatus}`);
  }
  if (data.assignedStaff) {
    lines.push(`<span class="label">Assigned to:</span> ${data.assignedStaff}`);
  }
  if (data.timeRequiredHours != null) {
    lines.push(`<span class="label">Time required:</span> ${Number(data.timeRequiredHours).toFixed(2)}h total`);
    if (data.timeBreakdown && data.timeBreakdown.length) {
      data.timeBreakdown.forEach(b => {
        lines.push(`<span class="task muted">  - ${b.taskId} (${b.taskType}): ${Number(b.hours).toFixed(2)}h</span>`);
      });
    }
  }
  if (data.deadline) {
    const feasibleClass = data.deadlineFeasible === true ? 'feasible-yes' : data.deadlineFeasible === false ? 'feasible-no' : 'muted';
    const feasibleText = data.deadlineFeasible === true ? 'Yes' : data.deadlineFeasible === false ? 'No' : '—';
    lines.push(`<span class="label">Deadline:</span> ${data.deadline}`);
    lines.push(`<span class="label">Feasible:</span> <span class="${feasibleClass}">${feasibleText}</span>`);
  } else if (data.timeRequiredHours != null) {
    lines.push(`<span class="label">Deadline:</span> <span class="muted">not set</span>`);
  }
  if (data.tasks && data.tasks.length) {
    lines.push(`<span class="label">Tasks:</span>`);
    data.tasks.forEach(t => {
      lines.push(`<span class="task">  - ${t.taskId} (${t.taskType}): ${t.status}${t.assignedTo ? ' → ' + t.assignedTo : ''} (${t.estimatedDurationHours != null ? Number(t.estimatedDurationHours).toFixed(2) + 'h' : '—'})</span>`);
    });
  }
  lines.push(`<span class="muted">${data.timestamp || ''}</span>`);
  return lines.map(l => `<div class="line">${l}</div>`).join('');
}

refreshOrdersBtn.addEventListener('click', loadOrdersList);

async function loadOrdersList() {
  try {
    const base = API_BASE || '';
    const res = await fetch(`${base}/order/list`.replace(/^\/+/, '/'));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load orders');
    const list = data.orders || [];
    if (list.length === 0) {
      ordersList.innerHTML = '<div class="muted">No orders yet.</div>';
      return;
    }
    ordersList.innerHTML = list.map(o => `
      <div class="order-item">
        <span class="order-id">${o.orderId}</span>
        <span class="order-status">${o.status}</span>
        · ${o.customerName || '—'} · ${o.totalQuantity} · ${o.assignedStaffName || 'unassigned'}
      </div>
    `).join('');
  } catch (err) {
    ordersList.innerHTML = `<span class="error">${err.message}</span>`;
  }
}

loadOrdersList();
document.getElementById('api-base').textContent = window.location.origin || 'http://localhost:3000';
