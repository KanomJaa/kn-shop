let selectedAmount = 0, selectedPayment = '', uploadedSlipUrl = '';

        document.addEventListener('DOMContentLoaded', async () => {
            if (!KNShop.isLoggedIn()) { window.location.href='/pages/login.html'; return; }
            await updateBalance();
            await renderPending();
            await renderHistory();
        });

        async function updateBalance() {
            const pts = await KNShop.getPoints();
            document.getElementById('balanceAmount').textContent = pts.toLocaleString();
        }

        // ==================== Pending Topups ====================
        async function renderPending() {
            const data = await KNShop.getPendingTopups();
            const el = document.getElementById('pendingArea');
            if (!data.success || !data.pending || data.pending.length === 0) {
                el.innerHTML = '';
                return;
            }
            let html = '<div class="pending-list">';
            html += '<h4 style="color:#e65100; margin-bottom:10px;"><i class="fa-solid fa-clock"></i> รายการรอตรวจสอบ</h4>';
            data.pending.forEach(tx => {
                html += `<div class="pending-item">
                    <div>
                        <div class="pending-amount">+${tx.amount.toLocaleString()} Point</div>
                        <div class="pending-time">${KNShop.formatDate(tx.createdAt)}</div>
                    </div>
                    <div class="pending-status">
                        <i class="fa-solid fa-spinner"></i> รอ Admin อนุมัติ
                    </div>
                </div>`;
            });
            html += '</div>';
            el.innerHTML = html;
        }

        function selectAmount(amount, el) {
            selectedAmount = amount;
            document.querySelectorAll('.topup-option').forEach(o => o.classList.remove('selected'));
            el.classList.add('selected');
            updatePaymentUI();
        }

        function selectPayment(method, el) {
            selectedPayment = method;
            document.querySelectorAll('.payment-card:not(.disabled)').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            updatePaymentUI();
        }

        function updatePaymentUI() {
            if (selectedAmount > 0 && selectedPayment) {
                document.getElementById('paymentInstructions').style.display = 'block';
                document.getElementById('topupSummary').textContent =
                    `เติม ${selectedAmount.toLocaleString()} Point = ฿${selectedAmount.toLocaleString()}`;
            }
        }

        function copyAccountNumber() {
            navigator.clipboard.writeText('3562673038').then(() => {
                KNShop.showToast('คัดลอกเลขบัญชีแล้ว!');
            }).catch(() => {
                const temp = document.createElement('input');
                temp.value = '3562673038';
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
                KNShop.showToast('คัดลอกเลขบัญชีแล้ว!');
            });
        }

        // ==================== SLIP UPLOAD ====================
        async function handleSlipUpload(input) {
            const file = input.files[0];
            if (!file) return;

            // Validate file
            const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowed.includes(file.type)) {
                KNShop.showToast('อนุญาตเฉพาะไฟล์รูปภาพ (.jpg, .png, .gif, .webp)', 'error');
                input.value = '';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                KNShop.showToast('ไฟล์ใหญ่เกิน 5MB', 'error');
                input.value = '';
                return;
            }

            const area = document.getElementById('slipUploadArea');
            const content = document.getElementById('slipUploadContent');
            area.classList.add('uploading');
            area.classList.remove('has-file');
            content.innerHTML = `
                <div class="upload-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
                <div class="upload-text">กำลังอัปโหลดสลิป...</div>
            `;

            const result = await KNShop.uploadSlip(file);

            if (result.success) {
                uploadedSlipUrl = result.slipUrl;
                area.classList.remove('uploading');
                area.classList.add('has-file');
                content.innerHTML = `
                    <div class="upload-icon"><i class="fa-solid fa-circle-check"></i></div>
                    <div class="upload-text" style="color:#2e7d32; font-weight:600;">✅ อัปโหลดสลิปสำเร็จ!</div>
                    <img src="${result.slipUrl}" class="slip-preview" alt="สลิป">
                    <div class="upload-hint" style="margin-top:8px;">คลิกเพื่อเปลี่ยนรูป</div>
                `;
                document.getElementById('slipRequiredMsg').style.display = 'none';
                document.getElementById('topupBtn').disabled = false;
                KNShop.showToast('อัปโหลดสลิปสำเร็จ!');
            } else {
                uploadedSlipUrl = '';
                area.classList.remove('uploading');
                content.innerHTML = `
                    <div class="upload-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                    <div class="upload-text">คลิกเพื่อเลือกรูปสลิป หรือลากไฟล์มาวางที่นี่</div>
                    <div class="upload-hint">รองรับ .jpg .png .gif .webp (สูงสุด 5MB)</div>
                `;
                document.getElementById('topupBtn').disabled = true;
                KNShop.showToast(result.msg || 'อัปโหลดล้มเหลว', 'error');
            }
            input.value = '';
        }

        // Drag and drop support
        const dropArea = document.getElementById('slipUploadArea');
        if (dropArea) {
            ['dragenter', 'dragover'].forEach(evt => {
                dropArea.addEventListener(evt, e => { e.preventDefault(); dropArea.style.borderColor = 'var(--primary-color)'; dropArea.style.background = '#e3f2fd'; });
            });
            ['dragleave', 'drop'].forEach(evt => {
                dropArea.addEventListener(evt, e => { e.preventDefault(); dropArea.style.borderColor = ''; dropArea.style.background = ''; });
            });
            dropArea.addEventListener('drop', e => {
                const file = e.dataTransfer.files[0];
                if (file) {
                    const input = document.getElementById('slipFileInput');
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    input.files = dt.files;
                    handleSlipUpload(input);
                }
            });
        }

        // ==================== CONFIRM TOPUP ====================
        async function confirmTopup() {
            if (!selectedAmount || !selectedPayment) {
                KNShop.showToast('กรุณาเลือกจำนวนและวิธีชำระเงิน', 'error');
                return;
            }
            if (!uploadedSlipUrl) {
                KNShop.showToast('กรุณาแนบสลิปการโอนเงินก่อน', 'error');
                document.getElementById('slipRequiredMsg').style.display = 'flex';
                return;
            }

            if (!confirm(`ยืนยันว่าคุณโอนเงิน ฿${selectedAmount.toLocaleString()} แล้ว?\n\nAdmin จะตรวจสอบสลิปและอนุมัติ Point ให้`)) {
                return;
            }

            const btn = document.getElementById('topupBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งคำขอ...';

            const data = await KNShop.topup(selectedAmount, selectedPayment, uploadedSlipUrl);

            if (data.success) {
                KNShop.showToast(data.msg);
                await renderPending();
                await renderHistory();
                // Reset
                selectedAmount = 0; selectedPayment = ''; uploadedSlipUrl = '';
                document.querySelectorAll('.topup-option, .payment-card').forEach(e => e.classList.remove('selected'));
                document.getElementById('paymentInstructions').style.display = 'none';
                // Reset slip area
                const area = document.getElementById('slipUploadArea');
                area.classList.remove('has-file', 'uploading');
                document.getElementById('slipUploadContent').innerHTML = `
                    <div class="upload-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                    <div class="upload-text">คลิกเพื่อเลือกรูปสลิป หรือลากไฟล์มาวางที่นี่</div>
                    <div class="upload-hint">รองรับ .jpg .png .gif .webp (สูงสุด 5MB)</div>
                `;
                document.getElementById('slipRequiredMsg').style.display = 'flex';
            } else {
                KNShop.showToast(data.msg, 'error');
            }
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ยืนยันการเติม Point (รอ Admin อนุมัติ)';
        }

        async function renderHistory() {
            const data = await KNShop.getTransactionHistory();
            const el = document.getElementById('txHistory');
            if (!data.success || !data.transactions || data.transactions.length === 0) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><h3>ยังไม่มีประวัติ</h3></div>';
                return;
            }
            const typeMap = {
                topup: '💰 เติมเงิน', purchase: '🛒 ซื้อสินค้า', refund: '↩️ คืนเงิน',
                admin_add: '➕ Admin เพิ่ม', admin_deduct: '➖ Admin ลด'
            };
            const statusMap = {
                pending: '<span style="color:#e65100; font-weight:600;">⏳ รอตรวจสอบ</span>',
                success: '<span style="color:#2e7d32; font-weight:600;">✅ สำเร็จ</span>',
                failed: '<span style="color:#c62828; font-weight:600;">❌ ไม่อนุมัติ</span>'
            };
            let html = '<div style="background:white; border-radius:12px; box-shadow:var(--shadow); overflow:hidden;">';
            data.transactions.forEach(tx => {
                const isPositive = tx.amount > 0;
                const isPending = tx.status === 'pending';
                html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:15px 20px; border-bottom:1px solid #f0f0f0; ${isPending ? 'background:#fffde7;' : ''}">
                    <div>
                        <div style="font-weight:600; color:${isPending ? '#e65100' : isPositive ? '#2e7d32' : '#c62828'};">
                            ${isPositive ? '+' : ''}${tx.amount.toLocaleString()} Point
                        </div>
                        <div style="font-size:12px; color:#999;">${typeMap[tx.type] || tx.type} ${tx.note ? '- ' + tx.note : ''}</div>
                    </div>
                    <div style="text-align:right;">
                        <div>${statusMap[tx.status] || tx.status}</div>
                        <div style="font-size:12px; color:#999;">${KNShop.formatDate(tx.createdAt)}</div>
                    </div>
                </div>`;
            });
            html += '</div>';
            el.innerHTML = html;
        }
