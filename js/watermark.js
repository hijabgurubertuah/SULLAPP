window.initWatermark = function(ctx = {}) {
    const {
        document = window.document,
        API_KEY = window.API_KEY,
        GENERATE_URL = window.GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound,
        switchTab,
        convertHeicToJpg,
        autoSelectClosestRatio,
        lucide = window.lucide
    } = ctx;

    const tabWatermark = document.getElementById('tab-watermark');
    if (tabWatermark) {
        tabWatermark.addEventListener('click', () => {
             if (typeof switchTab === 'function') switchTab('watermark');
        });

        const wmModeOptions = document.getElementById('wm-mode-options');
        const wmUploadInput = document.getElementById('wm-upload-input');
        const wmPlaceholder = document.getElementById('wm-upload-placeholder');
        const wmPreviewContainer = document.getElementById('wm-preview-container');
        const wmPreviewImg = document.getElementById('wm-preview-img');
        const wmRemoveImg = document.getElementById('wm-remove-img');
        const wmAddControls = document.getElementById('wm-add-controls');
        const wmTextInput = document.getElementById('wm-text-input');
        const wmOpacitySlider = document.getElementById('wm-opacity-slider');
        const wmOpacityValue = document.getElementById('wm-opacity-value');
        const wmRatioOptions = document.getElementById('wm-ratio-options');
        const wmGenerateBtn = document.getElementById('wm-generate-btn');
        const wmResultsGrid = document.getElementById('wm-results-grid');
        const wmResultsPlaceholder = document.getElementById('wm-results-placeholder');

        const wmAddType = document.getElementById('wm-add-type');
        const wmLogoInput = document.getElementById('wm-logo-input');
        const wmLogoPlaceholder = document.getElementById('wm-logo-placeholder');
        const wmLogoPreviewContainer = document.getElementById('wm-logo-preview-container');
        const wmLogoPreview = document.getElementById('wm-logo-preview');
        const wmRemoveLogo = document.getElementById('wm-remove-logo');
        const wmTextInputContainer = document.getElementById('wm-text-input-container');
        const wmLogoUploadContainer = document.getElementById('wm-logo-upload-container');

        let wmMode = 'remove';
        let wmImageData = null;
        let wmLogoData = null;

        if (wmModeOptions) {
            wmModeOptions.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                wmModeOptions.querySelectorAll('button').forEach(b => {
                    b.classList.remove('selected', 'bg-white', 'shadow-sm');
                    b.classList.add('text-slate-500');
                });
                btn.classList.add('selected', 'bg-white', 'shadow-sm');
                btn.classList.remove('text-slate-500');
                wmMode = btn.dataset.mode;
                if (wmAddControls) wmAddControls.classList.toggle('hidden', wmMode === 'remove');
                const btnText = document.getElementById('wm-btn-text');
                if (btnText) btnText.textContent = wmMode === 'remove' ? 'Hapus Watermark' : 'Tambah Watermark';

                const posSizeContainer = document.getElementById('wm-pos-size-container');
                if (posSizeContainer) posSizeContainer.classList.toggle('hidden', wmMode === 'remove');
            });
        }

        if (wmAddType) {
            wmAddType.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                wmAddType.querySelectorAll('button').forEach(b => {
                    b.classList.remove('selected', 'bg-white', 'shadow-sm');
                    b.classList.add('text-slate-500');
                });
                btn.classList.add('selected', 'bg-white', 'shadow-sm');
                btn.classList.remove('text-slate-500');

                const isText = btn.dataset.type === 'text';
                if (wmTextInputContainer) wmTextInputContainer.classList.toggle('hidden', !isText);
                if (wmLogoUploadContainer) wmLogoUploadContainer.classList.toggle('hidden', isText);
            });
        }

        const wmCountSlider = document.getElementById('wm-count-slider');
        const wmCountValue = document.getElementById('wm-count-value');

        const wmScaleSlider = document.getElementById('wm-scale-slider');
        const wmScaleValue = document.getElementById('wm-scale-value');

        if (wmScaleSlider && wmScaleValue) {
            wmScaleSlider.addEventListener('input', (e) => {
                wmScaleValue.textContent = `${e.target.value}%`;
            });
        }

        if (wmOpacitySlider && wmOpacityValue) {
            wmOpacitySlider.addEventListener('input', (e) => {
                wmOpacityValue.textContent = `${e.target.value}%`;
            });
        }

        if (wmCountSlider && wmCountValue) {
            wmCountSlider.addEventListener('input', (e) => {
                wmCountValue.textContent = e.target.value;
            });
        }

        if (wmUploadInput) {
            wmUploadInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const processed = await convertHeicToJpg(file);
                const reader = new FileReader();
                reader.onload = (ev) => {
                    wmImageData = { mimeType: file.type, base64: ev.target.result.split(',')[1], dataUrl: ev.target.result };
                    if (wmPreviewImg) wmPreviewImg.src = wmImageData.dataUrl;
                    if (wmPlaceholder) wmPlaceholder.classList.add('hidden');
                    if (wmPreviewContainer) wmPreviewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(processed);
            });
        }

        if (wmRemoveImg) {
            wmRemoveImg.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                wmImageData = null; wmUploadInput.value = '';
                if (wmPlaceholder) wmPlaceholder.classList.remove('hidden');
                if (wmPreviewContainer) wmPreviewContainer.classList.add('hidden');
            });
        }

        if (wmLogoInput) {
            wmLogoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    wmLogoData = { mimeType: file.type, base64: ev.target.result.split(',')[1], dataUrl: ev.target.result };
                    if (wmLogoPreview) wmLogoPreview.src = wmLogoData.dataUrl;
                    if (wmLogoPlaceholder) wmLogoPlaceholder.classList.add('hidden');
                    if (wmLogoPreviewContainer) wmLogoPreviewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            });
        }

        if (wmRemoveLogo) {
            wmRemoveLogo.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                wmLogoData = null; wmLogoInput.value = '';
                if (wmLogoPlaceholder) wmLogoPlaceholder.classList.remove('hidden');
                if (wmLogoPreviewContainer) wmLogoPreviewContainer.classList.add('hidden');
            });
        }

        if (wmRatioOptions) {
            wmRatioOptions.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn) {
                    wmRatioOptions.querySelectorAll('button').forEach(b => {
                        b.classList.remove('selected', 'bg-white', 'shadow-sm', 'font-semibold');
                        b.classList.add('text-slate-500', 'font-medium');
                    });
                    btn.classList.add('selected', 'bg-white', 'shadow-sm', 'font-semibold');
                    btn.classList.remove('text-slate-500', 'font-medium');
                }
            });
        }

        if (wmGenerateBtn) {
            wmGenerateBtn.addEventListener('click', async () => {
                if (!wmImageData) {
                    alert("Mohon unggah foto terlebih dahulu.");
                    return;
                }

                const addType = wmAddType ? (wmAddType.querySelector('.selected')?.dataset.type || 'text') : 'text';
                if (wmMode === 'add') {
                    if (addType === 'text' && !wmTextInput.value.trim()) {
                        alert("Mohon isi teks watermark.");
                        return;
                    }
                    if (addType === 'image' && !wmLogoData) {
                        alert("Mohon unggah logo terlebih dahulu.");
                        return;
                    }
                }

                const originalHTML = wmGenerateBtn.innerHTML;
                wmGenerateBtn.disabled = true;
                wmGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');
                wmGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Memproses...</span>`;

                if (wmResultsPlaceholder) wmResultsPlaceholder.classList.add('hidden');
                let aspectClass = 'aspect-video';
                if (wmRatioOptions) {
                    const ratio = wmRatioOptions.querySelector('.selected').dataset.value;
                    if (ratio === '1:1') aspectClass = 'aspect-square';
                    else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                    else if (ratio === '16:9') aspectClass = 'aspect-video';
                    else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                } else if (wmImageData && wmImageData.width && wmImageData.height) {
                    const ratioNum = wmImageData.width / wmImageData.height;
                    if (Math.abs(ratioNum - 1) < 0.1) aspectClass = 'aspect-square';
                    else if (ratioNum > 1.2) aspectClass = 'aspect-video';
                    else aspectClass = 'aspect-[9/16]';
                }

                if (wmResultsGrid) {
                    wmResultsGrid.classList.remove('hidden');
                    wmResultsGrid.innerHTML = `
                        <div class="card bg-slate-50 border border-slate-200 ${aspectClass} w-full flex flex-col items-center justify-center gap-3 animate-pulse">
                            <div class="spinner"></div>
                            <span class="text-sm font-semibold text-slate-500 font-premium">AI sedang bekerja...</span>
                        </div>
                    `;
                }

                try {
                    const ratio = wmRatioOptions ? wmRatioOptions.querySelector('.selected').dataset.value : 'Auto';
                    const opacity = wmOpacitySlider ? wmOpacitySlider.value : 70;
                    const text = wmTextInput ? wmTextInput.value.trim() : '';

                    const base64ToBlob = (base64, mimeType) => {
                        const byteCharacters = atob(base64);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        return new Blob([byteArray], { type: mimeType });
                    };

                    if (wmMode === 'remove') {
                        let attempts = 0;
                        const maxAttempts = 5;
                        let success = false;

                        while (attempts < maxAttempts && !success) {
                            attempts++;
                            if (attempts > 1) {
                                wmGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Coba lagi (${attempts}/${maxAttempts})...</span>`;
                            }

                            const formData = new FormData();
                            formData.append('images[]', base64ToBlob(wmImageData.base64, wmImageData.mimeType));
                            formData.append('instruction', "hapus bagian menganggu pada foto");
                            if (ratio && ratio !== 'Auto') {
                                formData.append('aspectRatio', ratio);
                            }

                            try {
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
                                    const resUrl = result.imageUrl;
                                    if (wmResultsGrid) {
                                        wmResultsGrid.innerHTML = `
                                            <div class="card overflow-hidden relative group bg-white border border-slate-200 ${aspectClass}">
                                                <img src="${resUrl}" class="w-full h-full object-contain cursor-pointer" onclick="window.openTiImagePreview('${resUrl}')">
                                                <div class="absolute bottom-3 right-3 flex gap-2 transition-all duration-300">
                                                    <button onclick="window.openTiImagePreview('${resUrl}')" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Lihat Fullscreen">
                                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                                    </button>
                                                    <a href="${resUrl}" download="clean_${Date.now()}.png" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Unduh Gambar">
                                                        <i data-lucide="download" class="w-4 h-4"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        `;
                                    }
                                    if (doneSound) doneSound.play();
                                    success = true;
                                    return;
                                }
                            } catch (e) {
                                console.warn(`Percobaan ${attempts}`, e);
                                if (attempts === maxAttempts) throw e;
                            }
                        }
                        if (!success) throw new Error("Gagal menghapus watermark, silahkan coba lagi.");
                    } else {
                        const addType = document.querySelector('#wm-add-type .selected')?.dataset.type || 'text';
                        const position = document.getElementById('wm-position-select').value;
                        const scale = document.getElementById('wm-scale-slider').value;
                        const count = document.getElementById('wm-count-slider')?.value || 1;

                        const addPrompt = `ADVERTISING TASK: Add professional watermarks. 
                            Type: ${addType}. 
                            Content: ${addType === 'text' ? `Text "${text}"` : 'the provided logo/image'}. 
                            Opacity: ${opacity}%. 
                            Position: ${position}. 
                            Quantity: 1 watermark(s).
                            Scaled Size: ${scale}% of main image. 
                            Instructions: First, clean any existing sample markings or old watermarks. Then, add the NEW watermark(s) professionally as requested. It should look like high-quality official company branding.`;

                        const processPromises = [];
                        let successCount = 0;

                        if (wmResultsGrid) {
                            wmResultsGrid.className = `grid ${getResultGridCols(count)} gap-4 w-full`;
                            wmResultsGrid.innerHTML = '';
                        }

                        for (let i = 0; i < count; i++) {
                            const cardId = 'wm-result-' + i;
                            const card = document.createElement('div');
                            card.id = cardId;
                            card.className = `card overflow-hidden relative group bg-white border border-slate-200 flex flex-col items-center justify-center min-h-[300px] ${aspectClass}`;
                            card.innerHTML = `<div class="spinner"></div><p class="text-xs text-slate-400 mt-2">Sedang memproses ${i + 1}...</p>`;
                            if (wmResultsGrid) wmResultsGrid.appendChild(card);

                            const promise = (async () => {
                                try {
                                    const formData = new FormData();
                                    
                                    if (addType === 'text') {
                                        formData.append('images[]', base64ToBlob(wmImageData.base64, wmImageData.mimeType));
                                    } else {
                                        formData.append('images[]', base64ToBlob(wmImageData.base64, wmImageData.mimeType));
                                        formData.append('images[]', base64ToBlob(wmLogoData.base64, wmLogoData.mimeType));
                                    }

                                    formData.append('instruction', addPrompt);
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
                                        const resUrl = result.imageUrl;
                                        card.innerHTML = `
                                                <img src="${resUrl}" class="w-full h-full object-contain cursor-pointer" onclick="window.openTiImagePreview('${resUrl}')">
                                                <div class="absolute bottom-3 right-3 flex gap-2 transition-all duration-300">
                                                    <button onclick="window.openTiImagePreview('${resUrl}')" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Lihat Fullscreen">
                                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                                    </button>
                                                    <a href="${resUrl}" download="watermark_${wmMode}_${Date.now()}_${i}.png" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Unduh Gambar">
                                                        <i data-lucide="download" class="w-4 h-4"></i>
                                                    </a>
                                                </div>
                                        `;
                                        if (window.lucide) window.lucide.createIcons();
                                        successCount++;
                                    } else {
                                        throw new Error("Gagal menerima data gambar dari AI.");
                                    }
                                } catch (error) {
                                    console.error(error);
                                    card.innerHTML = `<div class="text-center p-4 text-red-500 text-xs">${error.message}</div>`;
                                }
                            })();
                            processPromises.push(promise);
                        }

                        await Promise.all(processPromises);
                        if (successCount > 0 && typeof doneSound !== 'undefined' && doneSound) doneSound.play();
                        else if (successCount === 0 && typeof errorSound !== 'undefined' && errorSound) errorSound.play();
                    }

                } catch (err) {
                    console.error(err);
                    if (errorSound) errorSound.play();
                    if (wmResultsGrid) {
                        wmResultsGrid.innerHTML = `<div class="text-xs text-red-500 p-6 text-center bg-red-50 rounded-2xl border border-red-100">${err.message}</div>`;
                    }
                } finally {
                    wmGenerateBtn.disabled = false;
                    wmGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
                    wmGenerateBtn.innerHTML = originalHTML;
                    if (lucide) lucide.createIcons();
                }
            });
        }
    }
};
