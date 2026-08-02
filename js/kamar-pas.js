window.initKamarPas = function ({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    API_KEY,
    GENERATE_URL,
    getApiErrorMessage,
    doneSound,
    errorSound,
    getImageAspectRatio
}) {
    const kpUserInput = document.getElementById('kp-user-input');
    const kpUploadBox = document.getElementById('kp-upload-box');
    const kpPreview = document.getElementById('kp-preview');
    const kpPlaceholder = document.getElementById('kp-placeholder');
    const kpRemoveBtn = document.getElementById('kp-remove-btn');
    const kpRefInput = document.getElementById('kp-ref-input');
    const kpRefUploadBox = document.getElementById('kp-ref-upload-box');
    const kpRefPreview = document.getElementById('kp-ref-preview');
    const kpRefPlaceholder = document.getElementById('kp-ref-placeholder');
    const kpRemoveRefBtn = document.getElementById('kp-remove-ref-btn');
    const kpTextInput = document.getElementById('kp-text-input');
    const kpSearchInput = document.getElementById('kp-search-input');
    const kpModeText = document.getElementById('kp-mode-text');
    const kpModeUpload = document.getElementById('kp-mode-upload');
    const kpModeSearch = document.getElementById('kp-mode-search');
    const kpInputTextContainer = document.getElementById('kp-input-text-container');
    const kpInputUploadContainer = document.getElementById('kp-input-upload-container');
    const kpInputSearchContainer = document.getElementById('kp-input-search-container');
    const kpRatioOptions = document.getElementById('kp-ratio-options');
    const kpGenerateBtn = document.getElementById('kp-generate-btn');
    const kpResultsContainer = document.getElementById('kp-results-container');
    const kpResultsGrid = document.getElementById('kp-results-grid');
    const kpResultCountSlider = document.getElementById('kp-result-count-slider');
    const kpResultCountDisplay = document.getElementById('kp-result-count-display');

    if (kpResultCountSlider && kpResultCountDisplay) {
        kpResultCountSlider.addEventListener('input', function() {
            kpResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }
    let kpUserData = null;
    let kpRefData = null;
    let kpCurrentMode = 'text';
    function kpUpdateButtons() {
        const hasUser = !!kpUserData;
        let hasClothingInput = false;
        if (kpCurrentMode === 'text') hasClothingInput = kpTextInput.value.trim().length > 0;
        else if (kpCurrentMode === 'upload') hasClothingInput = !!kpRefData;
        else if (kpCurrentMode === 'search') hasClothingInput = kpSearchInput.value.trim().length > 0;
        kpGenerateBtn.disabled = !hasUser || !hasClothingInput;
    }
    function kpSetMode(mode) {
        kpCurrentMode = mode;
        [kpModeText, kpModeUpload, kpModeSearch].forEach(btn => {
            btn.className = "flex-1 py-2 text-xs font-semibold rounded-md text-gray-500 hover:text-gray-700 transition-all";
        });
        if (mode === 'text') kpModeText.className = "flex-1 py-2 text-xs font-semibold rounded-md bg-white shadow-sm text-teal-600 transition-all";
        if (mode === 'upload') kpModeUpload.className = "flex-1 py-2 text-xs font-semibold rounded-md bg-white shadow-sm text-teal-600 transition-all";
        if (mode === 'search') kpModeSearch.className = "flex-1 py-2 text-xs font-semibold rounded-md bg-white shadow-sm text-teal-600 transition-all";
        kpInputTextContainer.classList.toggle('hidden', mode !== 'text');
        kpInputUploadContainer.classList.toggle('hidden', mode !== 'upload');
        kpInputSearchContainer.classList.toggle('hidden', mode !== 'search');
        kpUpdateButtons();
    }
    kpModeText.addEventListener('click', () => kpSetMode('text'));
    kpModeUpload.addEventListener('click', () => kpSetMode('upload'));
    kpModeSearch.addEventListener('click', () => kpSetMode('search'));
    setupImageUpload(kpUserInput, kpUploadBox, (data) => {
        kpUserData = data;
        kpPreview.src = data.dataUrl;
        kpPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, kpRatioOptions);
        kpPreview.classList.remove('hidden');
        kpRemoveBtn.classList.remove('hidden');
        kpUpdateButtons();
    });
    kpRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        kpUserData = null;
        kpUserInput.value = '';
        kpPreview.src = '#';
        kpPreview.classList.add('hidden');
        kpPlaceholder.classList.remove('hidden');
        kpRemoveBtn.classList.add('hidden');
        document.getElementById('kp-results-placeholder').classList.remove('hidden');
        kpResultsContainer.classList.add('hidden');
        kpResultsGrid.innerHTML = '';
        kpUpdateButtons();
    });
    setupImageUpload(kpRefInput, kpRefUploadBox, (data) => {
        kpRefData = data;
        kpRefPreview.src = data.dataUrl;
        kpRefPlaceholder.classList.add('hidden');
        kpRefPreview.classList.remove('hidden');
        kpRemoveRefBtn.classList.remove('hidden');
        kpUpdateButtons();
    });
    kpRemoveRefBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        kpRefData = null;
        kpRefInput.value = '';
        kpRefPreview.src = '#';
        kpRefPreview.classList.add('hidden');
        kpRefPlaceholder.classList.remove('hidden');
        kpRemoveRefBtn.classList.add('hidden');
        kpUpdateButtons();
    });
    const kpGoogleSearchBtn = document.getElementById('kp-google-search-btn');
    if (kpGoogleSearchBtn) {
        kpGoogleSearchBtn.addEventListener('click', () => {
            const query = kpSearchInput.value.trim();
            if (query) {
                window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
            } else {
                alert("Masukkan kata kunci baju yang ingin dicari.");
            }
        });
    }
    kpTextInput.addEventListener('input', kpUpdateButtons);
    kpSearchInput.addEventListener('input', kpUpdateButtons);
    setupOptionButtons(kpRatioOptions);
    async function generateSingleKamarPasImage(id, aspectRatio) {
        const card = document.getElementById(`kp-card-${id}`);
        try {
            let clothingDesc = "";
            if (kpCurrentMode === 'text') {
                clothingDesc = kpTextInput.value.trim();
            } else if (kpCurrentMode === 'search') {
                clothingDesc = kpSearchInput.value.trim();
            } else if (kpCurrentMode === 'upload' && kpRefData) {
                clothingDesc = "The clothing shown in the SECOND image";
            }
            let prompt = `Virtual Try-On Task.
                Target: The person in the FIRST image.
                Task: Replace the person's current outfit with: ${clothingDesc}.
                CRITICAL RULES:
                1. PRESERVE IDENTITY: Do NOT change the person's face, body shape, pose, skin tone, or background. Only the clothing changes.
                2. REALISM: The new clothing must fit naturally, with correct lighting, shadows, and fabric physics.`;
            if (kpCurrentMode === 'upload' && kpRefData) {
                prompt += ` 3. REFERENCE: Strictly match the style, color, and texture of the clothing from the SECOND image provided.`;
            }
            prompt += ` This is variation ${id}.`;

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
            formData.append('images[]', base64ToBlob(kpUserData.base64, kpUserData.mimeType));

            if (kpCurrentMode === 'upload' && kpRefData) {
                formData.append('images[]', base64ToBlob(kpRefData.base64, kpRefData.mimeType));
            }

            formData.append('instruction', prompt);
            if (aspectRatio !== 'Auto') {
                formData.append('aspectRatio', aspectRatio);
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

            if (!result.success || !result.imageUrl) {
                throw new Error("No image data received from API.");
            }
            const imageUrl = result.imageUrl;
            card.innerHTML = `
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <a href="${imageUrl}" download="fitting_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>`;
            card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio !== 'Auto' ? aspectRatio : '1:1')}`;
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error for Kamar Pas card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }
    kpGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = kpGenerateBtn.innerHTML;
        kpGenerateBtn.disabled = true;
        kpGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Sedang Fitting...</span>`;
        document.getElementById('kp-results-placeholder').classList.add('hidden');
        let selectedRatioValue = kpRatioOptions.querySelector('.selected').dataset.value;
        let apiAspectRatio = selectedRatioValue;
        let autoRatio = 1;
        if (selectedRatioValue === 'Auto') {
            try {
                const ratio = await getImageAspectRatio(kpUserData);
                autoRatio = ratio;
            } catch {
                autoRatio = 1;
            }
        }
        kpResultsContainer.classList.remove('hidden');
        kpResultsGrid.innerHTML = '';
        
        const resultCount = kpResultCountSlider ? parseInt(kpResultCountSlider.value) : 1;
        kpResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-4 md:gap-5`;

        for (let i = 1; i <= resultCount; i++) {
            const card = document.createElement('div');
            card.id = `kp-card-${i}`;
            card.className = `card overflow-hidden bg-gray-100 flex items-center justify-center`;
            if (selectedRatioValue !== 'Auto') {
                card.classList.add(getAspectRatioClass(selectedRatioValue));
            } else {
                card.style.aspectRatio = `${autoRatio}`;
            }
            card.innerHTML = `<div class="spinner"></div>`;
            kpResultsGrid.appendChild(card);
        }
        lucide.createIcons();
        const generationPromises = Array.from({ length: resultCount }, (_, i) => i + 1).map(i => generateSingleKamarPasImage(i, apiAspectRatio));
        await Promise.allSettled(generationPromises);
        kpGenerateBtn.disabled = false;
        kpGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });
};
