window.initPosterFlyer = function({
    document,
    setupOptionButtons,
    getAspectRatioClass,
    lucide,
    getApiKey,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    // DOM Elements
    const imageInput = document.getElementById('pflyer-image-input');
    const uploadBox = document.getElementById('pflyer-upload-box');
    const preview = document.getElementById('pflyer-preview');
    const placeholder = document.getElementById('pflyer-placeholder');
    const removeBtn = document.getElementById('pflyer-remove-btn');
    const analyzingOverlay = document.getElementById('pflyer-analyzing-overlay');
    
    const topicInput = document.getElementById('pflyer-topic-input');

    const modelOptions = document.getElementById('pflyer-model-options');
    const customStyleContainer = document.getElementById('pflyer-custom-style-container');
    const customStyleInput = document.getElementById('pflyer-custom-style-input');

    const langOptions = document.getElementById('pflyer-lang-options');
    const layoutOptions = document.getElementById('pflyer-layout-options');
    const colorOptions = document.getElementById('pflyer-color-options');
    const manualColorContainer = document.getElementById('pflyer-manual-color-container');
    const manualColorInput = document.getElementById('pflyer-manual-color-input');

    const generateBtn = document.getElementById('pflyer-generate-btn');
    const generateBtnText = document.getElementById('pflyer-generate-btn-text');

    const countSlider = document.getElementById('pflyer-count-slider');
    const countValue = document.getElementById('pflyer-count-value');

    const resultsContainer = document.getElementById('pflyer-results-container');
    const resultsGrid = document.getElementById('pflyer-results-grid');
    const resultsPlaceholder = document.getElementById('pflyer-results-placeholder');

    if (!generateBtn || !topicInput) return;
    let isGenerating = false;
    let resultCardIndex = 0;
    let uploadedImageData = null;

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
    const psHint = document.getElementById('pflyer-ps-hint');
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
                ${requiresPS && !privateServerActive ? '<i data-lucide="lock" class="w-3 h-3 text-slate-400 pflyer-lock-icon"></i>' : ''}
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
    

    async function checkPfPrivateServer() {
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
    checkPfPrivateServer();
    
    // Listen for model changes
    window.addEventListener('privateServerModelChanged', function() {
        renderModelOptions(); // Re-render to sync model selection
    });

    // --- Image Upload Handler ---
    if (imageInput && uploadBox && preview && placeholder && removeBtn) {
        async function handleImageUpload(file) {
            if (!file) return;

            // 1. Show preview
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                const parts = dataUrl.split(',');
                const mimeType = parts[0].match(/:(.*?);/)[1];
                const base64 = parts[1];
                uploadedImageData = { base64, mimeType, dataUrl };
                preview.src = dataUrl;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
                removeBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(file);

            // 2. Send to /chat for auto-description (use original File, not base64 round-trip)
            if (analyzingOverlay) analyzingOverlay.classList.remove('hidden');

            try {
                const formData = new FormData();
                const analysisPrompt = lang === 'ms' 
                    ? 'Analisa gambar ini dan buat deskripsi singkat untuk poster atau flyer dalam Bahasa Malaysia. Fokus pada elemen visual utama, warna, dan tema yang cocok untuk desain poster/flyer. Maksimal 2-3 kalimat. Respond ONLY with the description text itself.'
                    : 'Analisa gambar ini dan buat deskripsi singkat untuk poster atau flyer dalam bahasa Indonesia. Fokus pada elemen visual utama, warna, dan tema yang cocok untuk desain poster/flyer. Maksimal 2-3 kalimat. Respond ONLY with the description text itself.';
                formData.append('prompt', analysisPrompt);
                formData.append('images', file);

                const response = await fetch(CHAT_URL, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': getApiKey()
                    },
                    body: formData
                });

                if (!response.ok) throw new Error('Server error: ' + response.status);
                const result = await response.json();

                if (result.success && result.response) {
                    const responseStr = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                    topicInput.value = responseStr.trim();
                    topicInput.dispatchEvent(new Event('input'));
                    updateGenerateButton();
                }
            } catch (error) {
                console.error('Failed to analyze image:', error);
            } finally {
                if (analyzingOverlay) analyzingOverlay.classList.add('hidden');
            }
        }

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageUpload(file);
        });

        // Drag & drop support
        ['dragover', 'drop', 'dragleave'].forEach(ev => {
            uploadBox.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
        });
        uploadBox.addEventListener('dragover', () => uploadBox.classList.add('border-purple-400', 'bg-purple-50'));
        uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('border-purple-400', 'bg-purple-50'));
        uploadBox.addEventListener('drop', (e) => {
            uploadBox.classList.remove('border-purple-400', 'bg-purple-50');
            const file = e.dataTransfer.files[0];
            if (file) handleImageUpload(file);
        });

        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imageInput.value = '';
            uploadedImageData = null;
            preview.src = '';
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
            removeBtn.classList.add('hidden');
        });
    }

    // Helper: Show Mini Popup
    function showLimitPopup(message) {
        const existingPopup = document.getElementById('pflyer-limit-popup');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.id = 'pflyer-limit-popup';
        popup.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg z-[9999] transition-all duration-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-4';
        popup.style.maxWidth = '90%';
        popup.style.width = 'max-content';
        popup.innerHTML = `<i data-lucide="info" class="w-3.5 h-3.5 text-yellow-400"></i><span>${message}</span>`;
        document.body.appendChild(popup);
        
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons({ root: popup });
        }

        setTimeout(() => {
            popup.classList.add('opacity-0', '-translate-y-4');
            setTimeout(() => { popup.remove(); }, 300);
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
                generateBtnText.textContent = countSlider.value > 1 ? `Buat ${countSlider.value} Poster` : 'Buat Poster / Flyer';
            }
        });
    }

    // --- Style Dropdown ---
    const styleDropdown = document.getElementById('pflyer-style-dropdown');
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
        
        function updateModelFromPrivateServer() {
            const privateModel = localStorage.getItem('private_server_model');
            if (!privateModel || privateModel === 'nanobanana') return;
            
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
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'private_server_model') {
                updateModelFromPrivateServer();
            }
        });
        window.addEventListener('privateServerModelChanged', () => {
            updateModelFromPrivateServer();
        });
        
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
    topicInput.addEventListener('change', updateGenerateButton);
    topicInput.addEventListener('keyup', updateGenerateButton);

    function updateGenerateButton() {
        const hasTopic = topicInput.value.trim().length > 0;
        const shouldDisable = !hasTopic || isGenerating;
        generateBtn.disabled = shouldDisable;
    }

    // Initial check
    updateGenerateButton();

    function getSelectedValue(container) {
        const sel = container.querySelector('.selected');
        return sel ? sel.dataset.value : null;
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

        let aspectClass = 'aspect-[9/16]';
        let maxWidthClass = 'max-w-sm';

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
                <img src="${imgUrl}" alt="Poster ${idx}" class="absolute inset-0 w-full h-full object-cover">
            </div>
            <div class="absolute bottom-2 right-2 flex gap-1">
                <button data-img-src="${imgUrl}" class="view-btn result-action-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors" title="Lihat Gambar">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <a href="${imgUrl}" download="poster_flyer_${idx}.png" class="result-action-btn download-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors" title="Unduh Gambar">
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
        let aspectClass = 'aspect-[9/16]';
        let maxWidthClass = 'max-w-sm';

        if (aspectRatio === '16:9') {
            aspectClass = 'aspect-[16/9]';
            maxWidthClass = 'max-w-2xl';
        } else if (aspectRatio === '1:1') {
            aspectClass = 'aspect-square';
            maxWidthClass = 'max-w-md';
        }

        const card = document.createElement('div');
        card.id = `pflyer-loading-card-${index}`;
        card.className = `relative rounded-2xl overflow-hidden bg-white/80 border border-slate-200 w-full flex flex-col items-center justify-center animate-pulse mx-auto ${maxWidthClass} shadow-lg`;
        
        card.innerHTML = `
            <div class="w-full ${aspectClass} flex flex-col items-center justify-center bg-slate-50">
                <div class="flex flex-col items-center justify-center gap-3 p-6 w-full text-center">
                    <div class="spinner border-4 border-purple-200 border-t-purple-600 w-8 h-8"></div>
                    <p class="text-slate-500 text-xs font-medium text-center w-full animate-pulse">Membuat poster ${index}...</p>
                </div>
            </div>
        `;
        resultsGrid.appendChild(card);
        return card;
    }

    function removeLoadingCard(index) {
        const card = document.getElementById(`pflyer-loading-card-${index}`);
        if (card) card.remove();
    }

    function markLoadingCardError(index, errorMsg) {
        const card = document.getElementById(`pflyer-loading-card-${index}`);
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

    async function generateSingle(variationPrompt, aspectRatio, apiKey, index) {
        try {
            const endpoint = getEndpointForModel();
            
            const formData = new FormData();
            formData.append('instruction', variationPrompt);
            formData.append('aspectRatio', aspectRatio);
            
            // Add uploaded image if available
            if (uploadedImageData) {
                const byteCharacters = atob(uploadedImageData.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: uploadedImageData.mimeType });
                formData.append('images', blob, 'reference.jpg');
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
            alert('Mohon masukkan deskripsi poster atau flyer.');
            return;
        }

        const styleValue = styleDropdown ? styleDropdown.value : 'Modern & Bold';
        const style = styleValue === 'Kustom' ? (customStyleInput.value.trim() || 'Modern & Bold') : styleValue;

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
            ? 'All text, titles, taglines, and descriptions in the poster/flyer MUST be written in Bahasa Indonesia.'
            : lang === 'ms'
            ? 'All text, titles, taglines, and descriptions in the poster/flyer MUST be written in Bahasa Malaysia (Malay language).'
            : 'All text, titles, taglines, and descriptions in the poster/flyer MUST be written in English.';

        const imageNote = uploadedImageData ? '\n- Reference image provided: Use visual elements, colors, and themes from the uploaded image as inspiration' : '';
        
        const instruction = `Create a professional, eye-catching poster/flyer image based on the following description:

Description: "${topic}"

Design Requirements:
- Visual Style: ${style}
- Layout: ${layout} orientation
- Color Scheme: ${colorScheme === 'auto' ? 'Choose the most suitable and eye-catching color palette for the content' : colorScheme}${imageNote}
- ${langInstruction}
- Must have a clear visual hierarchy with bold headline/title
- Include compelling typography with contrast between headline and body text
- Use high-impact visual elements, graphics, or illustrations
- Make key information (date, location, price, CTA) easy to spot
- Professional quality suitable for printing or digital distribution
- Text must be clearly readable with proper spacing
- Create a strong focal point to grab attention immediately`;

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

        for (let i = 1; i <= count; i++) {
            appendLoadingCard(i, aspectRatio);
        }

        const prompts = [];
        for (let i = 0; i < count; i++) {
            let variationPrompt = instruction;
            if (i > 0) variationPrompt += `\n(Create a unique variation #${i + 1} with different layout arrangement and visual approach)`;
            prompts.push(variationPrompt);
        }

        if (useParallel) {
            const promises = prompts.map((prompt, i) =>
                generateSingle(prompt, aspectRatio, apiKey, i + 1).then(result => {
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
            for (let i = 0; i < count; i++) {
                const result = await generateSingle(prompts[i], aspectRatio, apiKey, i + 1);
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
                    <p class="text-sm text-slate-400 mt-1 text-center max-w-xs">${firstError || 'Tidak ada poster yang dihasilkan'}</p>
                    <button id="pflyer-retry-btn" class="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200 transition-colors">Coba Lagi</button>
                </div>
            `;
            document.getElementById('pflyer-retry-btn')?.addEventListener('click', () => {
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
    const showExampleBtn = document.getElementById('pflyer-show-example-btn');
    function showExampleOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-auto transition-opacity duration-300';
        
        overlay.innerHTML = `
            <img src="/assets/posterflyer.png" alt="Contoh Hasil Poster & Flyer" class="max-w-full max-h-full object-contain rounded-2xl">
            <button id="pflyer-close-example" class="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        
        const closeBtn = overlay.querySelector('#pflyer-close-example');
        const closePopup = () => {
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.remove(), 300);
        };
        
        closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closePopup(); });
        overlay.addEventListener('click', closePopup);
        document.addEventListener('keydown', function handleEsc(e) {
            if (e.key === 'Escape') { closePopup(); document.removeEventListener('keydown', handleEsc); }
        });
    }

    if (showExampleBtn) {
        showExampleBtn.addEventListener('click', showExampleOverlay);
    }

    // --- Welcome Popup (show only if user hasn't purchased Private Server) ---
    const showWelcomePopup = () => {
        // Check if user has active Private Server addon
        const hasPrivateServer = window._psExpiresAt && window._psExpiresAt > 0 && window._psRemainingDays > 0;
        if (hasPrivateServer) {
            // User already has Private Server, don't show popup
            return;
        }
        
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[45] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
        backdrop.innerHTML = `
            <div class="pflyer-welcome-card bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform scale-95 transition-all duration-300 relative" id="pflyer-welcome-card">
                <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full -mr-10 -mt-10"></div>
                
                <div class="relative z-10">
                    <div class="pflyer-welcome-header px-5 py-4 flex items-center gap-3 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-amber-100">
                        <div class="pflyer-welcome-header__icon w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-amber-600 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2">
                                <h3 class="pflyer-welcome-header__title text-base font-bold text-slate-800">Addons: Private Server</h3>
                                <button id="pflyer-welcome-close" type="button" class="pflyer-welcome-header__close w-7 h-7 flex items-center justify-center rounded-full border border-amber-200 text-amber-600 text-xs font-semibold hover:bg-amber-100 transition-all" aria-label="Tutup">
                                    ✕
                                </button>
                            </div>
                            <p class="pflyer-welcome-header__subtitle text-xs text-slate-600 mt-0.5">Generate wajah lebih konsisten pakai model premium!</p>
                        </div>
                    </div>
                    
                    <div class="px-6 pt-5 space-y-3 mb-5">
                        <div class="flex items-start gap-3 text-sm">
                            <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 text-amber-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            </div>
                            <div>
                                <p class="font-semibold text-slate-800">Model AI Premium</p>
                                <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Akses penuh ke Nano Banana, Nano Banana Pro, Nano Banana 2, Super Grok, dan SeeDream 4.5. Pilih model terbaik sesuai kebutuhan desain Anda.</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-3 text-sm">
                            <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 text-amber-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                            </div>
                            <div>
                                <p class="font-semibold text-slate-800">Hasil Anti Typo & Profesional</p>
                                <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Desain poster & flyer berkualitas tinggi dengan akurasi teks 99%. Tidak ada lagi kesalahan penulisan yang merusak desain Anda.</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-3 text-sm">
                            <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 text-amber-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            </div>
                            <div>
                                <p class="font-semibold text-slate-800">Masa Aktif 15 Hari</p>
                                <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Hanya Rp 45.000 untuk akses penuh selama 15 hari. Investasi terbaik untuk desain profesional tanpa batas.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="px-6 pb-6">
                        <button id="pflyer-welcome-addons" class="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all hover:shadow-lg flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                            Mulai Sekarang
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => {
            backdrop.classList.remove('opacity-0');
            const card = backdrop.querySelector('#pflyer-welcome-card');
            if (card) { card.style.transform = 'scale(1)'; }
        });

        const closeWelcome = () => {
            backdrop.classList.add('opacity-0');
            const card = backdrop.querySelector('#pflyer-welcome-card');
            if (card) card.style.transform = 'scale(95%)';
            setTimeout(() => backdrop.remove(), 300);
        };

        const addonsBtn = backdrop.querySelector('#pflyer-welcome-addons');
        const closeBtn = backdrop.querySelector('#pflyer-welcome-close');

        if (addonsBtn) {
            addonsBtn.addEventListener('click', () => {
            closeWelcome();
            setTimeout(() => {
                const addonsTab = document.getElementById('tab-addons');
                if (addonsTab) addonsTab.click();
            }, 300);
        });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeWelcome();
            });
        }
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeWelcome(); });
    };
    
    // Wait for Private Server status to be checked before showing popup
    setTimeout(showWelcomePopup, 1500);
    
};
