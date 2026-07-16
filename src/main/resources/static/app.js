/**
 * Quantamart E-Commerce Client-side Script
 * Path: src/main/resources/static/app.js
 */

// State Management
let products = []; // Full list of products fetched from API
let cart = []; // Array of { product: Product, quantity: Number }
let authUser = JSON.parse(localStorage.getItem('authUser')) || null;
let authMode = 'login'; // 'login' or 'register'

// Theme Management State & Helpers
let currentTheme = localStorage.getItem('theme') || 'light';

function initTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
    showToast(`Switched to ${currentTheme} mode.`, 'success');
}

function updateThemeIcon() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    
    if (currentTheme === 'dark') {
        btn.innerHTML = '<i data-lucide="sun"></i>';
    } else {
        btn.innerHTML = '<i data-lucide="moon"></i>';
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Search and Filter State
let currentPage = 1;
const itemsPerPage = 6;
let searchKeyword = '';
let activeCategory = 'all';
let selectedBrands = [];
let minPrice = null;
let maxPrice = null;
let minRating = 0;
let activeSort = 'featured';

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

// Search & Filter DOM Elements
const searchInput = document.getElementById('searchInput');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const sortSelect = document.getElementById('sortSelect');
const resultsCount = document.getElementById('resultsCount');
const paginationControls = document.getElementById('paginationControls');

// Auth DOM Elements
const authSection = document.getElementById('authSection');
const authModal = document.getElementById('authModal');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authOverlay = document.getElementById('authOverlay');
const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
const authModalTitle = document.getElementById('authModalTitle');
const authToggleMsg = document.getElementById('authToggleMsg');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const emailFormGroup = document.getElementById('emailFormGroup');
const roleFormGroup = document.getElementById('roleFormGroup');
const authForm = document.getElementById('authForm');
const authUsername = document.getElementById('authUsername');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authRole = document.getElementById('authRole');

// API Endpoints
const PRODUCTS_API = '/api/products';
const ORDERS_API = '/api/orders';

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchProducts();
    updateAuthUI();
    setupEventListeners();
});

// Fetch products from our Express endpoints
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
        showToast('Failed to connect to the Express server.', 'error');
    }
}

// Render product catalog grid with filters, sorting, search, and pagination
function renderProducts() {
    // 1. Filtering
    const filtered = products.filter(product => {
        // Name / Brand / Description keyword search
        const query = searchKeyword.toLowerCase().trim();
        const nameMatch = !query || 
            product.name.toLowerCase().includes(query) || 
            (product.brand && product.brand.toLowerCase().includes(query)) ||
            (product.description && product.description.toLowerCase().includes(query)) ||
            product.category.toLowerCase().includes(query);
            
        // Category Filter
        const categoryMatch = activeCategory === 'all' || 
            product.category.toLowerCase() === activeCategory.toLowerCase();
            
        // Brand Filter (checked list)
        const brandMatch = selectedBrands.length === 0 || 
            (product.brand && selectedBrands.some(b => b.toLowerCase() === product.brand.toLowerCase()));
            
        // Price Range Filter
        const priceMinMatch = minPrice === null || minPrice === '' || product.price >= parseFloat(minPrice);
        const priceMaxMatch = maxPrice === null || maxPrice === '' || product.price <= parseFloat(maxPrice);
        
        // Rating Filter (minimum rating boundary)
        const ratingMatch = !product.rating || product.rating >= minRating;
        
        return nameMatch && categoryMatch && brandMatch && priceMinMatch && priceMaxMatch && ratingMatch;
    });
    
    const totalFiltered = filtered.length;
    
    // 2. Sorting
    if (activeSort === 'price-asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-desc') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'rating-desc') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (activeSort === 'name-asc') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (activeSort === 'name-desc') {
        filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else {
        // 'featured' / default: sort by ID
        filtered.sort((a, b) => a.id - b.id);
    }
    
    // 3. Pagination bounds
    const totalPages = Math.ceil(totalFiltered / itemsPerPage);
    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalFiltered);
    const paginated = filtered.slice(startIndex, endIndex);
    
    // Update UI elements for empty state / metadata bar
    if (totalFiltered === 0) {
        if (resultsCount) resultsCount.textContent = 'No products match your filters';
        productGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
        if (paginationControls) paginationControls.innerHTML = '';
        return;
    } else {
        emptyState.classList.add('hidden');
        if (resultsCount) {
            resultsCount.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalFiltered} items`;
        }
    }
    
    // Render product items
    productGrid.innerHTML = '';
    productGrid.classList.remove('hidden');
    
    paginated.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.id = `product-card-${product.id}`;
        
        // Build rating stars display
        const ratingVal = product.rating || 4.0;
        const ratingStarsStr = "★".repeat(Math.round(ratingVal)) + "☆".repeat(5 - Math.round(ratingVal));
        
        card.innerHTML = `
            <div class="product-img-wrapper" onclick="openProductDetail(${product.id})">
                <img class="product-img" src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                <span class="product-cat">${product.category}</span>
                ${product.brand ? `<span class="product-brand-tag">${product.brand}</span>` : ''}
            </div>
            <div class="product-info">
                <div class="product-info-header" onclick="openProductDetail(${product.id})">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-rating">
                        <span class="stars-gold-sm">${ratingStarsStr}</span>
                        <span class="rating-number-sm">${ratingVal.toFixed(1)}</span>
                    </div>
                </div>
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
    
    // 4. Render Pagination Controls
    renderPagination(totalPages);
    
    // Rerender Lucide icons for dynamic items
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Render Page buttons for dynamic Pagination
function renderPagination(totalPages) {
    if (!paginationControls) return;
    paginationControls.innerHTML = '';
    if (totalPages <= 1) return;
    
    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = `page-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts();
            scrollToShop();
        }
    });
    paginationControls.appendChild(prevBtn);
    
    // Page Number Buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${currentPage === i ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderProducts();
            scrollToShop();
        });
        paginationControls.appendChild(pageBtn);
    }
    
    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = `page-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProducts();
            scrollToShop();
        }
    });
    paginationControls.appendChild(nextBtn);
}

