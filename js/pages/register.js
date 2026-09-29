// Check social callback
        const socialResult = KNShop.handleSocialLoginCallback();
        if (socialResult && socialResult.success) {
            showMsg('สมัครด้วย ' + socialResult.social + ' สำเร็จ!', 'success');
            setTimeout(() => window.location.href='/index.html', 1000);
        } else if (KNShop.isLoggedIn()) {
            window.location.href='/index.html';
        }

        async function handleRegister(e) {
            e.preventDefault();
            const pass = document.getElementById('regPass').value;
            const passConfirm = document.getElementById('regPassConfirm').value;
            if (pass !== passConfirm) { showMsg('รหัสผ่านไม่ตรงกัน', 'error'); return; }

            const btn = document.getElementById('regBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังสมัคร...';

            const result = await KNShop.register(
                document.getElementById('regUsername').value.trim(),
                document.getElementById('regEmail').value.trim(),
                pass
            );
            if (result.success) {
                showMsg('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...', 'success');
                setTimeout(() => window.location.href='/index.html', 1000);
            } else {
                showMsg(result.msg, 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> สมัครสมาชิก';
            }
        }

        function showMsg(msg, type) {
            const el = document.getElementById('reg-msg');
            el.style.display = 'block';
            el.style.background = type === 'error' ? '#fce4ec' : '#e8f5e9';
            el.style.color = type === 'error' ? '#c62828' : '#2e7d32';
            el.innerHTML = `<i class="fa-solid fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${KNShop.escapeHTML(msg)}`;
        }

        function updatePasswordStrength(password) {
            const bar = document.getElementById('strengthBar');
            const text = document.getElementById('strengthText');
            let strength = 0;
            if (password.length >= 6) strength++;
            if (password.length >= 10) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;

            const colors = ['#ef5350', '#ff9800', '#ffc107', '#8bc34a', '#4caf50'];
            const labels = ['อ่อนมาก', 'อ่อน', 'ปานกลาง', 'แข็งแกร่ง', 'แข็งแกร่งมาก'];
            const widths = ['20%', '40%', '60%', '80%', '100%'];

            const idx = Math.max(0, Math.min(strength - 1, 4));
            bar.style.width = strength > 0 ? widths[idx] : '0';
            bar.style.background = strength > 0 ? colors[idx] : '#e0e0e0';
            text.textContent = strength > 0 ? `ความแข็งแกร่ง: ${labels[idx]}` : '';
            text.style.color = strength > 0 ? colors[idx] : '#999';
        }
