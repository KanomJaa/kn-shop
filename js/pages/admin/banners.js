        // ==================== BANNER MANAGEMENT ====================
        function renderBanners() {
            let html = `<button class="btn-submit" onclick="openBannerModal()" style="margin-bottom:20px;"><i class="fa-solid fa-plus"></i> เพิ่ม Banner</button>`;
            html += '<div id="bannersTableArea"></div>';
            document.getElementById('panel-banners').innerHTML = html;
            filterBanners();
        }

        function filterBanners() {
            if (allBanners.length === 0) {
                document.getElementById('bannersTableArea').innerHTML = '<div class="empty-state"><h3>ยังไม่มี Banner</h3><p>เพิ่ม Banner เพื่อแสดง Popup เมื่อลูกค้าเข้าเว็บ</p></div>';
                return;
            }
            let html = `<table class="admin-table"><thead><tr><th>ลำดับ</th><th>รูปภาพ</th><th>ชื่อ</th><th>🔥 Hot</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>`;
            allBanners.forEach((b, i) => {
                const image = KNShop.safeUrl(b.image);
                html += `<tr>
                    <td>${i + 1}</td>
                    <td>${image ? `<a href="${KNShop.escapeHTML(image)}" target="_blank" rel="noopener noreferrer"><img src="${KNShop.escapeHTML(image)}" alt="${KNShop.escapeHTML(b.title || 'Banner')}" style="width:120px; height:70px; object-fit:cover; border-radius:8px;"></a>` : '<span style="color:#aaa;">ไม่มีรูป</span>'}</td>
                    <td style="font-weight:600;">${b.title ? KNShop.escapeHTML(b.title) : '<i style="color:#aaa;">ไม่มีชื่อ</i>'}</td>
                    <td>
                        <button class="admin-action-btn ${b.isHot ? 'btn-process' : ''}" onclick="toggleBannerHot('${b._id}', ${!b.isHot})" style="font-size:12px;">
                            ${b.isHot ? '🔥 เปิด' : '⬜ ปิด'}
                        </button>
                    </td>
                    <td>
                        <button class="admin-action-btn ${b.isActive ? 'btn-process' : 'btn-reject'}" onclick="toggleBannerActive('${b._id}', ${!b.isActive})" style="font-size:12px;">
                            ${b.isActive ? '✅ เปิด' : '❌ ปิด'}
                        </button>
                    </td>
                    <td style="white-space:nowrap;">
                        <button class="admin-action-btn btn-process" onclick="openBannerModal('${b._id}')">แก้ไข</button>
                        <button class="admin-action-btn btn-reject" onclick="deleteBanner('${b._id}')">ลบ</button>
                    </td></tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('bannersTableArea').innerHTML = html;
        }

        function openBannerModal(bannerId) {
            const b = bannerId ? allBanners.find(x => x._id === bannerId) : null;
            const image = KNShop.safeUrl(b?.image);
            openModal(`<h3>${b ? 'แก้ไข' : 'เพิ่ม'} Banner</h3>
                <div class="form-group"><label>ชื่อ Banner</label><input type="text" id="bTitle" value="${KNShop.escapeHTML(b?.title || '')}" placeholder="เช่น โปรโมชั่นพิเศษ"></div>
                <div class="form-group"><label>รูปภาพ *</label>
                    ${image ? `<div style="margin-bottom:8px;"><img src="${KNShop.escapeHTML(image)}" style="width:200px; border-radius:8px;"></div>` : ''}
                    <input type="file" id="bImageFile" accept="image/*" onchange="previewBannerImage(this)">
                    <div id="bImagePreview" style="margin-top:8px;"></div>
                    <input type="hidden" id="bImageUrl" value="${KNShop.escapeHTML(image)}">
                </div>
                <div class="form-group"><label>ลิงก์ (เมื่อคลิก, ไม่บังคับ)</label><input type="text" id="bLink" value="${KNShop.escapeHTML(b?.link || '')}" placeholder="https://..."></div>
                <div class="form-group"><label>🔥 Hot Badge</label><select id="bHot"><option value="true" ${b?.isHot ? 'selected' : ''}>เปิด 🔥</option><option value="false" ${!b?.isHot ? 'selected' : ''}>ปิด</option></select></div>
                <div class="form-group"><label>สถานะ</label><select id="bActive"><option value="true" ${b?.isActive !== false ? 'selected' : ''}>เปิดใช้งาน</option><option value="false" ${b?.isActive === false ? 'selected' : ''}>ปิดใช้งาน</option></select></div>
                <div class="modal-actions"><button class="btn-cancel" onclick="closeModal()">ยกเลิก</button><button class="btn-save" onclick="saveBanner('${bannerId || ''}')">${b ? 'บันทึก' : 'เพิ่ม'}</button></div>`);
        }

        function previewBannerImage(input) {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    document.getElementById('bImagePreview').innerHTML = `<img src="${e.target.result}" style="width:200px; border-radius:8px;">`;
                };
                reader.readAsDataURL(file);
            }
        }

        async function saveBanner(bannerId) {
            const fileInput = document.getElementById('bImageFile');
            let imageUrl = document.getElementById('bImageUrl').value;

            // Upload new image if selected
            if (fileInput.files.length > 0) {
                const uploadResult = await KNShop.uploadImage(fileInput.files[0]);
                if (uploadResult.success) {
                    imageUrl = uploadResult.imageUrl;
                } else {
                    KNShop.showToast('อัปโหลดรูปล้มเหลว', 'error');
                    return;
                }
            }

            if (!imageUrl) { KNShop.showToast('กรุณาเลือกรูปภาพ', 'error'); return; }

            const body = {
                title: document.getElementById('bTitle').value,
                image: imageUrl,
                link: document.getElementById('bLink').value,
                isHot: document.getElementById('bHot').value === 'true',
                isActive: document.getElementById('bActive').value === 'true'
            };

            const r = bannerId ? await KNShop.adminUpdateBanner(bannerId, body) : await KNShop.adminCreateBanner(body);
            KNShop.showToast(r.msg); closeModal();
            const bannerData = await KNShop.adminGetBanners();
            allBanners = bannerData.success ? bannerData.banners : [];
            filterBanners();
        }

        async function toggleBannerHot(id, isHot) {
            const r = await KNShop.adminUpdateBanner(id, { isHot });
            if (r.success) {
                const b = allBanners.find(x => x._id === id);
                if (b) b.isHot = isHot;
                filterBanners();
            }
            KNShop.showToast(isHot ? '🔥 เปิด Hot สำเร็จ' : 'ปิด Hot สำเร็จ');
        }

        async function toggleBannerActive(id, isActive) {
            const r = await KNShop.adminUpdateBanner(id, { isActive });
            if (r.success) {
                const b = allBanners.find(x => x._id === id);
                if (b) b.isActive = isActive;
                filterBanners();
            }
            KNShop.showToast(isActive ? '✅ เปิดใช้งาน' : '❌ ปิดใช้งาน');
        }

        async function deleteBanner(id) {
            if (!confirm('ยืนยันลบ Banner?')) return;
            const r = await KNShop.adminDeleteBanner(id);
            if (r.success) {
                allBanners = allBanners.filter(b => b._id !== id);
                filterBanners();
            }
            KNShop.showToast(r.msg, r.success ? 'success' : 'error');
        }


