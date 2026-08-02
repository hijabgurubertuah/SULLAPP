window.initFotoFashion = function(ctx) {
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
        autoSelectClosestRatio,
        setupLogoUpload,
        setupLogoControls,
        setupSlider,
        applyLogoToImage
    } = ctx;

    const fsProductInput = document.getElementById('fs-product-input');
    const fsProductUploadBox = document.getElementById('fs-product-upload-box');
    const fsProductPreview = document.getElementById('fs-product-preview');
    const fsProductPlaceholder = document.getElementById('fs-product-placeholder');
    const fsRemoveProductBtn = document.getElementById('fs-remove-product-btn');

    const fsModelTypeOptions = document.getElementById('fs-model-type-options');
    const fsModelDetailsContainer = document.getElementById('fs-model-details-container');
    const fsCustomModelContainer = document.getElementById('fs-custom-model-container');
    const fsCustomModelInput = document.getElementById('fs-custom-model-input');
    const fsCustomModelUploadBox = document.getElementById('fs-custom-model-upload-box');
    const fsCustomModelPreview = document.getElementById('fs-custom-model-preview');
    const fsCustomModelPlaceholder = document.getElementById('fs-custom-model-placeholder');
    const fsRemoveCustomModelBtn = document.getElementById('fs-remove-custom-model-btn');
    const fsAgeOptions = document.getElementById('fs-age-options');
    const fsCustomAgeContainer = document.getElementById('fs-custom-age-container');
    const fsStyleOptions = document.getElementById('fs-style-options');
    const fsCustomStyleContainer = document.getElementById('fs-custom-style-container');
    const fsGenerateBtn = document.getElementById('fs-generate-btn');

    let fsProductData = null;
    let fsLogoData = null;
    let fsCustomModelData = null;

    function fsUpdateGenerateButtonState() {
        const modelType = document.querySelector('#fs-model-type-options .selected')?.dataset.value;
        const isCustomModelRequired = modelType === 'Kustom';
        const customModelOk = !isCustomModelRequired || (isCustomModelRequired && fsCustomModelData);
        fsGenerateBtn.disabled = !fsProductData || !customModelOk;
    }

    setupImageUpload(fsProductInput, fsProductUploadBox, (data) => {
        fsProductData = data;
        fsProductPreview.src = data.dataUrl;
        fsProductPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('fs-ratio-options'));
        fsProductPreview.classList.remove('hidden');
        fsRemoveProductBtn.classList.remove('hidden');
        fsUpdateGenerateButtonState();
        if (fsProductData) {
            const modelType = document.querySelector('#fs-model-type-options .selected')?.dataset.value;
            if (modelType !== 'Kustom' || fsCustomModelData) {
                fsGenerateBtn.disabled = false;
                fsGenerateBtn.removeAttribute('disabled');
            }
        }
    });

    fsRemoveProductBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fsProductData = null;
        fsProductInput.value = '';
        fsProductPreview.src = '#';
        fsProductPreview.classList.add('hidden');
        fsProductPlaceholder.classList.remove('hidden');
        fsRemoveProductBtn.classList.add('hidden');
        fsUpdateGenerateButtonState();
    });

    setupImageUpload(fsCustomModelInput, fsCustomModelUploadBox, (data) => {
        fsCustomModelData = data;
        fsCustomModelPreview.src = data.dataUrl;
        fsCustomModelPlaceholder.classList.add('hidden');
        fsCustomModelPreview.classList.remove('hidden');
        fsRemoveCustomModelBtn.classList.remove('hidden');
        fsUpdateGenerateButtonState();
    });

    fsRemoveCustomModelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fsCustomModelData = null;
        fsCustomModelInput.value = '';
        fsCustomModelPreview.src = '#';
        fsCustomModelPreview.classList.add('hidden');
        fsCustomModelPlaceholder.classList.remove('hidden');
        fsRemoveCustomModelBtn.classList.add('hidden');
        fsUpdateGenerateButtonState();
    });

    setupOptionButtons(fsModelTypeOptions);
    setupOptionButtons(document.getElementById('fs-gender-options'));
    setupOptionButtons(fsAgeOptions);
    setupOptionButtons(document.getElementById('fs-location-options'));
    setupOptionButtons(fsStyleOptions);
    setupOptionButtons(document.getElementById('fs-ratio-options'));

    fsModelTypeOptions.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const modelType = button.dataset.value;
        const showDetails = modelType === 'Manusia' || modelType === 'Manekin';
        const showCustom = modelType === 'Kustom';
        fsModelDetailsContainer.classList.toggle('hidden', !showDetails);
        fsCustomModelContainer.classList.toggle('hidden', !showCustom);
        fsUpdateGenerateButtonState();
    });

    fsAgeOptions.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button && button.dataset.value === 'Kustom') {
            fsCustomAgeContainer.classList.remove('hidden');
            document.getElementById('fs-custom-age-input').focus();
        } else if (button) {
            fsCustomAgeContainer.classList.add('hidden');
        }
    });

    fsStyleOptions.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button && button.dataset.value === 'Kustom') {
            fsCustomStyleContainer.classList.remove('hidden');
            document.getElementById('fs-custom-style-input').focus();
        } else if (button) {
            fsCustomStyleContainer.classList.add('hidden');
        }
    });

    // Initialize Logo Uploaders
    if (typeof setupLogoUpload === 'function') {
        setupLogoUpload('fs-logo-input', 'fs-logo-preview', 'fs-logo-remove', 'fs-logo-controls', (data) => {
            fsLogoData = data;
        });
    }

    // Initialize Controls
    if (typeof setupLogoControls === 'function') {
        setupLogoControls('fs-logo-position-options');
    }

    if (typeof setupSlider === 'function') {
        setupSlider('fs-logo-opacity-input', 'fs-logo-opacity-value', '%');
        // setupSlider('fs-logo-size-input', 'fs-logo-size-value', 'px');
        setupSlider('fs-count-slider', 'fs-count-value', ' Gambar');
    }

    fsGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = fsGenerateBtn.innerHTML;
        fsGenerateBtn.disabled = true;
        fsGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Foto...</span>`;
        document.getElementById('fs-results-placeholder').classList.add('hidden');
        const resultsContainer = document.getElementById('fs-results-container');
        resultsContainer.classList.remove('hidden');
        const aspectRatio = document.querySelector('#fs-ratio-options .selected').dataset.value;
        const aspectClass = getAspectRatioClass(aspectRatio);
        const resultsGrid = document.getElementById('fs-results-grid');
        
        // Get image count from slider
        const countSlider = document.getElementById('fs-count-slider');
        const imageCount = countSlider ? parseInt(countSlider.value) : 1;
        
        resultsGrid.innerHTML = '';
        resultsGrid.className = `grid ${getResultGridCols(imageCount)} gap-4`;
        for (let i = 1; i <= imageCount; i++) {
            const card = document.createElement('div');
            card.id = `fs-card-${i}`;
            card.className = `card overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
            card.innerHTML = `
                        <div class="text-center p-2">
                            <div class="spinner"></div>
                            <p class="text-xs mt-2 text-gray-600">Membuat Konsep...</p>
                        </div>
                    `;
            resultsGrid.appendChild(card);
        }
        lucide.createIcons();
        const generationPromises = Array.from({length: imageCount}, (_, i) => i + 1).map(i => generateSingleFashionImage(i, aspectRatio));
        await Promise.allSettled(generationPromises);
        fsGenerateBtn.disabled = false;
        fsGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });

    async function generateSingleFashionImage(id, aspectRatio) {
        const card = document.getElementById(`fs-card-${id}`);
        try {
            const modelType = document.querySelector('#fs-model-type-options .selected').dataset.value;
            const location = document.querySelector('#fs-location-options .selected').dataset.value;
            let style = document.querySelector('#fs-style-options .selected').dataset.value;
            if (style === 'Kustom') {
                style = document.getElementById('fs-custom-style-input').value.trim() || 'Studio Minimalis';
            }
            const customPrompt = document.getElementById('fs-prompt-input').value.trim();
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

            if (modelType === 'Kustom' && fsCustomModelData) {
                prompt = `Perform a virtual try-on.
                    CRITICAL INSTRUCTIONS:
                    1. The final image MUST feature the person from the provided Model Image.
                    2. The clothing from the provided Product Image must be transferred onto the person.
                    3. The background should be a ${location} setting with a '${style}' visual style.`;
                if (customPrompt) {
                    prompt += `\n- Additional user instructions: "${customPrompt}".`;
                }
                if (fsLogoData) {
                    prompt += `\n- Logo: Place the provided Logo Image subtly on the clothing.`;
                }
                prompt += `\nThis is variation ${id}. The result must be photorealistic.`;


                formData.append('images[]', base64ToBlob(fsProductData.base64, fsProductData.mimeType));
                formData.append('images[]', base64ToBlob(fsCustomModelData.base64, fsCustomModelData.mimeType));
                if (fsLogoData) {
                    formData.append('images[]', base64ToBlob(fsLogoData.base64, fsLogoData.mimeType));
                }

                endpoint = '/generate';
            } else {
                prompt = `Create a professional fashion photoshoot. The main subject is the clothing from the provided image.`;
                if (modelType === 'Manusia' || modelType === 'Manekin') {
                    const gender = document.querySelector('#fs-gender-options .selected').dataset.value;
                    let age = document.querySelector('#fs-age-options .selected').dataset.value;
                    if (age === 'Kustom') {
                        age = document.getElementById('fs-custom-age-input').value.trim() || 'Dewasa';
                    }
                    if (modelType === 'Manusia') {
                        prompt += ` The clothing is worn by a photorealistic human model. The model is a ${gender}, with an age appearance of '${age}'.`;
                    } else {
                        prompt += ` The clothing is displayed on a full-body, posable ${gender} mannequin.`;
                    }
                } else {
                    prompt += ` The clothing is presented as a 'flat lay' or on a hanger against a clean background.`;
                }
                prompt += ` The setting is a ${location} environment. The overall visual style and lighting should be '${style}'.`;
                if (customPrompt) {
                    prompt += ` Additional user instructions: "${customPrompt}".`;
                }


                prompt += ` For this variation (number ${id}), create a slightly different pose or angle.`;


                formData.append('images[]', base64ToBlob(fsProductData.base64, fsProductData.mimeType));
                endpoint = '/generate';
            }

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

            if (!result.success || !result.imageUrl) throw new Error("No image data received from API.");
            let imageUrl = result.imageUrl;

            // Apply Logo if present
            if (fsLogoData && fsLogoData.base64) {
                const position = document.querySelector('#fs-logo-position-options .selected')?.dataset.value || 'bottom-right';
                const opacityInput = document.getElementById('fs-logo-opacity-input');
                const opacity = opacityInput ? parseInt(opacityInput.value) / 100 : 0.3;
                const sizeInput = document.getElementById('fs-logo-size-input');
                const size = sizeInput ? parseInt(sizeInput.value) : 20;
                try {
                    if (typeof applyLogoToImage === 'function') {
                        imageUrl = await applyLogoToImage(imageUrl, fsLogoData.base64, position, opacity, size);
                    }
                } catch (e) {
                    console.error("Failed to apply logo", e);
                }
            }

            card.innerHTML = `
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <a href="${imageUrl}" download="fashion_foto_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>`;
            card.classList.remove('bg-gray-100', 'flex', 'items-center', 'justify-center');
            card.classList.add('relative');
            doneSound.play();
        } catch (error) {
            lucide.createIcons();
            console.error(`Error for fashion photo card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }
};
