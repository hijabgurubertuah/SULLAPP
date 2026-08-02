window.initPerbaikiFoto = function (ctx) {
    const {
        document,
        setupImageUpload,
        setupOptionButtons,
        getAspectRatioClass,
        lucide,
        getApiKey,
        GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound,
        autoSelectClosestRatio
    } = ctx;

    const efContentEnhance = document.getElementById('ef-content-enhance');
    const pfImageInput = document.getElementById('pf-image-input');
    const pfUploadBox = document.getElementById('pf-upload-box');
    const pfPreview = document.getElementById('pf-preview');
    const pfPlaceholder = document.getElementById('pf-placeholder');
    const pfRemoveBtn = document.getElementById('pf-remove-btn');
    const pfRatioOptions = document.getElementById('pf-ratio-options');
    const pfGenerateBtn = document.getElementById('pf-generate-btn');
    const pfResultsContainer = document.getElementById('pf-results-container');
    const pfResultsGrid = document.getElementById('pf-results-grid');
    const pfResultsPlaceholder = document.getElementById('pf-results-placeholder');
    const pfAdditionalInstruction = document.getElementById('pf-additional-instruction');
    const pfResultCountSlider = document.getElementById('pf-result-count-slider');
    const pfResultCountDisplay = document.getElementById('pf-result-count-display');

    if (!pfImageInput || !pfUploadBox || !pfPreview || !pfPlaceholder || !pfRemoveBtn || !pfRatioOptions || !pfGenerateBtn || !pfResultsContainer || !pfResultsGrid) {
        return null;
    }

    let pfImageData = null;

    function showEnhanceTab() {
        if (efContentEnhance) efContentEnhance.classList.remove('hidden');
    }

    function pfUpdateButtons() {
        pfGenerateBtn.disabled = !pfImageData;
    }

    function setPfImage(data) {
        pfImageData = data;
        pfPreview.src = data.dataUrl;
        pfPlaceholder.classList.add('hidden');
        pfPreview.classList.remove('hidden');
        pfRemoveBtn.classList.remove('hidden');
        pfUpdateButtons();
    }

    setupImageUpload(pfImageInput, pfUploadBox, (data) => {
        setPfImage(data);
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, pfRatioOptions);
    });
    setupOptionButtons(pfRatioOptions);

    if (pfResultCountSlider && pfResultCountDisplay) {
        pfResultCountSlider.addEventListener('input', () => {
            let val = parseInt(pfResultCountSlider.value);
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;

            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                pfResultCountSlider.value = 1;
                val = 1;
            }
            pfResultCountDisplay.textContent = `${val} Gambar`;
        });
    }

    pfRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pfImageData = null;
        pfImageInput.value = '';
        pfPreview.src = '#';
        pfPreview.classList.add('hidden');
        pfPlaceholder.classList.remove('hidden');
        pfRemoveBtn.classList.add('hidden');
        pfUpdateButtons();
        if (pfResultsPlaceholder) pfResultsPlaceholder.classList.remove('hidden');
        pfResultsContainer.classList.add('hidden');
        pfResultsGrid.innerHTML = '';
    });

    pfGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = pfGenerateBtn.innerHTML;
        pfGenerateBtn.disabled = true;
        pfGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Memperbaiki...</span>`;
        if (pfResultsPlaceholder) pfResultsPlaceholder.classList.add('hidden');
        const aspectRatio = pfRatioOptions.querySelector('.selected').dataset.value;
        const aspectClass = getAspectRatioClass(aspectRatio);
        pfResultsContainer.classList.remove('hidden');
        const resultCount = pfResultCountSlider ? parseInt(pfResultCountSlider.value) : 1;
        pfResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-4 md:gap-6`;
        pfResultsGrid.innerHTML = '';
        for (let i = 1; i <= resultCount; i++) {
            const card = document.createElement('div');
            card.id = `pf-card-${i}`;
            card.className = `card overflow-hidden transition-all ${aspectClass} bg-gray-100 flex items-center justify-center`;
            card.innerHTML = `<div class="spinner"></div>`;
            pfResultsGrid.appendChild(card);
        }
        lucide.createIcons();
        const generationPromises = Array.from({length: resultCount}, (_, i) => i + 1).map(i => generateEnhancedImage(i, aspectRatio));
        await Promise.allSettled(generationPromises);
        pfGenerateBtn.disabled = false;
        pfGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });

    async function generateEnhancedImage(id, aspectRatio) {
        const card = document.getElementById(`pf-card-${id}`);
        if (!card) return;
        try {
            let instruction = pfAdditionalInstruction ? pfAdditionalInstruction.value.trim() : '';
            let prompt = `Enhance this image to professional studio portrait quality. Improve lighting, sharpness, and color balance. Make it look like a high-resolution photograph.`;
            if (instruction) {
                prompt += ` Additional instruction: ${instruction}.`;
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
            formData.append('images', base64ToBlob(pfImageData.base64, pfImageData.mimeType));
            formData.append('instruction', prompt);
            formData.append('aspectRatio', aspectRatio);
            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': getApiKey()
                },
                body: formData
            });
            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();
            if (!result.success || !result.imageUrl) throw new Error("Respon tidak valid dari API.");
            const imageUrl = result.imageUrl;
            card.innerHTML = `
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${imageUrl}" download="perbaikan_foto_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>`;
            card.classList.remove('bg-gray-100', 'flex', 'items-center', 'justify-center');
            card.classList.add('relative');
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error for enhanced photo card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }

    return {
        setPfImageData: setPfImage,
        showEnhanceTab
    };
};
