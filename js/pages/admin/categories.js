        // ==================== CATEGORIES ====================
        function renderCategories() {
            let html = `<button class="btn-submit" onclick="openCategoryModal()" style="margin-bottom:20px;"><i class="fa-solid fa-plus"></i> เพิ่มหมวดหมู่</button>`;
            html += `<div class="search-bar">
                <input type="text" id="searchCategories" placeholder="🔍 ค้นหาหมวดหมู่..." oninput="filterCategories()">
                <span class="result-count" id="categoriesCount"></span>
            </div>`;
            html += '<div id="categoriesTableArea"></div>';
            document.getElementById('panel-categories').innerHTML = html;
            filterCategories();
        }

        function filterCategories() {
            const search = (document.getElementById('searchCategories')?.value || '').toLowerCase();
            let filtered = allCategories.filter(c => {
                if (search && !c.name.toLowerCase().includes(search) && !c.slug.toLowerCase().includes(search)) return false;
                return true;
            });
            document.getElementById('categoriesCount').textContent = `แสดง ${filtered.length} / ${allCategories.length} หมวด`;
            if (filtered.length === 0) { document.getElementById('categoriesTableArea').innerHTML = '<div class="empty-state"><h3>ไม่พบหมวดหมู่</h3></div>'; return; }
            let html = `<table class="admin-table"><thead><tr><th>รูปภาพ</th><th>ชื่อ</th><th>Slug</th><th>🔥 Hot</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>`;
            filtered.forEach(c => {
                const imgSrc = KNShop.safeUrl(c.image);
                const imgHtml = imgSrc
                    ? `<img src="${KNShop.escapeHTML(imgSrc)}" style="width:60px; height:40px; object-fit:cover; border-radius:6px;">`
                    : `<div style="width:60px; height:40px; background:#e3f2fd; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#0288d1;">ไม่มีรูป</div>`;
                html += `<tr>
                    <td>${imgHtml}</td>
                    <td style="font-weight:600;">${KNShop.escapeHTML(c.name)}</td><td>${KNShop.escapeHTML(c.slug)}</td>
                    <td>
                        <button class="admin-action-btn ${c.isHot ? 'btn-process' : ''}" onclick="toggleCategoryHot('${c._id}', ${!c.isHot})" style="font-size:12px;">
                            ${c.isHot ? '🔥 เปิด' : '⬜ ปิด'}
                        </button>
                    </td>
                    <td>${c.isActive ? '✅ เปิด' : '❌ ปิด'}</td>
                    <td style="white-space:nowrap;">
                        <button class="admin-action-btn btn-process" onclick="openCategoryModal('${c._id}')">แก้ไข</button>
                        <button class="admin-action-btn btn-reject" onclick="deleteCategory('${c._id}')">ลบ</button>
                    </td></tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('categoriesTableArea').innerHTML = html;
        }

        async function toggleCategoryHot(catId, isHot) {
            const r = await KNShop.adminUpdateCategory(catId, { isHot });
            if (r.success) {
                const cat = allCategories.find(c => c._id === catId);
                if (cat) cat.isHot = isHot;
                filterCategories();
            }
            KNShop.showToast(isHot ? '🔥 เปิด Hot สำเร็จ' : 'ปิด Hot สำเร็จ');
        }

        function previewCategoryImage(input) {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    document.getElementById('cImagePreview').innerHTML = `<img src="${e.target.result}" style="width:200px; border-radius:8px;">`;
                };
                reader.readAsDataURL(file);
            }
        }

        function openCategoryModal(catId) {
            const cat = catId ? allCategories.find(c => c._id === catId) : null;
            const image = KNShop.safeUrl(cat?.image);
            openModal(`<h3>${cat ? 'แก้ไข' : 'เพิ่ม'}หมวดหมู่</h3>
                <div class="form-group"><label>ชื่อ *</label><input type="text" id="cName" value="${KNShop.escapeHTML(cat?.name || '')}"></div>
                <div class="form-group"><label>Slug * (ภาษาอังกฤษ ไม่เว้นวรรค)</label><input type="text" id="cSlug" value="${KNShop.escapeHTML(cat?.slug || '')}" ${cat ? 'disabled style="background:#f5f5f5;"' : ''}></div>
                <div class="form-group"><label>คำอธิบาย</label><input type="text" id="cDesc" value="${KNShop.escapeHTML(cat?.description || '')}"></div>
                <div class="form-group"><label>รูปภาพหมวดหมู่</label>
                    ${image ? `<div style="margin-bottom:8px;"><img src="${KNShop.escapeHTML(image)}" style="width:200px; border-radius:8px;"></div>` : ''}
                    <input type="file" id="cImageFile" accept="image/*" onchange="previewCategoryImage(this)">
                    <div id="cImagePreview" style="margin-top:8px;"></div>
                    <input type="hidden" id="cImageUrl" value="${KNShop.escapeHTML(image)}">
                </div>
                <div class="form-group"><label>🔥 Hot Badge</label><select id="cHot"><option value="true" ${cat?.isHot ? 'selected' : ''}>เปิด 🔥</option><option value="false" ${!cat?.isHot ? 'selected' : ''}>ปิด</option></select></div>
                <div class="form-group"><label>เปิดใช้งาน</label><select id="cActive"><option value="true" ${cat?.isActive !== false ? 'selected' : ''}>เปิด</option><option value="false" ${cat?.isActive === false ? 'selected' : ''}>ปิด</option></select></div>
                <div class="modal-actions"><button class="btn-cancel" onclick="closeModal()">ยกเลิก</button><button class="btn-save" onclick="saveCategory('${catId || ''}')">${cat ? 'บันทึก' : 'เพิ่ม'}</button></div>`);
        }

        async function saveCategory(catId) {
            // Upload image if selected
            const fileInput = document.getElementById('cImageFile');
            let imageUrl = document.getElementById('cImageUrl').value;

            if (fileInput && fileInput.files.length > 0) {
                const uploadResult = await KNShop.uploadImage(fileInput.files[0]);
                if (uploadResult.success) {
                    imageUrl = uploadResult.imageUrl;
                } else {
                    KNShop.showToast('อัปโหลดรูปล้มเหลว', 'error');
                    return;
                }
            }

            const body = {
                name: document.getElementById('cName').value,
                slug: document.getElementById('cSlug').value,
                description: document.getElementById('cDesc').value,
                image: imageUrl,
                isHot: document.getElementById('cHot').value === 'true',
                isActive: document.getElementById('cActive').value === 'true'
            };
            if (!body.name || !body.slug) { KNShop.showToast('กรอกชื่อและ slug', 'error'); return; }
            const r = catId ? await KNShop.adminUpdateCategory(catId, body) : await KNShop.adminCreateCategory(body);
            KNShop.showToast(r.msg); closeModal();
            const catData = await KNShop.adminGetCategories();
            allCategories = catData.success ? catData.categories : [];
            renderCategories();
        }

        async function deleteCategory(id) {
            if (!confirm('ยืนยันลบหมวดหมู่? (ต้องลบสินค้าในหมวดหมู่ก่อน)')) return;
            const r = await KNShop.adminDeleteCategory(id);
            if (r.success) {
                allCategories = allCategories.filter(c => c._id !== id);
                renderCategories();
            }
            KNShop.showToast(r.msg, r.success ? 'success' : 'error');
        }

