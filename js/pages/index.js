function openContactPopup() {
            document.getElementById('contactPopup').classList.add('active');
        }
        function closeContactPopup() {
            document.getElementById('contactPopup').classList.remove('active');
        }
        function openLinePopup() {
            closeContactPopup();
            document.getElementById('lineQrPopup').classList.add('active');
        }
        function closeLinePopup() {
            document.getElementById('lineQrPopup').classList.remove('active');
        }
        // Close on overlay click
        document.getElementById('contactPopup').addEventListener('click', function (e) {
            if (e.target === this) closeContactPopup();
        });
        document.getElementById('lineQrPopup').addEventListener('click', function (e) {
            if (e.target === this) closeLinePopup();
        });
        // Close on ESC
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { closeContactPopup(); closeLinePopup(); }
        });
