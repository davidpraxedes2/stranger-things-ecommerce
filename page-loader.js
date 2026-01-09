(function () {
    'use strict';
    // Page Loader Logic

    const loader = document.getElementById('pageLoader');
    const MIN_LOADING_TIME = 0; // Minimum time to show loader
    const MAX_LOADING_TIME = 5000; // Safety timeout
    const startTime = Date.now();
    let hidden = false;

    function hideLoader() {
        if (hidden || !loader) return;

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

        setTimeout(() => {
            if (hidden) return;
            hidden = true;

            loader.classList.add('hidden');
            document.body.classList.remove('no-scroll'); // Ensure scroll is enabled

            // Remove from DOM after transition
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, remaining);
    }

    // Expose functions globally
    window.showPageLoader = function () {
        if (loader) {
            hidden = false;
            loader.style.display = 'flex';
            loader.classList.remove('hidden');
            loader.classList.add('active');
            document.body.classList.add('no-scroll');
        }
    };

    window.hidePageLoader = hideLoader;

    // Safety timeout
    setTimeout(hideLoader, MAX_LOADING_TIME);

    // If script runs late and everything is loaded, try to hide (but script.js should handle it for products)
    // We will leave it active until script.js calls hidePageLoader() or timeout happens.
})();
