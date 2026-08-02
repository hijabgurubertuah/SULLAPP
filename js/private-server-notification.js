// Private Server Notification System
(function() {
    const SHOW_DELAY = 15000; // 15 seconds
    const AUTO_HIDE_DELAY = 30000; // 30 seconds
    
    let showTimeout = null;
    let autoHideTimeout = null;
    
    const notification = document.getElementById('private-server-notification');
    const buyBtn = document.getElementById('private-server-buy-btn');
    const closeBtn = document.getElementById('private-server-close-btn');
    
    if (!notification || !buyBtn || !closeBtn) return;
    
    // Check if user has private_server addon from database
    async function hasPrivateServer() {
        try {
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) return false;
            
            const data = window.getAddonStatus ? await window.getAddonStatus(userEmail, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email: userEmail, addon_key: 'private_server' }) })).json();
            return data.success && data.is_active;
        } catch (error) {
            return false;
        }
    }
    
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
    
    // Buy button click - navigate to addons page
    buyBtn.addEventListener('click', () => {
        if (autoHideTimeout) clearTimeout(autoHideTimeout);
        hideNotification();
        
        // Click on addons tab/button
        const addonsBtn = document.getElementById('tab-marketplace') || 
                         document.querySelector('[id*="addon"]') ||
                         document.querySelector('button:has-text("Marketplace")');
        
        if (addonsBtn) {
            addonsBtn.click();
        } else {
            // Fallback: try to show addons content directly
            const addonsContent = document.getElementById('content-addons');
            if (addonsContent) {
                // Hide all content panes
                document.querySelectorAll('.tab-content-pane').forEach(pane => {
                    pane.classList.add('hidden');
                });
                // Show addons content
                addonsContent.classList.remove('hidden');
            }
        }
    });
    
    // Close button click
    closeBtn.addEventListener('click', () => {
        if (autoHideTimeout) clearTimeout(autoHideTimeout);
        hideNotification();
    });
    
    // Initialize notification system
    async function init() {
        // Wait 1 second for page to fully load
        setTimeout(async () => {
            // Check if user already has private server
            const hasAddon = await hasPrivateServer();
            
            if (hasAddon) {
                return;
            }
            
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