// Smooth scroll to catalog section
function scrollToShop() {
    const shopSection = document.getElementById('shop');
    if (shopSection) {
        shopSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Open Product Detail Modal
function openProductDetail(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const isOutOfStock = product.stock <= 0;
    const ratingVal = product.rating || 4.0;
    const ratingStarsStr = "★".repeat(Math.round(ratingVal)) + "☆".repeat(5 - Math.round(ratingVal));
    
    detailBody.innerHTML = `
        <img class="detail-img" src="${product.imageUrl}" alt="${product.name}">
        <div class="detail-meta">
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem;">
                <span class="detail-category">${product.category}</span>
                ${product.brand ? `<span class="detail-brand-tag" style="background-color: var(--border-dark); color: var(--text-main); font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500;">${product.brand}</span>` : ''}
                <div class="detail-rating-stars" style="display: flex; align-items: center; gap: 0.25rem; font-size: 13px; margin-left: auto;">
                    <span class="stars-gold-sm" style="color: #f59e0b;">${ratingStarsStr}</span>
                    <span style="color: var(--text-muted); font-weight: 500;">(${ratingVal.toFixed(1)})</span>
                </div>
            </div>
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
    
    // Fetch and display AI Product Recommendations
    fetchAIRecommendations(product.id);
}

// Fetch and Render AI Product Recommendations
async function fetchAIRecommendations(productId) {
    const section = document.getElementById('aiRecommendationsSection');
    if (!section) return;

    // Render loading skeletons
    section.innerHTML = `
        <div class="ai-recommendations-header">
            <span class="ai-recommendations-spark">
                <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
            </span>
            <h3 style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin: 0;">AI Smart Recommendations</h3>
            <span class="ai-recommendations-badge">Gemini Powered</span>
        </div>
        <div class="ai-recommendations-grid">
            <div class="ai-rec-shimmer"></div>
            <div class="ai-rec-shimmer"></div>
            <div class="ai-rec-shimmer"></div>
        </div>
    `;
    if (window.lucide) {
        lucide.createIcons();
    }

    try {
        const cartProductIds = cart.map(item => item.product.id);
        
        const response = await fetch('/api/ai/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentProductId: productId,
                cartProductIds
            })
        });

        if (!response.ok) {
            throw new Error('Recommendations fetch failed');
        }

        const data = await response.json();
        const recommendations = data.recommendations || [];

        if (recommendations.length === 0) {
            section.innerHTML = '';
            return;
        }

        let gridHtml = '';
        recommendations.forEach(rec => {
            gridHtml += `
                <div class="ai-rec-card" onclick="event.stopPropagation(); openProductDetail(${rec.id});">
                    <img class="ai-rec-img" src="${rec.imageUrl}" alt="${rec.name}">
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <h4 class="ai-rec-title" title="${rec.name}">${rec.name}</h4>
                        <div class="ai-rec-price">$${rec.price.toFixed(2)}</div>
                    </div>
                    <p class="ai-rec-reason">${rec.reason}</p>
                </div>
            `;
        });

        section.innerHTML = `
            <div class="ai-recommendations-header">
                <span class="ai-recommendations-spark">
                    <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>
                </span>
                <h3 style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin: 0;">AI Smart Recommendations</h3>
                <span class="ai-recommendations-badge">Gemini Powered</span>
            </div>
            <div class="ai-recommendations-grid">
                ${gridHtml}
            </div>
        `;
        if (window.lucide) {
            lucide.createIcons();
        }

    } catch (err) {
        console.error('Error loading AI recommendations:', err);
        section.innerHTML = ''; // Hide section quietly on error
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
    
    // Get chosen payment method
    const paymentMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'COD';
    
    const orderData = {
        customerName,
        email,
        totalAmount,
        paymentMethod,
        status: paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING'
    };
    
    try {
        const submitBtn = checkoutForm.querySelector('.submit-order-btn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div> Submitting...';
        
        const reqHeaders = {
            'Content-Type': 'application/json'
        };
        if (authUser && authUser.token) {
            reqHeaders['Authorization'] = `Bearer ${authUser.token}`;
        }
        
        const response = await fetch(ORDERS_API, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const savedOrder = await response.json();
        
        // Success Toast & receipt modal display
        showToast(`Order #${savedOrder.id} successfully placed!`, 'success');
        
        // Reset Cart and View
        cart = [];
        updateCartUI();
        checkoutForm.reset();
        
        // Reset Payment Selection toggles to COD default
        const pmCardCod = document.getElementById('pmCardCod');
        const pmCardOnline = document.getElementById('pmCardOnline');
        const cardDetailsSection = document.getElementById('cardDetailsSection');
        if (pmCardCod && pmCardOnline) {
            pmCardCod.classList.add('active');
            pmCardOnline.classList.remove('active');
            pmCardCod.querySelector('input').checked = true;
            if (cardDetailsSection) cardDetailsSection.classList.add('hidden');
        }
        
        closeCart();
        
        // Render Success Modal Receipt details
        const paymentInfo = savedOrder.payment || {};
        document.getElementById('receiptOrderId').textContent = `#${savedOrder.id}`;
        document.getElementById('receiptCustomerName').textContent = savedOrder.customerName;
        document.getElementById('receiptAmount').textContent = `$${savedOrder.totalAmount.toFixed(2)}`;
        document.getElementById('receiptPaymentMethod').textContent = paymentInfo.paymentMethod || 'COD';
        document.getElementById('receiptTransactionId').textContent = paymentInfo.transactionId || 'N/A';
        
        const receiptPaymentStatus = document.getElementById('receiptPaymentStatus');
        if (receiptPaymentStatus) {
            receiptPaymentStatus.textContent = paymentInfo.status || 'PENDING';
            if (paymentInfo.status === 'COMPLETED') {
                receiptPaymentStatus.className = 'badge success';
            } else {
                receiptPaymentStatus.className = 'badge pending';
            }
        }
        
        const successModal = document.getElementById('successModal');
        if (successModal) {
            successModal.classList.add('active');
        }
        
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

// Fetch orders and payments linked for the specific email address
async function fetchUserOrders(email) {
    const container = document.getElementById('ordersListContainer');
    if (!container) return;

    try {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 0;">
                <div class="spinner" style="width: 24px; height: 24px; border-width: 2px; margin: 0 auto; border-color: var(--accent) transparent var(--accent) transparent;"></div>
                <p style="margin-top: 0.75rem; font-size: 0.875rem; color: var(--text-muted);">Retrieving orders and linked transactions...</p>
            </div>
        `;

        const response = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error('Failed to retrieve orders.');
        }

        const ordersList = await response.json();
        container.innerHTML = '';

        if (ordersList.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2.5rem 0; color: var(--text-muted);">
                    <i data-lucide="shopping-bag" style="width: 36px; height: 36px; margin: 0 auto 0.75rem; display: block; color: var(--text-muted);"></i>
                    <p style="font-size: 0.875rem;">No orders found for this email address.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Sort with newest orders first
        ordersList.sort((a, b) => b.id - a.id);

        ordersList.forEach(order => {
            const card = document.createElement('div');
            card.className = 'order-history-card';
            
            const payment = order.payment || {};
            const methodBadge = payment.paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD';
            const paymentStatusBadgeClass = payment.status === 'COMPLETED' ? 'success' : 'pending';
            const paymentStatusText = payment.status || 'PENDING';

            // Normalize order status display classes
            let statusClass = 'pending';
            if (order.status === 'PAID' || order.status === 'DELIVERED') {
                statusClass = 'success';
            } else if (order.status === 'SHIPPED' || order.status === 'IN_TRANSIT') {
                statusClass = 'accent-badge'; // Wait, let's use standard or simple colors
            }

            // Calculate progress steps dynamically
            const statusSteps = ['PENDING', 'PAID', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];
            const currentStepIndex = statusSteps.indexOf(order.status);
            const progressPercent = currentStepIndex >= 0 ? (currentStepIndex / (statusSteps.length - 1)) * 100 : 0;

            const stepsData = [
                { label: 'Placed', icon: 'file-text' },
                { label: 'Paid', icon: 'check-circle' },
                { label: 'Shipped', icon: 'package' },
                { label: 'In Transit', icon: 'truck' },
                { label: 'Delivered', icon: 'home' }
            ];

            let stepsHtml = '';
            stepsData.forEach((step, idx) => {
                let stepClass = '';
                let iconHtml = '';
                
                if (idx < currentStepIndex) {
                    stepClass = 'completed';
                    iconHtml = '<i data-lucide="check" style="width: 12px; height: 12px;"></i>';
                } else if (idx === currentStepIndex) {
                    stepClass = 'active';
                    iconHtml = `<i data-lucide="${step.icon}" style="width: 12px; height: 12px;"></i>`;
                } else {
                    stepClass = '';
                    iconHtml = `<i data-lucide="${step.icon}" style="width: 12px; height: 12px; opacity: 0.65;"></i>`;
                }
                
                stepsHtml += `
                    <div class="progress-step ${stepClass}">
                        <div class="step-circle">
                            ${iconHtml}
                        </div>
                        <span class="step-label">${step.label}</span>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="order-history-header">
                    <span class="order-history-title">Order #${order.id}</span>
                    <span class="badge ${statusClass}">${order.status}</span>
                </div>
                
                <!-- Visual Order Progress Bar -->
                <div class="order-progress-wrapper">
                    <div class="order-progress-title-compact">
                        <i data-lucide="activity" style="width: 14px; height: 14px;"></i> Delivery Status Tracker
                    </div>
                    <div class="order-progress-bar">
                        <div class="order-progress-line" style="width: calc(${progressPercent}% - 20px); max-width: 100%; min-width: 0%;"></div>
                        ${stepsHtml}
                    </div>
                </div>

                <div class="order-history-details">
                    <div>
                        <span class="oh-label">Customer:</span>
                        <span class="oh-val">${order.customerName}</span>
                    </div>
                    <div>
                        <span class="oh-label">Email:</span>
                        <span class="oh-val">${order.email}</span>
                    </div>
                    <div>
                        <span class="oh-label">Total:</span>
                        <span class="oh-val" style="color: var(--accent); font-weight: 600;">$${order.totalAmount.toFixed(2)}</span>
                    </div>
                    <div>
                        <span class="oh-label">Payment Method:</span>
                        <span class="badge" style="padding: 2px 8px; font-size: 0.7rem;">${methodBadge}</span>
                    </div>
                    <div style="grid-column: 1 / -1; margin-top: 0.5rem; border-top: 1px dashed var(--border-dark); padding-top: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="oh-label">Transaction ID:</span>
                            <span class="code-font" style="font-size: 0.7rem;">${payment.transactionId || 'N/A'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="oh-label">Payment Status:</span>
                            <span class="badge ${paymentStatusBadgeClass}" style="padding: 2px 8px; font-size: 0.7rem;">${paymentStatusText}</span>
                        </div>
                    </div>
                    
                    <!-- Simulated Order Shipping & Status Changer -->
                    <div class="simulation-status-control" style="grid-column: 1 / -1;">
                        <span class="simulation-label">
                            <i data-lucide="truck" style="width: 14px; height: 14px;"></i> Update Status (Demo):
                        </span>
                        <select class="status-select" onchange="updateSimulatedOrderStatus(${order.id}, this.value, '${order.email}')">
                            <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>PENDING</option>
                            <option value="PAID" ${order.status === 'PAID' ? 'selected' : ''}>PAID</option>
                            <option value="SHIPPED" ${order.status === 'SHIPPED' ? 'selected' : ''}>SHIPPED</option>
                            <option value="IN_TRANSIT" ${order.status === 'IN_TRANSIT' ? 'selected' : ''}>IN TRANSIT</option>
                            <option value="DELIVERED" ${order.status === 'DELIVERED' ? 'selected' : ''}>DELIVERED</option>
                        </select>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();

    } catch (err) {
        console.error('Error fetching orders:', err);
        container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 0; color: #ef4444;">
                <p style="font-size: 0.875rem;">Failed to load order history. Please try again.</p>
            </div>
        `;
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
    // Theme Toggle Handler
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Open / Close Cart Sidebar
    cartBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    modalOverlay.addEventListener('click', closeCart);
    
    // Close Product Detail Modal
    closeDetailBtn.addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', closeDetail);
    
    // Checkout form handler
    checkoutForm.addEventListener('submit', handleCheckout);
    
    // Auth Modal Bindings
    closeAuthBtn.addEventListener('click', closeAuth);
    authOverlay.addEventListener('click', closeAuth);
    toggleAuthModeBtn.addEventListener('click', () => {
        setAuthMode(authMode === 'login' ? 'register' : 'login');
    });
    authForm.addEventListener('submit', handleAuthSubmit);
    
    // Search input with debounce
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchKeyword = e.target.value;
                currentPage = 1;
                renderProducts();
            }, 250);
        });
    }

    // Category radio filters
    const categoryFilters = document.querySelectorAll('input[name="categoryFilter"]');
    categoryFilters.forEach(radio => {
        radio.addEventListener('change', (e) => {
            activeCategory = e.target.value;
            currentPage = 1;
            renderProducts();
        });
    });

    // Brand checkbox filters
    const brandFilters = document.querySelectorAll('input[name="brandFilter"]');
    brandFilters.forEach(cb => {
        cb.addEventListener('change', () => {
            selectedBrands = Array.from(brandFilters)
                .filter(c => c.checked)
                .map(c => c.value);
            currentPage = 1;
            renderProducts();
        });
    });

    // Price range filters with debounce
    const minPriceInput = document.getElementById('minPriceInput');
    const maxPriceInput = document.getElementById('maxPriceInput');
    let priceTimeout;
    const handlePriceChange = () => {
        clearTimeout(priceTimeout);
        priceTimeout = setTimeout(() => {
            minPrice = minPriceInput.value !== '' ? parseFloat(minPriceInput.value) : null;
            maxPrice = maxPriceInput.value !== '' ? parseFloat(maxPriceInput.value) : null;
            currentPage = 1;
            renderProducts();
        }, 400);
    };
    if (minPriceInput) minPriceInput.addEventListener('input', handlePriceChange);
    if (maxPriceInput) maxPriceInput.addEventListener('input', handlePriceChange);

    // Rating filter radios
    const ratingFilters = document.querySelectorAll('input[name="ratingFilter"]');
    ratingFilters.forEach(radio => {
        radio.addEventListener('change', (e) => {
            minRating = parseFloat(e.target.value);
            currentPage = 1;
            renderProducts();
        });
    });

    // Sorting select
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            activeSort = e.target.value;
            currentPage = 1;
            renderProducts();
        });
    }

    // Clear filters reset button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            searchKeyword = '';
            activeCategory = 'all';
            selectedBrands = [];
            minPrice = null;
            maxPrice = null;
            minRating = 0;
            activeSort = 'featured';
            currentPage = 1;
            
            // Reset input values in DOM
            if (searchInput) searchInput.value = '';
            if (minPriceInput) minPriceInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
            if (sortSelect) sortSelect.value = 'featured';
            
            categoryFilters.forEach(r => r.checked = (r.value === 'all'));
            brandFilters.forEach(cb => cb.checked = false);
            ratingFilters.forEach(r => r.checked = (r.value === '0'));
            
            renderProducts();
            showToast('All filters have been reset.');
        });
    }

    // Payment Selection toggles
    const pmCardCod = document.getElementById('pmCardCod');
    const pmCardOnline = document.getElementById('pmCardOnline');
    const cardDetailsSection = document.getElementById('cardDetailsSection');
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');

    if (pmCardCod && pmCardOnline) {
        pmCardCod.addEventListener('click', () => {
            pmCardCod.classList.add('active');
            pmCardOnline.classList.remove('active');
            pmCardCod.querySelector('input').checked = true;
            if (cardDetailsSection) cardDetailsSection.classList.add('hidden');
            
            if (cardNumber) cardNumber.removeAttribute('required');
            if (cardExpiry) cardExpiry.removeAttribute('required');
            if (cardCvv) cardCvv.removeAttribute('required');
        });

        pmCardOnline.addEventListener('click', () => {
            pmCardOnline.classList.add('active');
            pmCardCod.classList.remove('active');
            pmCardOnline.querySelector('input').checked = true;
            if (cardDetailsSection) cardDetailsSection.classList.remove('hidden');
            
            if (cardNumber) cardNumber.setAttribute('required', 'true');
            if (cardExpiry) cardExpiry.setAttribute('required', 'true');
            if (cardCvv) cardCvv.setAttribute('required', 'true');
        });
    }

    // Success / Confirmation Modal Controls
    const successCloseBtn = document.getElementById('successCloseBtn');
    const successViewOrdersBtn = document.getElementById('successViewOrdersBtn');
    const successModal = document.getElementById('successModal');
    const successOverlay = document.getElementById('successOverlay');
    const ordersModal = document.getElementById('ordersModal');

    if (successCloseBtn) {
        successCloseBtn.addEventListener('click', () => {
            successModal.classList.remove('active');
        });
    }
    if (successOverlay) {
        successOverlay.addEventListener('click', () => {
            successModal.classList.remove('active');
        });
    }
    if (successViewOrdersBtn) {
        successViewOrdersBtn.addEventListener('click', () => {
            successModal.classList.remove('active');
            if (ordersModal) ordersModal.classList.add('active');
            
            const emailInput = document.getElementById('customerEmail');
            const lookupEmailInput = document.getElementById('lookupEmail');
            const email = (emailInput ? emailInput.value : '') || (authUser ? authUser.email : '') || '';
            
            if (lookupEmailInput) {
                lookupEmailInput.value = email;
            }
            if (email) {
                fetchUserOrders(email);
            }
        });
    }

    // My Orders Modal Controls
    const shopNavBtn = document.getElementById('shopNavBtn');
    const ordersNavBtn = document.getElementById('ordersNavBtn');
    const closeOrdersBtn = document.getElementById('closeOrdersBtn');
    const ordersOverlay = document.getElementById('ordersOverlay');
    const lookupOrdersBtn = document.getElementById('lookupOrdersBtn');
    const lookupEmailInput = document.getElementById('lookupEmail');

    // Nav links references
    const homeNavBtn = document.getElementById('homeNavBtn');
    const aboutNavBtn = document.getElementById('aboutNavBtn');
    const contactNavBtn = document.getElementById('contactNavBtn');

    // Custom Modals references
    const aboutModal = document.getElementById('aboutModal');
    const aboutOverlay = document.getElementById('aboutOverlay');
    const closeAboutBtn = document.getElementById('closeAboutBtn');

    const contactModal = document.getElementById('contactModal');
    const contactOverlay = document.getElementById('contactOverlay');
    const closeContactBtn = document.getElementById('closeContactBtn');
    const contactForm = document.getElementById('contactForm');

    // Helper to update active navigation links classes
    function setActiveNav(activeBtn) {
        [homeNavBtn, shopNavBtn, aboutNavBtn, contactNavBtn, ordersNavBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (activeBtn) activeBtn.classList.add('active');
    }

    // Helper to close all custom and default navigation modals
    function closeAllNavModals() {
        if (ordersModal) ordersModal.classList.remove('active');
        if (aboutModal) aboutModal.classList.remove('active');
        if (contactModal) contactModal.classList.remove('active');
    }

    if (homeNavBtn) {
        homeNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllNavModals();
            setActiveNav(homeNavBtn);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (shopNavBtn) {
        shopNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllNavModals();
            setActiveNav(shopNavBtn);
            const shopSection = document.getElementById('shop');
            if (shopSection) {
                shopSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                window.scrollTo({ top: 400, behavior: 'smooth' });
            }
        });
    }

    if (aboutNavBtn && aboutModal) {
        aboutNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllNavModals();
            aboutModal.classList.add('active');
            setActiveNav(aboutNavBtn);
        });
    }

    if (closeAboutBtn) {
        closeAboutBtn.addEventListener('click', () => {
            if (aboutModal) aboutModal.classList.remove('active');
            setActiveNav(window.scrollY < 200 ? homeNavBtn : shopNavBtn);
        });
    }
    if (aboutOverlay) {
        aboutOverlay.addEventListener('click', () => {
            if (aboutModal) aboutModal.classList.remove('active');
            setActiveNav(window.scrollY < 200 ? homeNavBtn : shopNavBtn);
        });
    }

    if (contactNavBtn && contactModal) {
        contactNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllNavModals();
            contactModal.classList.add('active');
            setActiveNav(contactNavBtn);
            
            // Pre-populate if logged in
            const contactName = document.getElementById('contactName');
            const contactEmail = document.getElementById('contactEmail');
            if (authUser) {
                if (contactName && !contactName.value) contactName.value = authUser.username;
                if (contactEmail && !contactEmail.value) contactEmail.value = authUser.email;
            }
        });
    }

    if (closeContactBtn) {
        closeContactBtn.addEventListener('click', () => {
            if (contactModal) contactModal.classList.remove('active');
            setActiveNav(window.scrollY < 200 ? homeNavBtn : shopNavBtn);
        });
    }
    if (contactOverlay) {
        contactOverlay.addEventListener('click', () => {
            if (contactModal) contactModal.classList.remove('active');
            setActiveNav(window.scrollY < 200 ? homeNavBtn : shopNavBtn);
        });
    }

    if (contactForm && contactModal) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value;

            try {
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div> Sending...';

                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, subject, message })
                });

                if (!response.ok) {
                    throw new Error('Failed to send inquiry.');
                }

                const resData = await response.json();
                contactForm.reset();
                contactModal.classList.remove('active');
                setActiveNav(window.scrollY < 200 ? homeNavBtn : shopNavBtn);
                
                showToast(`Inquiry sent! Ref: ${resData.reference}`, 'success');

                // Auto open emails hub to show simulation
                setTimeout(() => {
                    const notificationsNavBtn = document.getElementById('notificationsNavBtn');
                    if (notificationsNavBtn) {
                        notificationsNavBtn.click();
                        const contactPill = document.querySelector('.filter-pills button[data-filter="CONTACT_FORM"]');
                        if (contactPill) contactPill.click();
                    }
                }, 1200);
            } catch (err) {
                console.error(err);
                showToast('Failed to send message. Please try again.', 'error');
            } finally {
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="send"></i> Send Inquiry';
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    if (ordersNavBtn && ordersModal) {
        ordersNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllNavModals();
            ordersModal.classList.add('active');
            setActiveNav(ordersNavBtn);
            
            const customerEmailInput = document.getElementById('customerEmail');
            const email = (authUser ? authUser.email : '') || (customerEmailInput ? customerEmailInput.value : '') || '';
            
            if (lookupEmailInput) {
                lookupEmailInput.value = email;
            }
            if (email) {
                fetchUserOrders(email);
            }
        });
    }
    
    function handleCloseOrders() {
        if (ordersModal) ordersModal.classList.remove('active');
        setActiveNav(window.scrollY < 200 ? homeNavBtn : shopNavBtn);
    }

    if (closeOrdersBtn && ordersModal) {
        closeOrdersBtn.addEventListener('click', handleCloseOrders);
    }
    if (ordersOverlay && ordersModal) {
        ordersOverlay.addEventListener('click', handleCloseOrders);
    }
    if (lookupOrdersBtn && lookupEmailInput) {
        lookupOrdersBtn.addEventListener('click', () => {
            const email = lookupEmailInput.value.trim();
            if (!email) {
                showToast('Please enter an email address to search.', 'error');
                return;
            }
            fetchUserOrders(email);
        });
    }
}

// Authentication UI & State Handlers
function updateAuthUI() {
    const customerNameInput = document.getElementById('customerName');
    const customerEmailInput = document.getElementById('customerEmail');
    
    if (authUser) {
        authSection.innerHTML = `
            <div class="profile-dropdown">
                <button id="profileDropdownBtn" class="profile-trigger-btn" aria-label="User Profile" aria-haspopup="true" aria-expanded="false">
                    <div class="profile-avatar">
                        ${authUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div class="profile-meta">
                        <span class="profile-hi">Hi, ${authUser.username}</span>
                        <span class="profile-role">${authUser.role}</span>
                    </div>
                    <i data-lucide="chevron-down" class="profile-chevron"></i>
                </button>
                <div id="profileDropdownMenu" class="profile-dropdown-menu">
                    <div class="profile-menu-header">
                        <div class="profile-menu-avatar-large">
                            ${authUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div class="profile-menu-info">
                            <span class="profile-menu-name">${authUser.username}</span>
                            <span class="profile-menu-role-badge">${authUser.role}</span>
                        </div>
                    </div>
                    <div class="profile-menu-items">
                        <button class="profile-menu-item" id="menuShopBtn">
                            <i data-lucide="shopping-bag" style="width: 14px; height: 14px;"></i>
                            <span>Shop Products</span>
                        </button>
                        <button class="profile-menu-item" id="menuOrdersBtn">
                            <i data-lucide="package" style="width: 14px; height: 14px;"></i>
                            <span>My Orders</span>
                        </button>
                        <button class="profile-menu-item" id="menuNotificationsBtn">
                            <i data-lucide="mail" style="width: 14px; height: 14px;"></i>
                            <span>Emails Hub</span>
                        </button>
                        <div class="profile-menu-divider"></div>
                        <button class="profile-menu-item logout-item" id="authLogoutBtn">
                            <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Logout handler
        document.getElementById('authLogoutBtn').addEventListener('click', handleLogout);
        
        // Navigation links within the dropdown
        document.getElementById('menuShopBtn').addEventListener('click', (e) => {
            e.preventDefault();
            const shopNavBtn = document.getElementById('shopNavBtn');
            if (shopNavBtn) shopNavBtn.click();
            closeProfileDropdown();
        });
        
        document.getElementById('menuOrdersBtn').addEventListener('click', (e) => {
            e.preventDefault();
            const ordersNavBtn = document.getElementById('ordersNavBtn');
            if (ordersNavBtn) ordersNavBtn.click();
            closeProfileDropdown();
        });
        
        document.getElementById('menuNotificationsBtn').addEventListener('click', (e) => {
            e.preventDefault();
            const notificationsNavBtn = document.getElementById('notificationsNavBtn');
            if (notificationsNavBtn) notificationsNavBtn.click();
            closeProfileDropdown();
        });

        // Dropdown toggle logic
        const btn = document.getElementById('profileDropdownBtn');
        const menu = document.getElementById('profileDropdownMenu');
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = menu.classList.contains('active');
            closeAllDropdowns(); // helper if other dropdowns exist
            if (!isActive) {
                menu.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
            }
        });

        // Close dropdown helper
        function closeProfileDropdown() {
            if (menu) {
                menu.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            }
        }

        // Global click-away handler
        function handleOutsideClick(event) {
            if (menu && menu.classList.contains('active')) {
                if (!btn.contains(event.target) && !menu.contains(event.target)) {
                    closeProfileDropdown();
                }
            }
        }

        document.removeEventListener('click', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);

        if (customerNameInput) customerNameInput.value = authUser.username;
        if (customerEmailInput) customerEmailInput.value = authUser.email;
    } else {
        authSection.innerHTML = `
            <button id="authOpenBtn" class="auth-btn-login">
                <i data-lucide="user" style="width: 14px; height: 14px;"></i> Sign In
            </button>
        `;
        document.getElementById('authOpenBtn').addEventListener('click', openAuth);
        if (customerNameInput) customerNameInput.value = '';
        if (customerEmailInput) customerEmailInput.value = '';
    }
    
    // Auxiliary helper to close all dropdowns
    function closeAllDropdowns() {
        const menus = document.querySelectorAll('.profile-dropdown-menu');
        menus.forEach(m => m.classList.remove('active'));
        const triggers = document.querySelectorAll('.profile-trigger-btn');
        triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function openAuth() {
    authModal.classList.add('active');
    authForm.reset();
    setAuthMode('login');
}

function closeAuth() {
    authModal.classList.remove('active');
}

function setAuthMode(mode) {
    authMode = mode;
    if (mode === 'login') {
        authModalTitle.textContent = 'Sign In';
        authToggleMsg.textContent = "Don't have an account?";
        toggleAuthModeBtn.textContent = 'Sign Up';
        emailFormGroup.classList.add('hidden');
        roleFormGroup.classList.add('hidden');
        authSubmitBtn.innerHTML = '<i data-lucide="log-in"></i> Sign In';
        authEmail.removeAttribute('required');
    } else {
        authModalTitle.textContent = 'Create Account';
        authToggleMsg.textContent = 'Already have an account?';
        toggleAuthModeBtn.textContent = 'Sign In';
        emailFormGroup.classList.remove('hidden');
        roleFormGroup.classList.remove('hidden');
        authSubmitBtn.innerHTML = '<i data-lucide="user-plus"></i> Sign Up';
        authEmail.setAttribute('required', 'true');
    }
    if (window.lucide) {
        lucide.createIcons();
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = authUsername.value.trim();
    const password = authPassword.value;
    const email = authEmail.value.trim();
    const role = authRole.value;

    if (authMode === 'login') {
        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div> Signing In...';
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            localStorage.setItem('authUser', JSON.stringify(data));
            authUser = data;
            
            updateAuthUI();
            closeAuth();
            showToast('Welcome back, ' + username + '!', 'success');
        } catch (error) {
            console.error('Login error:', error);
            showToast(error.message || 'Login failed. Please check credentials.', 'error');
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.innerHTML = '<i data-lucide="log-in"></i> Sign In';
            if (window.lucide) lucide.createIcons();
        }
    } else {
        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div> Registering...';
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role })
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            
            showToast('Registration successful! Please sign in.', 'success');
            setAuthMode('login');
        } catch (error) {
            console.error('Registration error:', error);
            showToast(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.innerHTML = '<i data-lucide="user-plus"></i> Sign Up';
            if (window.lucide) lucide.createIcons();
        }
    }
}

function handleLogout() {
    localStorage.removeItem('authUser');
    authUser = null;
    updateAuthUI();
    showToast('Logged out successfully.');
}

// ==========================================================================
// Notification Module (Emails Hub) & Forgot Password Client-side Logic
// ==========================================================================

let allSentEmails = [];
let emailFilter = 'all';
let selectedEmailId = null;

// Initialize Notification & Reset UI on DOM load
window.addEventListener('DOMContentLoaded', () => {
    initNotificationsHub();
    initPasswordResetFlow();
});

// Setup badge & fetch check periodically
function initNotificationsHub() {
    const navBtn = document.getElementById('notificationsNavBtn');
    const modal = document.getElementById('notificationsModal');
    const closeBtn = document.getElementById('closeNotificationsBtn');
    const overlay = document.getElementById('notificationsOverlay');
    const pills = document.querySelectorAll('.filter-pills .pill');

    if (navBtn) {
        navBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openNotificationsModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeNotificationsModal);
    }

    if (overlay) {
        overlay.addEventListener('click', closeNotificationsModal);
    }

    // Filter pills
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            emailFilter = pill.getAttribute('data-filter');
            renderEmailsList();
        });
    });

    // Initial check for emails
    pollEmails();
    // Check every 10 seconds for new emails
    setInterval(pollEmails, 10000);
}

