document.addEventListener('DOMContentLoaded', async () => {
            if (!KNShop.isLoggedIn()) { window.location.href='/pages/login.html'; return; }
            const user = await KNShop.getCurrentUser();
            if (!user) { window.location.href='/pages/login.html'; return; }
            document.getElementById('profileName').textContent = user.username;
            document.getElementById('pUsername').value = user.username;
            document.getElementById('pEmail').value = user.email;
            document.getElementById('pRoblox').value = user.robloxUsername || '';
            document.getElementById('pPoints').value = user.points.toLocaleString() + ' Point';
            document.getElementById('pCreated').value = KNShop.formatDate(user.createdAt);
        });

        async function saveProfile(e) {
            e.preventDefault();
            const roblox = document.getElementById('pRoblox').value;
            const result = await KNShop.updateProfile({ robloxUsername: roblox });
            if (result.success) KNShop.showToast('บันทึกข้อมูลสำเร็จ!');
            else KNShop.showToast(result.msg, 'error');
        }
