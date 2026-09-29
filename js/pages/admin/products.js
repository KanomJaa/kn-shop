        // ==================== PRODUCTS ====================
        let allProductsAdmin = [];
        async function renderProducts() {
            const data = await KNShop.adminGetProducts();
            allProductsAdmin = (data.success && data.products) ? data.products : [];
            let html = `<button class="btn-submit" onclick="openProductModal()" style="margin-bottom:20px;"><i class="fa-solid fa-plus"></i> เพิ่มสินค้า</button>`;
            html += `<div class="search-bar">
                <input type="text" id="searchProducts" placeholder="🔍 ค้นหาชื่อสินค้า..." oninput="filterProducts()">
                <select id="filterProductCat" onchange="filterProducts()">
                    <option value="">หมวดทั้งหมด</option>
                    ${allCategories.map(c => `<option value="${KNShop.escapeHTML(c.slug)}">${KNShop.escapeHTML(c.name)}</option>`).join('')}
                </select>
                <span class="result-count" id="productsCount"></span>
            </div>`;
            html += '<div id="productsTableArea"></div>';
            document.getElementById('panel-products').innerHTML = html;
            filterProducts();
        }

        function filterProducts() {
            const search = (document.getElementById('searchProducts')?.value || '').toLowerCase();
            const cat = document.getElementById('filterProductCat')?.value || '';
            let filtered = allProductsAdmin.filter(p => {
                if (search && !p.title.toLowerCase().includes(search)) return false;
                if (cat && p.categorySlug !== cat) return false;
                return true;
            });
            document.getElementById('productsCount').textContent = `แสดง ${filtered.length} / ${allProductsAdmin.length} รายการ`;
            if (filtered.length === 0) { document.getElementById('productsTableArea').innerHTML = '<div class="empty-state"><h3>ไม่พบสินค้า</h3></div>'; return; }
            let html = `<table class="admin-table"><thead><tr><th>รูป</th><th>ชื่อ</th><th>หมวด</th><th>ราคา</th><th>ขายแล้ว</th><th>สต็อก</th><th>🔥 Hot</th><th>เปิดขาย</th><th>จัดการ</th></tr></thead><tbody>`;
            filtered.forEach(p => {
                const image = KNShop.safeUrl(p.image);
                html += `<tr>
                    <td>${image ? `<img src="${KNShop.escapeHTML(image)}" class="img-preview">` : `<div style="width:50px;height:50px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;">${KNShop.escapeHTML(p.imgLabel || '—')}</div>`}</td>
                    <td style="font-weight:600;">${KNShop.escapeHTML(p.title)}</td>
                    <td>${KNShop.escapeHTML(p.category?.name || p.categorySlug)}</td>
                    <td style="font-weight:600; color:var(--primary-color);">${p.price.toLocaleString()} P</td>
                    <td style="font-weight:600; color:#2e7d32;">${(p.soldCount || 0).toLocaleString()}</td>
                    <td><label class="switch"><input type="checkbox" ${p.inStock ? 'checked' : ''} onchange="toggleField('${p._id}','inStock')"><span class="slider"></span></label><div style="font-size:11px;color:#777;margin-top:2px;">${p.stockQty === -1 ? '∞' : (p.stockQty || 0)}</div></td>
                    <td><label class="switch"><input type="checkbox" ${p.isHot ? 'checked' : ''} onchange="toggleField('${p._id}','isHot')"><span class="slider"></span></label></td>
                    <td><label class="switch"><input type="checkbox" ${p.isActive ? 'checked' : ''} onchange="toggleField('${p._id}','isActive')"><span class="slider"></span></label></td>
                    <td style="white-space:nowrap;">
                        <button class="admin-action-btn btn-process" onclick="openProductModal('${p._id}')">แก้ไข</button>
                        <button class="admin-action-btn btn-reject" onclick="deleteProduct('${p._id}')">ลบ</button>
                    </td></tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('productsTableArea').innerHTML = html;
        }

        function openProductModal(productId) {
            const catOptions = allCategories.map(c => `<option value="${c._id}" data-slug="${KNShop.escapeHTML(c.slug)}">${KNShop.escapeHTML(c.name)}</option>`).join('');
            openModal(`<h3>${productId ? 'แก้ไข' : 'เพิ่ม'}สินค้า</h3>
                <div class="form-group"><label>ชื่อสินค้า *</label><input type="text" id="pTitle" required></div>
                <div class="form-group"><label>ราคา (Point) *</label><input type="number" id="pPrice" min="0" required></div>
                <div class="form-group"><label>หมวดหมู่ *</label><select id="pCat">${catOptions}</select></div>
                <div class="form-group"><label>รายละเอียด</label><textarea id="pDesc" placeholder="ใช้ • คั่นรายการ"></textarea></div>
                <div class="form-group"><label>ป้ายรูป (Placeholder)</label><input type="text" id="pImgLabel" placeholder="ข้อความบน placeholder"></div>
                <div class="form-group"><label>อัปโหลดรูปสินค้า</label><input type="file" id="pImageFile" accept="image/*"><div id="pImagePreview" style="margin-top:8px;"></div></div>
                <input type="hidden" id="pImageUrl">
                <div class="form-group"><label>จำนวนสต็อก (-1 = ไม่จำกัด)</label><input type="number" id="pStock" value="-1"></div>
                <div class="form-group" style="display:flex;align-items:center;gap:12px;"><label style="margin:0;">🔥 สินค้ายอดฮิต (Hot)</label><label class="switch"><input type="checkbox" id="pIsHot"><span class="slider"></span></label></div>
                <div class="modal-actions"><button class="btn-cancel" onclick="closeModal()">ยกเลิก</button><button class="btn-save" onclick="saveProduct('${productId || ''}')">${productId ? 'บันทึก' : 'เพิ่มสินค้า'}</button></div>`);

            // Image upload handler
            document.getElementById('pImageFile').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const preview = document.getElementById('pImagePreview');
                preview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด...';
                const result = await KNShop.uploadImage(file);
                if (result.success) {
                    document.getElementById('pImageUrl').value = result.imageUrl;
                    const image = KNShop.safeUrl(result.imageUrl);
                    preview.innerHTML = image ? `<img src="${KNShop.escapeHTML(image)}" class="img-preview"> ✅ อัปโหลดสำเร็จ` : '❌ URL รูปภาพไม่ถูกต้อง';
                } else {
                    preview.textContent = '❌ ' + result.msg;
                }
            });

            // If editing, load existing data
            if (productId) loadProductData(productId);
        }

        async function loadProductData(id) {
            const data = await KNShop.getProduct(id);
            if (!data.success) return;
            const p = data.product;
            document.getElementById('pTitle').value = p.title;
            document.getElementById('pPrice').value = p.price;
            document.getElementById('pCat').value = p.category?._id || '';
            document.getElementById('pDesc').value = p.description;
            document.getElementById('pImgLabel').value = p.imgLabel || '';
            document.getElementById('pImageUrl').value = p.image || '';
            document.getElementById('pStock').value = p.stockQty;
            if (p.isHot) document.getElementById('pIsHot').checked = true;
            const image = KNShop.safeUrl(p.image);
            if (image) document.getElementById('pImagePreview').innerHTML = `<img src="${KNShop.escapeHTML(image)}" class="img-preview">`;
        }

        async function saveProduct(productId) {
            const catSelect = document.getElementById('pCat');
            const selectedOption = catSelect.options[catSelect.selectedIndex];
            const body = {
                title: document.getElementById('pTitle').value,
                price: parseFloat(document.getElementById('pPrice').value),
                categoryId: catSelect.value,
                categorySlug: selectedOption.dataset.slug,
                description: document.getElementById('pDesc').value,
                imgLabel: document.getElementById('pImgLabel').value,
                image: document.getElementById('pImageUrl').value,
                stockQty: parseInt(document.getElementById('pStock').value),
                isHot: document.getElementById('pIsHot').checked
            };
            if (!body.title || !Number.isFinite(body.price)) { KNShop.showToast('กรอกข้อมูลที่จำเป็น', 'error'); return; }

            const r = productId ? await KNShop.adminUpdateProduct(productId, body) : await KNShop.adminCreateProduct(body);
            KNShop.showToast(r.msg); closeModal(); await renderProducts(); await renderStats();
        }

        async function toggleField(id, field) {
            await KNShop.adminToggleProduct(id, field);
        }

        async function deleteProduct(id) {
            if (!confirm('ยืนยันลบสินค้านี้?')) return;
            const r = await KNShop.adminDeleteProduct(id);
            KNShop.showToast(r.msg); await renderProducts();
        }

