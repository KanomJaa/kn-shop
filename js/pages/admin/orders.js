        // ==================== ORDERS ====================
        let allOrders = [];
        async function renderOrders() {
            const data = await KNShop.adminGetOrders();
            allOrders = (data.success && data.orders) ? data.orders : [];
            let html = `<div class="search-bar">
                <input type="text" id="searchOrders" placeholder="🔍 ค้นหา Order ID / ชื่อผู้ซื้อ..." oninput="filterOrders()">
                <select id="filterOrderStatus" onchange="filterOrders()">
                    <option value="">สถานะทั้งหมด</option>
                    <option value="pending">⏳ รอดำเนินการ</option>
                    <option value="processing">🔄 กำลังดำเนินการ</option>
                    <option value="completed">✅ สำเร็จ</option>
                    <option value="failed">❌ ผิดพลาด</option>
                    <option value="refunded">↩️ คืนเงินแล้ว</option>
                </select>
                <span class="result-count" id="ordersCount"></span>
            </div>`;
            html += '<div id="ordersTableArea"></div>';
            document.getElementById('panel-orders').innerHTML = html;
            filterOrders();
        }

        function filterOrders() {
            const search = (document.getElementById('searchOrders')?.value || '').toLowerCase();
            const status = document.getElementById('filterOrderStatus')?.value || '';
            let filtered = allOrders.filter(o => {
                if (search && !o.orderId.toLowerCase().includes(search) && !o.username.toLowerCase().includes(search)) return false;
                if (status && o.status !== status) return false;
                return true;
            });
            document.getElementById('ordersCount').textContent = `แสดง ${filtered.length} / ${allOrders.length} รายการ`;
            if (filtered.length === 0) { document.getElementById('ordersTableArea').innerHTML = '<div class="empty-state"><h3>ไม่พบออเดอร์</h3></div>'; return; }
            let html = `<table class="admin-table"><thead><tr><th>Order</th><th>ผู้ซื้อ</th><th>รายการ</th><th>รวม</th><th>สถานะ</th><th>คิว</th><th>จัดการ</th></tr></thead><tbody>`;
            filtered.forEach(o => {
                const items = KNShop.escapeHTML(o.items.map(i => i.title).join(', '));
                const orderId = KNShop.escapeHTML(o.orderId);
                html += `<tr>
                    <td style="font-weight:600;">${orderId}</td><td>${KNShop.escapeHTML(o.username)}</td>
                    <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${items}">${items}</td>
                    <td style="font-weight:600;">${o.totalPoints.toLocaleString()} P</td>
                    <td><span class="order-status ${KNShop.getStatusClass(o.status)}">${KNShop.getStatusText(o.status)}</span></td>
                    <td>#${o.queueNumber}</td>
                    <td style="white-space:nowrap;">
                        ${o.status === 'pending' ? `<button class="admin-action-btn btn-process" onclick="setOrderStatus('${o.orderId}','processing')">ดำเนินการ</button>` : ''}
                        ${o.status === 'processing' ? `<button class="admin-action-btn btn-approve" onclick="setOrderStatus('${o.orderId}','completed')">สำเร็จ</button><button class="admin-action-btn btn-reject" onclick="setOrderStatus('${o.orderId}','failed')">ผิดพลาด</button>` : ''}
                        ${o.status === 'failed' && !o.refunded ? `<button class="admin-action-btn btn-refund-admin" onclick="refundOrder('${o.orderId}')">คืน Point</button>` : ''}
                    </td></tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('ordersTableArea').innerHTML = html;
        }

        async function setOrderStatus(orderId, status) {
            const r = await KNShop.adminUpdateOrderStatus(orderId, status);
            KNShop.showToast(r.msg); await renderOrders(); await renderStats();
        }
        async function refundOrder(orderId) {
            if (!confirm('ยืนยันคืน Point?')) return;
            const r = await KNShop.adminRefundOrder(orderId);
            KNShop.showToast(r.msg); await renderOrders(); await renderStats();
        }