// Toggle Red dot on Email navigation
function triggerNotificationBadge() {
    const navBtn = document.getElementById('notificationsNavBtn');
    if (!navBtn) return;
    
    // Check if dot already exists
    let dot = navBtn.querySelector('.notification-badge-dot');
    if (!dot) {
        dot = document.createElement('span');
        dot.className = 'notification-badge-dot';
        navBtn.appendChild(dot);
    }
}

function removeNotificationBadge() {
    const navBtn = document.getElementById('notificationsNavBtn');
    if (!navBtn) return;
    const dot = navBtn.querySelector('.notification-badge-dot');
    if (dot) {
        dot.remove();
    }
}

// Fetch sent emails from Express server API
async function pollEmails() {
    try {
        const response = await fetch('/api/notifications/emails');
        if (!response.ok) return;
        const data = await response.json();
        
        // If length increased, trigger badge
        if (data.length > allSentEmails.length && allSentEmails.length > 0) {
            triggerNotificationBadge();
            showToast('New email notification received!', 'success');
        }
        
        allSentEmails = data;
        
        // If modal is open, refresh the view
        const modal = document.getElementById('notificationsModal');
        if (modal && modal.classList.contains('active')) {
            renderEmailsList();
        }
    } catch (err) {
        console.error('Error polling emails:', err);
    }
}

function openNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.add('active');
        removeNotificationBadge();
        pollEmails().then(() => {
            renderEmailsList();
        });
    }
}

function closeNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Render list of emails in Sidebar
function renderEmailsList() {
    const listContainer = document.getElementById('emailsList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    const filtered = allSentEmails.filter(email => {
        if (emailFilter === 'all') return true;
        return email.type === emailFilter;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">
                No emails found.
            </div>
        `;
        return;
    }

    // Render emails in reverse order (newest first)
    const sorted = [...filtered].reverse();

    sorted.forEach(email => {
        const item = document.createElement('div');
        item.className = `email-item ${selectedEmailId === email.id ? 'active' : ''}`;
        
        const dateStr = new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        item.innerHTML = `
            <span class="email-item-to">To: ${email.to}</span>
            <div class="email-item-subject">${email.subject}</div>
            <div class="email-item-footer">
                <span class="email-type-badge ${email.type}">${email.type.replace('_', ' ')}</span>
                <span>${dateStr}</span>
            </div>
        `;

        item.addEventListener('click', () => {
            selectedEmailId = email.id;
            // Highlight active item
            document.querySelectorAll('.email-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            displayEmailDetails(email);
        });

        listContainer.appendChild(item);
    });

    // Keep active selected or auto select first email
    if (selectedEmailId) {
        const currentSelected = sorted.find(e => e.id === selectedEmailId);
        if (currentSelected) {
            displayEmailDetails(currentSelected);
            return;
        }
    }
}

// Display HTML email inside IFrame safely
function displayEmailDetails(email) {
    const emptyView = document.getElementById('emailViewerEmpty');
    const headerView = document.getElementById('emailViewerHeader');
    const bodyContainer = document.getElementById('emailViewerBodyContainer');
    const iframe = document.getElementById('emailBodyIframe');

    if (!emptyView || !headerView || !bodyContainer || !iframe) return;

    emptyView.style.display = 'none';
    headerView.style.display = 'block';
    bodyContainer.style.display = 'block';

    document.getElementById('emailViewerSubject').textContent = email.subject;
    document.getElementById('emailViewerTo').textContent = email.to;
    document.getElementById('emailViewerDate').textContent = new Date(email.sentAt).toLocaleString();

    // Render HTML inside iframe securely to isolate styles
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(email.body);
    doc.close();
}

// Password Reset Flow UI Controllers
function initPasswordResetFlow() {
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    const authModal = document.getElementById('authModal');
    const resetModal = document.getElementById('resetPasswordModal');
    const closeResetBtn = document.getElementById('closeResetPasswordBtn');
    const resetOverlay = document.getElementById('resetPasswordOverlay');

    const forgotForm = document.getElementById('forgotPasswordForm');
    const resetForm = document.getElementById('resetPasswordForm');

    const stepRequest = document.getElementById('resetStepRequest');
    const stepSubmit = document.getElementById('resetStepSubmit');

    const resetEmailInput = document.getElementById('resetEmailInput');

    if (forgotBtn) {
        forgotBtn.addEventListener('click', () => {
            if (authModal) authModal.classList.remove('active');
            if (resetModal) {
                resetModal.classList.add('active');
                // Reset to step 1
                stepRequest.classList.remove('hidden');
                stepSubmit.classList.add('hidden');
                forgotForm.reset();
                resetForm.reset();
            }
        });
    }

    function handleCloseReset() {
        if (resetModal) resetModal.classList.remove('active');
    }

    if (closeResetBtn) closeResetBtn.addEventListener('click', handleCloseReset);
    if (resetOverlay) resetOverlay.addEventListener('click', handleCloseReset);

    // Form 1: Request Code
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = resetEmailInput.value.trim();

            try {
                const submitBtn = forgotForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px; margin-right: 4px;"></div> Sending...';

                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Error requesting reset');
                }

                showToast('Reset code sent! Inspect Emails Hub to copy the 6-digit code.', 'success');
                triggerNotificationBadge();

                // Switch step
                stepRequest.classList.add('hidden');
                stepSubmit.classList.remove('hidden');
            } catch (err) {
                console.error(err);
                showToast(err.message || 'Error requesting password reset.', 'error');
            } finally {
                const submitBtn = forgotForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="send"></i> Send Reset Code';
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    // Form 2: Submit Reset Password
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = resetEmailInput.value.trim();
            const code = document.getElementById('resetCodeInput').value.trim();
            const newPassword = document.getElementById('resetNewPasswordInput').value;

            try {
                const submitBtn = resetForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px; margin-right: 4px;"></div> Resetting...';

                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code, newPassword })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Invalid or expired code');
                }

                showToast('Password reset successfully! You can now log in.', 'success');
                handleCloseReset();
                openAuth(); // Redirect back to sign in
            } catch (err) {
                console.error(err);
                showToast(err.message || 'Failed to reset password. Check your code.', 'error');
            } finally {
                const submitBtn = resetForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="key-round"></i> Update Password';
                if (window.lucide) lucide.createIcons();
            }
        });
    }
}

// Global Order update helper for simulated shipping triggers
async function updateSimulatedOrderStatus(orderId, newStatus, customerEmail) {
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to update order status');
        }
        
        showToast(`Order #${orderId} updated to ${newStatus}! Shipping update email triggered.`, 'success');
        fetchUserOrders(customerEmail);
        triggerNotificationBadge();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Failed to update simulated status.', 'error');
    }
}
window.updateSimulatedOrderStatus = updateSimulatedOrderStatus;

