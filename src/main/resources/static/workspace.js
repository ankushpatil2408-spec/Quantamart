/**
 * Quantamart Workspace & Developer Sandbox Script
 * Path: src/main/resources/static/workspace.js
 */

// Local Workspace State
let activeWsTab = 'sandbox'; // 'sandbox', 'customer', 'seller', 'admin'
let sandboxSubTab = 'search'; // 'search', 'ai', 'payments', 'shipping', 'devops'

// Simulated local storage states for customer wallet & addresses
let customerWalletBalance = parseFloat(localStorage.getItem('ws_wallet_balance')) || 550.00;
let customerAddresses = JSON.parse(localStorage.getItem('ws_addresses')) || [
    { id: 1, type: 'Primary Home', name: 'AnkushP', phone: '+91 98765 43210', street: '142, Orchid Greens, Phase 2', city: 'Bangalore', pin: '560001', isDefault: true },
    { id: 2, type: 'Office / Workplace', name: 'AnkushP (Quanta Corp)', phone: '+91 98765 43299', street: 'Block C, Quantum Tech Park, Electronic City', city: 'Bangalore', pin: '560100', isDefault: false }
];

// Initialize Workspace Hooks on Load
window.addEventListener('load', () => {
    setupWorkspaceNavigation();
    renderActiveWorkspaceTab();
});

// Setup navigation triggers to toggle between main landing and workspace
function setupWorkspaceNavigation() {
    const workspaceNavBtn = document.getElementById('workspaceNavBtn');
    const homeNavBtn = document.getElementById('homeNavBtn');
    const shopNavBtn = document.getElementById('shopNavBtn');
    const aboutNavBtn = document.getElementById('aboutNavBtn');
    const contactNavBtn = document.getElementById('contactNavBtn');

    const heroSection = document.querySelector('.hero');
    const shopSection = document.getElementById('shop');
    const workspacePageContainer = document.getElementById('workspacePageContainer');

    // Helper to toggle views
    window.showWorkspaceView = function() {
        if (heroSection) heroSection.classList.add('hidden');
        if (shopSection) shopSection.classList.add('hidden');
        if (workspacePageContainer) workspacePageContainer.classList.remove('hidden');
        
        // Remove active class from other headers
        document.querySelectorAll('.nav-links .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        if (workspaceNavBtn) workspaceNavBtn.classList.add('active');
        
        // Update user status & render content
        updateWorkspaceUserStatus();
        renderActiveWorkspaceTab();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.hideWorkspaceView = function() {
        if (workspacePageContainer) workspacePageContainer.classList.add('hidden');
        if (heroSection) heroSection.classList.remove('hidden');
        if (shopSection) shopSection.classList.remove('hidden');
        if (workspaceNavBtn) workspaceNavBtn.classList.remove('active');
    };

    // Bind navigation buttons
    if (workspaceNavBtn) {
        workspaceNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showWorkspaceView();
        });
    }

    // When clicking main tabs, ensure workspace is hidden
    [homeNavBtn, shopNavBtn, aboutNavBtn, contactNavBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                hideWorkspaceView();
            });
        }
    });

    // Sidebar tab buttons switching
    const tabs = ['wsTabSandbox', 'wsTabCustomer', 'wsTabSeller', 'wsTabAdmin'];
    tabs.forEach(tabId => {
        const btn = document.getElementById(tabId);
        if (btn) {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ws-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeWsTab = tabId.replace('wsTab', '').toLowerCase();
                renderActiveWorkspaceTab();
            });
        }
    });

    // Quick Login toggle within the workspace sidebar
    const quickAuthBtn = document.getElementById('wsQuickAuthToggle');
    if (quickAuthBtn) {
        quickAuthBtn.addEventListener('click', () => {
            if (window.authUser) {
                // If logged in, logout
                handleLogout();
            } else {
                // If not, open normal Auth modal
                if (window.openAuth) window.openAuth();
            }
        });
    }
}

// Update the user details in workspace sidebar based on main auth state
function updateWorkspaceUserStatus() {
    const badge = document.getElementById('wsUserStatusBadge');
    const quickAuthBtn = document.getElementById('wsQuickAuthToggle');
    
    if (window.authUser) {
        badge.innerHTML = `Role: <strong style="color:var(--accent);">${window.authUser.role}</strong> (${window.authUser.username})`;
        if (quickAuthBtn) {
            quickAuthBtn.innerHTML = '<i data-lucide="log-out" style="width:14px;height:14px;"></i> Sign Out';
            quickAuthBtn.className = 'btn btn-secondary';
        }
        
        // Remove padlock icons on tabs that match their role
        const customerLock = document.querySelector('#wsTabCustomer .tab-lock-icon');
        const sellerLock = document.querySelector('#wsTabSeller .tab-lock-icon');
        const adminLock = document.querySelector('#wsTabAdmin .tab-lock-icon');

        if (customerLock && window.authUser.role === 'CUSTOMER') customerLock.style.display = 'none';
        if (sellerLock && window.authUser.role === 'SELLER') sellerLock.style.display = 'none';
        if (adminLock && window.authUser.role === 'ADMIN') adminLock.style.display = 'none';
    } else {
        badge.innerHTML = 'Role: Guest Visitor';
        if (quickAuthBtn) {
            quickAuthBtn.innerHTML = '<i data-lucide="log-in" style="width:14px;height:14px;"></i> Sign In To Unlock';
            quickAuthBtn.className = 'btn btn-accent';
        }
        
        // Restore padlock indicators
        document.querySelectorAll('.tab-lock-icon').forEach(icon => {
            icon.style.display = 'inline-block';
        });
    }

    if (window.lucide) lucide.createIcons();
}

// Sync global auth updates with workspace status
const originalUpdateAuthUI = window.updateAuthUI;
window.updateAuthUI = function() {
    if (typeof originalUpdateAuthUI === 'function') {
        originalUpdateAuthUI();
    }
    updateWorkspaceUserStatus();
    // Re-render current workspace tab if visible
    const workspacePageContainer = document.getElementById('workspacePageContainer');
    if (workspacePageContainer && !workspacePageContainer.classList.contains('hidden')) {
        renderActiveWorkspaceTab();
    }
};

// Render chosen tab dashboard
function renderActiveWorkspaceTab() {
    const container = document.getElementById('workspacePanelContent');
    if (!container) return;

    if (activeWsTab === 'sandbox') {
        renderSandboxTab(container);
    } else if (activeWsTab === 'customer') {
        if (!window.authUser || window.authUser.role !== 'CUSTOMER') {
            renderLockoutScreen(container, 'Customer Dashboard', 'CUSTOMER');
        } else {
            renderCustomerTab(container);
        }
    } else if (activeWsTab === 'seller') {
        if (!window.authUser || window.authUser.role !== 'SELLER') {
            renderLockoutScreen(container, 'Seller Dashboard', 'SELLER');
        } else {
            renderSellerTab(container);
        }
    } else if (activeWsTab === 'admin') {
        if (!window.authUser || window.authUser.role !== 'ADMIN') {
            renderLockoutScreen(container, 'Admin Control Panel', 'ADMIN');
        } else {
            renderAdminTab(container);
        }
    }

    if (window.lucide) lucide.createIcons();
}

