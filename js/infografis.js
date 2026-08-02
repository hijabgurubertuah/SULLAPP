window.initInfografis = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    getApiKey,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    // DOM Elements
    const imageInput = document.getElementById('ig-image-input');
    const imageUploadBox = document.getElementById('ig-upload-box');
    const imagePreview = document.getElementById('ig-preview');
    const imagePlaceholder = document.getElementById('ig-placeholder');
    const removeImageBtn = document.getElementById('ig-remove-btn');

    const topicInput = document.getElementById('ig-topic-input');

    const modelOptions = document.getElementById('ig-model-options');
    const styleOptions = document.getElementById('ig-style-options'); // legacy ref, now using dropdown
    const customStyleContainer = document.getElementById('ig-custom-style-container');
    const customStyleInput = document.getElementById('ig-custom-style-input');

    const langOptions = document.getElementById('ig-lang-options');
    const layoutOptions = document.getElementById('ig-layout-options');
    const colorOptions = document.getElementById('ig-color-options');
    const manualColorContainer = document.getElementById('ig-manual-color-container');
    const manualColorInput = document.getElementById('ig-manual-color-input');

    const generateBtn = document.getElementById('ig-generate-btn');
    const generateBtnText = document.getElementById('ig-generate-btn-text');

    const countSlider = document.getElementById('ig-count-slider');
    const countValue = document.getElementById('ig-count-value');

    const resultsContainer = document.getElementById('ig-results-container');
    const resultsGrid = document.getElementById('ig-results-grid');
    const resultsPlaceholder = document.getElementById('ig-results-placeholder');

    if (!generateBtn) return;

    let imageData = null;
    let isGenerating = false;
    let resultCardIndex = 0;

    // Helper function to check if boost mode is active
    function isBoostActive() {
        const boostToggle = document.getElementById('boost-generate-toggle') || document.getElementById('boost-generate-toggle-home');
        return boostToggle && boostToggle.checked;
    }

    // Use /generate endpoint - interceptor will route to correct endpoint based on selected model
    function getEndpointForModel() {
        return GENERATE_URL;
    }

    // Private Server gating for locked models
    const psHint = document.getElementById('ig-ps-hint');
    let privateServerActive = false;

    // Model color mapping
    const modelColors = {
        'nanobanana': 'green',
        'nanobanana2': 'purple',
        'grok': 'orange',
        'seedream': 'rose',
        'flux2dev': 'teal',
        'qwen': 'orange'
    };

    const colorClasses = {
        'green': 'bg-green-500',
        'blue': 'bg-blue-500',
        'purple': 'bg-purple-500',
        'orange': 'bg-orange-500',
        'teal': 'bg-teal-500',
        'rose': 'bg-rose-500',
        'indigo': 'bg-indigo-500'
    };

    // Render model options dynamically from PRIVATE_SERVER_MODELS
    function renderModelOptions() {
        if (!modelOptions) return;
        const models = window.PRIVATE_SERVER_MODELS || {};
        const currentModel = localStorage.getItem('private_server_model') || 'nanobanana';
        
        modelOptions.innerHTML = '';
        
        for (const [key, info] of Object.entries(models)) {
            const color = modelColors[key] || 'green';
            const colorClass = colorClasses[color] || 'bg-green-500';
            const isNanobanana = key === 'nanobanana';
            const requiresPS = !isNanobanana;
            const isSelected = key === currentModel;
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.value = key;
            if (requiresPS) btn.dataset.requiresPs = 'true';
            
            btn.className = `option-btn justify-center flex items-center gap-2 relative ${isSelected ? 'selected' : ''}`;
            
            // Lock non-nanobanana models by default
            if (requiresPS && !privateServerActive) {
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            
            // Add Support Boost badge for nanobanana, nanobanana2, seedream
            const supportsBoost = key === 'nanobanana' || key === 'nanobanana2' || key === 'seedream';
            const boostBadge = supportsBoost ? '<span class="text-[7px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 ml-1">BOOST</span>' : '';
            const fourKBadge = key === 'seedream' ? '<span class="text-[7px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-600 to-purple-700 text-white ml-1">4K</span>' : '';
            
            btn.innerHTML = `
                <span class="w-2 h-2 rounded-full ${colorClass}"></span> ${info.label}${boostBadge}${fourKBadge}
                ${requiresPS && !privateServerActive ? '<i data-lucide="lock" class="w-3 h-3 text-slate-400 ig-lock-icon"></i>' : ''}
            `;
            
            modelOptions.appendChild(btn);
        }
        
        // Recreate icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({ root: modelOptions });
        }
        
        // Re-setup option buttons
        if (typeof setupOptionButtons === 'function') {
            setupOptionButtons(modelOptions);
        }
        
        // Add click handler to sync model to localStorage
        modelOptions.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-value]');
            if (btn && !btn.dataset.requiresPs || (btn.dataset.requiresPs && privateServerActive)) {
                const modelKey = btn.dataset.value;
                localStorage.setItem('private_server_model', modelKey);
                window.dispatchEvent(new CustomEvent('privateServerModelChanged', { detail: { model: modelKey } }));
            }
        });
    }
    

    async function checkIgPrivateServer() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return;
        try {
            const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
            if (r.success && r.is_active) {
                privateServerActive = true;
                renderModelOptions(); // Re-render with unlocked models
                if (psHint) psHint.classList.add('hidden');
            }
        } catch(e) { /* ignore */ }
    }
    
    // Initial render
    renderModelOptions();
    checkIgPrivateServer();
    
    // Listen for model changes
    window.addEventListener('privateServerModelChanged', function() {
        renderModelOptions(); // Re-render to sync model selection
    });

    // Server status elements
    const serverStatusBadge = document.getElementById('ig-server-status');
    const statusDot = document.getElementById('ig-status-dot');
    const statusText = document.getElementById('ig-status-text');

    // Remove server status check
    if (serverStatusBadge) serverStatusBadge.style.display = 'none';

    // Helper: Show Mini Popup (Copied from wedding-2.js)
    function showLimitPopup(message) {
        // Remove existing popup if any
        const existingPopup = document.getElementById('ig-limit-popup');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.id = 'ig-limit-popup';
        popup.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg z-[9999] transition-all duration-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-4';
        popup.style.maxWidth = '90%';
        popup.style.width = 'max-content';
        popup.innerHTML = `<i data-lucide="info" class="w-3.5 h-3.5 text-yellow-400"></i><span>${message}</span>`;
        document.body.appendChild(popup);
        
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({
                root: popup
            });
        }

        setTimeout(() => {
            popup.classList.add('opacity-0', '-translate-y-4');
            setTimeout(() => {
                popup.remove();
            }, 300);
        }, 3000);
    }

    // --- Slider Logic ---
    if (countSlider && countValue) {
        countSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            
            if (val > 1 && !isBoostActive()) {
                countSlider.value = 1;
                countValue.textContent = "1 Variasi";
                showLimitPopup("Aktifkan Boost Mode untuk generate lebih dari 1 gambar");
            } else {
                countValue.textContent = `${val} Variasi`;
            }

            if (generateBtnText) {
                generateBtnText.textContent = countSlider.value > 1 ? `Buat ${countSlider.value} Infografis` : 'Buat Infografis';
            }
        });
    }

    // --- Image Upload Handling (Optional) ---
    setupImageUpload(imageInput, imageUploadBox, (data) => {
        imageData = data;
        imagePreview.src = data.dataUrl;
        imagePlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, layoutOptions);
        imagePreview.classList.remove('hidden');
        removeImageBtn.classList.remove('hidden');
    });

    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        imageData = null;
        imageInput.value = '';
        imagePreview.src = '#';
        imagePreview.classList.add('hidden');
        imagePlaceholder.classList.remove('hidden');
        removeImageBtn.classList.add('hidden');
    });

    // --- Style Dropdown ---
    const styleDropdown = document.getElementById('ig-style-dropdown');
    if (styleDropdown) {
        styleDropdown.addEventListener('change', () => {
            if (styleDropdown.value === 'Kustom') {
                customStyleContainer.classList.remove('hidden');
                customStyleInput.focus();
            } else {
                customStyleContainer.classList.add('hidden');
            }
        });
    }

    // --- Model Selection with Private Server gating ---
    if (modelOptions) {
        modelOptions.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.requiresPs === 'true' && !privateServerActive) {
                if (psHint) psHint.classList.remove('hidden');
                return;
            }
            modelOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            if (psHint) psHint.classList.add('hidden');
        });
        
        // Update model selection when Private Server model changes
        function updateModelFromPrivateServer() {
            const privateModel = localStorage.getItem('private_server_model');
            if (!privateModel || privateModel === 'nanobanana') return;
            
            // Map private server model to infografis model
            const modelMap = {
                'nanobanana_pro': 'nanobanana',
                'nanobanana2': 'nanobanana2',
                'grok': 'grok',
                'gpt_image': 'gpt_image'
            };
            
            const targetModel = modelMap[privateModel];
            if (targetModel) {
                const targetBtn = modelOptions.querySelector(`[data-value="${targetModel}"]`);
                if (targetBtn && !targetBtn.classList.contains('opacity-50')) {
                    modelOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                    targetBtn.classList.add('selected');
                }
            }
        }
        
        // Listen for storage changes (cross-tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'private_server_model') {
                updateModelFromPrivateServer();
            }
        });
        // Listen for custom event (same-tab)
        window.addEventListener('privateServerModelChanged', () => {
            updateModelFromPrivateServer();
        });
        
        // Initial update
        updateModelFromPrivateServer();
    }

    // --- Language Selection ---
    if (langOptions) setupOptionButtons(langOptions);

    // --- Layout Selection ---
    if (layoutOptions) setupOptionButtons(layoutOptions);

    // --- Color Selection with Manual support ---
    if (colorOptions) {
        colorOptions.addEventListener('click', (e) => {
            const btn = e.target.closest('.option-btn');
            if (!btn) return;
            colorOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            if (btn.dataset.value === 'manual') {
                if (manualColorContainer) manualColorContainer.classList.remove('hidden');
                if (manualColorInput) manualColorInput.focus();
            } else {
                if (manualColorContainer) manualColorContainer.classList.add('hidden');
            }
        });
    }

    // --- Generate Button Logic ---
    topicInput.addEventListener('input', updateGenerateButton);

    function updateGenerateButton() {
        const hasTopic = topicInput.value.trim().length > 0;
        generateBtn.disabled = !hasTopic || isGenerating;
    }

    function getSelectedValue(container) {
        const sel = container.querySelector('.selected');
        return sel ? sel.dataset.value : null;
    }

    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    function getAspectRatioFromLayout(layout) {
        switch (layout) {
            case 'vertical': return '9:16';
            case 'horizontal': return '16:9';
            case 'square': return '1:1';
            default: return '9:16';
        }
    }

    function appendResultCard(imgUrl, aspectRatio) {
        resultCardIndex++;
        const idx = resultCardIndex;

        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        // Determine aspect ratio class
        let aspectClass = 'aspect-[9/16]'; // default vertical
        let maxWidthClass = 'max-w-sm'; // default for vertical to not take full width

        if (aspectRatio === '16:9') {
            aspectClass = 'aspect-[16/9]';
            maxWidthClass = 'max-w-2xl';
        } else if (aspectRatio === '1:1') {
            aspectClass = 'aspect-square';
            maxWidthClass = 'max-w-md';
        }

        const card = document.createElement('div');
        card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full animate-fade-in mx-auto ${maxWidthClass} shadow-lg`;

        card.innerHTML = `
            <div class="relative w-full ${aspectClass}">
                <img src="${imgUrl}" alt="Infografis ${idx}" class="absolute inset-0 w-full h-full object-cover">
            </div>
            <div class="absolute bottom-2 right-2 flex gap-1">
                <button data-img-src="${imgUrl}" class="view-btn result-action-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors" title="Lihat Gambar">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <a href="${imgUrl}" download="infografis_${idx}.png" class="result-action-btn download-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors" title="Unduh Gambar">
                    <i data-lucide="download" class="w-4 h-4"></i>
                </a>
            </div>
        `;

        resultsGrid.appendChild(card);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        if (window.innerWidth < 1024) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function appendLoadingCard(index, aspectRatio) {
        // Determine aspect ratio class for loading card
        let aspectClass = 'aspect-[9/16]'; // default vertical
        let maxWidthClass = 'max-w-sm'; // default for vertical

        if (aspectRatio === '16:9') {
            aspectClass = 'aspect-[16/9]';
            maxWidthClass = 'max-w-2xl';
        } else if (aspectRatio === '1:1') {
            aspectClass = 'aspect-square';
            maxWidthClass = 'max-w-md';
        }

        const card = document.createElement('div');
        card.id = `ig-loading-card-${index}`;
        card.className = `relative rounded-2xl overflow-hidden bg-white/80 border border-slate-200 w-full flex flex-col items-center justify-center animate-pulse mx-auto ${maxWidthClass} shadow-lg`;
        
        // Use aspect ratio wrapper to maintain size
        card.innerHTML = `
            <div class="w-full ${aspectClass} flex flex-col items-center justify-center bg-slate-50">
                <div class="flex flex-col items-center justify-center gap-3 p-6 w-full text-center">
                    <div class="spinner border-4 border-purple-200 border-t-purple-600 w-8 h-8"></div>
                    <p class="text-slate-500 text-xs font-medium text-center w-full animate-pulse">Membuat infografis ${index}...</p>
                </div>
            </div>
        `;
        resultsGrid.appendChild(card);
        return card;
    }

    function removeLoadingCard(index) {
        const card = document.getElementById(`ig-loading-card-${index}`);
        if (card) card.remove();
    }

    function markLoadingCardError(index, errorMsg) {
        const card = document.getElementById(`ig-loading-card-${index}`);
        if (card) {
            card.innerHTML = `
                <div class="flex flex-col items-center gap-2 p-6 text-red-400">
                    <i data-lucide="alert-circle" class="w-8 h-8"></i>
                    <p class="text-xs font-medium text-center">Gagal: ${errorMsg}</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    async function generateSingle(variationPrompt, aspectRatio, imgData, apiKey, index) {
        try {
            const endpoint = getEndpointForModel();
            
            const formData = new FormData();
            formData.append('instruction', variationPrompt);
            formData.append('aspectRatio', aspectRatio);

            if (imgData && imgData.base64 && imgData.mimeType) {
                formData.append('images[]', base64ToBlob(imgData.base64, imgData.mimeType));
            }

            const headers = { 'X-API-Key': apiKey };

            const response = await fetch(endpoint, {
                method: 'POST',
                cache: 'no-store',
                headers: headers,
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));

            const data = await response.json();
            let images = [];

            if (data.imageUrl) {
                images.push(data.imageUrl);
            } else if (data.images && Array.isArray(data.images)) {
                images.push(...data.images);
            } else if (data.image) {
                images.push(data.image);
            }

            return { success: true, images, index };
        } catch (err) {
            if (err.name === 'AbortError') {
                return { success: false, error: 'Dibatalkan oleh pengguna', index };
            }
            return { success: false, error: err.message, index };
        }
    }

    generateBtn.addEventListener('click', async () => {
        if (isGenerating) return;

        const topic = topicInput.value.trim();
        if (!topic) {
            alert('Mohon masukkan topik atau data infografis.');
            return;
        }

        const styleValue = styleDropdown ? styleDropdown.value : 'Modern & Clean';
        const style = styleValue === 'Kustom' ? (customStyleInput.value.trim() || 'Modern & Clean') : styleValue;

        const lang = getSelectedValue(langOptions) || 'id';
        const layout = getSelectedValue(layoutOptions) || 'vertical';
        let colorScheme = getSelectedValue(colorOptions) || 'auto';
        if (colorScheme === 'manual' && manualColorInput) {
            colorScheme = manualColorInput.value.trim() || 'auto';
        }
        const aspectRatio = getAspectRatioFromLayout(layout);
        const count = parseInt(countSlider.value) || 1;
        const useParallel = isBoostActive() && count > 1;

        const langInstruction = lang === 'id'
            ? 'All text, titles, labels, and descriptions in the infographic MUST be written in Bahasa Indonesia.'
            : lang === 'ms'
            ? 'All text, titles, labels, and descriptions in the infographic MUST be written in Bahasa Malaysia (Malay language).'
            : 'All text, titles, labels, and descriptions in the infographic MUST be written in English.';

        const instruction = `Create a professional, high-quality infographic image about the following topic:

Topic/Data: "${topic}"

Design Requirements:
- Visual Style: ${style}
- Layout: ${layout} orientation
- Color Scheme: ${colorScheme === 'auto' ? 'Choose the most suitable color palette for the topic' : colorScheme}
- ${langInstruction}
- Must include clear data visualization (charts, graphs, icons, statistics)
- Use clean typography with hierarchy (title, subtitle, body text)
- Include relevant icons and visual elements
- Make data points easy to read and understand
- Professional quality suitable for social media or presentations
- Text must be clearly readable
- Use visual flow to guide the reader through the information`;

        // UI Loading State
        isGenerating = true;
        generateBtn.disabled = true;
        const originalBtnContent = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 mr-2 animate-spin"></i><span>Sedang Memproses...</span>';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Reset results grid and show loading placeholders
        resultsGrid.innerHTML = '';
        resultsGrid.className = `grid ${getResultGridCols(count)} gap-4 md:gap-6`;
        resultsContainer.classList.remove('hidden');
        resultsPlaceholder.classList.add('hidden');
        resultCardIndex = 0;

        const apiKey = getApiKey();
        let hasAnySuccess = false;
        let firstError = null;

        // Create loading placeholder cards for each variation
        for (let i = 1; i <= count; i++) {
            appendLoadingCard(i, aspectRatio);
        }

        // Build prompts per variation
        const prompts = [];
        for (let i = 0; i < count; i++) {
            let variationPrompt = instruction;
            if (i > 0) variationPrompt += `\n(Create a unique variation #${i + 1} with different layout arrangement and visual approach)`;
            prompts.push(variationPrompt);
        }

        if (useParallel) {
            // --- PARALLEL MODE (Boost Active) ---
            const promises = prompts.map((prompt, i) =>
                generateSingle(prompt, aspectRatio, imageData, apiKey, i + 1).then(result => {
                    removeLoadingCard(result.index);
                    if (result.success && result.images.length > 0) {
                        hasAnySuccess = true;
                        result.images.forEach(img => appendResultCard(img, aspectRatio));
                        doneSound.play();
                    } else if (!result.success) {
                        if (!firstError) firstError = result.error;
                        markLoadingCardError(result.index, result.error);
                    }
                })
            );

            await Promise.allSettled(promises);
        } else {
            // --- SEQUENTIAL MODE ---
            for (let i = 0; i < count; i++) {
                const result = await generateSingle(prompts[i], aspectRatio, imageData, apiKey, i + 1);
                removeLoadingCard(result.index);
                if (result.success && result.images.length > 0) {
                    hasAnySuccess = true;
                    result.images.forEach(img => appendResultCard(img, aspectRatio));
                    doneSound.play();
                } else if (!result.success) {
                    if (!firstError) firstError = result.error;
                    markLoadingCardError(result.index, result.error);
                }
            }
        }

        // Final state
        if (!hasAnySuccess) {
            errorSound.play();
            resultsContainer.classList.add('hidden');
            resultsPlaceholder.classList.remove('hidden');
            resultsPlaceholder.innerHTML = `
                <div class="flex flex-col items-center text-red-500">
                    <i data-lucide="alert-circle" class="w-12 h-12 mb-2"></i>
                    <p class="font-medium">Terjadi Kesalahan</p>
                    <p class="text-sm text-slate-400 mt-1 text-center max-w-xs">${firstError || 'Tidak ada infografis yang dihasilkan'}</p>
                    <button id="ig-retry-btn" class="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200 transition-colors">Coba Lagi</button>
                </div>
            `;
            document.getElementById('ig-retry-btn')?.addEventListener('click', () => {
                generateBtn.click();
            });
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalBtnContent;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        updateGenerateButton();
    });

    // Initial state
    updateGenerateButton();

    // Show Example Button
    const showExampleBtn = document.getElementById('ig-show-example-btn');
    if (showExampleBtn) {
        showExampleBtn.addEventListener('click', () => {
            // Create popup overlay - full screen like image preview modal
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-auto transition-opacity duration-300';
            
            // Create image element - full size, no padding
            overlay.innerHTML = `
                <img src="/assets/infografis.png" alt="Contoh Hasil Infografis" class="max-w-full max-h-full object-contain">
                <button id="ig-close-example" class="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
            `;
            
            document.body.appendChild(overlay);
            
            // Trigger fade-in animation
            setTimeout(() => overlay.classList.remove('opacity-0'), 10);
            
            // Close handlers
            const closeBtn = overlay.querySelector('#ig-close-example');
            const closePopup = () => {
                overlay.classList.add('opacity-0');
                setTimeout(() => overlay.remove(), 300);
            };
            
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closePopup();
            });
            overlay.addEventListener('click', closePopup);
            
            // ESC key to close
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    closePopup();
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }
};
