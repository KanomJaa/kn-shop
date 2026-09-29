async function renderCart() {
            const container = document.getElementById('cartContent');
            if (!KNShop.isLoggedIn()) {
                container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-right-to-bracket"></i><h3>กรุณาเข้าสู่ระบบ</h3><p><a href="/pages/login.html" style="color:var(--primary-color);">เข้าสู่ระบบ</a> เพื่อดูตะกร้าสินค้า</p></div>';
                return;
            }
            const cart = KNShop.getCart();
            if (cart.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-cart-shopping"></i><h3>ตะกร้าว่างเปล่า</h3><p><a href="/index.html#categories" style="color:var(--primary-color);">เลือกดูสินค้า</a></p></div>';
                return;
            }

            // Auto-fill missing Roblox usernames from profile
            const user = await KNShop.getCurrentUser();
            if (user && user.robloxUsername) {
                let updated = false;
                cart.forEach(item => {
                    if (!item.robloxUsername) {
                        item.robloxUsername = user.robloxUsername;
                        updated = true;
                    }
                });
                if (updated) {
                    localStorage.setItem('kn_cart', JSON.stringify(cart));
                }
            }

            const balData = await KNShop.getBalance();
            const userPoints = balData.success ? balData.points : 0;
            const total = KNShop.getCartTotal();
            const hasEnough = userPoints >= total;
            const hasAllUsernames = cart.every(item => item.robloxUsername && item.robloxUsername.trim());

            let html = '';
            cart.forEach(item => {
                const subtotal = item.price * item.qty;
                const noUsername = !item.robloxUsername || !item.robloxUsername.trim();
                const productId = KNShop.escapeHTML(item.productId);
                const title = KNShop.escapeHTML(item.title);
                const label = KNShop.escapeHTML(item.imgLabel || item.title);
                const robloxUsername = KNShop.escapeHTML(item.robloxUsername || '');
                html += `
                    <div class="cart-item">
                        <div class="cart-item-img">${label}</div>
                        <div class="cart-item-info">
                            <h4>${title}</h4>
                            <p style="${noUsername ? 'color:#c62828; font-weight:600;' : ''}">${item.robloxUsername ? '<i class="fa-solid fa-user"></i> ' + robloxUsername : '<i class="fa-solid fa-exclamation-triangle"></i> ยังไม่ระบุ Username'}</p>
                        </div>
                        <div class="cart-qty">
                            <button data-cart-action="decrease" data-product-id="${productId}">-</button>
                            <span>${item.qty}</span>
                            <button data-cart-action="increase" data-product-id="${productId}">+</button>
                        </div>
                        <div class="cart-item-price">${subtotal.toLocaleString()} P</div>
                        <button class="cart-remove" data-cart-action="remove" data-product-id="${productId}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            });

            html += `
                <div class="cart-summary">
                    <div class="cart-summary-row"><span>จำนวนรายการ</span><span>${cart.length} รายการ</span></div>
                    <div class="cart-summary-row"><span>Point ของคุณ</span><span style="color:${hasEnough ? '#2e7d32' : '#c62828'}">${userPoints.toLocaleString()} P</span></div>
                    <div class="cart-summary-row total"><span>รวมทั้งหมด</span><span>${total.toLocaleString()} Point</span></div>
                    ${!hasEnough ? '<p style="color:#c62828; text-align:center; margin-top:10px; font-size:14px;">Point ไม่เพียงพอ <a href="/pages/wallet.html" style="color:#0288d1;">เติม Point</a></p>' : ''}
                    ${!hasAllUsernames ? '<p style="color:#c62828; text-align:center; margin-top:10px; font-size:14px;"><i class="fa-solid fa-exclamation-triangle"></i> กรุณาตั้ง <a href="/pages/profile.html" style="color:#c62828; font-weight:700;">Username Roblox ในโปรไฟล์</a> ก่อนสั่งซื้อ</p>' : ''}
                    <button class="btn-checkout" onclick="doCheckout()" ${!hasEnough || !hasAllUsernames ? 'disabled' : ''}><i class="fa-solid fa-credit-card"></i> ชำระเงินด้วย Point</button>
                </div>
            `;
            container.innerHTML = html;
            container.querySelectorAll('[data-cart-action]').forEach((button) => {
                button.addEventListener('click', () => {
                    const productId = button.dataset.productId;
                    if (button.dataset.cartAction === 'remove') {
                        removeItem(productId);
                    } else {
                        changeQty(productId, button.dataset.cartAction === 'increase' ? 1 : -1);
                    }
                });
            });
        }

        function changeQty(pid, delta) {
            const cart = KNShop.getCart();
            const item = cart.find(i => i.productId === pid);
            if (item) { KNShop.updateCartQty(pid, item.qty + delta); renderCart(); }
        }
        function removeItem(pid) { KNShop.removeFromCart(pid); renderCart(); KNShop.showToast('ลบสินค้าออกแล้ว', 'info'); }

        async function doCheckout() {
            // Final validation
            const cart = KNShop.getCart();
            const hasAllUsernames = cart.every(item => item.robloxUsername && item.robloxUsername.trim());
            if (!hasAllUsernames) {
                KNShop.showToast('กรุณาตั้ง Username Roblox ในโปรไฟล์ก่อนสั่งซื้อ', 'error');
                return;
            }

            if (!confirm('ยืนยันการสั่งซื้อ?')) return;
            const btn = document.querySelector('.btn-checkout');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสั่งซื้อ...';
            const result = await KNShop.checkout();
            if (result.success) {
                KNShop.showToast(result.msg);
                setTimeout(() => window.location.href='/pages/order-history.html', 1500);
            } else {
                KNShop.showToast(result.msg, 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-credit-card"></i> ชำระเงินด้วย Point';
            }
        }

        document.addEventListener('DOMContentLoaded', renderCart);
