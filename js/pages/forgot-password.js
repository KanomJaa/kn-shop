// State
        let currentStep = 1;
        let userEmail = '';
        let resetToken = '';
        let otpTimerInterval = null;

        // ==================== STEP 1: Request OTP ====================
        async function handleRequestOTP(e) {
            e.preventDefault();
            const btn = document.getElementById('step1Btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่ง OTP...';
            hideMsg();

            userEmail = document.getElementById('resetEmail').value.trim();
            const result = await KNShop.requestOTP(userEmail);

            if (result.success) {
                showMsg(result.msg, 'success');
                goToStep(2);
                document.getElementById('displayEmail').textContent = userEmail;
                startOTPTimer(600); // 10 minutes
                focusOTPInput(0);
            } else {
                showMsg(result.msg, 'error');
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ส่งรหัส OTP';
        }

        // ==================== STEP 2: Verify OTP ====================
        async function handleVerifyOTP() {
            const btn = document.getElementById('step2Btn');
            const otpCode = getOTPValue();
            if (otpCode.length !== 6) {
                showMsg('กรุณากรอกรหัส OTP 6 หลักให้ครบ', 'error');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบ...';
            hideMsg();

            const result = await KNShop.verifyOTP(userEmail, otpCode);

            if (result.success) {
                resetToken = result.resetToken;
                showMsg('รหัส OTP ถูกต้อง!', 'success');
                goToStep(3);
                clearInterval(otpTimerInterval);
            } else {
                showMsg(result.msg, 'error');
                clearOTPInputs();
                focusOTPInput(0);
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check-circle"></i> ยืนยันรหัส OTP';
        }

        // ==================== STEP 3: Reset Password ====================
        async function handleResetPassword(e) {
            e.preventDefault();
            const newPass = document.getElementById('newPass').value;
            const confirmPass = document.getElementById('confirmPass').value;

            if (newPass !== confirmPass) {
                showMsg('รหัสผ่านไม่ตรงกัน', 'error');
                return;
            }
            if (newPass.length < 6) {
                showMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
                return;
            }

            const btn = document.getElementById('step3Btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตั้งรหัสผ่าน...';
            hideMsg();

            const result = await KNShop.resetPasswordWithToken(userEmail, resetToken, newPass);

            if (result.success) {
                goToStep(4);
                document.getElementById('backLink').style.display = 'none';
            } else {
                showMsg(result.msg, 'error');
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> ตั้งรหัสผ่านใหม่';
        }

        // ==================== Resend OTP ====================
        async function handleResendOTP() {
            const result = await KNShop.requestOTP(userEmail);
            if (result.success) {
                showMsg('ส่งรหัส OTP ใหม่แล้ว!', 'success');
                startOTPTimer(600);
                clearOTPInputs();
                focusOTPInput(0);
            } else {
                showMsg(result.msg, 'error');
            }
        }

        // ==================== UI Helpers ====================
        function goToStep(step) {
            currentStep = step;
            document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('step' + step).classList.add('active');

            // Update step indicators
            for (let i = 1; i <= 3; i++) {
                const indicator = document.getElementById('step-indicator-' + i);
                indicator.classList.remove('active', 'completed');
                if (i < step) indicator.classList.add('completed');
                else if (i === step) indicator.classList.add('active');
            }
        }

        function showMsg(msg, type) {
            const el = document.getElementById('resultMsg');
            el.style.display = 'block';
            el.style.background = type === 'error' ? '#fce4ec' : '#e8f5e9';
            el.style.color = type === 'error' ? '#c62828' : '#2e7d32';
            el.innerHTML = `<i class="fa-solid fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${KNShop.escapeHTML(msg)}`;
        }

        function hideMsg() {
            document.getElementById('resultMsg').style.display = 'none';
        }

        // ==================== OTP Input Logic ====================
        function getOTPValue() {
            return Array.from(document.querySelectorAll('.otp-digit')).map(el => el.value).join('');
        }

        function clearOTPInputs() {
            document.querySelectorAll('.otp-digit').forEach(el => {
                el.value = '';
                el.classList.remove('filled');
            });
        }

        function focusOTPInput(index) {
            const inputs = document.querySelectorAll('.otp-digit');
            if (inputs[index]) inputs[index].focus();
        }

        // Set up OTP input behavior
        document.querySelectorAll('.otp-digit').forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = val.charAt(0) || '';
                e.target.classList.toggle('filled', !!val);

                if (val && index < 5) {
                    focusOTPInput(index + 1);
                }

                // Auto-submit when all 6 digits entered
                if (getOTPValue().length === 6) {
                    handleVerifyOTP();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    focusOTPInput(index - 1);
                }
            });

            // Handle paste
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                const inputs = document.querySelectorAll('.otp-digit');
                for (let i = 0; i < Math.min(pasteData.length, 6); i++) {
                    inputs[i].value = pasteData[i];
                    inputs[i].classList.add('filled');
                }
                if (pasteData.length >= 6) {
                    handleVerifyOTP();
                } else {
                    focusOTPInput(Math.min(pasteData.length, 5));
                }
            });
        });

        // ==================== Timer ====================
        function startOTPTimer(seconds) {
            clearInterval(otpTimerInterval);
            let remaining = seconds;
            const display = document.getElementById('timerDisplay');
            const timerText = document.querySelector('.timer-text');
            const resendLink = document.getElementById('resendLink');

            timerText.style.display = 'inline';
            resendLink.classList.remove('show');

            otpTimerInterval = setInterval(() => {
                remaining--;
                const mins = Math.floor(remaining / 60);
                const secs = remaining % 60;
                display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

                if (remaining <= 0) {
                    clearInterval(otpTimerInterval);
                    timerText.style.display = 'none';
                    resendLink.classList.add('show');
                }
            }, 1000);
        }

        // ==================== Password Strength ====================
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
