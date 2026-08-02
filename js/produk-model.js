window.initProdukModel = function(ctx = {}) {
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

    const vtoTabProductOnly = document.getElementById('vto-tab-product-only');
    const vtoTabProductModel = document.getElementById('vto-tab-product-model');
    const vtoContentProductOnly = document.getElementById('vto-content-product-only');
    const vtoContentProductModel = document.getElementById('vto-content-product-model');

    function switchVtoTab(tabName) {
        const isActiveProductOnly = tabName === 'product-only';
        if (vtoTabProductOnly) vtoTabProductOnly.classList.toggle('active', isActiveProductOnly);
        if (vtoTabProductModel) vtoTabProductModel.classList.toggle('active', !isActiveProductOnly);
        if (vtoContentProductOnly) vtoContentProductOnly.classList.toggle('hidden', !isActiveProductOnly);
        if (vtoContentProductModel) vtoContentProductModel.classList.toggle('hidden', isActiveProductOnly);
    }

    // Expose globally for script.js
    window.switchVtoTab = switchVtoTab;

    if (vtoTabProductOnly) vtoTabProductOnly.addEventListener('click', () => switchVtoTab('product-only'));
    if (vtoTabProductModel) vtoTabProductModel.addEventListener('click', () => switchVtoTab('product-model'));

    const vtoProductUploadBox = document.getElementById('vto-product-upload-box');
    const vtoProductInput = document.getElementById('vto-product-input');
    const vtoProductPreview = document.getElementById('vto-product-preview');
    const vtoProductPlaceholder = document.getElementById('vto-product-placeholder');
    const vtoRemoveProductBtn = document.getElementById('vto-remove-product-btn');
    const vtoModelUploadBox = document.getElementById('vto-model-upload-box');
    const vtoModelInput = document.getElementById('vto-model-input');
    const vtoModelPreview = document.getElementById('vto-model-preview');
    const vtoModelPlaceholder = document.getElementById('vto-model-placeholder');
    const vtoRemoveModelBtn = document.getElementById('vto-remove-model-btn');
    const vtoRatioOptions = document.getElementById('vto-ratio-options');
    const vtoResultCountSlider = document.getElementById('vto-result-count-slider');
    const vtoResultCountDisplay = document.getElementById('vto-result-count-display');
    const vtoGenerateBtn = document.getElementById('vto-generate-btn');
    const vtoStatusMessage = document.getElementById('vto-status-message');
    const vtoResultsContainer = document.getElementById('vto-results-container');
    const vtoResultsGrid = document.getElementById('vto-results-grid');

    if (!vtoProductInput || !vtoModelInput || !vtoGenerateBtn) return;

    let vtoProductData = null;
    let vtoModelData = null;

    setupImageUpload(vtoProductInput, vtoProductUploadBox, (data) => {
        vtoProductData = data;
        vtoProductPreview.src = data.dataUrl;
        vtoProductPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('vto-ratio-options'));
        vtoProductPreview.classList.remove('hidden');
        vtoRemoveProductBtn.classList.remove('hidden');
    });

    vtoRemoveProductBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        vtoProductData = null;
        vtoProductInput.value = '';
        vtoProductPreview.src = '#';
        vtoProductPreview.classList.add('hidden');
        vtoProductPlaceholder.classList.remove('hidden');
        vtoRemoveProductBtn.classList.add('hidden');
        document.getElementById('vto-results-placeholder').classList.remove('hidden');
        vtoResultsContainer.classList.add('hidden');
        if (vtoResultsContainer.querySelector('h2')) vtoResultsContainer.querySelector('h2').classList.remove('hidden');
        vtoResultsGrid.innerHTML = '';
    });

    setupImageUpload(vtoModelInput, vtoModelUploadBox, (data) => {
        vtoModelData = data;
        vtoModelPreview.src = data.dataUrl;
        vtoModelPlaceholder.classList.add('hidden');
        vtoModelPreview.classList.remove('hidden');
        vtoRemoveModelBtn.classList.remove('hidden');
    });

    vtoRemoveModelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        vtoModelData = null;
        vtoModelInput.value = '';
        vtoModelPreview.src = '#';
        vtoModelPreview.classList.add('hidden');
        vtoModelPlaceholder.classList.remove('hidden');
        vtoRemoveModelBtn.classList.add('hidden');
        document.getElementById('vto-results-placeholder').classList.remove('hidden');
        vtoResultsContainer.classList.add('hidden');
        if (vtoResultsContainer.querySelector('h2')) vtoResultsContainer.querySelector('h2').classList.remove('hidden');
        vtoResultsGrid.innerHTML = '';
    });

    setupOptionButtons(vtoRatioOptions);

    if (vtoResultCountSlider) {
        vtoResultCountSlider.addEventListener('input', () => {
            if (vtoResultCountDisplay) vtoResultCountDisplay.textContent = `${vtoResultCountSlider.value} Gambar`;
            // Check if showUpgradeVipPopup is defined (from global scope)
            if (parseInt(vtoResultCountSlider.value) > 1 && typeof showUpgradeVipPopup === 'function') {
                showUpgradeVipPopup();
                vtoResultCountSlider.value = 1;
                if (vtoResultCountDisplay) vtoResultCountDisplay.textContent = "1 Gambar";
            }
        });
    }

    async function generateSingleVTOImage(id, product, model, concept, aspectRatio) {
        const card = document.getElementById(`vto-card-${id}`);
        try {
            const prompt = `${concept.prompt}. This is variation ${id}.`;

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
            formData.append('images[]', base64ToBlob(product.base64, product.mimeType));
            formData.append('images[]', base64ToBlob(model.base64, model.mimeType));
            formData.append('instruction', prompt);
            formData.append('aspectRatio', aspectRatio);

            const apiHeaders = typeof getApiKey === 'function' ? { 'X-API-Key': getApiKey() } : undefined;
            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: apiHeaders,
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (!result.success || !result.imageUrl) throw new Error("Tidak ada data gambar yang diterima dari AI.");
            const imageUrl = result.imageUrl;
            card.innerHTML = `
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <h4 class="absolute top-3 left-3 text-white font-bold text-sm pointer-events-none drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">${concept.title}</h4>
                    <div class="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${imageUrl}" download="photoshoot_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>`;
            card.className = `card relative w-full overflow-hidden group ${getAspectRatioClass(aspectRatio)}`;
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error for vto card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    vtoGenerateBtn.addEventListener('click', async () => {
        if (!vtoProductData || !vtoModelData) {
            vtoStatusMessage.textContent = 'Harap unggah foto produk dan model terlebih dahulu.';
            return;
        }
        vtoStatusMessage.textContent = '';
        const originalBtnHTML = vtoGenerateBtn.innerHTML;
        vtoGenerateBtn.disabled = true;
        vtoGenerateBtn.innerHTML = '<div class="spinner"></div><span class="ml-2">Memproses Gambar...</span>';
        const additionalInput = document.getElementById('vto-additional-input');
        const additionalText = additionalInput ? additionalInput.value.trim() : '';
        const aspectRatio = vtoRatioOptions.querySelector('.selected')?.dataset.value || '1:1';
        const aspectClass = getAspectRatioClass(aspectRatio);
        document.getElementById('vto-results-placeholder').classList.add('hidden');
        const resultsTitle = vtoResultsContainer.querySelector('h2');
        const count = parseInt(vtoResultCountSlider ? vtoResultCountSlider.value : 1);
        if (resultsTitle) {
            resultsTitle.textContent = `${count} Variasi Photoshoot AI`;
            resultsTitle.classList.remove('hidden');
        }
        vtoResultsContainer.classList.remove('hidden');
        vtoResultsContainer.classList.add('flex');
        vtoResultsGrid.innerHTML = '';
        vtoResultsGrid.className = `grid ${getResultGridCols(count)} gap-4`;
        for (let i = 1; i <= count; i++) {
            const card = document.createElement('div');
            card.id = `vto-card-${i}`;
            card.className = `card overflow-hidden transition-all ${aspectClass} bg-gray-100 flex items-center justify-center`;
            card.innerHTML = `<div class="spinner"></div>`;
            vtoResultsGrid.appendChild(card);
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
        try {
            vtoGenerateBtn.querySelector('span').textContent = `Membuat Gambar (0/${count})`;

            const generationPromises = [];
            const themes = [
                "Professional Studio", "Casual Lifestyle", "Urban Chic", "Soft Aesthetic",
                "Minimalist", "Outdoor Nature", "Luxury Interior", "Street Style",
                "Vintage Retro", "Modern Corporate"
            ];

            for (let i = 1; i <= count; i++) {
                const theme = themes[i - 1] || "Fashion";
                const prompt = `Fashion photoshoot featuring the model wearing/using the product. Theme: ${theme}. Variation ${i}. Ensure the product looks natural and the model's face is preserved. The final image MUST have an aspect ratio of ${aspectRatio}.${additionalText ? ` Additional instructions: ${additionalText}` : ''}`;
                const title = `${theme} Concept`;

                generationPromises.push(
                    generateSingleVTOImage(i, vtoProductData, vtoModelData, { title: title, prompt: prompt }, aspectRatio)
                        .then(() => {
                            vtoGenerateBtn.querySelector('span').textContent = `Membuat Gambar (${i}/4)`;
                        })
                );
            }

            await Promise.allSettled(generationPromises);
        } catch (error) {
            console.error('Gagal generate gambar:', error);
            vtoStatusMessage.textContent = `Maaf, terjadi kesalahan: ${error.message}`;
            vtoResultsGrid.innerHTML = `<div class="col-span-1 text-center py-10 text-red-500"><p class="break-all">Terjadi kesalahan: ${error.message}</p></div>`;
        } finally {
            vtoGenerateBtn.disabled = false;
            vtoGenerateBtn.innerHTML = originalBtnHTML;
        }
    });
};