// Helper to render locked screen
function renderLockoutScreen(container, title, requiredRole) {
    container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="background: #fef2f2; color: #ef4444; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;">
                <i data-lucide="shield-alert" style="width: 32px; height: 32px;"></i>
            </div>
            <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">${title} Locked</h3>
            <p style="color: var(--text-muted); max-width: 420px; margin-bottom: 1.5rem; font-size: 0.95rem; line-height: 1.5;">
                This workspace corresponds to the <strong>${requiredRole} Module</strong>. You must be authenticated under a <strong>${requiredRole}</strong> account to access these interactive management operations.
            </p>
            <div style="display: flex; gap: 1rem;">
                <button class="btn btn-accent" onclick="window.openAuth()">
                    <i data-lucide="log-in"></i> Sign In
                </button>
                <button class="btn btn-secondary" onclick="window.setAuthMode('register'); window.openAuth()">
                    <i data-lucide="user-plus"></i> Register
                </button>
            </div>
            <div style="background: #f8fafc; border: 1px dashed var(--border-dark); border-radius: 8px; padding: 1rem; margin-top: 2rem; max-width: 380px; font-size: 0.8rem; text-align: left;">
                <strong style="color:var(--primary);">Quick Access Hint:</strong><br>
                For sandbox testing, use the username <code style="background:#e2e8f0; padding:2px 4px; border-radius:4px; font-weight:600;">${requiredRole.toLowerCase()}</code> and password <code style="background:#e2e8f0; padding:2px 4px; border-radius:4px; font-weight:600;">${requiredRole.toLowerCase()}123</code>.
            </div>
        </div>
    `;
}

// ==========================================================================
// 1. DEVELOPER SANDBOX TAB
// ==========================================================================
function renderSandboxTab(container) {
    container.innerHTML = `
        <div class="sandbox-container">
            <div style="border-bottom: 1px solid var(--border-dark); padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                        <i data-lucide="beaker" style="color: var(--accent);"></i> Interactive Developer Sandbox
                    </h2>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.15rem;">Simulate, monitor, and experience advanced platform modules instantly.</p>
                </div>
                <!-- Mini Sandbox Tabs -->
                <div class="sandbox-pills" style="display: flex; gap: 0.25rem; flex-wrap: wrap; background: #f1f5f9; padding: 4px; border-radius: 8px;">
                    <button class="sandbox-pill ${sandboxSubTab === 'search' ? 'active' : ''}" onclick="switchSandboxSubTab('search')">Search Module</button>
                    <button class="sandbox-pill ${sandboxSubTab === 'ai' ? 'active' : ''}" onclick="switchSandboxSubTab('ai')">AI Features</button>
                    <button class="sandbox-pill ${sandboxSubTab === 'payments' ? 'active' : ''}" onclick="switchSandboxSubTab('payments')">Payments</button>
                    <button class="sandbox-pill ${sandboxSubTab === 'shipping' ? 'active' : ''}" onclick="switchSandboxSubTab('shipping')">Shipping</button>
                    <button class="sandbox-pill ${sandboxSubTab === 'devops' ? 'active' : ''}" onclick="switchSandboxSubTab('devops')">DevOps &amp; Security</button>
                </div>
            </div>

            <div id="sandboxSubPanel">
                <!-- Loaded dynamically -->
            </div>
        </div>
    `;

    renderSandboxSubPanel();
}

window.switchSandboxSubTab = function(subTab) {
    sandboxSubTab = subTab;
    renderSandboxSubPanel();
    if (window.lucide) lucide.createIcons();
};

function renderSandboxSubPanel() {
    const subContainer = document.getElementById('sandboxSubPanel');
    if (!subContainer) return;

    // Remove active styles on all pills, add on active
    document.querySelectorAll('.sandbox-pill').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(sandboxSubTab)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (sandboxSubTab === 'search') {
        subContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr; lg:grid-template-columns: 1.2fr 0.8fr; gap: 2rem;">
                <div>
                    <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i data-lucide="search" style="color:var(--accent);"></i> Dynamic Multimodal Search Engine
                    </h3>
                    <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem;">Quantamart supports standard, speech-to-text voice searching, smart image upload parsing, and semantic suggestions.</p>

                    <!-- Sandbox Voice Search Box -->
                    <div style="background: #f8fafc; border: 1px solid var(--border-dark); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem;">
                        <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--primary); display: flex; align-items: center; gap: 0.4rem;">
                            <i data-lucide="mic" style="width:16px;"></i> Voice Search Simulation (Demo)
                        </h4>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">Click the microphone below to simulate real-time speech query synthesis.</p>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button id="wsVoiceBtn" class="btn btn-primary" onclick="triggerVoiceSimulation()" style="width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                                <i data-lucide="mic" style="width: 24px; height: 24px;"></i>
                            </button>
                            <div id="wsVoiceStatus" style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Microphone Ready. Click to speak...</div>
                        </div>
                    </div>

                    <!-- Sandbox Image Search Box -->
                    <div style="background: #f8fafc; border: 1px solid var(--border-dark); border-radius: 10px; padding: 1.5rem;">
                        <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--primary); display: flex; align-items: center; gap: 0.4rem;">
                            <i data-lucide="image" style="width:16px;"></i> Vision Image-Search Simulation (Demo)
                        </h4>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">Upload or select a mock object image file to allow the AI Vision models to catalog match it.</p>
                        <div style="border: 2px dashed var(--border-dark); border-radius: 8px; padding: 2rem 1rem; text-align: center; cursor: pointer; background: white;" onclick="triggerImageSearchSimulation()">
                            <i data-lucide="upload-cloud" style="width: 32px; height: 32px; color: var(--text-muted); margin: 0 auto 0.5rem auto;"></i>
                            <span id="wsImageSearchText" style="font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);">Click here to select mock photo...</span>
                        </div>
                    </div>
                </div>

                <!-- Live suggestions simulator on the side -->
                <div style="background: #fafafa; border-radius: 10px; border: 1px solid var(--border-dark); padding: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 600; color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                        <i data-lucide="sparkles" style="color:var(--accent); width:16px;"></i> Active Smart Autocomplete
                    </h3>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Typing filters matching catalog entries recursively. Test-drive keywords:</p>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <button class="pill" style="font-size:0.75rem;" onclick="testSearchKeywords('Leather')">Leather</button>
                        <button class="pill" style="font-size:0.75rem;" onclick="testSearchKeywords('Laptop')">Laptop</button>
                        <button class="pill" style="font-size:0.75rem;" onclick="testSearchKeywords('Wireless')">Wireless</button>
                        <button class="pill" style="font-size:0.75rem;" onclick="testSearchKeywords('Backpack')">Backpack</button>
                    </div>
                    <div id="wsSearchSuggestionsOutput" style="border:1px solid var(--border-dark); background:white; border-radius:6px; min-height:150px; padding:0.5rem; font-family:var(--font-mono); font-size:0.8rem;">
                        <div style="color:var(--text-muted); font-style:italic; padding:0.5rem; text-align:center; margin-top:2.5rem;">Results appear as you interact.</div>
                    </div>
                </div>
            </div>
        `;
    } else if (sandboxSubTab === 'ai') {
        subContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr; lg:grid-template-columns: 1fr 1fr; gap: 2rem;">
                <!-- Smart Pricing Engine -->
                <div style="background: #f8fafc; border: 1px solid var(--border-dark); border-radius: 12px; padding: 1.5rem;">
                    <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i data-lucide="trending-up" style="color:var(--accent);"></i> AI Smart Scarcity Pricing Engine
                    </h3>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">Calculate dynamic, revenue-maximizing pricing based on demand curves, inventory metrics, and product velocity.</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                            <div>
                                <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Base Cost (USD)</label>
                                <input type="number" id="pricingBaseCost" value="150" style="width:100%; padding:0.5rem; border:1px solid var(--border-dark); border-radius:6px;">
                            </div>
                            <div>
                                <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Stock Left (units)</label>
                                <input type="number" id="pricingStock" value="4" style="width:100%; padding:0.5rem; border:1px solid var(--border-dark); border-radius:6px;">
                            </div>
                        </div>
                        <div>
                            <label style="font-size:0.75rem; font-weight:600; display:block; margin-bottom:0.25rem;">Demand Factor (Category Interest)</label>
                            <select id="pricingDemand" style="width:100%; padding:0.5rem; border:1px solid var(--border-dark); border-radius:6px;">
                                <option value="1.0">Standard / Normal (1.0x)</option>
                                <option value="1.25" selected>Elevated / Trending (1.25x)</option>
                                <option value="1.5">Critical Scarcity / High Demand (1.5x)</option>
                            </select>
                        </div>
                        <button class="btn btn-accent" onclick="calculateSmartPricing()" style="width:100%; margin-top:0.5rem;">
                            <i data-lucide="calculator"></i> Calculate Optimal Price
                        </button>
                        <div id="pricingResult" style="margin-top:1rem; border-top:1px dashed var(--border-dark); padding-top:1rem; display:none; text-align:center;">
                            <!-- Output injected -->
                        </div>
                    </div>
                </div>

                <!-- Demand Prediction & Fraud Detection Simulation -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- Category Demand Forecasting Chart representation -->
                    <div style="background: white; border: 1px solid var(--border-dark); border-radius: 12px; padding: 1.5rem; flex: 1;">
                        <h3 style="font-size: 1rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="bar-chart-3" style="color: var(--accent);"></i> AI Product Category Demand Forecasting
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Predicted sales growth indexes across category buckets for the current month.</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px;">
                                    <strong>Electronics (High Velocity)</strong>
                                    <span style="color:var(--success); font-weight:600;">+44% Spike</span>
                                </div>
                                <div style="width:100%; background:#f1f5f9; height:8px; border-radius:4px; overflow:hidden;">
                                    <div style="width:85%; background: var(--accent); height:100%;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px;">
                                    <strong>Lifestyle &amp; Accessories</strong>
                                    <span style="color:var(--success); font-weight:600;">+21% Growth</span>
                                </div>
                                <div style="width:100%; background:#f1f5f9; height:8px; border-radius:4px; overflow:hidden;">
                                    <div style="width:60%; background: #10b981; height:100%;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px;">
                                    <strong>Bags &amp; Travel Goods</strong>
                                    <span style="color:#f59e0b; font-weight:600;">Stable (+4%)</span>
                                </div>
                                <div style="width:100%; background:#f1f5f9; height:8px; border-radius:4px; overflow:hidden;">
                                    <div style="width:40%; background: #f59e0b; height:100%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fraud Detection Simulation -->
                    <div style="background: white; border: 1px solid var(--border-dark); border-radius: 12px; padding: 1.5rem; flex: 1;">
                        <h3 style="font-size: 1rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="shield-alert" style="color:#ef4444;"></i> AI Fraud Detection Simulator
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Analyze payment vectors like VPN status, card billing alignment, and velocity rules.</p>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-secondary" onclick="simulateFraudAnalysis('CLEAN')" style="flex:1; font-size:0.75rem;">Simulate Normal Order</button>
                            <button class="btn btn-secondary" onclick="simulateFraudAnalysis('RISKY')" style="flex:1; font-size:0.75rem; border-color:#fca5a5; color:#b91c1c;">Simulate Suspect Order</button>
                        </div>
                        <div id="wsFraudOutput" style="margin-top: 1rem; border-radius:6px; font-size:0.8rem; display:none; padding:0.75rem;"></div>
                    </div>
                </div>
            </div>
        `;
    } else if (sandboxSubTab === 'payments') {
        subContainer.innerHTML = `
            <div style="background: #f8fafc; border: 1px solid var(--border-dark); border-radius: 12px; padding: 1.5rem;">
                <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="credit-card" style="color:var(--accent);"></i> Multi-Gateway Payment Sandbox Terminal
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Simulate API call handshakes and ledger generation across popular transaction platforms.</p>
                
                <div style="display: grid; grid-template-columns: 1fr; md:grid-template-columns: 1fr 1.5fr; gap: 2rem;">
                    <div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:0.25rem;">Payment Vendor</label>
                            <select id="paymentGatewaySelect" class="form-select" onchange="updatePaymentGatewayDetails()">
                                <option value="Stripe">Stripe Gateway (Card/Global)</option>
                                <option value="Razorpay">Razorpay Checkout (UPI/Cards/Netbanking India)</option>
                                <option value="PayPal">PayPal Commerce (Global Wallet)</option>
                                <option value="UPI">Direct Unified Payments Interface (Instant Settlement)</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:0.25rem;">Simulated Transaction Amount</label>
                            <input type="text" id="paymentSimAmount" value="$249.00" style="width:100%; padding:0.5rem; border:1px solid var(--border-dark); border-radius:6px; font-weight:600;">
                        </div>
                        <button class="btn btn-accent" onclick="runPaymentGatewaySimulation()" style="width:100%;">
                            <i data-lucide="play-circle"></i> Initiate Sandbox Payment
                        </button>
                    </div>

                    <div style="background: #0f172a; border-radius: 8px; color: #38bdf8; font-family: var(--font-mono); padding: 1rem; font-size: 0.75rem; min-height: 220px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
                        <div style="display:flex; justify-content:space-between; color:#64748b; border-bottom:1px solid #1e293b; padding-bottom:0.25rem; margin-bottom:0.5rem;">
                            <span>PAYMENT INTERFACE CONSOLE LOGS</span>
                            <span id="gatewayStatusBadge" style="color:#ef4444; font-weight:700;">OFFLINE</span>
                        </div>
                        <div id="paymentTerminalLogs" style="height:170px; overflow-y:auto; line-height:1.5;">
                            &gt; Select parameters and press Initiate to boot gateway handshake...
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (sandboxSubTab === 'shipping') {
        subContainer.innerHTML = `
            <div style="background: #f8fafc; border: 1px solid var(--border-dark); border-radius: 12px; padding: 1.5rem;">
                <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="truck" style="color:var(--accent);"></i> Real-Time Shipment &amp; Waypoint Tracker
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Simulate delivery milestone progressions, delivery secure OTP checks, and transit courier routing map nodes.</p>

                <div style="display: grid; grid-template-columns: 1fr; lg:grid-template-columns: 0.8fr 1.2fr; gap: 2rem;">
                    <div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:0.25rem;">Courier Partner Matching</label>
                            <select id="shippingCourier" class="form-select">
                                <option value="QuantaExpress">QuantaExpress Smart Fulfillment (Air Priority)</option>
                                <option value="FedEx">FedEx International Priority (Insured)</option>
                                <option value="DHL">DHL Express Worldwide Express</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:0.25rem;">Tracking Number ID</label>
                            <input type="text" id="shippingTrackingNumber" value="QM-901844-IN" style="width:100%; padding:0.5rem; border:1px solid var(--border-dark); border-radius:6px; font-family:var(--font-mono); font-weight:600;">
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-accent" onclick="startShipmentTrackingSim()" style="flex:1;">
                                <i data-lucide="search"></i> Load Tracker
                            </button>
                            <button class="btn btn-secondary" onclick="simulateDeliveryOtp()" style="flex:1;">
                                <i data-lucide="key-round"></i> Delivery OTP
                            </button>
                        </div>
                    </div>

                    <div style="background:white; border: 1px solid var(--border-dark); border-radius:8px; padding:1rem; display:flex; flex-direction:column; justify-content:center; min-height:220px;">
                        <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1rem; color: var(--primary); border-bottom:1px solid var(--border-dark); padding-bottom:0.5rem;">
                            <i data-lucide="map-pin" style="width:14px; vertical-align:middle;"></i> Visual Delivery Route Map
                        </h4>
                        <div id="shippingTrackingVisual" style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:0.75rem;">
                            <p style="font-size:0.85rem; color:var(--text-muted); text-align:center; font-style:italic;">Enter tracking details and load tracker to trace dynamic shipment dispatch nodes.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (sandboxSubTab === 'devops') {
        subContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr; lg:grid-template-columns: 1fr 1.2fr; gap: 2rem;">
                <div style="background: #f8fafc; border: 1px solid var(--border-dark); border-radius: 12px; padding: 1.5rem;">
                    <h3 style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i data-lucide="cpu" style="color:var(--accent);"></i> Real-Time Infrastructure Monitoring
                    </h3>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1.25rem;">Simulate Node.js runtime metrics inside the isolated sandbox container (Docker/GCP Port 3000).</p>

                    <div style="display:flex; flex-direction:column; gap:1rem;">
                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px;">
                                <strong>Container Memory Usage (Node.js Heap)</strong>
                                <span id="devopsMemLabel" style="font-weight:600;">64.2 MB / 512 MB</span>
                            </div>
                            <div style="width:100%; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                                <div id="devopsMemBar" style="width:15%; background: var(--accent); height:100%; transition: width 0.5s ease;"></div>
                            </div>
                        </div>

                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px;">
                                <strong>DevServer CPU Allocation (Shared Kernels)</strong>
                                <span id="devopsCpuLabel" style="font-weight:600;">12% Active</span>
                            </div>
                            <div style="width:100%; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                                <div id="devopsCpuBar" style="width:12%; background: #10b981; height:100%; transition: width 0.5s ease;"></div>
                            </div>
                        </div>

                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px;">
                                <strong>Docker Network Sockets (WS/Ingress Client Tunnel)</strong>
                                <span id="devopsSocketsLabel" style="font-weight:600;">1 Active Connections</span>
                            </div>
                            <div style="width:100%; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                                <div id="devopsSocketsBar" style="width:8%; background: #f59e0b; height:100%; transition: width 0.5s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CI/CD Build Pipeline and Security Auditing -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- CI/CD Trigger Simulator -->
                    <div style="background: white; border: 1px solid var(--border-dark); border-radius: 12px; padding: 1.5rem;">
                        <h3 style="font-size: 1rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="git-branch" style="color:var(--accent);"></i> CI/CD Pipeline Simulator (DevOps Deployment)
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Trigger a simulated production compilation and Cloud Run microservice deploy sequence.</p>
                        <button class="btn btn-secondary" onclick="triggerBuildPipelineSim()" style="width:100%;" id="btnTriggerBuild">
                            <i data-lucide="refresh-cw"></i> Start Pipeline Build
                        </button>
                        <div id="buildPipelineProgress" style="margin-top:1rem; display:none;">
                            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:3px;">
                                <span id="pipelineBuildStatus">Building files...</span>
                                <strong id="pipelineBuildPercent">0%</strong>
                            </div>
                            <div style="width:100%; background:#e2e8f0; height:6px; border-radius:3px; overflow:hidden;">
                                <div id="pipelineBuildBar" style="width:0%; background:var(--accent); height:100%; transition: width 0.2s;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Security Access Controls -->
                    <div style="background: white; border: 1px solid var(--border-dark); border-radius: 12px; padding: 1.5rem;">
                        <h3 style="font-size: 1rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="shield" style="color:#10b981;"></i> Security Sandbox Tools
                        </h3>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Generate dynamic JWT authorization tokens and cryptographically inspect active local encryption keys.</p>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-secondary" onclick="generateTokenInspector()" style="flex:1; font-size:0.75rem;"><i data-lucide="key"></i> JWT Generator</button>
                            <button class="btn btn-secondary" onclick="generateEncryptionKey()" style="flex:1; font-size:0.75rem;"><i data-lucide="lock"></i> Encryption Key</button>
                        </div>
                        <div id="securityToolOutput" style="margin-top:1rem; padding:0.75rem; border-radius:6px; background:#f8fafc; font-family:var(--font-mono); font-size:0.75rem; word-break:break-all; display:none; border:1px solid var(--border-dark);"></div>
                    </div>
                </div>
            </div>
        `;
        // Start live DevOps meter fluctuations
        startDevopsMeterFluctuations();
    }
}

