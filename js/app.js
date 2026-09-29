// ================================================================
//  KN SHOP — Frontend API Client (app.js)
//  เชื่อมต่อ Backend จริง (Node.js + MongoDB + JWT)
// ================================================================

const API_BASE = '/api';

const KNShop = {
    token: localStorage.getItem('kn_token') || null,
    cachedUser: null,

    // ==================== HTTP HELPERS ====================
    async api(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = 'Bearer ' + this.token;

        // ส่ง CSRF token ถ้ามี (สำหรับ non-Bearer requests)
        const csrfToken = this.getCookie('csrfToken');
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        try {
            const res = await fetch(API_BASE + endpoint, { ...options, headers, credentials: 'same-origin' });
            const data = await res.json();

            // Auto refresh token เมื่อ access token หมดอายุ
            if (res.status === 401 && data.code === 'TOKEN_EXPIRED' && !options._retried) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // ลองส่ง request อีกครั้งด้วย token ใหม่
                    options._retried = true;
                    return this.api(endpoint, options);
                }
            }

            if (res.status === 401 && !options._retried) {
                this.logout();
                return data;
            }
            return data;
        } catch (err) {
            console.error('API Error:', err);
            return { success: false, msg: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
        }
    },

    // อ่าน cookie
    getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    },

    // Auto refresh token
    async refreshToken() {
        try {
            const res = await fetch(API_BASE + '/auth/refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
            });
            const data = await res.json();
            if (data.success && data.token) {
                this.setToken(data.token);
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    },

    async get(endpoint) {
        return this.api(endpoint);
    },

    async post(endpoint, body) {
        return this.api(endpoint, { method: 'POST', body: JSON.stringify(body) });
    },

    async put(endpoint, body) {
        return this.api(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    },

    async del(endpoint) {
        return this.api(endpoint, { method: 'DELETE' });
    },

    // ==================== AUTHENTICATION ====================
    async register(username, email, password) {
        const data = await this.post('/auth/register', { username, email, password });
        if (data.success && data.token) {
            this.setToken(data.token);
            this.cachedUser = data.user;
        }
        return data;
    },

    async login(emailOrUsername, password) {
        const data = await this.post('/auth/login', { emailOrUsername, password });
        if (data.success && data.token) {
            this.setToken(data.token);
            this.cachedUser = data.user;
        }
        return data;
    },

    async logout() {
        // Clear local state synchronously so navigation cannot leave a stale token behind.
        const tokenToRevoke = this.token;
        this.token = null;
        this.cachedUser = null;
        localStorage.removeItem('kn_token');
        localStorage.removeItem('kn_cart');

        // เรียก backend เพื่อลบ refresh token cookie
        try {
            await fetch(API_BASE + '/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tokenToRevoke ? { 'Authorization': 'Bearer ' + tokenToRevoke } : {}),
                },
                credentials: 'same-origin',
                keepalive: true,
            });
        } catch (err) {
            // ไม่ต้อง block logout แม้ API ล้มเหลว
        }
    },

    setToken(token) {
        this.token = token;
        localStorage.setItem('kn_token', token);
    },

    isLoggedIn() {
        return !!this.token;
    },

    async getCurrentUser() {
        if (this.cachedUser) return this.cachedUser;
        if (!this.token) return null;
        const data = await this.get('/auth/me');
        if (data.success) {
            this.cachedUser = data.user;
            return data.user;
        }
        return null;
    },

    async updateProfile(profileData) {
        const data = await this.put('/auth/profile', profileData);
        if (data.success) this.cachedUser = data.user;
        return data;
    },

    async changePassword(currentPassword, newPassword) {
        return this.put('/auth/change-password', { currentPassword, newPassword });
    },

    // ==================== OTP PASSWORD RESET (3 Steps) ====================
    async requestOTP(email) {
        return this.post('/auth/forgot-password', { email });
    },

    async verifyOTP(email, code) {
        return this.post('/auth/verify-otp', { email, code });
    },

    async resetPasswordWithToken(email, resetToken, newPassword) {
        return this.post('/auth/reset-password', { email, resetToken, newPassword });
    },

    // Backward compatibility
    async resetPassword(email) {
        return this.requestOTP(email);
    },

    // ==================== SOCIAL LOGIN ====================
    getGoogleLoginUrl() {
        return API_BASE + '/auth/google';
    },

    getFacebookLoginUrl() {
        return API_BASE + '/auth/facebook';
    },

    handleSocialLoginCallback() {
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const token = hashParams.get('token') || queryParams.get('token');
        const social = hashParams.get('social') || queryParams.get('social');
        const error = queryParams.get('error') || hashParams.get('error');

        if (error) {
            const oauthErrors = {
                google_unavailable: 'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google บนเซิร์ฟเวอร์',
                facebook_unavailable: 'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Facebook บนเซิร์ฟเวอร์',
                google_failed: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่',
                facebook_failed: 'เข้าสู่ระบบด้วย Facebook ไม่สำเร็จ กรุณาลองใหม่',
            };
            return { success: false, msg: oauthErrors[error] || 'เข้าสู่ระบบด้วยบัญชีภายนอกไม่สำเร็จ' };
        }
        if (token && social) {
            this.setToken(token);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return { success: true, social };
        }
        return null;
    },

    isAdmin() {
        return this.cachedUser && this.cachedUser.role === 'admin';
    },

    // ==================== PRODUCTS ====================
    async getProducts(categorySlug) {
        if (categorySlug) return this.get('/products/category/' + categorySlug);
        return this.get('/products');
    },

    async getProduct(id) {
        return this.get('/products/' + id);
    },

    async getPublicStats() {
        return this.get('/products/public-stats');
    },

    async addReview(productId, rating, comment) {
        return this.post('/products/' + productId + '/review', { rating, comment });
    },

    // ==================== CATEGORIES ====================
    async getCategories() {
        return this.get('/categories');
    },

    async getCategory(slug) {
        return this.get('/categories/' + slug);
    },

    // ==================== CART (Client-side, submitted to server on checkout) ====================
    getCart() {
        return JSON.parse(localStorage.getItem('kn_cart') || '[]');
    },

    addToCart(productId, qty, robloxUsername, title, price, imgLabel) {
        const cart = this.getCart();
        const existing = cart.find(i => i.productId === productId);
        if (existing) {
            existing.qty += qty;
            if (robloxUsername) existing.robloxUsername = robloxUsername;
        } else {
            cart.push({ productId, qty, robloxUsername: robloxUsername || '', title, price, imgLabel });
        }
        localStorage.setItem('kn_cart', JSON.stringify(cart));
        this.updateCartBadge();
        return { success: true, msg: 'เพิ่มลงตะกร้าแล้ว!' };
    },

    removeFromCart(productId) {
        let cart = this.getCart();
        cart = cart.filter(i => i.productId !== productId);
        localStorage.setItem('kn_cart', JSON.stringify(cart));
        this.updateCartBadge();
    },

    updateCartQty(productId, newQty) {
        const cart = this.getCart();
        const item = cart.find(i => i.productId === productId);
        if (item) {
            if (newQty <= 0) {
                this.removeFromCart(productId);
                return;
            }
            item.qty = newQty;
            localStorage.setItem('kn_cart', JSON.stringify(cart));
            this.updateCartBadge();
        }
    },

    clearCart() {
        localStorage.removeItem('kn_cart');
        this.updateCartBadge();
    },

    getCartTotal() {
        return this.getCart().reduce((sum, item) => sum + (item.price * item.qty), 0);
    },

    getCartCount() {
        return this.getCart().reduce((sum, item) => sum + item.qty, 0);
    },

    updateCartBadge() {
        const badge = document.getElementById('navCartBadge');
        if (badge) {
            const count = this.getCartCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    // ==================== CHECKOUT (Server-side) ====================
    async checkout() {
        const cart = this.getCart();
        if (cart.length === 0) return { success: false, msg: 'ตะกร้าว่างเปล่า' };

        const items = cart.map(item => ({
            productId: item.productId,
            qty: item.qty,
            robloxUsername: item.robloxUsername
        }));

        const data = await this.post('/orders/checkout', { items });
        if (data.success) {
            this.clearCart();
            if (data.user) this.cachedUser = data.user;
        }
        return data;
    },

    // ==================== ORDERS ====================
    async getUserOrders() {
        return this.get('/orders/my-orders');
    },

    // ==================== WALLET / PAYMENT ====================
    async getBalance() {
        return this.get('/payment/balance');
    },

    async topup(amount, method, slipImage) {
        return this.post('/payment/topup', { amount, method, slipImage });
    },

    async getTransactionHistory() {
        return this.get('/payment/history');
    },

    async generatePromptPayQR(amount) {
        return this.post('/payment/promptpay-qr', { amount });
    },

    async getPoints() {
        const data = await this.getBalance();
        return data.success ? data.points : 0;
    },

    async uploadSlip(file) {
        const formData = new FormData();
        formData.append('slip', file);
        try {
            const res = await fetch(API_BASE + '/upload/slip', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + this.token },
                body: formData
            });
            return res.json();
        } catch (err) {
            return { success: false, msg: 'อัปโหลดสลิปล้มเหลว' };
        }
    },

    // ==================== ADMIN ====================
    async adminGetStats() { return this.get('/admin/stats'); },
    async adminGetUsers(params) {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.get('/admin/users' + qs);
    },
    async adminUpdatePoints(userId, amount, note) { return this.put('/admin/users/' + userId + '/points', { amount, note }); },
    async adminBanUser(userId, ban, reason) { return this.put('/admin/users/' + userId + '/ban', { ban, reason }); },
    async adminGetOrders(params) {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.get('/admin/orders' + qs);
    },
    async adminUpdateOrderStatus(orderId, status, note) { return this.put('/admin/orders/' + orderId + '/status', { status, note }); },
    async adminRefundOrder(orderId) { return this.post('/admin/orders/' + orderId + '/refund'); },

    // Categories CRUD
    async adminGetCategories() { return this.get('/categories?active=false'); },
    async adminCreateCategory(data) { return this.post('/admin/categories', data); },
    async adminUpdateCategory(id, data) { return this.put('/admin/categories/' + id, data); },
    async adminDeleteCategory(id) { return this.del('/admin/categories/' + id); },

    // Banners
    async getBanners() { return this.get('/banners'); },
    async adminGetBanners() { return this.get('/admin/banners'); },
    async adminCreateBanner(data) { return this.post('/admin/banners', data); },
    async adminUpdateBanner(id, data) { return this.put('/admin/banners/' + id, data); },
    async adminDeleteBanner(id) { return this.del('/admin/banners/' + id); },

    // Products CRUD
    async adminGetProducts() { return this.get('/admin/products'); },
    async adminCreateProduct(data) { return this.post('/admin/products', data); },
    async adminUpdateProduct(id, data) { return this.put('/admin/products/' + id, data); },
    async adminToggleProduct(id, field) { return this.put('/admin/products/' + id + '/toggle', { field }); },
    async adminDeleteProduct(id) { return this.del('/admin/products/' + id); },

    // Sales
    async adminGetSalesReport(days) { return this.get('/admin/sales-report?days=' + (days || 30)); },

    // Topup Management
    async adminGetTopups(status) { return this.get('/admin/topups' + (status ? '?status=' + status : '')); },
    async adminGetPendingTopupCount() { return this.get('/admin/topups/pending-count'); },
    async adminApproveTopup(id) { return this.put('/admin/topups/' + id + '/approve'); },
    async adminRejectTopup(id, reason) { return this.put('/admin/topups/' + id + '/reject', { reason }); },

    // User pending topups
    async getPendingTopups() { return this.get('/payment/pending-topups'); },

    // Upload
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await fetch(API_BASE + '/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + this.token },
                body: formData
            });
            return res.json();
        } catch (err) {
            return { success: false, msg: 'อัปโหลดล้มเหลว' };
        }
    },

    // ==================== UI HELPERS ====================
    escapeHTML(value) {
        const element = document.createElement('div');
        element.textContent = String(value ?? '');
        return element.innerHTML;
    },

    safeUrl(value, fallback = '') {
        if (!value) return fallback;
        try {
            const url = new URL(String(value), window.location.origin);
            if (!['http:', 'https:'].includes(url.protocol)) return fallback;
            return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
        } catch (err) {
            return fallback;
        }
    },

    showToast(msg, type = 'success') {
        const existing = document.getElementById('kn-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'kn-toast';
        toast.className = 'toast-notification ' + (type === 'error' ? 'toast-error' : type === 'info' ? 'toast-info' : 'toast-success');
        const icon = document.createElement('i');
        icon.className = `fa-solid fa-${type === 'error' ? 'exclamation-circle' : type === 'info' ? 'info-circle' : 'check-circle'}`;
        toast.append(icon, document.createTextNode(` ${String(msg)}`));
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    getStatusText(status) {
        const map = { pending: '⏳ รอดำเนินการ', processing: '🔄 กำลังดำเนินการ', completed: '✅ สำเร็จ', failed: '❌ ผิดพลาด', refunded: '↩️ คืนเงินแล้ว' };
        return map[status] || status;
    },

    getStatusClass(status) {
        const map = { pending: 'status-pending', processing: 'status-processing', completed: 'status-completed', failed: 'status-failed', refunded: 'status-refunded' };
        return map[status] || '';
    },

    // ==================== NAVBAR ====================
    async updateNavbar() {
        const authBtns = document.querySelector('.auth-buttons');
        if (!authBtns) return;

        // HTML บางหน้ามีปุ่ม Login สำรองอยู่ตั้งแต่แรก เพื่อให้ใช้งานได้แม้ JS ล้มเหลว
        // ซ่อนส่วนนั้นไว้ระหว่างตรวจ token เพื่อไม่ให้ปุ่ม Login กะพริบก่อนข้อมูลบัญชีโหลดเสร็จ
        authBtns.classList.remove('auth-ready');
        authBtns.setAttribute('aria-busy', 'true');

        try {
            if (this.isLoggedIn()) {
                const user = await this.getCurrentUser();
                if (!user) {
                    await this.logout();
                    authBtns.innerHTML = `
                        <a href="/pages/login.html" class="btn-login"><i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ</a>
                        <a href="/pages/register.html" class="btn-register-nav"><i class="fa-solid fa-user-plus"></i> สมัครสมาชิก</a>
                    `;
                    this.updateMobileMenu(null);
                    return;
                }

                const cartCount = this.getCartCount();
                authBtns.innerHTML = `
                    <span class="points-display"><i class="fa-solid fa-coins"></i> ${user.points.toLocaleString()} P</span>
                    <a href="/pages/cart.html" class="btn-cart" title="ตะกร้า" id="navCartBtn">
                        <i class="fa-solid fa-cart-shopping"></i>
                        <span class="cart-badge" id="navCartBadge" style="${cartCount > 0 ? '' : 'display:none;'}">${cartCount}</span>
                    </a>
                    <div class="user-dropdown">
                        <button class="btn-user"><i class="fa-solid fa-user"></i> ${this.escapeHTML(user.username)}</button>
                        <div class="dropdown-content">
                            <a href="/pages/profile.html"><i class="fa-solid fa-user"></i> โปรไฟล์</a>
                            <a href="/pages/wallet.html"><i class="fa-solid fa-wallet"></i> กระเป๋าเงิน</a>
                            <a href="/pages/order-history.html"><i class="fa-solid fa-clock-rotate-left"></i> ประวัติสั่งซื้อ</a>
                            ${user.role === 'admin' ? '<a href="/pages/admin.html"><i class="fa-solid fa-shield-halved"></i> แอดมิน</a>' : ''}
                            <a href="#" onclick="KNShop.logout(); window.location.href='/index.html'; return false;"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</a>
                        </div>
                    </div>
                `;
                this.updateMobileMenu(user);
            } else {
                authBtns.innerHTML = `
                    <a href="/pages/login.html" class="btn-login"><i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ</a>
                    <a href="/pages/register.html" class="btn-register-nav"><i class="fa-solid fa-user-plus"></i> สมัครสมาชิก</a>
                `;
                this.updateMobileMenu(null);
            }
        } finally {
            authBtns.removeAttribute('aria-busy');
            authBtns.classList.add('auth-ready');
        }
    },

    // ==================== MOBILE MENU ====================
    updateMobileMenu(user) {
        // Remove existing mobile menu elements
        document.querySelectorAll('.mobile-menu, .mobile-menu-overlay').forEach(el => el.remove());

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        overlay.id = 'mobileMenuOverlay';
        overlay.addEventListener('click', () => this.closeMobileMenu());

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'mobile-menu';
        menu.id = 'mobileMenu';

        let menuHTML = '';

        // User info (if logged in)
        if (user) {
            menuHTML += `
                <div class="mobile-user-info">
                    <div class="mobile-avatar">${this.escapeHTML(user.username.charAt(0).toUpperCase())}</div>
                    <div class="mobile-user-detail">
                        <div class="name">${this.escapeHTML(user.username)}</div>
                        <div class="points"><i class="fa-solid fa-coins"></i> ${user.points.toLocaleString()} Point</div>
                    </div>
                </div>
            `;
        }

        // Navigation links
        const contactAction = typeof openContactPopup === 'function'
            ? 'javascript:void(0)" onclick="openContactPopup(); KNShop.closeMobileMenu();'
            : '#contact';

        menuHTML += `
            <ul class="mobile-menu-nav">
                <li><a href="/index.html"><i class="fa-solid fa-house"></i> หน้าแรก</a></li>
                <li><a href="/pages/topup.html"><i class="fa-solid fa-coins"></i> เติมเงิน</a></li>
                <li><a href="/index.html#categories"><i class="fa-solid fa-store"></i> สินค้าและบริการต่างๆ</a></li>
                <li><a href="${contactAction}"><i class="fa-solid fa-headset"></i> ติดต่อเรา</a></li>
            </ul>
        `;

        if (user) {
            // Logged in links
            menuHTML += `
                <hr class="mobile-menu-divider">
                <ul class="mobile-menu-nav">
                    <li><a href="/pages/cart.html"><i class="fa-solid fa-cart-shopping"></i> ตะกร้าสินค้า</a></li>
                    <li><a href="/pages/profile.html"><i class="fa-solid fa-user"></i> โปรไฟล์</a></li>
                    <li><a href="/pages/wallet.html"><i class="fa-solid fa-wallet"></i> กระเป๋าเงิน</a></li>
                    <li><a href="/pages/order-history.html"><i class="fa-solid fa-clock-rotate-left"></i> ประวัติสั่งซื้อ</a></li>
                    ${user.role === 'admin' ? '<li><a href="/pages/admin.html"><i class="fa-solid fa-shield-halved"></i> แอดมิน</a></li>' : ''}
                </ul>
                <hr class="mobile-menu-divider">
                <ul class="mobile-menu-nav">
                    <li><a href="#" onclick="KNShop.logout(); window.location.href='/index.html'; return false;"><i class="fa-solid fa-right-from-bracket" style="color:#e53935;"></i> ออกจากระบบ</a></li>
                </ul>
            `;
        } else {
            // Logged out — show login/register buttons
            menuHTML += `
                <hr class="mobile-menu-divider">
                <div class="mobile-menu-auth">
                    <a href="/pages/login.html" class="mobile-btn-login"><i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ</a>
                    <a href="/pages/register.html" class="mobile-btn-register"><i class="fa-solid fa-user-plus"></i> สมัครสมาชิก</a>
                </div>
            `;
        }

        menu.innerHTML = menuHTML;

        // Close menu when clicking any link
        menu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                if (!a.getAttribute('onclick')) {
                    this.closeMobileMenu();
                }
            });
        });

        document.body.appendChild(overlay);
        document.body.appendChild(menu);

        // Setup hamburger toggle
        this.setupMobileToggle();
    },

    setupMobileToggle() {
        const toggle = document.querySelector('.mobile-menu-toggle');
        if (!toggle || toggle.dataset.mobileSetup) return;
        toggle.dataset.mobileSetup = 'true';

        toggle.addEventListener('click', () => {
            const menu = document.getElementById('mobileMenu');
            const overlay = document.getElementById('mobileMenuOverlay');
            if (!menu) return;

            const isOpen = menu.classList.contains('active');
            if (isOpen) {
                this.closeMobileMenu();
            } else {
                menu.classList.add('active');
                if (overlay) overlay.classList.add('active');
                toggle.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            }
        });
    },

    closeMobileMenu() {
        const menu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('mobileMenuOverlay');
        const toggle = document.querySelector('.mobile-menu-toggle');
        if (menu) menu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (toggle) toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }
};

// ==================== AUTO-INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    KNShop.updateNavbar();
    // Fallback: if no auth-buttons, still setup mobile toggle
    if (!document.querySelector('.auth-buttons')) {
        KNShop.updateMobileMenu(null);
    }
});
