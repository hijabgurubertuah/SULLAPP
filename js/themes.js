document.addEventListener('DOMContentLoaded', () => {
    // Theme Manager
    const ThemeManager = {
        init() {
            this.cards = document.querySelectorAll('.theme-card');
            this.fileInput = document.getElementById('custom-theme-input');
            this.previewImg = document.getElementById('custom-theme-preview');
            this.loadTheme();
            this.bindEvents();
        },

        bindEvents() {
            this.cards.forEach(card => {
                card.addEventListener('click', (e) => {
                    // If clicking the file input, let it propagate
                    if (e.target === this.fileInput) return;

                    const theme = card.dataset.theme;
                    
                    if (theme === 'custom') {
                        // If custom theme is clicked but no image is set, trigger file input
                        if (!localStorage.getItem('sf_custom_bg')) {
                            this.fileInput.click();
                            return;
                        }
                    }

                    this.setTheme(theme);
                });
            });

            if (this.fileInput) {
                this.fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const bgData = event.target.result;
                            try {
                                localStorage.setItem('sf_custom_bg', bgData);
                                this.updateCustomPreview(bgData);
                                this.setTheme('custom');
                            } catch (err) {
                                alert('Gambar terlalu besar untuk disimpan. Gunakan gambar yang lebih kecil (< 2MB).');
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        },

        setTheme(theme) {
            // Update UI
            this.cards.forEach(card => {
                const isActive = card.dataset.theme === theme;
                const checkIcon = card.querySelector('.check-icon');
                const badge = card.querySelector('.active-badge');
                
                if (isActive) {
                    card.classList.add('border-teal-500');
                    card.classList.remove('border-transparent');
                    if (checkIcon) {
                        checkIcon.classList.remove('opacity-0');
                        checkIcon.classList.add('opacity-100');
                    }
                    if (badge) badge.classList.remove('hidden');
                } else {
                    card.classList.remove('border-teal-500');
                    card.classList.add('border-transparent');
                    if (checkIcon) {
                        checkIcon.classList.add('opacity-0');
                        checkIcon.classList.remove('opacity-100');
                    }
                     if (badge) badge.classList.add('hidden');
                }
            });

            // Save preference
            localStorage.setItem('sf_theme', theme);

            // Apply Theme
            this.applyTheme(theme);
        },

        applyTheme(theme) {
            const body = document.body;
            
            // Remove existing theme classes
            body.classList.remove('theme-dark', 'theme-glass', 'theme-custom', 'ramadhan-bg', 'default-theme');
            
            // Remove Ramadhan background elements if they exist
            const sky = document.querySelector('.ramadhan-sky');
            const mosque = document.querySelector('.ramadhan-mosque');
            if (sky) sky.style.display = 'none';
            if (mosque) mosque.style.display = 'none';
            
            if (theme === 'default') {
                body.classList.add('default-theme');
                body.style.backgroundImage = '';
            } else if (theme === 'dark') {
                body.classList.add('theme-dark');
                 body.style.backgroundImage = '';
            } else if (theme === 'glass') {
                body.classList.add('theme-glass');
                body.style.backgroundImage = '';
            } else if (theme === 'custom') {
                body.classList.add('theme-custom');
                const customBg = localStorage.getItem('sf_custom_bg');
                if (customBg) {
                    body.style.backgroundImage = `url('${customBg}')`;
                    body.style.backgroundSize = 'cover';
                    body.style.backgroundPosition = 'center';
                    body.style.backgroundAttachment = 'fixed';
                }
            }
        },

        loadTheme() {
            const theme = localStorage.getItem('sf_theme') || 'default';
            const customBg = localStorage.getItem('sf_custom_bg');
            
            if (customBg) {
                this.updateCustomPreview(customBg);
            }

            this.setTheme(theme);
        },

        updateCustomPreview(dataUrl) {
            if (this.previewImg) {
                this.previewImg.src = dataUrl;
                this.previewImg.classList.remove('hidden');
            }
        }
    };

    ThemeManager.init();
    
    // Also expose applyTheme globally for immediate execution in head if needed, 
    // but DOMContentLoaded is safer for class manipulation
    window.ThemeManager = ThemeManager;
    
    // Refresh Sidebar Icons after theme change to ensure visibility
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                // Force redraw sidebar icons for any theme change
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        });
    });
    observer.observe(document.body, { attributes: true });
});

