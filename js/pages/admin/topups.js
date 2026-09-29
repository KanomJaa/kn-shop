        // ==================== TOPUP MANAGEMENT ====================
        let allTopups = [];
        async function renderTopups() {
            const data = await KNShop.adminGetTopups();
            allTopups = (data.success && data.topups) ? data.topups : [];
            let html = `<div class="search-bar">
                <input type="text" id="searchTopups" placeholder="🔍 ค้นหาชื่อผู้ใช้ / อีเมล..." oninput="filterTopups()">
                <select id="filterTopupStatus" onchange="filterTopups()">
                    <option value="">สถานะทั้งหมด</option>
                    <option value="pending" selected>⏳ รอตรวจสอบ</option>
                    <option value="success">✅ อนุมัติแล้ว</option>
                    <option value="failed">❌ ปฏิเสธ</option>
                </select>
                <span class="result-count" id="topupsCount"></span>
            </div>`;
            html += '<div id="topupsTableArea"></div>';
            document.getElementById('panel-topups').innerHTML = html;
            filterTopups();
        }

        function filterTopups() {
            const search = (document.getElementById('searchTopups')?.value || '').toLowerCase();
            const status = document.getElementById('filterTopupStatus')?.value || '';
            let filtered = allTopups.filter(t => {
                const username = t.user?.username || '';
                const email = t.user?.email || '';
                if (search && !username.toLowerCase().includes(search) && !email.toLowerCase().includes(search)) return false;
                if (status && t.status !== status) return false;
                return true;
            });
            document.getElementById('topupsCount').textContent = `แสดง ${filtered.length} / ${allTopups.length} รายการ`;
            if (filtered.length === 0) {
                document.getElementById('topupsTableArea').innerHTML = '<div class="empty-state"><h3>ไม่พบรายการเติมเงิน</h3></div>';
                return;
            }
            const statusMap = {
                pending: '<span style="color:#e65100; font-weight:600;">⏳ รอตรวจสอบ</span>',
                success: '<span style="color:#2e7d32; font-weight:600;">✅ อนุมัติ</span>',
                failed: '<span style="color:#c62828; font-weight:600;">❌ ปฏิเสธ</span>'
            };
            let html = `<table class="admin-table"><thead><tr><th>ผู้ใช้</th><th>จำนวน</th><th>สลิป</th><th>วิธี</th><th>สถานะ</th><th>วันที่</th><th>หมายเหตุ</th><th>จัดการ</th></tr></thead><tbody>`;
            filtered.forEach(t => {
                const slip = KNShop.safeUrl(t.slipImage);
                const slipHtml = slip
                    ? `<a href="${KNShop.escapeHTML(slip)}" target="_blank" rel="noopener noreferrer" title="คลิกเพื่อดูสลิปเต็ม"><img src="${KNShop.escapeHTML(slip)}" style="width:50px; height:65px; object-fit:cover; border-radius:6px; border:1px solid #ddd; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.5)'" onmouseout="this.style.transform='scale(1)'"></a>`
                    : '<span style="color:#999; font-size:12px;">ไม่มี</span>';
                html += `<tr style="${t.status === 'pending' ? 'background:#fffde7;' : ''}">
                    <td><div style="font-weight:600;">${KNShop.escapeHTML(t.user?.username || 'N/A')}</div><div style="font-size:11px; color:#999;">${KNShop.escapeHTML(t.user?.email || '')}</div></td>
                    <td style="font-weight:700; color:var(--primary-color); font-size:16px;">${t.amount.toLocaleString()} P</td>
                    <td>${slipHtml}</td>
                    <td>${t.method === 'bank' ? '🏦 โอนธนาคาร' : KNShop.escapeHTML(t.method)}</td>
                    <td>${statusMap[t.status] || KNShop.escapeHTML(t.status)}</td>
                    <td style="font-size:13px;">${KNShop.formatDate(t.createdAt)}</td>
                    <td style="font-size:12px; max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${KNShop.escapeHTML(t.note || '')}">${KNShop.escapeHTML(t.note || '-')}</td>
                    <td style="white-space:nowrap;">
                        ${t.status === 'pending' ? `
                            <button class="admin-action-btn btn-approve" onclick="approveTopup('${t._id}')">✅ อนุมัติ</button>
                            <button class="admin-action-btn btn-reject" onclick="rejectTopup('${t._id}')">❌ ปฏิเสธ</button>
                        ` : ''}
                    </td>
                </tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('topupsTableArea').innerHTML = html;
        }

        async function approveTopup(id) {
            const topup = allTopups.find((item) => item._id === id);
            if (!topup) return;
            const username = topup.user?.username || 'N/A';
            const amount = topup.amount;
            if (!confirm(`ยืนยันอนุมัติ ${amount.toLocaleString()} Point ให้ ${username}?`)) return;
            const r = await KNShop.adminApproveTopup(id);
            KNShop.showToast(r.msg, r.success ? 'success' : 'error');
            await renderTopups();
            await renderStats();
            await updatePendingBadge();
        }

        async function rejectTopup(id) {
            const topup = allTopups.find((item) => item._id === id);
            if (!topup) return;
            const username = topup.user?.username || 'N/A';
            const amount = topup.amount;
            const reason = prompt(`ปฏิเสธ ${amount.toLocaleString()} Point ของ ${username}\n\nเหตุผล:`, 'ไม่พบหลักฐานการโอน');
            if (reason === null) return; // cancelled
            const r = await KNShop.adminRejectTopup(id, reason);
            KNShop.showToast(r.msg, r.success ? 'success' : 'error');
            await renderTopups();
            await updatePendingBadge();
        }

