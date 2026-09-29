let allCategories = [];
        let allBanners = [];

        document.addEventListener('DOMContentLoaded', async () => {
            const user = await KNShop.getCurrentUser();
            if (!user || user.role !== 'admin') { alert('ไม่มีสิทธิ์เข้าถึง'); window.location.href='/index.html'; return; }
            await loadAll();
        });

        async function loadAll() {
            await renderStats();
            await updatePendingBadge();
            const catData = await KNShop.adminGetCategories();
            allCategories = catData.success ? catData.categories : [];
            const bannerData = await KNShop.adminGetBanners();
            allBanners = bannerData.success ? bannerData.banners : [];
            await renderOrders();
            await renderTopups();
            await renderUsers();
            await renderProducts();
            renderCategories();
            renderBanners();
            await renderSales();
        }

        async function updatePendingBadge() {
            const data = await KNShop.adminGetPendingTopupCount();
            const badge = document.getElementById('pendingTopupBadge');
            if (data.success && data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }

        function switchTab(tab, el) {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            el.classList.add('active');
            document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
            document.getElementById('panel-' + tab).style.display = 'block';
        }

        function openModal(html) { document.getElementById('modalContent').innerHTML = html; document.getElementById('modal').classList.add('active'); }
        function closeModal() { document.getElementById('modal').classList.remove('active'); }
        document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

        // ==================== STATS ====================
        async function renderStats() {
            const data = await KNShop.adminGetStats();
            if (!data.success) return;
            const s = data.stats;
            document.getElementById('adminStats').innerHTML = `
                <div class="admin-stat-card"><div class="admin-stat-icon blue"><i class="fa-solid fa-users"></i></div><div class="admin-stat-info"><h4>สมาชิก</h4><p>${s.totalUsers}</p></div></div>
                <div class="admin-stat-card"><div class="admin-stat-icon green"><i class="fa-solid fa-coins"></i></div><div class="admin-stat-info"><h4>รายได้รวม</h4><p>${s.totalRevenue.toLocaleString()} P</p></div></div>
                <div class="admin-stat-card"><div class="admin-stat-icon orange"><i class="fa-solid fa-box"></i></div><div class="admin-stat-info"><h4>ออเดอร์ทั้งหมด</h4><p>${s.totalOrders}</p></div></div>
                <div class="admin-stat-card"><div class="admin-stat-icon purple"><i class="fa-solid fa-clock"></i></div><div class="admin-stat-info"><h4>รอดำเนินการ</h4><p>${s.pendingOrders}</p></div></div>
            `;
        }

