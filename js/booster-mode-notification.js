// Booster Mode Notification System
(function() {
    const SHOW_DELAY = 16000; // 16 seconds
    const AUTO_HIDE_DELAY = 31000; // 30 seconds
    
    let showTimeout = null;
    let autoHideTimeout = null;
    
    const notification = document.getElementById('booster-mode-notification');
    const activateBtn = document.getElementById('booster-mode-activate-btn');
    const closeBtn = document.getElementById('booster-mode-close-btn');
    
    if (!notification || !activateBtn || !closeBtn) return;
    
    // Show notification with slide-in animation
    function showNotification() {
        notification.classList.remove('hidden');
        notification.style.animation = 'slideInDown 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        
        // Auto-hide after 30 seconds
        autoHideTimeout = setTimeout(() => {
            hideNotification();
        }, AUTO_HIDE_DELAY);
    }
    
    // Hide notification with slide-out animation
    function hideNotification() {
        notification.style.animation = 'slideOutUp 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 400);
    }
    
    // Activate button click - activate boost mode
    activateBtn.addEventListener('click', () => {
        if (autoHideTimeout) clearTimeout(autoHideTimeout);
        hideNotification();
        
        // Find boost toggle elements
        const boostToggle = document.getElementById('boost-generate-toggle');
        const boostToggleHome = document.getElementById('boost-generate-toggle-home');
        
        // Activate boost mode (not toggle, always turn ON)
        if (boostToggle && !boostToggle.checked) {
            boostToggle.checked = true;
            boostToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (boostToggleHome && !boostToggleHome.checked) {
            boostToggleHome.checked = true;
            boostToggleHome.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // If already active, just hide notification (do nothing)
    });
    
    // Close button click
    closeBtn.addEventListener('click', () => {
        if (autoHideTimeout) clearTimeout(autoHideTimeout);
        hideNotification();
    });
    
    // Initialize notification system
    function init() {
        // Wait 1 second for page to fully load
        setTimeout(() => {
            // Show notification after 5 seconds
            showTimeout = setTimeout(() => {
                showNotification();
            }, SHOW_DELAY);
        }, 1000);
    }
    
    // Start the notification system when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (showTimeout) clearTimeout(showTimeout);
        if (autoHideTimeout) clearTimeout(autoHideTimeout);
    });
})();
