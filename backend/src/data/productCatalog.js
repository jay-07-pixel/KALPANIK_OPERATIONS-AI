/**
 * Product catalog — single source of truth for website and WhatsApp.
 * Same 10 clothing products used by server seed and WhatsApp parser.
 */

const CLOTHING_PRODUCTS = [
  { productId: 'PROD-101', productName: 'Cotton Crew T-Shirt', sku: 'CLTH-001', category: 'Tops', unit: 'pieces', currentStock: 150, minStockLevel: 20, reorderPoint: 30, pricePerUnit: 599, imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop' },
  { productId: 'PROD-102', productName: 'Denim Jacket', sku: 'CLTH-002', category: 'Outerwear', unit: 'pieces', currentStock: 45, minStockLevel: 5, reorderPoint: 10, pricePerUnit: 2499, imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop' },
  { productId: 'PROD-103', productName: 'Summer Floral Dress', sku: 'CLTH-003', category: 'Dresses', unit: 'pieces', currentStock: 60, minStockLevel: 8, reorderPoint: 15, pricePerUnit: 1899, imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop' },
  { productId: 'PROD-104', productName: 'Slim Fit Chinos', sku: 'CLTH-004', category: 'Bottoms', unit: 'pieces', currentStock: 80, minStockLevel: 10, reorderPoint: 20, pricePerUnit: 1299, imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop' },
  { productId: 'PROD-105', productName: 'Wool Blend Sweater', sku: 'CLTH-005', category: 'Knitwear', unit: 'pieces', currentStock: 55, minStockLevel: 8, reorderPoint: 12, pricePerUnit: 2199, imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop' },
  { productId: 'PROD-106', productName: 'Running Sneakers', sku: 'CLTH-006', category: 'Footwear', unit: 'pairs', currentStock: 70, minStockLevel: 10, reorderPoint: 15, pricePerUnit: 3499, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop' },
  { productId: 'PROD-107', productName: 'Casual Blazer', sku: 'CLTH-007', category: 'Outerwear', unit: 'pieces', currentStock: 35, minStockLevel: 5, reorderPoint: 8, pricePerUnit: 3999, imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop' },
  { productId: 'PROD-108', productName: 'Striped Polo Shirt', sku: 'CLTH-008', category: 'Tops', unit: 'pieces', currentStock: 90, minStockLevel: 12, reorderPoint: 25, pricePerUnit: 899, imageUrl: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=400&fit=crop' },
  { productId: 'PROD-109', productName: 'High-Waist Trousers', sku: 'CLTH-009', category: 'Bottoms', unit: 'pieces', currentStock: 50, minStockLevel: 6, reorderPoint: 12, pricePerUnit: 1599, imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop' },
  { productId: 'PROD-110', productName: 'Zip-Up Hoodie', sku: 'CLTH-010', category: 'Tops', unit: 'pieces', currentStock: 65, minStockLevel: 8, reorderPoint: 18, pricePerUnit: 1799, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop' }
];

/** Product names only (for WhatsApp parser prompt) */
function getProductNames() {
  return CLOTHING_PRODUCTS.map(p => p.productName);
}

/** Full catalog for server seed */
function getCatalogForSeed() {
  return CLOTHING_PRODUCTS.map(p => ({ ...p, reservedStock: 0 }));
}

module.exports = {
  CLOTHING_PRODUCTS,
  getProductNames,
  getCatalogForSeed
};
