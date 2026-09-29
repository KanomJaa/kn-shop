document.addEventListener('DOMContentLoaded', async () => {
            if (!KNShop.isLoggedIn()) { window.location.href='/pages/login.html'; return; }
            const data = await KNShop.getUserOrders();
            const container = document.getElementById('ordersContent');
            if (!data.success || !data.orders || data.orders.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-box-open"></i><h3>ยังไม่มีคำสั่งซื้อ</h3></div>';
                return;
            }
            container.innerHTML = data.orders.map(order => {
                const itemsHtml = order.items.map(item =>
                    `<div class="order-item-row"><span>${KNShop.escapeHTML(item.title)} x${item.qty} ${item.robloxUsername ? '(Roblox: ' + KNShop.escapeHTML(item.robloxUsername) + ')' : ''}</span><span style="font-weight:600;">${(item.price * item.qty).toLocaleString()} P</span></div>`
                ).join('');
                return `<div class="order-card">
                    <div class="order-header"><div><span class="order-id">${KNShop.escapeHTML(order.orderId)}</span><span class="order-date" style="margin-left:15px;">${KNShop.formatDate(order.createdAt)}</span></div>
                    <span class="order-status ${KNShop.getStatusClass(order.status)}">${KNShop.getStatusText(order.status)}</span></div>
                    <div class="order-items">${itemsHtml}</div>
                    <div class="order-footer"><span class="order-queue">คิวที่ #${order.queueNumber}</span><span class="order-total">${order.totalPoints.toLocaleString()} Point</span></div>
                </div>`;
            }).join('');
        });
