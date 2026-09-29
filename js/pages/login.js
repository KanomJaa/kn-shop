// Check social login callback
        const socialResult = KNShop.handleSocialLoginCallback();
        if (socialResult) {
            if (socialResult.success) {
                // Social login succeeded
                const el = document.getElementById('login-success');
                el.style.display = 'block';
                el.innerHTML = '<i class="fa-solid fa-check-circle"></i> เข้าสู่ระบบด้วย ' +
                    socialResult.social.charAt(0).toUpperCase() + socialResult.social.slice(1) + ' สำเร็จ! กำลังเข้าสู่ระบบ...';
                setTimeout(() => window.location.href='/index.html', 1000);
            } else {
                showError(socialResult.msg);
            }
        } else if (KNShop.isLoggedIn()) {
            window.location.href='/index.html';
        }

        async function handleLogin(e) {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...';

            const emailOrUser = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPass').value;
            const result = await KNShop.login(emailOrUser, password);

            if (result.success) {
                window.location.href='/index.html';
            } else {
                showError(result.msg);
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ';
            }
        }

        function showError(msg) {
            const el = document.getElementById('login-error');
            el.style.display = 'block';
            el.innerHTML = '<i class="fa-solid fa-exclamation-circle"></i> ' + KNShop.escapeHTML(msg);
        }
