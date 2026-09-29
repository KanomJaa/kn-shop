(() => {
    const category = document.documentElement.dataset.category;
    const destination = category
        ? `/pages/products.html?cat=${encodeURIComponent(category)}`
        : '/pages/products.html';

    window.location.replace(destination);
})();
