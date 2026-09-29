        // ==================== USERS ====================
        let allUsers = [];
        async function renderUsers() {
            const data = await KNShop.adminGetUsers();
            allUsers = (data.success && data.users) ? data.users : [];
            let html = `<div class="search-bar">
                <input type="text" id="searchUsers" placeholder="🔍 ค้นหาชื่อ / อีเมล..." oninput="filterUsers()">
                <select id="filterUserRole" onchange="filterUsers()">
                    <option value="">สถานะทั้งหมด</option>
                    <option value="admin">🛡️ Admin</option>
                    <option value="member">👤 Member</option>
                    <option value="banned">🚫 Banned</option>
                </select>
                <span class="result-count" id="usersCount"></span>
            </div>`;
            html += '<div id="usersTableArea"></div>';
            document.getElementById('panel-users').innerHTML = html;
            filterUsers();
        }

        function filterUsers() {
            const search = (document.getElementById('searchUsers')?.value || '').toLowerCase();
            const role = document.getElementById('filterUserRole')?.value || '';
            let filtered = allUsers.filter(u => {
                if (search && !u.username.toLowerCase().includes(search) && !u.email.toLowerCase().includes(search)) return false;
                if (role === 'admin' && u.role !== 'admin') return false;
                if (role === 'member' && (u.role === 'admin' || u.isBanned)) return false;
                if (role === 'banned' && !u.isBanned) return false;
                return true;
            });
            document.getElementById('usersCount').textContent = `แสดง ${filtered.length} / ${allUsers.length} คน`;
            if (filtered.length === 0) { document.getElementById('usersTableArea').innerHTML = '<div class="empty-state"><h3>ไม่พบผู้ใช้</h3></div>'; return; }
            let html = `<table class="admin-table"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>สถานะ</th><th>Point</th><th>วันสมัคร</th><th>จัดการ</th></tr></thead><tbody>`;
            filtered.forEach(u => {
                html += `<tr>
                    <td style="font-weight:600;">${KNShop.escapeHTML(u.username)}</td><td>${KNShop.escapeHTML(u.email)}</td>
                    <td>${u.role === 'admin' ? '🛡️ Admin' : u.isBanned ? '🚫 Ban' : '👤 Member'}</td>
                    <td style="font-weight:600; color:var(--primary-color);">${u.points.toLocaleString()}</td>
                    <td>${KNShop.formatDate(u.createdAt)}</td>
                    <td style="white-space:nowrap;">
                        <button class="admin-action-btn btn-process" onclick="openPointsModal('${u._id}')">±Point</button>
                        ${u.role !== 'admin' ? `<button class="admin-action-btn ${u.isBanned ? 'btn-approve' : 'btn-reject'}" onclick="toggleBan('${u._id}', ${!u.isBanned})">${u.isBanned ? 'ปลดแบน' : 'แบน'}</button>` : ''}
                    </td></tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('usersTableArea').innerHTML = html;
        }

        function openPointsModal(userId) {
            const user = allUsers.find((item) => item._id === userId);
            if (!user) return;
            const username = KNShop.escapeHTML(user.username);
            const currentPoints = user.points;
            openModal(`<h3>±Point ให้ ${username}</h3>
                <p style="margin-bottom:15px; color:#777;">Point ปัจจุบัน: ${currentPoints.toLocaleString()}</p>
                <div class="form-group"><label>จำนวน (+ เพิ่ม, - ลด)</label><input type="number" id="ptAmount" placeholder="เช่น 100 หรือ -50"></div>
                <div class="form-group"><label>หมายเหตุ</label><input type="text" id="ptNote" placeholder="เหตุผล (ไม่บังคับ)"></div>
                <div class="modal-actions"><button class="btn-cancel" onclick="closeModal()">ยกเลิก</button><button class="btn-save" onclick="doUpdatePoints('${userId}')">ยืนยัน</button></div>`);
        }

        async function doUpdatePoints(userId) {
            const amount = parseInt(document.getElementById('ptAmount').value);
            const note = document.getElementById('ptNote').value;
            if (!amount) { KNShop.showToast('กรอกจำนวน', 'error'); return; }
            const r = await KNShop.adminUpdatePoints(userId, amount, note);
            KNShop.showToast(r.msg); closeModal(); await renderUsers(); await renderStats();
        }

        async function toggleBan(userId, ban) {
            if (ban && !confirm('ยืนยันแบนผู้ใช้นี้?')) return;
            const r = await KNShop.adminBanUser(userId, ban, ban ? prompt('เหตุผลที่แบน:') || 'ละเมิดกฎ' : '');
            KNShop.showToast(r.msg); await renderUsers();
        }

