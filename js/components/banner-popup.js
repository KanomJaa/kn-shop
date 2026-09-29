let sharedBanners = [];
let sharedBannerIndex = 0;

function initHomeBannerPopup(banners) {
    sharedBanners = banners;

    if (!document.getElementById('bannerPopup')) {
        const popup = document.createElement('div');
        popup.className = 'banner-popup-overlay';
        popup.id = 'bannerPopup';
        popup.innerHTML = `
            <div class="banner-popup-box">
                <button class="banner-close-btn" type="button"><i class="fa-solid fa-xmark"></i></button>
                <div class="banner-slider" id="bannerSlider">
                    <div class="banner-slide-container" id="bannerSlideContainer"></div>
                    <button class="banner-arrow banner-prev" id="bannerPrev" type="button"><i class="fa-solid fa-chevron-left"></i></button>
                    <button class="banner-arrow banner-next" id="bannerNext" type="button"><i class="fa-solid fa-chevron-right"></i></button>
                    <div class="banner-dots" id="bannerDots"></div>
                </div>
            </div>`;
        popup.addEventListener('click', (event) => {
            if (event.target === popup) closeBannerPopup();
        });
        popup.querySelector('.banner-close-btn').addEventListener('click', closeBannerPopup);
        document.body.appendChild(popup);
    }

    renderSharedBannerSlider();

    const lastDismissed = Number.parseInt(localStorage.getItem('bannerDismissedAt'), 10);
    const canShow = !Number.isFinite(lastDismissed) || Date.now() - lastDismissed > 5 * 60 * 1000;
    if (canShow) {
        setTimeout(() => document.getElementById('bannerPopup')?.classList.add('active'), 1000);
    }
}

function renderSharedBannerSlider() {
    const container = document.getElementById('bannerSlideContainer');
    const dots = document.getElementById('bannerDots');
    if (!container || !dots) return;

    container.innerHTML = sharedBanners.map((banner, index) => {
        const image = KNShop.safeUrl(banner.image);
        const link = KNShop.safeUrl(banner.link);
        const title = KNShop.escapeHTML(banner.title || '');
        return `
            <div class="banner-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                ${banner.isHot ? '<div class="slide-hot-tag"><i class="fa-solid fa-fire"></i> HOT</div>' : ''}
                ${link ? `<a href="${KNShop.escapeHTML(link)}" target="_blank" rel="noopener noreferrer">` : ''}
                ${image ? `<img src="${KNShop.escapeHTML(image)}" alt="${title || 'Banner'}" onerror="this.style.display='none'">` : ''}
                ${link ? '</a>' : ''}
                ${title ? `<div class="slide-title">${title}</div>` : ''}
            </div>`;
    }).join('');

    dots.replaceChildren(...sharedBanners.map((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `banner-dot ${index === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToHomeBanner(index));
        return dot;
    }));

    const previous = document.getElementById('bannerPrev');
    const next = document.getElementById('bannerNext');
    const multiple = sharedBanners.length > 1;
    previous.style.display = multiple ? '' : 'none';
    next.style.display = multiple ? '' : 'none';
    dots.style.display = multiple ? '' : 'none';
    previous.onclick = () => goToHomeBanner(sharedBannerIndex <= 0 ? sharedBanners.length - 1 : sharedBannerIndex - 1);
    next.onclick = () => goToHomeBanner(sharedBannerIndex >= sharedBanners.length - 1 ? 0 : sharedBannerIndex + 1);
}

function goToHomeBanner(index) {
    const popup = document.getElementById('bannerPopup');
    if (!popup) return;
    const slides = popup.querySelectorAll('.banner-slide');
    const dots = popup.querySelectorAll('.banner-dot');
    slides.forEach((slide) => slide.classList.remove('active'));
    dots.forEach((dot) => dot.classList.remove('active'));
    sharedBannerIndex = index;
    slides[index]?.classList.add('active');
    dots[index]?.classList.add('active');
}

function closeBannerPopup() {
    document.getElementById('bannerPopup')?.classList.remove('active');
    localStorage.setItem('bannerDismissedAt', Date.now().toString());
}
