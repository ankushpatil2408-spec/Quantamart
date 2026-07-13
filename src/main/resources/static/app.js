/**
 * CRAFTED E-Commerce Client-side Script
 * Path: src/main/resources/static/app.js
 */

// State Management
let products = [];
let cart = []; // Array of { product: Product, quantity: Number }
let activeCategory = 'all';

// DOM Elements
const productGrid = document.getElementById('productGrid');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('emptyState');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const closeCartBtn = document.getElementById('closeCartBtn');
const modalOverlay = document.getElementById('modalOverlay');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartTotal = document.getElementById('cartTotal');
const checkoutForm = document.getElementById('checkoutForm');
const detailModal = document.getElementById('detailModal');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const detailOverlay = document.getElementById('detailOverlay');
const detailBody = document.getElementById('detailBody');
const toast = document.getElementById('toast');
const filterPills = document.querySelectorAll('.filter-pill');

// API Endpoints
const PRODUCTS_API = '/api/products';
const ORDERS_API = '/api/orders';

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
});

// Fetch products from our Spring Boot JPA endpoints
async function fetchProducts() {
    try {
        loader.classList.remove('hidden');
        productGrid.classList.add('hidden');
        emptyState.classList.add('hidden');

        const response = await fetch(PRODUCTS_API);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        products = await response.json();
        
        loader.classList.add('hidden');
        if (products.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            productGrid.classList.remove('hidden');
            renderProducts();
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        loader.classList.add('hidden');
        emptyState.classList.remove('hidden');
        showToast('Failed to connect to the Spring Boot server.', 'error');
    }
}

// Render product catalog grid with filters
function renderProducts() {
    productGrid.innerHTML = '';
    
    const filtered = activeCategory === 'all' 
        ? products 
        : products.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
        
    if (filtered.length === 0) {
        productGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; margin: 0 auto; text-align: center;">
                <p>No items found in this category.</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.id = `product-card-${product.id}`;
        
        card.innerHTML = `
            <div class="product-img-wrapper" onclick="openProductDetail(${product.id})">
                <img class="product-img" src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                <span class="product-cat">${product.category}</span>
            </div>
            <div class="product-info">
                <h3 class="product-title" onclick="openProductDetail(${product.id})">${product.name}</h3>
                <p class="product-desc">${product.description || 'No description available.'}</p>
                <div class="product-footer">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})" aria-label="Add to cart">
                        <i data-lucide="plus"></i>
                    </button>
                </div>
            </div>
        `;
        
        productGrid.appendChild(card);
    });
    
    // Rerender Lucide icons for dynamic items
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Open Product Detail Modal
function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const isOutOfStock = product.stock <= 0;
    
    detailBody.innerHTML = `
        <img class="detail-img" src="${product.imageUrl}" alt="${product.name}">
        <div class="detail-meta">
            <span class="detail-category">${product.category}</span>
            <p class="detail-desc">${product.description || 'No description available.'}</p>
            <div class="detail-stock">
                <i data-lucide="${isOutOfStock ? 'x-circle' : 'check-circle'}" class="${isOutOfStock ? 'stock-out' : 'stock-in'}"></i>
                <span class="${isOutOfStock ? 'stock-out' : 'stock-in'}">${isOutOfStock ? 'Out of stock' : `In stock (${product.stock} available)`}</span>
            </div>
            <div class="detail-price-row">
                <span class="detail-price">$${product.price.toFixed(2)}</span>
                <button class="detail-add-btn" onclick="addToCart(${product.id}); closeDetail();" ${isOutOfStock ? 'disabled' : ''}>
                    <i data-lucide="shopping-cart"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('detailTitle').textContent = product.name;
    detailModal.classList.add('active');
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Close Product Detail Modal
function closeDetail() {
    detailModal.classList.remove('active');
}

// Add Item to Cart
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const existing = cart.find(item => item.product.id === id);
    if (existing) {
        if (existing.quantity >= product.stock) {
            showToast(`Cannot add more. Limit reached (${product.stock} items in stock).`, 'error');
            return;
        }
        existing.quantity += 1;
    } else {
        cart.push({ product, quantity: 1 });
    }
    
    updateCartUI();
    showToast(`Added ${product.name} to cart.`);
}

// Update Cart Count Badge, Totals, and Items List
function updateCartUI() {
    // Total Count Badge
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
    
    // Subtotal & Grand Total
    const subtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartTotal.textContent = `$${subtotal.toFixed(2)}`;
    
    // Render Items inside List
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state" style="padding: 2.5rem 0;">
                <i data-lucide="shopping-bag" class="empty-icon"></i>
                <p>Your shopping cart is empty.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }
    
    cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        
        itemEl.innerHTML = `
            <img class="cart-item-img" src="${item.product.imageUrl}" alt="${item.product.name}">
            <div class="cart-item-info">
                <h4 class="cart-item-title">${item.product.name}</h4>
                <div class="cart-item-price">$${item.product.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="adjustQty(${item.product.id}, -1)">-</button>
                <span class="qty-val">${item.quantity}</span>
                <button class="qty-btn" onclick="adjustQty(${item.product.id}, 1)">+</button>
                <button class="remove-item-btn" onclick="removeFromCart(${item.product.id})" aria-label="Remove item">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        `;
        
        cartItemsContainer.appendChild(itemEl);
    });
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Adjust Cart Qty
function adjustQty(id, amount) {
    const item = cart.find(item => item.product.id === id);
    if (!item) return;
    
    item.quantity += amount;
    
    if (item.quantity <= 0) {
        removeFromCart(id);
    } else {
        if (item.quantity > item.product.stock) {
            item.quantity = item.product.stock;
            showToast(`Cannot exceed stock limit of ${item.product.stock} items.`, 'error');
        }
        updateCartUI();
    }
}

// Remove item from cart array
function removeFromCart(id) {
    cart = cart.filter(item => item.product.id !== id);
    updateCartUI();
    showToast('Removed item from cart.');
}

// POST dispatch order to Spring Boot REST endpoint
async function handleCheckout(e) {
    e.preventDefault();
    
    if (cart.length === 0) {
        showToast('Your cart is empty.', 'error');
        return;
    }
    
    const customerName = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const totalAmount = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    
    const orderData = {
        customerName,
        email,
        totalAmount,
        status: 'PENDING'
    };
    
    try {
        const submitBtn = checkoutForm.querySelector('.submit-order-btn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div> Submitting...';
        
        const response = await fetch(ORDERS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const savedOrder = await response.json();
        
        // Success Toast & alert
        showToast(`Order #${savedOrder.id} successfully placed!`, 'success');
        
        // Reset Cart and View
        cart = [];
        updateCartUI();
        checkoutForm.reset();
        closeCart();
        
        // Elegant confirmation message
        alert(`Order Placed Successfully!\n\nThank you, ${customerName}. Your order has been registered.\nOrder ID: #${savedOrder.id}\nTotal Amount: $${totalAmount.toFixed(2)}\nStatus: ${savedOrder.status}`);
        
    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Failed to place order. Please try again.', 'error');
    } finally {
        const submitBtn = checkoutForm.querySelector('.submit-order-btn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="credit-card"></i> Place Order';
        if (window.lucide) lucide.createIcons();
    }
}

// Sidebar Cart controls
function openCart() {
    cartModal.classList.add('active');
}

function closeCart() {
    cartModal.classList.remove('active');
}

// Display modern visual toasts
function showToast(message, type = 'success') {
    toast.textContent = message;
    
    if (type === 'error') {
        toast.style.borderLeft = '4px solid #ef4444';
    } else if (type === 'success') {
        toast.style.borderLeft = '4px solid #10b981';
    } else {
        toast.style.borderLeft = 'none';
    }
    
    toast.classList.remove('hidden');
    // Force browser reflow
    toast.offsetHeight;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// Bind DOM event listeners
function setupEventListeners() {
    // Open / Close Cart Sidebar
    cartBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    modalOverlay.addEventListener('click', closeCart);
    
    // Close Product Detail Modal
    closeDetailBtn.addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', closeDetail);
    
    // Checkout form handler
    checkoutForm.addEventListener('submit', handleCheckout);
    
    // Category pills filter binds
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(btn => btn.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.getAttribute('data-category');
            renderProducts();
        });
    });
}