// Sandbox: Speech Voice search logic simulation
function triggerVoiceSimulation() {
    const btn = document.getElementById('wsVoiceBtn');
    const status = document.getElementById('wsVoiceStatus');
    if (!status) return;

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>';
    status.innerHTML = '<span style="color:var(--accent); font-weight:600; display:flex; align-items:center; gap:0.5rem;"><span class="online-indicator pulsate"></span> Listening for voice query...</span>';

    setTimeout(() => {
        status.innerHTML = '<span style="color:#10b981; font-weight:600;">⚡ Processing with Whisper/AI Audio models...</span>';
        
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="mic" style="width:24px;height:24px;"></i>';
            status.innerHTML = 'Microphone Ready. Click to speak...';
            
            // Populate autocomplete with simulation keyword
            testSearchKeywords('Leather');
            showToast('Voice matched: "Leather bag collection"', 'success');
        }, 1500);
    }, 2500);
    if (window.lucide) lucide.createIcons();
}

// Sandbox: Image Vision search logic simulation
function triggerImageSearchSimulation() {
    const box = document.getElementById('wsImageSearchText');
    if (!box) return;

    box.innerHTML = 'Initializing Gemini Vision API... Analyzing...';
    setTimeout(() => {
        box.innerHTML = '<span style="color:#2563eb; font-weight:600;">Analyzing image: "Leather Backpack / Schoolpack" detected!</span>';
        setTimeout(() => {
            testSearchKeywords('Backpack');
            box.innerHTML = 'Click here to select mock photo...';
            showToast('Vision matched: "Leather Backpack"', 'success');
        }, 2000);
    }, 1500);
}

