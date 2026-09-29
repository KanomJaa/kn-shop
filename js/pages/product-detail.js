const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        let currentProduct = null;

        document.addEventListener('DOMContentLoaded', async () => {
            if (!productId) { showNotFound(); return; }

            const data = await KNShop.getProduct(productId);
            if (!data.success || !data.product) { showNotFound(); return; }

            currentProduct = data.product;
            document.getElementById('p-title').textContent = currentProduct.title;
            document.getElementById('p-price').textContent = currentProduct.price.toLocaleString() + ' P';
            document.title = currentProduct.title + ' - KN Shop';

            // Image
            if (currentProduct.image) {
                const imageUrl = KNShop.safeUrl(currentProduct.image);
                if (imageUrl) {
                    const image = document.createElement('img');
                    image.src = imageUrl;
                    image.alt = currentProduct.title;
                    image.style.cssText = 'max-width:100%; border-radius:12px;';
                    document.getElementById('p-img-container').replaceChildren(image);
                }
            } else {
                document.getElementById('p-img').textContent = currentProduct.imgLabel || currentProduct.title;
            }

            // Description
            const descList = document.getElementById('p-desc');
            if (currentProduct.description) {
                const items = currentProduct.description.split('•').map(s => s.trim()).filter(Boolean);
                descList.replaceChildren(...items.map((item) => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    return li;
                }));
            }

            // Stock status
            if (!currentProduct.inStock || !currentProduct.isActive) {
                document.getElementById('stock-status').innerHTML = '<p style="color:#c62828; font-weight:600; margin:10px 0;"><i class="fa-solid fa-times-circle"></i> สินค้าหมดชั่วคราว</p>';
                document.getElementById('purchaseForm').style.display = 'none';
            }

            // Rating
            if (data.reviewCount > 0) {
                let stars = '';
                for (let i = 1; i <= 5; i++) stars += `<i class="fa-solid fa-star" style="color:${i <= Math.round(data.avgRating) ? '#ffc107' : '#e0e0e0'};"></i>`;
                document.getElementById('avg-rating').innerHTML = `${stars} <span style="font-weight:600;">${data.avgRating}</span> <span style="color:#999;">(${data.reviewCount} รีวิว)</span>`;
            } else {
                document.getElementById('avg-rating').innerHTML = '<span style="color:#999;">ยังไม่มีรีวิว</span>';
            }

            // Auto-fill Roblox Username from profile
            await autoFillRobloxUsername();

            // Reviews
            renderReviewForm();
            renderReviews(data.reviews || []);
        });

        async function autoFillRobloxUsername() {
            if (!KNShop.isLoggedIn()) return;
            const user = await KNShop.getCurrentUser();
            if (user && user.robloxUsername) {
                document.getElementById('robloxUser').value = user.robloxUsername;
                const warning = document.getElementById('usernameWarning');
                if (warning) warning.style.display = 'none';
            } else {
                // Show warning if no username set
                const warning = document.getElementById('usernameWarning');
                if (warning) warning.style.display = 'block';
            }
        }

        function validateUsername() {
            const roblox = document.getElementById('robloxUser').value.trim();
            if (!roblox) {
                KNShop.showToast('กรุณาใส่ Username Roblox ก่อนสั่งซื้อ', 'error');
                document.getElementById('robloxUser').focus();
                document.getElementById('robloxUser').style.borderColor = '#c62828';
                document.getElementById('robloxUser').style.boxShadow = '0 0 0 3px rgba(198,40,40,0.15)';
                setTimeout(() => {
                    document.getElementById('robloxUser').style.borderColor = '';
                    document.getElementById('robloxUser').style.boxShadow = '';
                }, 3000);
                return false;
            }
            return true;
        }

        function showNotFound() {
            document.getElementById('p-title').textContent = 'ไม่พบสินค้า';
            document.getElementById('p-price').textContent = '-';
            document.getElementById('p-img').textContent = '?';
            document.getElementById('purchaseForm').style.display = 'none';
            document.getElementById('reviewsSection').style.display = 'none';
        }

        function addToCart() {
            if (!KNShop.isLoggedIn()) { window.location.href='/pages/login.html'; return; }
            if (!validateUsername()) return;
            const roblox = document.getElementById('robloxUser').value.trim();
            const qty = parseInt(document.getElementById('itemQty').value) || 1;
            const result = KNShop.addToCart(productId, qty, roblox, currentProduct.title, currentProduct.price, currentProduct.imgLabel);
            KNShop.showToast(result.msg);
        }

        function buyNow() {
            if (!KNShop.isLoggedIn()) { window.location.href='/pages/login.html'; return; }
            if (!validateUsername()) return;
            const roblox = document.getElementById('robloxUser').value.trim();
            const qty = parseInt(document.getElementById('itemQty').value) || 1;
            KNShop.addToCart(productId, qty, roblox, currentProduct.title, currentProduct.price, currentProduct.imgLabel);
            window.location.href='/pages/cart.html';
        }

        function renderReviewForm() {
            const area = document.getElementById('reviewFormArea');
            if (!KNShop.isLoggedIn()) {
                area.innerHTML = '<p style="color:#999; font-size:14px; margin-bottom:20px;"><a href="/pages/login.html" style="color:var(--primary-color);">เข้าสู่ระบบ</a> เพื่อเขียนรีวิว</p>';
                return;
            }
            area.innerHTML = `
                <div class="review-form" style="margin-bottom:25px; padding-bottom:20px; border-bottom:1px solid #f0f0f0;">
                    <div class="star-input" id="starInput">
                        <label onclick="setRating(1)">★</label><label onclick="setRating(2)">★</label><label onclick="setRating(3)">★</label><label onclick="setRating(4)">★</label><label onclick="setRating(5)">★</label>
                    </div>
                    <textarea id="reviewComment" placeholder="เขียนรีวิวของคุณ..."></textarea>
                    <button class="btn-submit" onclick="submitReview()" style="max-width:200px;"><i class="fa-solid fa-paper-plane"></i> ส่งรีวิว</button>
                </div>
            `;
        }

        let selectedRating = 0;
        function setRating(n) {
            selectedRating = n;
            document.querySelectorAll('#starInput label').forEach((label, i) => label.classList.toggle('active', i < n));
        }

        async function submitReview() {
            if (!selectedRating) { KNShop.showToast('กรุณาให้คะแนนดาว', 'error'); return; }
            const comment = document.getElementById('reviewComment').value.trim();
            if (!comment) { KNShop.showToast('กรุณาเขียนรีวิว', 'error'); return; }
            const result = await KNShop.addReview(productId, selectedRating, comment);
            if (result.success) {
                KNShop.showToast(result.msg);
                // Reload reviews
                const data = await KNShop.getProduct(productId);
                renderReviews(data.reviews || []);
            } else {
                KNShop.showToast(result.msg, 'error');
            }
        }

        function renderReviews(reviews) {
            const el = document.getElementById('reviewsList');
            if (!reviews.length) { el.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">ยังไม่มีรีวิว เป็นคนแรกที่รีวิว!</p>'; return; }
            el.innerHTML = reviews.map(r => {
                let stars = '';
                for (let i = 1; i <= 5; i++) stars += `<i class="fa-solid fa-star" style="color:${i <= r.rating ? '#ffc107' : '#e0e0e0'}; font-size:14px;"></i>`;
                return `<div class="review-card"><div class="review-header"><div><span class="review-user"><i class="fa-solid fa-user-circle"></i> ${KNShop.escapeHTML(r.username)}</span> ${stars}</div><span class="review-date">${KNShop.formatDate(r.createdAt)}</span></div><p class="review-comment">${KNShop.escapeHTML(r.comment)}</p></div>`;
            }).join('');
        }
