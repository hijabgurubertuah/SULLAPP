window.initPOVSelfie = function(ctx = {}) {
    const {
        document = window.document,
        API_KEY = window.API_KEY,
        GENERATE_URL = window.GENERATE_URL,
        setupImageUpload = window.setupImageUpload,
        setupOptionButtons = window.setupOptionButtons,
        autoSelectClosestRatio,
        lucide = window.lucide,
        doneSound = window.doneSound,
        errorSound = window.errorSound,
        switchTab = window.switchTab
    } = ctx;

    const tabPOVSelfie = document.getElementById('tab-pov-selfie');
    if (tabPOVSelfie) {
        tabPOVSelfie.addEventListener('click', () => {
            if (typeof switchTab === 'function') switchTab('pov-selfie');
        });
    }

    const povsAutoModelToggle = document.getElementById('povs-auto-model-toggle');
    const povsModelUploadContainer = document.getElementById('povs-model-upload-container');
    const povsModelInput = document.getElementById('povs-model-input');
    const povsModelUploadBox = document.getElementById('povs-model-upload-box');
    const povsModelPreview = document.getElementById('povs-model-preview');
    const povsModelPlaceholder = document.getElementById('povs-model-placeholder');
    const povsModelRemoveBtn = document.getElementById('povs-model-remove-btn');

    const povsModeOptions = document.getElementById('povs-mode-options');
    const povsItemLabel = document.getElementById('povs-item-label');
    const povsItemInput = document.getElementById('povs-item-input');
    const povsItemUploadBox = document.getElementById('povs-item-upload-box');
    const povsItemPreview = document.getElementById('povs-item-preview');
    const povsItemPlaceholder = document.getElementById('povs-item-placeholder');
    const povsItemRemoveBtn = document.getElementById('povs-item-remove-btn');

    const povsLocationSelect = document.getElementById('povs-location-select');
    const povsLocationCustomContainer = document.getElementById('povs-location-custom-container');
    const povsLocationCustomInput = document.getElementById('povs-location-custom-input');

    const povsPoseSelect = document.getElementById('povs-pose-select');
    const povsPoseCustomContainer = document.getElementById('povs-pose-custom-container');
    const povsPoseCustomInput = document.getElementById('povs-pose-custom-input');

    const povsCountSlider = document.getElementById('povs-count-slider');
    const povsCountValue = document.getElementById('povs-count-value');
    const povsAdditionalInput = document.getElementById('povs-additional-input');
    const povsRatioOptions = document.getElementById('povs-ratio-options');
    const povsGenerateBtn = document.getElementById('povs-generate-btn');

    const povsResultsPlaceholder = document.getElementById('povs-results-placeholder');
    const povsResultsGrid = document.getElementById('povs-results-grid');

    let povsModelData = null;
    let povsItemData = null;

    function povsUpdateGenerateButton() {
        const isAutoModel = povsAutoModelToggle?.checked;
        const hasModel = isAutoModel || povsModelData;
        const hasItem = povsItemData;
        if (povsGenerateBtn) {
            povsGenerateBtn.disabled = !(hasModel && hasItem);
        }
    }

    if (povsAutoModelToggle) {
        povsAutoModelToggle.addEventListener('change', () => {
            if (povsAutoModelToggle.checked) {
                povsModelUploadContainer.classList.add('hidden');
            } else {
                povsModelUploadContainer.classList.remove('hidden');
            }
            povsUpdateGenerateButton();
        });
    }

    if (povsModelInput && povsModelUploadBox && typeof setupImageUpload === 'function') {
        setupImageUpload(povsModelInput, povsModelUploadBox, (data) => {
            povsModelData = data;
            povsModelPreview.src = data.dataUrl;
            povsModelPlaceholder.classList.add('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, povsRatioOptions);
            povsModelPreview.classList.remove('hidden');
            povsModelRemoveBtn.classList.remove('hidden');
            povsUpdateGenerateButton();
        });
    }

    if (povsModelRemoveBtn) {
        povsModelRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            povsModelData = null;
            povsModelInput.value = '';
            povsModelPreview.src = '#';
            povsModelPreview.classList.add('hidden');
            povsModelPlaceholder.classList.remove('hidden');
            povsModelRemoveBtn.classList.add('hidden');
            povsUpdateGenerateButton();
        });
    }

    if (povsModeOptions && typeof setupOptionButtons === 'function') {
        setupOptionButtons(povsModeOptions);
        povsModeOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const mode = button.dataset.value;
            if (mode === 'produk') {
                povsItemLabel.innerHTML = `<span class="w-5 h-5 rounded-full text-white flex items-center justify-center text-xs" style="background: var(--sidebar-bg);">3</span> Foto Produk`;
                povsItemPlaceholder.innerHTML = `<i data-lucide="package" class="mx-auto h-10 w-10 mb-2"></i><p class="text-xs">Klik / Seret foto produk</p>`;
            } else {
                povsItemLabel.innerHTML = `<span class="w-5 h-5 rounded-full text-white flex items-center justify-center text-xs" style="background: var(--sidebar-bg);">3</span> Foto Pakaian`;
                povsItemPlaceholder.innerHTML = `<i data-lucide="shirt" class="mx-auto h-10 w-10 mb-2"></i><p class="text-xs">Klik / Seret foto pakaian</p>`;
            }
            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        });
    }

    if (povsItemInput && povsItemUploadBox && typeof setupImageUpload === 'function') {
        setupImageUpload(povsItemInput, povsItemUploadBox, (data) => {
            povsItemData = data;
            povsItemPreview.src = data.dataUrl;
            povsItemPlaceholder.classList.add('hidden');
            povsItemPreview.classList.remove('hidden');
            povsItemRemoveBtn.classList.remove('hidden');
            povsUpdateGenerateButton();
        });
    }

    if (povsItemRemoveBtn) {
        povsItemRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            povsItemData = null;
            povsItemInput.value = '';
            povsItemPreview.src = '#';
            povsItemPreview.classList.add('hidden');
            povsItemPlaceholder.classList.remove('hidden');
            povsItemRemoveBtn.classList.add('hidden');
            povsUpdateGenerateButton();
        });
    }

    if (povsLocationSelect) {
        povsLocationSelect.addEventListener('change', () => {
            if (povsLocationSelect.value === 'custom') {
                povsLocationCustomContainer.classList.remove('hidden');
                povsLocationCustomInput.focus();
            } else {
                povsLocationCustomContainer.classList.add('hidden');
            }
        });
    }

    if (povsPoseSelect) {
        povsPoseSelect.addEventListener('change', () => {
            if (povsPoseSelect.value === 'custom') {
                povsPoseCustomContainer.classList.remove('hidden');
                povsPoseCustomInput.focus();
            } else {
                povsPoseCustomContainer.classList.add('hidden');
            }
        });
    }

    if (povsCountSlider && povsCountValue) {
        povsCountSlider.addEventListener('input', () => {
            povsCountValue.textContent = povsCountSlider.value;
        });
    }

    if (povsRatioOptions && typeof setupOptionButtons === 'function') {
        setupOptionButtons(povsRatioOptions);
    }

    if (povsGenerateBtn) {
        povsGenerateBtn.addEventListener('click', async () => {
            const isAutoModel = povsAutoModelToggle?.checked;
            if (!isAutoModel && !povsModelData) {
                alert("Mohon unggah foto model atau aktifkan Auto Model.");
                return;
            }
            if (!povsItemData) {
                alert("Mohon unggah foto produk/pakaian.");
                return;
            }

            const mode = povsModeOptions.querySelector('.selected')?.dataset.value || 'produk';
            const modeLabel = mode === 'produk' ? 'Produk' : 'Fashion';
            const modeLabelEn = mode === 'produk' ? 'product' : 'clothing/fashion item';
            let location = povsLocationSelect.value === 'custom'
                ? (povsLocationCustomInput.value.trim() || 'Ruang tamu rumah yang nyaman')
                : povsLocationSelect.value;
            let locationLabel = povsLocationSelect.value === 'custom'
                ? povsLocationCustomInput.value.trim()
                : povsLocationSelect.options[povsLocationSelect.selectedIndex].text;
            let pose = povsPoseSelect.value === 'custom'
                ? (povsPoseCustomInput.value.trim() || 'Selfie casual dengan produk')
                : povsPoseSelect.value;
            
            const count = parseInt(povsCountSlider.value) || 1;
            const additionalInstructions = povsAdditionalInput.value.trim();
            const ratio = povsRatioOptions.querySelector('.selected')?.dataset.value || '1:1';

            const originalBtnHTML = povsGenerateBtn.innerHTML;
            const originalBtnStyle = povsGenerateBtn.style.background;

            povsGenerateBtn.disabled = true;
            povsGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Menganalisis Gambar...</span>`;
            povsGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');

            try {
                povsResultsPlaceholder.classList.add('hidden');
                povsResultsGrid.classList.remove('hidden');
                povsResultsGrid.className = `grid gap-4 ${getResultGridCols(count)}`;
                povsResultsGrid.innerHTML = '';

                for (let i = 0; i < count; i++) {
                    const placeholder = document.createElement('div');
                    placeholder.id = `povs-result-${i}`;
                    let aspectClass = 'aspect-square';
                    if (ratio === '16:9') aspectClass = 'aspect-video';
                    else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                    else if (ratio === '3:4') aspectClass = 'aspect-[3/4]';
                    else if (ratio === '4:3') aspectClass = 'aspect-[4/3]';

                    placeholder.className = `card ${aspectClass} w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 relative overflow-hidden`;
                    placeholder.innerHTML = `
                                <div class="text-center p-4">
                                    <div class="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
                                        <div class="spinner"></div>
                                    </div>
                                    <p class="text-xs text-slate-600 font-semibold">Variasi ${i + 1}</p>
                                    <p id="povs-status-${i}" class="text-[10px] text-teal-600 mt-1">
                                        Sedang memproses gambar...
                                    </p>
                                </div>
                            `;
                    povsResultsGrid.appendChild(placeholder);
                }
                if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

                povsGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Membuat POV Selfie...</span>`;

                const generateSinglePOVSelfie = async (index) => {
                    const card = document.getElementById(`povs-result-${index}`);
                    const conceptTitle = `Variasi ${index + 1}`;
                    const conceptDesc = `${modeLabel} di ${locationLabel}`;

                    try {
                        let prompt = '';
                        let endpoint = '';

                        const base64ToBlob = (base64, mimeType) => {
                            const byteCharacters = atob(base64);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            return new Blob([byteArray], { type: mimeType });
                        };

                        const formData = new FormData();

                        const basePrompt = `Create a professional POV selfie photo:
- Subject: ${modeLabelEn}
- Location: ${location}
- Pose: ${pose}
${additionalInstructions ? `- Additional Instructions: ${additionalInstructions}` : ''}

Ensure the image is photorealistic, high quality, and naturally lit. The POV style should be authentic.
Variation ${index + 1}.`;

                        if (isAutoModel) {
                            endpoint = '/generate';
                            prompt = `${basePrompt}
CRITICAL:
1. Generate an attractive, photorealistic human model.
2. The ${modeLabelEn} from the input image must be clearly visible and preserved in detail.
3. Integrate the ${modeLabelEn} naturally into the scene.`;
                            formData.append('images[]', base64ToBlob(povsItemData.base64, povsItemData.mimeType));
                        } else {
                            endpoint = '/generate';
                            prompt = `${basePrompt}
CRITICAL:
1. PRESERVE FACE: The person's face from the uploaded model image must be preserved exactly.
2. PRESERVE ITEM: The ${modeLabelEn} from the uploaded item image must be preserved exactly.
3. The model should be interacting with or wearing the ${modeLabelEn} naturally.`;
                            formData.append('images[]', base64ToBlob(povsModelData.base64, povsModelData.mimeType));
                            formData.append('images[]', base64ToBlob(povsItemData.base64, povsItemData.mimeType));
                        }

                        formData.append('instruction', prompt);
                        if (ratio && ratio !== 'Auto') {
                            formData.append('aspectRatio', ratio);
                        }

                        const response = await fetch(`${GENERATE_URL}`, {
                            method: 'POST',
                            headers: {
                                'X-API-Key': API_KEY
                            },
                            body: formData
                        });

                        if (!response.ok) throw new Error(await getApiErrorMessage(response));

                        const result = await response.json();

                        if (result.success && result.imageUrl) {
                            const imageUrl = result.imageUrl;
                            const previewFn = (typeof window.openTiImagePreview === 'function') ? `window.openTiImagePreview('${imageUrl}')` : `window.open('${imageUrl}', '_blank')`;

                            card.className = 'card overflow-hidden relative bg-white group';
                            card.style.height = 'auto';
                            card.innerHTML = `
                                        <img src="${imageUrl}" class="w-full h-full object-contain shadow-sm cursor-pointer" onclick="${previewFn}">
                                        <div class="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent p-3 pointer-events-none">
                                            <div class="flex items-center gap-2">
                                                <span class="bg-teal-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">${modeLabel}</span>
                                                <span class="text-white text-xs font-semibold drop-shadow-md truncate">${conceptTitle}</span>
                                            </div>
                                            <div class="flex items-center gap-2 mt-1 text-[10px] text-white/80">
                                                <span class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i>${locationLabel}</span>
                                            </div>
                                        </div>
                                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                            <div class="flex items-center justify-between">
                                                <p class="text-[10px] text-white/90 font-medium truncate flex-1 mr-2">${conceptDesc}</p>
                                                <div class="flex gap-1.5 flex-shrink-0">
                                                    <button onclick="${previewFn}" class="bg-white/95 backdrop-blur-sm text-slate-700 hover:bg-white p-2 rounded-full shadow-lg transition-all hover:scale-105" title="Lihat">
                                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                                    </button>
                                                    <a href="${imageUrl}" download="pov_selfie_${Date.now()}_${index}.png" class="bg-teal-500 hover:bg-teal-600 text-white p-2 rounded-full shadow-lg transition-all hover:scale-105" title="Unduh">
                                                        <i data-lucide="download" class="w-4 h-4"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    `;

                            if (doneSound) doneSound.play();
                        } else {
                            throw new Error("Gagal membuat gambar (No URL returned).");
                        }
                    } catch (e) {
                        console.error(e);
                        card.innerHTML = `
                                    <div class="text-center p-4">
                                        <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                                            <i data-lucide="alert-circle" class="w-6 h-6 text-red-500"></i>
                                        </div>
                                        <p class="text-xs text-red-600 font-bold">${conceptTitle}</p>
                                        <p class="text-[10px] text-red-400 mt-1 break-words px-2">${e.message}</p>
                                    </div>
                                `;
                    }
                    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
                };

                const promises = [];
                for (let i = 0; i < count; i++) promises.push(generateSinglePOVSelfie(i));
                await Promise.allSettled(promises);

            } catch (e) {
                if (errorSound) errorSound.play();
                alert("Terjadi kesalahan: " + e.message);
            } finally {
                povsGenerateBtn.disabled = false;
                povsGenerateBtn.innerHTML = originalBtnHTML;
                povsGenerateBtn.style.background = originalBtnStyle;
                povsGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
                if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
            }
        });
    }
};