// Sandbox: Auto Suggestions listing helper
function testSearchKeywords(keyword) {
    const output = document.getElementById('wsSearchSuggestionsOutput');
    if (!output) return;

    const matches = products.filter(p => 
        p.name.toLowerCase().includes(keyword.toLowerCase()) || 
        p.category.toLowerCase().includes(keyword.toLowerCase()) ||
        p.brand.toLowerCase().includes(keyword.toLowerCase())
    );

    if (matches.length === 0) {
        output.innerHTML = `<div style="color:red; font-weight:600; padding:1rem;">No direct category/product match in catalog for: "${keyword}"</div>`;
        return;
    }

    let itemsHtml = `<div style="font-weight:700; border-bottom:1px solid var(--border-dark); padding-bottom:0.25rem; margin-bottom:0.5rem; color:var(--primary);">AI Matched catalog entries for: "${keyword}"</div>`;
    matches.forEach(m => {
        itemsHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.25rem; border-bottom:1px dashed #f1f5f9; cursor:pointer;" onclick="viewWorkspaceProductDetails(${m.id})">
                <span style="font-weight:500; color:var(--text-secondary);">${m.name}</span>
                <strong style="color:var(--accent);">$${m.price.toFixed(2)}</strong>
            </div>
        `;
    });
    output.innerHTML = itemsHtml;
}

// Sandbox: Smart pricing calculator helper
function calculateSmartPricing() {
    const baseInput = document.getElementById('pricingBaseCost');
    const stockInput = document.getElementById('pricingStock');
    const demandInput = document.getElementById('pricingDemand');
    const result = document.getElementById('pricingResult');
    if (!result) return;

    const base = parseFloat(baseInput.value) || 100;
    const stock = parseInt(stockInput.value) || 10;
    const demand = parseFloat(demandInput.value) || 1.0;

    // Smart pricing scarcity logic:
    // If stock < 5, apply scarcity multiplier: 1.2x. If stock < 2, apply 1.4x.
    let stockMultiplier = 1.0;
    if (stock <= 1) stockMultiplier = 1.45;
    else if (stock <= 3) stockMultiplier = 1.25;
    else if (stock <= 5) stockMultiplier = 1.12;

    const finalSmartPrice = base * demand * stockMultiplier;
    const surgePercent = Math.round((finalSmartPrice / base - 1) * 100);

    result.style.display = 'block';
    result.innerHTML = `
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.25rem;">AI Scarcity Recommended Price</div>
        <div style="font-size:2rem; font-weight:800; color:#10b981; font-family:var(--font-display);">$${finalSmartPrice.toFixed(2)}</div>
        <div style="margin-top:0.25rem; display:inline-block; font-size:0.75rem; font-weight:600; padding:2px 8px; border-radius:9999px; background:#ecfdf5; color:#047857;">
            ${surgePercent > 0 ? `⚡ Surge Dynamic Pricing (+${surgePercent}% markup)` : '✔ Stable standard pricing'}
        </div>
        <p style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.5rem; line-height:1.4;">Based on ${stock} stock units available and a factor of ${demand}x interest, pricing was adjusted to maximize fulfillment profitability.</p>
    `;
    
    if (window.lucide) lucide.createIcons();
}

// Sandbox: Fraud simulation
function simulateFraudAnalysis(mode) {
    const out = document.getElementById('wsFraudOutput');
    if (!out) return;

    out.style.display = 'block';
    out.innerHTML = '<div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div> Auditing payment signatures...';

    setTimeout(() => {
        if (mode === 'RISKY') {
            out.style.background = '#fef2f2';
            out.style.border = '1px solid #fecaca';
            out.style.color = '#991b1b';
            out.innerHTML = `
                <div style="font-weight:700; display:flex; align-items:center; gap:0.4rem; margin-bottom:0.25rem;">
                    <i data-lucide="shield-alert" style="width:16px;"></i> CRITICAL WARNING: FRAUD DETECTED (Risk Index: 94%)
                </div>
                <ul style="padding-left:1.2rem; margin-top:0.25rem; display:flex; flex-direction:column; gap:2px; font-size:0.75rem; list-style:disc;">
                    <li>Transaction IP belongs to proxy pool (Node VPN)</li>
                    <li>IP Country (Estonia) does not match Card Billing Country (India)</li>
                    <li>Sub-second multiple attempts made with matching session ID</li>
                </ul>
            `;
        } else {
            out.style.background = '#ecfdf5';
            out.style.border = '1px solid #a7f3d0';
            out.style.color = '#065f46';
            out.innerHTML = `
                <div style="font-weight:700; display:flex; align-items:center; gap:0.4rem;">
                    <i data-lucide="shield-check" style="width:16px;"></i> SECURITY AUDIT: CLEAN (Risk Index: 2%)
                </div>
                <p style="font-size:0.75rem; margin-top:0.25rem; margin-bottom:0;">Telemetry checked. IP, Billing Address, Device Fingerprint, and Card verification match completely. Proceeding with secure processing.</p>
            `;
        }
        if (window.lucide) lucide.createIcons();
    }, 1500);
}

// Sandbox: Payments simulators
function updatePaymentGatewayDetails() {
    const select = document.getElementById('paymentGatewaySelect');
    const amt = document.getElementById('paymentSimAmount');
    if (!select || !amt) return;

    const gateway = select.value;
    if (gateway === 'Razorpay') {
        amt.value = '₹21,000.00';
    } else {
        amt.value = '$249.00';
    }
}

function runPaymentGatewaySimulation() {
    const logs = document.getElementById('paymentTerminalLogs');
    const badge = document.getElementById('gatewayStatusBadge');
    const gateway = document.getElementById('paymentGatewaySelect').value;
    const amt = document.getElementById('paymentSimAmount').value;
    if (!logs) return;

    badge.innerHTML = 'CONNECTING...';
    badge.style.color = '#e4e4e7';
    logs.innerHTML = `&gt; Initiating transaction sequence on secure ${gateway} sandbox endpoint...`;

    let step = 0;
    const simulationSteps = [
        `&gt; Requesting secure token signature for transaction amount ${amt}...`,
        `&gt; Generating cryptographic payload keys (RSA-2048/SHA256)...`,
        `&gt; [${gateway}] Connection established. Tokenizing Card details / UPI handles...`,
        `&gt; Handshaking with payment issuer bank network...`,
        `&gt; 3D Secure / MFA validation check (SIMULATED PASSED)...`,
        `&gt; Transaction captured. ID: txn_${Math.random().toString(36).substr(2, 9)}`,
        `&gt; Ledger sync completed successfully. Response 200 OK captured.`
    ];

    const timer = setInterval(() => {
        if (step < simulationSteps.length) {
            logs.innerHTML += `<br>${simulationSteps[step]}`;
            logs.scrollTop = logs.scrollHeight;
            step++;
        } else {
            clearInterval(timer);
            badge.innerHTML = 'COMPLETED';
            badge.style.color = '#10b981';
            showToast(`${gateway} Payment sandbox simulation succeeded!`, 'success');
        }
    }, 1000);
}

// Sandbox: Shipping Tracker
function startShipmentTrackingSim() {
    const courier = document.getElementById('shippingCourier').value;
    const tracking = document.getElementById('shippingTrackingNumber').value;
    const output = document.getElementById('shippingTrackingVisual');
    if (!output) return;

    output.innerHTML = '<div style="text-align:center;"><div class="spinner" style="width: 18px; height: 18px; border-width: 2px; margin: 0 auto 0.5rem auto;"></div> Querying Courier database...</div>';

    setTimeout(() => {
        output.innerHTML = `
            <div style="font-size:0.8rem; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dark); padding-bottom:0.5rem; margin-bottom:0.75rem;">
                <span><strong>Carrier:</strong> ${courier}</span>
                <span><strong>Tracking:</strong> ${tracking}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.75rem; position:relative; padding-left:1.5rem; border-left:2px solid var(--accent);">
                <!-- Node 1 -->
                <div style="position:relative;">
                    <span style="position:absolute; left:-29px; top:3px; width:10px; height:10px; border-radius:50%; background:var(--accent);"></span>
                    <div style="font-size:0.75rem; font-weight:700; color:var(--primary);">Out for Delivery <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(Bangalore Hub)</span></div>
                    <div style="font-size:0.7rem; color:var(--text-secondary);">Simulated ETA: Today, 3:00 PM</div>
                </div>
                <!-- Node 2 -->
                <div style="position:relative;">
                    <span style="position:absolute; left:-29px; top:3px; width:10px; height:10px; border-radius:50%; background:var(--accent);"></span>
                    <div style="font-size:0.75rem; font-weight:700; color:var(--primary);">In Transit - Sorted at Regional Facility <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(Majestic Terminal)</span></div>
                    <div style="font-size:0.7rem; color:var(--text-secondary);">Yesterday, 11:20 PM</div>
                </div>
                <!-- Node 3 -->
                <div style="position:relative;">
                    <span style="position:absolute; left:-29px; top:3px; width:10px; height:10px; border-radius:50%; background:var(--accent); opacity:0.5;"></span>
                    <div style="font-size:0.75rem; font-weight:500; color:var(--text-muted);">Shipment Manifest Transmitted <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(Origin Hub)</span></div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">2 Days ago, 10:00 AM</div>
                </div>
            </div>
        `;
    }, 1200);
}

function simulateDeliveryOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000);
    showToast(`Simulated Courier Secure Delivery OTP generated: ${otp}`, 'success');
}

// Sandbox: DevOps monitoring fluctuations
let devopsTimer = null;
function startDevopsMeterFluctuations() {
    if (devopsTimer) clearInterval(devopsTimer);

    devopsTimer = setInterval(() => {
        const cpuLabel = document.getElementById('devopsCpuLabel');
        const cpuBar = document.getElementById('devopsCpuBar');
        const memLabel = document.getElementById('devopsMemLabel');
        const memBar = document.getElementById('devopsMemBar');
        
        if (!cpuLabel || !cpuBar) {
            clearInterval(devopsTimer);
            return;
        }

        const mockCpu = Math.floor(5 + Math.random() * 30);
        cpuLabel.textContent = `${mockCpu}% Active`;
        cpuBar.style.width = `${mockCpu}%`;

        // Fluctuate memory slightly around 64MB
        const mockMem = (64.2 + (Math.random() - 0.5) * 4).toFixed(1);
        memLabel.textContent = `${mockMem} MB / 512 MB`;
        memBar.style.width = `${(mockMem / 512) * 100}%`;
    }, 3000);
}

// Sandbox: DevOps build compilation pipeline simulation
function triggerBuildPipelineSim() {
    const btn = document.getElementById('btnTriggerBuild');
    const container = document.getElementById('buildPipelineProgress');
    const bar = document.getElementById('pipelineBuildBar');
    const label = document.getElementById('pipelineBuildStatus');
    const percent = document.getElementById('pipelineBuildPercent');

    if (!btn || !container) return;

    btn.disabled = true;
    container.style.display = 'block';
    
    let progress = 0;
    const stages = [
        { limit: 20, text: 'Installing NPM dependencies (npm run build)...' },
        { limit: 40, text: 'Running type checks & ESNext code analysis...' },
        { limit: 60, text: 'Bundling with esbuild & compiling server.ts...' },
        { limit: 80, text: 'Generating Docker image layers for GCP deployment...' },
        { limit: 100, text: 'Deploying secure Cloud Run cluster (Port 3000)...' }
    ];

    const timer = setInterval(() => {
        if (progress <= 100) {
            percent.textContent = `${progress}%`;
            bar.style.width = `${progress}%`;
            
            const currentStage = stages.find(s => progress <= s.limit);
            if (currentStage) {
                label.textContent = currentStage.text;
            }

            progress += 4;
        } else {
            clearInterval(timer);
            label.textContent = '✔ Build successful! Container Operational & Live.';
            showToast('Sandbox DevOps CI/CD pipeline deploy completed green!', 'success');
            setTimeout(() => {
                btn.disabled = false;
            }, 3000);
        }
    }, 200);
}

// Sandbox: Security generators
function generateTokenInspector() {
    const out = document.getElementById('securityToolOutput');
    if (!out) return;

    out.style.display = 'block';
    const payload = {
        sub: window.authUser ? window.authUser.username : "guest_visitor",
        role: window.authUser ? window.authUser.role : "GUEST",
        aud: "quantamart-applet-ingress",
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    const signature = Math.random().toString(36).substr(2, 12);
    out.innerHTML = `<strong>GENERATED JWT:</strong><br><span style="color:#10b981;">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(payload))}.${signature}</span><br><br><strong>DECODED CLUSTER HEADERS:</strong><br>${JSON.stringify(payload, null, 2)}`;
}

function generateEncryptionKey() {
    const out = document.getElementById('securityToolOutput');
    if (!out) return;

    out.style.display = 'block';
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    out.innerHTML = `<strong>LOCAL AES-256 SYMMETRIC DECRYPTION KEY:</strong><br><span style="color:#2563eb; font-weight:bold;">${hex}</span><br><br><strong>STATUS:</strong> Key loaded into kernel memory. All local database records are dynamically hashed and shielded before persistence.`;
}

// Trigger detail viewing from sandbox
window.viewWorkspaceProductDetails = function(id) {
    if (window.showProductDetail) {
        window.showProductDetail(id);
    }
};

// ==========================================================================
// 2. CUSTOMER DASHBOARD TAB
// ==========================================================================
function renderCustomerTab(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom:1px solid var(--border-dark); padding-bottom:1rem; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
            <div>
                <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--primary);">
                    Customer Workspace Console
                </h2>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.15rem;">Manage your active delivery details, wallet credits, wishlist, and file returns.</p>
            </div>
            <div style="display:flex; gap:0.5rem;">
                <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:0.5rem 1rem; border-radius:8px; display:flex; align-items:center; gap:0.5rem;">
                    <i data-lucide="wallet" style="color:#10b981; width:16px;"></i>
                    <span style="font-size:0.8rem; color:#065f46; font-weight:700;">Wallet Credits: <strong id="customerWalletOutput">$${customerWalletBalance.toFixed(2)}</strong></span>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; lg:grid-template-columns: 1.2fr 0.8fr; gap: 2rem;">
            <div>
                <!-- Wishlist and Address Management -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem; margin-bottom:1.5rem;">
                    <h3 style="font-size:1.1rem; font-weight:600; color:var(--primary); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="map-pin" style="color:var(--accent);"></i> Shipping Address Management
                    </h3>
                    <div id="customerAddressesList" style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.25rem;">
                        <!-- Injected -->
                    </div>
                    
                    <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.75rem;">Add New Shipping Address</h4>
                    <form id="wsAddressForm" onsubmit="handleNewAddressSubmit(event)" style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                        <input type="text" id="addAddrType" placeholder="Address Tag (e.g. Work, Gym)" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                        <input type="text" id="addAddrName" placeholder="Full Recipient Name" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                        <input type="text" id="addAddrPhone" placeholder="Contact Phone" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                        <input type="text" id="addAddrStreet" placeholder="Street/Building Details" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                        <input type="text" id="addAddrCity" placeholder="City" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                        <input type="text" id="addAddrPin" placeholder="Pin/Zip Code" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                        <button class="btn btn-accent" type="submit" style="grid-column:1 / -1; font-size:0.8rem; padding:0.5rem;"><i data-lucide="plus"></i> Add Address</button>
                    </form>
                </div>

                <!-- Product return files requests -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem;">
                    <h3 style="font-size:1.1rem; font-weight:600; color:var(--primary); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="undo" style="color:#ef4444;"></i> Return Order File Center
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem;">Request return and refund operations directly for completed orders.</p>
                    
                    <div style="display:grid; grid-template-columns:1fr; md:grid-template-columns:1fr 1fr; gap:1rem;">
                        <div>
                            <div class="form-group" style="margin-bottom:0.5rem;">
                                <label style="font-size:0.75rem; font-weight:600;">Select Order ID</label>
                                <input type="number" id="wsReturnOrderId" placeholder="e.g. 1" required style="width:100%; padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                            </div>
                            <div class="form-group" style="margin-bottom:0.75rem;">
                                <label style="font-size:0.75rem; font-weight:600;">Reason for Return</label>
                                <textarea id="wsReturnReason" placeholder="Item damaged / Wrong sizing details" rows="2" style="width:100%; padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;"></textarea>
                            </div>
                            <button class="btn btn-secondary" onclick="fileCustomerReturnRequest()" style="width:100%; font-size:0.8rem; padding:0.5rem;">File Return Request</button>
                        </div>
                        <div style="background:#f8fafc; padding:1rem; border-radius:6px; border:1px solid var(--border-dark); font-size:0.75rem;">
                            <strong>Return Pipeline Info:</strong><br>
                            All return requests require direct approval from an authorized administrator. Standard refund settlement credits are processed directly into your Wallet within 2-4 hours.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Customer Wallet & coupons on sidebar -->
            <div style="display:flex; flex-direction:column; gap:1.5rem;">
                <!-- Wishlist Items Container -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem;">
                    <h3 style="font-size:1rem; font-weight:600; color:var(--primary); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="heart" style="color:#ef4444;"></i> Saved Wishlist Goods
                    </h3>
                    <div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:1.5rem 0;" id="wsWishlistPlaceholder">
                        <i data-lucide="heart" style="width:24px; margin:0 auto 0.25rem auto; opacity:0.35;"></i>
                        No items in wishlist yet. Click heart icons in catalog!
                    </div>
                </div>

                <!-- Instant Topup panel -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem;">
                    <h3 style="font-size:1rem; font-weight:600; color:var(--primary); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="plus-circle" style="color:var(--accent);"></i> Top-Up Wallet Credits
                    </h3>
                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                            <button class="btn btn-secondary" onclick="addCustomerWalletFunds(100)" style="font-size:0.75rem; padding:0.4rem;">+$100.00</button>
                            <button class="btn btn-secondary" onclick="addCustomerWalletFunds(250)" style="font-size:0.75rem; padding:0.4rem;">+$250.00</button>
                        </div>
                        <button class="btn btn-accent" onclick="addCustomerWalletFunds(500)" style="font-size:0.75rem; padding:0.4rem; width:100%;">+$500.00 Express Topup</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    renderCustomerAddresses();
}

function renderCustomerAddresses() {
    const container = document.getElementById('customerAddressesList');
    if (!container) return;

    if (customerAddresses.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; font-style:italic;">No addresses saved yet.</div>';
        return;
    }

    let html = '';
    customerAddresses.forEach(addr => {
        html += `
            <div style="background:#f8fafc; border:1px solid ${addr.isDefault ? 'var(--accent)' : 'var(--border-dark)'}; padding:0.85rem; border-radius:6px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.25rem;">
                        <strong style="color:var(--primary);">${addr.type}</strong>
                        ${addr.isDefault ? '<span style="background:var(--accent); color:white; font-size:0.6rem; padding:1px 5px; border-radius:4px; font-weight:600;">DEFAULT</span>' : ''}
                    </div>
                    <div>Recipient: ${addr.name} | Phone: ${addr.phone}</div>
                    <div style="color:var(--text-secondary); margin-top:0.15rem;">${addr.street}, ${addr.city} - ${addr.pin}</div>
                </div>
                <button onclick="deleteCustomerAddress(${addr.id})" style="border:none; background:transparent; color:#ef4444; cursor:pointer;" title="Delete Address">
                    <i data-lucide="trash-2" style="width:16px;"></i>
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

window.handleNewAddressSubmit = function(e) {
    e.preventDefault();
    const type = document.getElementById('addAddrType').value;
    const name = document.getElementById('addAddrName').value;
    const phone = document.getElementById('addAddrPhone').value;
    const street = document.getElementById('addAddrStreet').value;
    const city = document.getElementById('addAddrCity').value;
    const pin = document.getElementById('addAddrPin').value;

    const newAddr = {
        id: Date.now(),
        type,
        name,
        phone,
        street,
        city,
        pin,
        isDefault: customerAddresses.length === 0
    };

    customerAddresses.push(newAddr);
    localStorage.setItem('ws_addresses', JSON.stringify(customerAddresses));
    document.getElementById('wsAddressForm').reset();
    renderCustomerAddresses();
    showToast('Delivery Address saved successfully!', 'success');
};

window.deleteCustomerAddress = function(id) {
    customerAddresses = customerAddresses.filter(a => a.id !== id);
    localStorage.setItem('ws_addresses', JSON.stringify(customerAddresses));
    renderCustomerAddresses();
    showToast('Delivery Address deleted.', 'success');
};

window.addCustomerWalletFunds = function(amt) {
    customerWalletBalance += amt;
    localStorage.setItem('ws_wallet_balance', customerWalletBalance.toFixed(2));
    const label = document.getElementById('customerWalletOutput');
    if (label) label.textContent = `$${customerWalletBalance.toFixed(2)}`;
    showToast(`Added $${amt.toFixed(2)} mock credits to your active wallet balance!`, 'success');
};

window.fileCustomerReturnRequest = async function() {
    const orderIdInput = document.getElementById('wsReturnOrderId');
    const reasonInput = document.getElementById('wsReturnReason');
    if (!orderIdInput) return;

    const orderId = orderIdInput.value;
    const reason = reasonInput.value;

    if (!orderId) {
        showToast('Please enter a valid completed Order ID.', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/orders/${orderId}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Request failed.');
        }

        showToast(`Return request filed for Order #${orderId}. Pending verification.`, 'success');
        orderIdInput.value = '';
        reasonInput.value = '';
    } catch (e) {
        showToast(e.message, 'error');
    }
};

// ==========================================================================
// 3. SELLER DASHBOARD TAB
// ==========================================================================
function renderSellerTab(container) {
    container.innerHTML = `
        <div style="border-bottom:1px solid var(--border-dark); padding-bottom:1rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div>
                <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--primary);">
                    Seller Merchant Terminal
                </h2>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.15rem;">Manage active warehouses, upload new catalog goods, track shop analytics, and print barcodes.</p>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; lg:grid-template-columns: 1.1fr 0.9fr; gap: 2rem;">
            <div>
                <!-- Product upload -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem; margin-bottom:1.5rem;">
                    <h3 style="font-size:1.1rem; font-weight:600; color:var(--primary); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="package-plus" style="color:var(--accent);"></i> Upload New Catalog Product
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Submit details to immediately publish products to the active client store.</p>
                    
                    <form id="wsProductUploadForm" onsubmit="handleProductUploadSubmit(event)" style="display:flex; flex-direction:column; gap:0.75rem;">
                        <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:0.75rem;">
                            <input type="text" id="upName" placeholder="Product Title" required style="padding:0.45rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.85rem;">
                            <input type="number" id="upPrice" placeholder="Price (USD)" step="0.01" required style="padding:0.45rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.85rem;">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                            <select id="upCategory" required style="padding:0.45rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.85rem;">
                                <option value="" disabled selected>Select Category</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Lifestyle">Lifestyle</option>
                                <option value="Bags">Bags</option>
                                <option value="Audio">Audio</option>
                            </select>
                            <input type="text" id="upBrand" placeholder="Brand / Maker (e.g. Quanta)" required style="padding:0.45rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.85rem;">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                            <input type="number" id="upStock" placeholder="Initial Inventory Stock" required style="padding:0.45rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.85rem;">
                            <input type="text" id="upImage" placeholder="Image URL (Leave empty for default)" style="padding:0.45rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.85rem;">
                        </div>
                        <textarea id="upDesc" placeholder="Meticulous details and product features description..." rows="3" required style="padding:0.45rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.85rem;"></textarea>
                        
                        <button type="submit" class="btn btn-accent" style="font-size:0.85rem; padding:0.6rem;"><i data-lucide="cloud-lightning"></i> Publish Product Live</button>
                    </form>
                </div>

                <!-- Warehouse stock warning -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem;">
                    <h3 style="font-size:1.1rem; font-weight:600; color:var(--primary); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="alert-triangle" style="color:#f59e0b;"></i> Low Stock Warehouse Monitoring
                    </h3>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                            <thead>
                                <tr style="border-bottom:2px solid var(--border-dark); color:var(--text-secondary); font-weight:700;">
                                    <th style="padding:0.5rem 0;">SKU ID</th>
                                    <th style="padding:0.5rem 0;">Product</th>
                                    <th style="padding:0.5rem 0;">Stock</th>
                                    <th style="padding:0.5rem 0;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom:1px solid var(--border-dark);">
                                    <td style="padding:0.5rem 0; font-family:var(--font-mono);">#4</td>
                                    <td style="padding:0.5rem 0;">Leather Travel Duffel</td>
                                    <td style="padding:0.5rem 0; font-weight:700; color:#ef4444;">1 left</td>
                                    <td style="padding:0.5rem 0;"><span style="background:#fee2e2; color:#ef4444; font-size:0.65rem; padding:2px 6px; border-radius:4px; font-weight:600;">CRITICAL</span></td>
                                </tr>
                                <tr style="border-bottom:1px solid var(--border-dark);">
                                    <td style="padding:0.5rem 0; font-family:var(--font-mono);">#8</td>
                                    <td style="padding:0.5rem 0;">Sleek Aluminum Pen</td>
                                    <td style="padding:0.5rem 0; font-weight:700; color:#f59e0b;">4 left</td>
                                    <td style="padding:0.5rem 0;"><span style="background:#fef3c7; color:#d97706; font-size:0.65rem; padding:2px 6px; border-radius:4px; font-weight:600;">REORDER</span></td>
                                </tr>
                                <tr>
                                    <td style="padding:0.5rem 0; font-family:var(--font-mono);">#11</td>
                                    <td style="padding:0.5rem 0;">Smart Thermos Flask</td>
                                    <td style="padding:0.5rem 0; font-weight:700; color:#f59e0b;">5 left</td>
                                    <td style="padding:0.5rem 0;"><span style="background:#fef3c7; color:#d97706; font-size:0.65rem; padding:2px 6px; border-radius:4px; font-weight:600;">REORDER</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:1.5rem;">
                <!-- Earning analytics chart -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem;">
                    <h3 style="font-size:1rem; font-weight:600; color:var(--primary); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="bar-chart-2" style="color:var(--accent);"></i> Merchant Earnings Analytics
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Gross simulated merchant revenues over the past months.</p>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; height:130px; border-bottom:1px solid var(--border-dark); padding-bottom:0.5rem; margin-top:1.5rem;">
                        <!-- April -->
                        <div style="display:flex; flex-direction:column; align-items:center; width:20%;">
                            <div style="height:35px; background:var(--primary); width:24px; border-radius:4px 4px 0 0;" title="$3,500"></div>
                            <span style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">Apr</span>
                        </div>
                        <!-- May -->
                        <div style="display:flex; flex-direction:column; align-items:center; width:20%;">
                            <div style="height:65px; background:var(--primary); width:24px; border-radius:4px 4px 0 0;" title="$6,500"></div>
                            <span style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">May</span>
                        </div>
                        <!-- June -->
                        <div style="display:flex; flex-direction:column; align-items:center; width:20%;">
                            <div style="height:100px; background:var(--accent); width:24px; border-radius:4px 4px 0 0;" title="$10,000"></div>
                            <span style="font-size:0.7rem; color:var(--primary); font-weight:700; margin-top:0.25rem;">Jun</span>
                        </div>
                        <!-- July (Current) -->
                        <div style="display:flex; flex-direction:column; align-items:center; width:20%;">
                            <div style="height:80px; background:var(--primary); width:24px; border-radius:4px 4px 0 0;" title="$8,000"></div>
                            <span style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">Jul</span>
                        </div>
                    </div>
                </div>

                <!-- Barcode printer -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem;">
                    <h3 style="font-size:1rem; font-weight:600; color:var(--primary); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="barcode" style="color:var(--primary);"></i> Logistics Barcode Label Printer
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem;">Generate and download compliant logistics barcodes for dispatch bins.</p>
                    
                    <div style="background:#f1f5f9; padding:0.75rem; border-radius:6px; border:1px dashed var(--border-dark); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.25rem;">
                        <div style="background:black; width:100%; height:45px; display:flex; justify-content:space-between; padding:4px 0;">
                            <!-- CSS Simulated Barcode lines -->
                            <div style="background:white; width:3px; height:100%;"></div>
                            <div style="background:white; width:1px; height:100%;"></div>
                            <div style="background:white; width:4px; height:100%;"></div>
                            <div style="background:white; width:2px; height:100%;"></div>
                            <div style="background:white; width:3px; height:100%;"></div>
                            <div style="background:white; width:1px; height:100%;"></div>
                            <div style="background:white; width:4px; height:100%;"></div>
                            <div style="background:white; width:2px; height:100%;"></div>
                            <div style="background:white; width:1px; height:100%;"></div>
                            <div style="background:white; width:3px; height:100%;"></div>
                        </div>
                        <span style="font-family:var(--font-mono); font-size:0.65rem; color:var(--primary); letter-spacing:0.2em;">*QM-DISPATCH-90412*</span>
                    </div>
                    <button class="btn btn-secondary" onclick="showToast('Barcode sent to thermal label printer queue!', 'success')" style="width:100%; margin-top:0.75rem; font-size:0.75rem;"><i data-lucide="printer"></i> Print Compliant Label</button>
                </div>
            </div>
        </div>
    `;
}

window.handleProductUploadSubmit = async function(e) {
    e.preventDefault();
    const name = document.getElementById('upName').value;
    const price = document.getElementById('upPrice').value;
    const category = document.getElementById('upCategory').value;
    const brand = document.getElementById('upBrand').value;
    const stock = document.getElementById('upStock').value;
    const imageUrl = document.getElementById('upImage').value || undefined;
    const description = document.getElementById('upDesc').value;

    const data = { name, price, category, brand, stock, imageUrl, description };

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to upload product.');

        showToast(`"${name}" is now live in the active catalog!`, 'success');
        document.getElementById('wsProductUploadForm').reset();
        
        // Trigger catalog update
        if (window.fetchProducts) {
            window.fetchProducts();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ==========================================================================
// 4. ADMIN CONTROL PANEL TAB
// ==========================================================================
function renderAdminTab(container) {
    container.innerHTML = `
        <div style="border-bottom:1px solid var(--border-dark); padding-bottom:1rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div>
                <h2 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--primary);">
                    Administrator Control Panel
                </h2>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.15rem;">Manage active user status vectors, trigger refunds, seed custom site-wide coupons, and audit security telemetry.</p>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; xl:grid-template-columns: 1.2fr 0.8fr; gap: 2rem;">
            <div>
                <!-- User Directory Table -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem; margin-bottom:1.5rem;">
                    <h3 style="font-size:1.1rem; font-weight:600; color:var(--primary); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="users" style="color:var(--accent);"></i> User Directory &amp; RBAC Accounts
                    </h3>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                            <thead>
                                <tr style="border-bottom:2px solid var(--border-dark); color:var(--text-secondary); font-weight:700;">
                                    <th style="padding:0.5rem 0.25rem;">ID</th>
                                    <th style="padding:0.5rem 0.25rem;">Username</th>
                                    <th style="padding:0.5rem 0.25rem;">Email</th>
                                    <th style="padding:0.5rem 0.25rem;">Role</th>
                                    <th style="padding:0.5rem 0.25rem;">Status</th>
                                    <th style="padding:0.5rem 0.25rem; text-align:right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="adminUsersTableBody">
                                <!-- Loaded dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Refund Approvals Queue -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem; margin-bottom:1.5rem;">
                    <h3 style="font-size:1.1rem; font-weight:600; color:var(--primary); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="undo" style="color:#ef4444;"></i> Refund Approvals &amp; Return Pipeline
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">Approve client returns to trigger direct automated bank/wallet refund processing.</p>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                            <thead>
                                <tr style="border-bottom:2px solid var(--border-dark); color:var(--text-secondary); font-weight:700;">
                                    <th style="padding:0.5rem 0.25rem;">ID</th>
                                    <th style="padding:0.5rem 0.25rem;">Order ID</th>
                                    <th style="padding:0.5rem 0.25rem;">Reason</th>
                                    <th style="padding:0.5rem 0.25rem;">Amount</th>
                                    <th style="padding:0.5rem 0.25rem;">Status</th>
                                    <th style="padding:0.5rem 0.25rem; text-align:right;">Verify</th>
                                </tr>
                            </thead>
                            <tbody id="adminReturnsTableBody">
                                <!-- Loaded dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:1.5rem;">
                <!-- Coupon Seed rule -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem;">
                    <h3 style="font-size:1rem; font-weight:600; color:var(--primary); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="tag" style="color:var(--accent);"></i> Create Custom Platform Coupon
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Add global discount promocodes applied instantly during client checkout.</p>
                    
                    <form id="wsCouponForm" onsubmit="handleNewCouponSubmit(event)" style="display:flex; flex-direction:column; gap:0.5rem;">
                        <input type="text" id="coupCode" placeholder="COUPON_CODE (e.g. FLASH30)" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem; text-transform:uppercase;">
                        <input type="number" id="coupPercent" placeholder="Discount Percentage (e.g. 30)" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                        <input type="text" id="coupDesc" placeholder="Brief Promo Description" required style="padding:0.4rem; border:1px solid var(--border-dark); border-radius:6px; font-size:0.8rem;">
                        <button class="btn btn-accent" type="submit" style="font-size:0.8rem; padding:0.5rem; margin-top:0.25rem;"><i data-lucide="plus"></i> Add Coupon</button>
                    </form>
                </div>

                <!-- Live Audit Logs -->
                <div style="background:white; border:1px solid var(--border-dark); border-radius:10px; padding:1.5rem;">
                    <h3 style="font-size:1rem; font-weight:600; color:var(--primary); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <i data-lucide="shield" style="color:#10b981;"></i> Security &amp; Audit Logs
                    </h3>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Real-time backend audit events telemetry (JWT validation / Auth checks).</p>
                    <div id="adminSecurityLogs" style="background:#0f172a; border-radius:6px; padding:0.75rem; color:#a7f3d0; font-family:var(--font-mono); font-size:0.7rem; height:180px; overflow-y:auto; line-height:1.4;">
                        <!-- Injected -->
                    </div>
                </div>
            </div>
        </div>
    `;

    fetchAdminUsers();
    fetchAdminReturns();
    fetchAdminLogs();
}

async function fetchAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch user index.');
        
        const users = await response.json();
        let html = '';
        users.forEach(u => {
            html += `
                <tr style="border-bottom:1px solid var(--border-dark);">
                    <td style="padding:0.5rem 0.25rem; font-family:var(--font-mono);">${u.id}</td>
                    <td style="padding:0.5rem 0.25rem; font-weight:600;">${u.username}</td>
                    <td style="padding:0.5rem 0.25rem; color:var(--text-secondary);">${u.email}</td>
                    <td style="padding:0.5rem 0.25rem;"><span class="badge" style="font-size:0.65rem; padding:1px 5px;">${u.role}</span></td>
                    <td style="padding:0.5rem 0.25rem;">
                        <span class="badge ${u.active ? 'success' : 'danger'}" style="font-size:0.65rem; padding:1px 5px;">
                            ${u.active ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                    </td>
                    <td style="padding:0.5rem 0.25rem; text-align:right;">
                        <button class="btn btn-secondary" onclick="toggleUserAccountStatus(${u.id})" style="font-size:0.7rem; padding:2px 8px;">
                            ${u.active ? 'Suspend' : 'Activate'}
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:1rem; text-align:center; color:red;">${e.message}</td></tr>`;
    }
}

async function fetchAdminReturns() {
    const tbody = document.getElementById('adminReturnsTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('/api/admin/returns');
        if (!response.ok) throw new Error('Failed to fetch return index.');

        const returns = await response.json();
        if (returns.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:1rem; text-align:center; color:var(--text-muted); font-style:italic;">No return requests filed yet.</td></tr>`;
            return;
        }

        let html = '';
        returns.forEach(r => {
            let actionHtml = '';
            if (r.status === 'PENDING') {
                actionHtml = `
                    <button class="btn btn-accent" onclick="processRefundRequest(${r.id}, 'APPROVE')" style="font-size:0.65rem; padding:2px 6px;">Approve</button>
                    <button class="btn btn-secondary" onclick="processRefundRequest(${r.id}, 'REJECT')" style="font-size:0.65rem; padding:2px 6px; margin-left:2px;">Reject</button>
                `;
            } else {
                actionHtml = `<span style="color:var(--text-muted); font-size:0.75rem;">✔ Closed</span>`;
            }

            html += `
                <tr style="border-bottom:1px solid var(--border-dark);">
                    <td style="padding:0.5rem 0.25rem; font-family:var(--font-mono);">${r.id}</td>
                    <td style="padding:0.5rem 0.25rem; font-weight:600;">Order #${r.orderId}</td>
                    <td style="padding:0.5rem 0.25rem; color:var(--text-secondary); max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.reason}">${r.reason}</td>
                    <td style="padding:0.5rem 0.25rem; font-weight:700; color:var(--accent);">$${r.refundAmount.toFixed(2)}</td>
                    <td style="padding:0.5rem 0.25rem;">
                        <span class="badge ${r.status === 'APPROVED' ? 'success' : r.status === 'PENDING' ? 'pending' : 'danger'}" style="font-size:0.65rem; padding:1px 5px;">
                            ${r.status}
                        </span>
                    </td>
                    <td style="padding:0.5rem 0.25rem; text-align:right;">${actionHtml}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:1rem; text-align:center; color:red;">${e.message}</td></tr>`;
    }
}

async function fetchAdminLogs() {
    const box = document.getElementById('adminSecurityLogs');
    if (!box) return;

    try {
        const response = await fetch('/api/admin/logs');
        if (!response.ok) throw new Error('Logs failed.');

        const logs = await response.json();
        let html = '';
        logs.forEach(log => {
            const dateStr = new Date(log.timestamp).toLocaleTimeString();
            let stateColor = '#a7f3d0'; // green for success
            if (log.status.includes('FAILED') || log.status.includes('SUSPENDED')) stateColor = '#fca5a5'; // red
            
            html += `
                <div style="margin-bottom:0.25rem; border-bottom:1px solid #1e293b; padding-bottom:0.2rem;">
                    <span style="color:#64748b;">[${dateStr}]</span> 
                    <strong style="color:#38bdf8;">${log.event}</strong> 
                    <span style="color:#e2e8f0;">User: ${log.user}</span> 
                    | Status: <span style="color:${stateColor}; font-weight:bold;">${log.status}</span>
                </div>
            `;
        });
        box.innerHTML = html;
        box.scrollTop = 0;
    } catch (e) {
        box.textContent = 'Failed to fetch logs telemetry.';
    }
}

window.toggleUserAccountStatus = async function(id) {
    try {
        const response = await fetch(`/api/admin/users/${id}/toggle`, {
            method: 'POST'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed status change.');
        }

        const data = await response.json();
        showToast(`User account status updated. ${data.username} active = ${data.active}`, 'success');
        fetchAdminUsers();
        fetchAdminLogs();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.processRefundRequest = async function(id, action) {
    try {
        const response = await fetch(`/api/admin/returns/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });

        if (!response.ok) throw new Error('Refund processing failed.');

        const data = await response.json();
        showToast(`Return request #${id} ${action === 'APPROVE' ? 'Approved & Refunded' : 'Rejected'}.`, 'success');
        
        // If approved, dynamically credit simulated customer wallet credits
        if (action === 'APPROVE') {
            customerWalletBalance += data.request.refundAmount;
            localStorage.setItem('ws_wallet_balance', customerWalletBalance.toFixed(2));
        }

        fetchAdminReturns();
        fetchAdminLogs();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.handleNewCouponSubmit = async function(e) {
    e.preventDefault();
    const code = document.getElementById('coupCode').value;
    const discountPercent = document.getElementById('coupPercent').value;
    const description = document.getElementById('coupDesc').value;

    const data = { code, discountPercent, description };

    try {
        const response = await fetch('/api/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Coupon creation failed.');
        }

        showToast(`Global promocode ${code.toUpperCase()} successfully initialized!`, 'success');
        document.getElementById('wsCouponForm').reset();
        fetchAdminLogs();
    } catch (err) {
        showToast(err.message, 'error');
    }
};
