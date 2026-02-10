/**
 * OPERATIONS — E-commerce
 * Products listed → Select product → Quantity → Place order → Agents handle the rest
 */

const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '';

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
    productsGrid.innerHTML = products.map(p => {
      const imgUrl = (p.imageUrl || '').trim() || 'https://images.unsplash.com/photo-1558769132-cb1aea913002?w=400&h=400&fit=crop';
      const price = p.pricePerUnit != null ? `₹${Number(p.pricePerUnit).toLocaleString('en-IN')}` : '';
      return `
      <div class="product-card" data-product-id="${p.productId}" data-product-name="${p.productName}" data-unit="${p.unit}" data-available="${p.availableStock}" data-price="${p.pricePerUnit != null ? p.pricePerUnit : ''}">
        <div class="product-card-image-wrap">
          <img src="${imgUrl}" alt="${p.productName}" class="product-card-image" loading="lazy" />
        </div>
        <div class="product-card-body">
          <div class="product-name">${p.productName}</div>
          ${price ? `<div class="product-price">${price}</div>` : ''}
          <div class="product-meta">${p.availableStock} ${p.unit} available</div>
          <button type="button" class="btn-select">Add to order</button>
        </div>
      </div>`;
    }).join('');
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
    availableStock: parseInt(card.dataset.available, 10) || 0,
    pricePerUnit: card.dataset.price ? parseInt(card.dataset.price, 10) : null
  };
  quantityInput.max = selectedProduct.availableStock;
  quantityInput.value = Math.min(1, selectedProduct.availableStock);
  const priceStr = selectedProduct.pricePerUnit != null ? ` · ₹${selectedProduct.pricePerUnit.toLocaleString('en-IN')} each` : '';
  cartSummary.innerHTML = `
    <strong>Selected:</strong> ${selectedProduct.productName} (${selectedProduct.unit})${priceStr}
    <br><span class="muted">Max: ${selectedProduct.availableStock} ${selectedProduct.unit}</span>
  `;
  cartSection.removeAttribute('hidden');
  resultSection.setAttribute('hidden', '');
  document.querySelector('.product-card.selected')?.classList.remove('selected');
  card.classList.add('selected');
  cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

clearSelectionBtn.addEventListener('click', () => {
  selectedProduct = null;
  cartSection.setAttribute('hidden', '');
  cartSummary.innerHTML = '';
  resultSection.setAttribute('hidden', '');
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
  resultSection.setAttribute('hidden', '');

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

    resultSection.removeAttribute('hidden');
    resultContent.innerHTML = formatResult(data, res.ok);
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    loadProducts(); // refresh stock (no recent-orders list for customer)
  } catch (err) {
    resultSection.removeAttribute('hidden');
    resultContent.innerHTML = `<span class="error">Request failed: ${err.message}</span>`;
  } finally {
    placeOrderBtn.disabled = false;
  }
});

function formatResult(data, ok) {
  if (!ok) {
    const lines = [`<span class="error">Error: ${data.error || data.message || 'Unknown'}</span>`];
    if (data.customerServiceMessage) {
      lines.push(`<div class="customer-service">${data.customerServiceMessage}</div>`);
    }
    return lines.map(l => `<div class="line">${l}</div>`).join('');
  }

  // Customer-facing: simple confirmation only (no internal details)
  const lines = [];
  lines.push(`<p class="order-placed-msg">Your order has been placed!</p>`);
  if (data.orderId) {
    lines.push(`<p class="order-id-ref">Order ID: <strong>${data.orderId}</strong></p>`);
  }
  if (data.customerServiceMessage) {
    lines.push(`<div class="customer-service">${data.customerServiceMessage}</div>`);
  }
  return lines.map(l => `<div class="line">${l}</div>`).join('');
}

// Recent orders section hidden on shop page (customer-facing); use Dashboard Overview for internal view
document.getElementById('api-base').textContent = API_BASE || window.location.origin || 'http://localhost:3000';