// ==========================================================================
// AI Shopping Assistant Client Integration
// ==========================================================================

function initAiShoppingAssistant() {
    const aiChatToggleBtn = document.getElementById('aiChatToggleBtn');
    const aiChatPanel = document.getElementById('aiChatPanel');
    const aiMinimizeBtn = document.getElementById('aiMinimizeBtn');
    const aiClearChatBtn = document.getElementById('aiClearChatBtn');
    const aiChatForm = document.getElementById('aiChatForm');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const aiTypingIndicator = document.getElementById('aiTypingIndicator');
    const aiChatBody = document.getElementById('aiChatBody');

    if (!aiChatToggleBtn || !aiChatPanel) return;

    // Retrieve or initialize unique guest/user session identifier
    let aiSessionId = localStorage.getItem('aiSessionId');
    if (!aiSessionId) {
        aiSessionId = 'session_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('aiSessionId', aiSessionId);
    }

    // Toggle Chat Panel visibility
    aiChatToggleBtn.addEventListener('click', () => {
        aiChatPanel.classList.toggle('hidden');
        if (!aiChatPanel.classList.contains('hidden')) {
            scrollToBottom();
            aiChatInput.focus();
        }
    });

    // Minimize Panel
    if (aiMinimizeBtn) {
        aiMinimizeBtn.addEventListener('click', () => {
            aiChatPanel.classList.add('hidden');
        });
    }

    // Clear Chat history on click
    if (aiClearChatBtn) {
        aiClearChatBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to clear your conversation history?')) {
                try {
                    await fetch('/api/ai/clear', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: aiSessionId })
                    });
                    aiChatMessages.innerHTML = '';
                    showToast('AI conversation history cleared.');
                } catch (err) {
                    console.error('Error clearing chat:', err);
                    showToast('Failed to clear chat history.', 'error');
                }
            }
        });
    }

    // Register click for quick query action chips
    document.querySelectorAll('.ai-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            if (query) {
                sendAiUserMessage(query);
            }
        });
    });

    // Form submission listener
    aiChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = aiChatInput.value.trim();
        if (text) {
            sendAiUserMessage(text);
            aiChatInput.value = '';
        }
    });

    // Send User Message to Backend Route
    async function sendAiUserMessage(text) {
        // Render user bubble in UI
        appendMessageToUi('user', text);
        scrollToBottom();

        // Show typing feedback
        aiTypingIndicator.classList.remove('hidden');
        scrollToBottom();

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, sessionId: aiSessionId })
            });

            const data = await response.json();
            aiTypingIndicator.classList.add('hidden');

            if (!response.ok) {
                throw new Error(data.message || 'Server error');
            }

            // Append assistant bubble & linked matched product card items
            appendMessageToUi('assistant', data.reply, data.recommendedProductIds);
            scrollToBottom();

        } catch (err) {
            console.error(err);
            aiTypingIndicator.classList.add('hidden');
            appendMessageToUi('assistant', `⚠️ **Error:** ${err.message || 'Could not reach model.'}\n\nPlease check if your **GEMINI_API_KEY** is configured in **Settings > Secrets** panel.`);
            scrollToBottom();
        }
    }

    // Append Message with styled custom layout & nested products list
    function appendMessageToUi(role, text, recommendedProductIds = []) {
        const msgContainer = document.createElement('div');
        msgContainer.className = `ai-msg ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.innerHTML = formatMarkdown(text);
        msgContainer.appendChild(bubble);

        // Render inline catalog product cards if returned from AI schema
        if (recommendedProductIds && recommendedProductIds.length > 0) {
            const recContainer = document.createElement('div');
            recContainer.className = 'ai-recommended-container';
            
            const titleEl = document.createElement('div');
            titleEl.className = 'ai-recommended-title';
            titleEl.textContent = 'Suggested Products:';
            recContainer.appendChild(titleEl);

            recommendedProductIds.forEach(id => {
                const product = products.find(p => p.id === id);
                if (product) {
                    const prodCard = document.createElement('div');
                    prodCard.className = 'ai-product-card';

                    const ratingVal = product.rating || 4.0;
                    const ratingStars = "★".repeat(Math.round(ratingVal)) + "☆".repeat(5 - Math.round(ratingVal));
                    const inrVal = Math.round(product.price * 83).toLocaleString('en-IN');

                    prodCard.innerHTML = `
                        <img class="ai-product-img" src="${product.imageUrl}" alt="${product.name}" onclick="openProductDetail(${product.id}); document.getElementById('aiChatPanel').classList.add('hidden');" style="cursor: pointer;">
                        <div class="ai-product-details" onclick="openProductDetail(${product.id}); document.getElementById('aiChatPanel').classList.add('hidden');" style="cursor: pointer; min-width: 0;">
                            <h4 class="ai-product-name">${product.name}</h4>
                            <div class="ai-product-price">
                                $${product.price.toFixed(2)}
                                <span class="inr-conv">(~₹${inrVal})</span>
                            </div>
                            <div class="ai-product-rating">${ratingStars} ${ratingVal.toFixed(1)}</div>
                        </div>
                        <div class="ai-product-actions">
                            <button class="ai-prod-btn add" onclick="addToCart(${product.id})">
                                <i data-lucide="shopping-cart"></i> +Cart
                            </button>
                            <button class="ai-prod-btn view" onclick="openProductDetail(${product.id}); document.getElementById('aiChatPanel').classList.add('hidden');">
                                <i data-lucide="eye"></i> Details
                            </button>
                        </div>
                    `;
                    recContainer.appendChild(prodCard);
                }
            });
            msgContainer.appendChild(recContainer);
        }

        const meta = document.createElement('div');
        meta.className = 'ai-msg-meta';
        const now = new Date();
        meta.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgContainer.appendChild(meta);

        aiChatMessages.appendChild(msgContainer);

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Scroll chat area to bottom helper
    function scrollToBottom() {
        aiChatBody.scrollTop = aiChatBody.scrollHeight;
    }

    // Safely escape and render simple Markdown as HTML
    function formatMarkdown(text) {
        if (!text) return '';
        let escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        
        // Match bold markers: **text**
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Match list items: - text or * text
        escaped = escaped.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
        escaped = escaped.replace(/(<li>.*<\/li>)/s, '<ul>$1<\/ul>');
        // Match line breaks
        escaped = escaped.replace(/\n/g, '<br>');
        return escaped;
    }

    // Load Chat History from Server on Load
    async function loadChatHistory() {
        try {
            const response = await fetch(`/api/ai/history?sessionId=${aiSessionId}`);
            if (!response.ok) return;
            const history = await response.json();
            
            if (history && history.length > 0) {
                aiChatMessages.innerHTML = '';
                history.forEach(item => {
                    appendMessageToUi(item.role === 'user' ? 'user' : 'assistant', item.parts[0].text);
                });
                scrollToBottom();
            }
        } catch (err) {
            console.error('Error loading AI history:', err);
        }
    }

    // Retrieve previous conversations
    loadChatHistory();
}

// Hook into DOM load triggers safely
window.addEventListener('load', () => {
    initAiShoppingAssistant();
});
