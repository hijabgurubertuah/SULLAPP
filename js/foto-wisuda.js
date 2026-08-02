window.initFotoWisuda = function(config) {
    const {
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
        convertHeicToJpg,
        switchTab
    } = config;

    const tabGraduationPhoto = document.getElementById('tab-graduation-photo');
    if (tabGraduationPhoto) {
        tabGraduationPhoto.addEventListener('click', () => switchTab('graduation-photo'));
    }

    const gpUserInput = document.getElementById('gp-user-input');
    const gpUploadBox = document.getElementById('gp-upload-box');
    const gpPreview = document.getElementById('gp-preview');
    const gpPlaceholder = document.getElementById('gp-placeholder');
    const gpRemoveBtn = document.getElementById('gp-remove-btn');
    const gpClothingSelect = document.getElementById('gp-clothing-select');
    const gpLocationSelect = document.getElementById('gp-location-select');
    const gpAccessorySelect = document.getElementById('gp-accessory-select');
    const gpRatioOptions = document.getElementById('gp-ratio-options');
    const gpCountSlider = document.getElementById('gp-count-slider');
    const gpCountValue = document.getElementById('gp-count-value');
    const gpGenerateBtn = document.getElementById('gp-generate-btn');
    const gpResultsPlaceholder = document.getElementById('gp-results-placeholder');
    const gpResultsGrid = document.getElementById('gp-results-grid');
    const gpAdditionalPrompt = document.getElementById('gp-additional-prompt');

    let gpUserData = null;
    let gpClothingData = null;
    let gpLocationData = null;
    let gpAccessoryData = null;

    if (gpUserInput) {
        setupImageUpload(gpUserInput, gpUploadBox, (data) => {
            gpUserData = data;
            gpPreview.src = data.dataUrl;
            gpPlaceholder.classList.add('hidden');
            gpPreview.classList.remove('hidden');
            gpRemoveBtn.classList.remove('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, gpRatioOptions);

            const img = new Image();
            img.onload = () => {
                gpUserData.aspectRatioNum = img.width / img.height;
            };
            img.src = data.dataUrl;

            gpUpdateBtn();
        });

        gpRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            gpUserData = null;
            gpUserInput.value = '';
            gpPreview.src = '';
            gpPreview.classList.add('hidden');
            gpPlaceholder.classList.remove('hidden');
            gpRemoveBtn.classList.add('hidden');
            gpUpdateBtn();
        });

        const handleDropdownToggle = (selectId, containerId, inputId, previewWrapperId, previewImgId, removeBtnId, dataVarName) => {
            const select = document.getElementById(selectId);
            const container = document.getElementById(containerId);
            const input = document.getElementById(inputId);
            const previewWrapper = document.getElementById(previewWrapperId);
            const previewImg = document.getElementById(previewImgId);
            const removeBtn = document.getElementById(removeBtnId);

            const clearData = () => {
                if (dataVarName === 'clothing') gpClothingData = null;
                if (dataVarName === 'location') gpLocationData = null;
                if (dataVarName === 'accessory') gpAccessoryData = null;
                input.value = '';
                if (previewWrapper) {
                    previewWrapper.classList.add('hidden');
                    previewImg.src = '';
                }
                input.classList.remove('hidden');
            };

            select.addEventListener('change', () => {
                if (select.value === 'custom') {
                    container.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                    clearData();
                }
            });

            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    clearData();
                });
            }

            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const processed = await convertHeicToJpg(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const base64 = ev.target.result.split(',')[1];
                        const dataObj = { mimeType: file.type, base64: base64 };
                        if (dataVarName === 'clothing') gpClothingData = dataObj;
                        if (dataVarName === 'location') gpLocationData = dataObj;
                        if (dataVarName === 'accessory') gpAccessoryData = dataObj;

                        if (previewWrapper && previewImg) {
                            previewImg.src = ev.target.result;
                            previewWrapper.classList.remove('hidden');
                            input.classList.add('hidden');
                        }
                    };
                    reader.readAsDataURL(processed);
                }
            });
        };

        handleDropdownToggle('gp-clothing-select', 'gp-clothing-upload-container', 'gp-clothing-ref', 'gp-clothing-preview-wrapper', 'gp-clothing-preview', 'gp-clothing-remove', 'clothing');
        handleDropdownToggle('gp-location-select', 'gp-location-upload-container', 'gp-location-ref', 'gp-location-preview-wrapper', 'gp-location-preview', 'gp-location-remove', 'location');
        handleDropdownToggle('gp-accessory-select', 'gp-accessory-upload-container', 'gp-accessory-ref', 'gp-accessory-preview-wrapper', 'gp-accessory-preview', 'gp-accessory-remove', 'accessory');

        setupOptionButtons(gpRatioOptions);
        gpCountSlider.addEventListener('input', (e) => {
            gpCountValue.textContent = e.target.value;
        });

        function gpUpdateBtn() {
            gpGenerateBtn.disabled = !gpUserData;
        }

        gpGenerateBtn.addEventListener('click', async () => {
            if (!gpUserData) return;

            const originalBtnHTML = gpGenerateBtn.innerHTML;
            gpGenerateBtn.disabled = true;
            gpGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');
            gpGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Wisuda Loading...</span>`;

            gpResultsPlaceholder.classList.add('hidden');
            gpResultsGrid.classList.remove('hidden');
            gpResultsGrid.innerHTML = '';

            const count = parseInt(gpCountSlider.value);
            gpResultsGrid.className = `grid ${getResultGridCols(count)} gap-4`;
            let ratio = gpRatioOptions.querySelector('.selected').dataset.value;

            if (ratio === 'Auto' && gpUserData && gpUserData.aspectRatioNum) {
                const ratios = { '1:1': 1, '9:16': 0.75, '16:9': 1.33, '9:16': 0.5625, '16:9': 1.77 };
                let closest = '1:1';
                let minDiff = Infinity;
                for (const [key, val] of Object.entries(ratios)) {
                    const diff = Math.abs(gpUserData.aspectRatioNum - val);
                    if (diff < minDiff) { minDiff = diff; closest = key; }
                }
                ratio = closest;
            }
            const clothingVal = gpClothingSelect.value;
            const locationVal = gpLocationSelect.value;
            const accessoryVal = gpAccessorySelect.value;
            const additionalPromptVal = gpAdditionalPrompt.value;

            for (let i = 0; i < count; i++) {
                const div = document.createElement('div');
                div.id = `gp-card-${i}`;
                let aspectClass = 'aspect-square';
                if (ratio === '16:9') aspectClass = 'aspect-video';
                else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                else if (ratio === '16:9') aspectClass = 'aspect-video';
                else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';

                div.className = `card ${aspectClass} w-full flex items-center justify-center bg-slate-50 border border-slate-200`;
                div.innerHTML = `<div class="spinner"></div>`;
                gpResultsGrid.appendChild(div);
            }

            let prompt = `Create a photorealistic Graduation Photo.
                    Subject: Use the face from the FIRST provided image (the user).
                    CRITICAL: You MUST Preserve the facial features, identity, and expression of the user perfectly. It must look exactly like them.

                    Clothing: ${clothingVal === 'custom' ? 'Wear the clothing shown in the Clothing Reference image.' : `Wear: ${clothingVal}.`}
                    Location: ${locationVal === 'custom' ? 'Background matches the Location Reference image.' : `Background: ${locationVal}.`}
                    Accessories: ${accessoryVal === 'custom' ? 'Include the accessory from the Reference image.' : `Props: ${accessoryVal}.`}

                    Style: High quality, professional photography, flattering lighting, sharp details.
                    ${additionalPromptVal ? `Additional Instructions: ${additionalPromptVal}.` : ''}
                    Aspect Ratio: ${ratio}.
                    `;

            const parts = [{ text: prompt }];
            parts.push({ inlineData: { mimeType: gpUserData.mimeType, data: gpUserData.base64 } });
            if (clothingVal === 'custom' && gpClothingData) parts.push({ inlineData: { mimeType: gpClothingData.mimeType, data: gpClothingData.base64 } });
            if (locationVal === 'custom' && gpLocationData) parts.push({ inlineData: { mimeType: gpLocationData.mimeType, data: gpLocationData.base64 } });
            if (accessoryVal === 'custom' && gpAccessoryData) parts.push({ inlineData: { mimeType: gpAccessoryData.mimeType, data: gpAccessoryData.base64 } });

            const base64ToBlob = (base64, mimeType) => {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: mimeType });
            };

            const generateSingle = async (index) => {
                const card = document.getElementById(`gp-card-${index}`);
                try {

                    const formData = new FormData();

                    formData.append('images[]', base64ToBlob(gpUserData.base64, gpUserData.mimeType));


                    if (clothingVal === 'custom' && gpClothingData) formData.append('images[]', base64ToBlob(gpClothingData.base64, gpClothingData.mimeType));
                    if (locationVal === 'custom' && gpLocationData) formData.append('images[]', base64ToBlob(gpLocationData.base64, gpLocationData.mimeType));
                    if (accessoryVal === 'custom' && gpAccessoryData) formData.append('images[]', base64ToBlob(gpAccessoryData.base64, gpAccessoryData.mimeType));

                    formData.append('instruction', `${prompt} Variation ${index + 1}`);

                    if (ratio && ratio !== 'Auto') formData.append('aspectRatio', ratio);
                    else formData.append('aspectRatio', '1:1');

                    const response = await fetch(`${GENERATE_URL}`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': API_KEY
                        },
                        body: formData
                    });

                    if (!response.ok) throw new Error(await getApiErrorMessage(response));
                    const result = await response.json();

                    if (!result.success || !result.imageUrl) throw new Error("No image data");


                    let imageUrl = result.imageUrl;
                    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                        imageUrl = `data:image/png;base64,${imageUrl}`;
                    }
                    if (imageUrl) {
                        const previewFn = (typeof window.openTiImagePreview === 'function') ? `window.openTiImagePreview('${imageUrl}')` : `window.open('${imageUrl}', '_blank')`;
                        card.className = `card overflow-hidden relative bg-white ${getAspectRatioClass(ratio)}`;
                        card.style.height = 'auto';
                        card.innerHTML = `
                                    <img src="${imageUrl}" class="w-full h-full object-contain shadow-sm cursor-pointer" onclick="${previewFn}">
                                    <div class="absolute bottom-2 right-2 flex gap-2">
                                        <button onclick="${previewFn}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                            <i data-lucide="eye" class="w-4 h-4"></i>
                                        </button>
                                        <a href="${imageUrl}" download="wisuda_${Date.now()}_${index}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                            <i data-lucide="download" class="w-4 h-4"></i>
                                        </a>
                                    </div>
                                `;
                    } else {
                        throw new Error("No image data");
                    }
                } catch (e) {
                    console.error(e);
                    card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">${e.message}</div>`;
                }
            };

            const promises = [];
            for (let i = 0; i < count; i++) promises.push(generateSingle(i));
            await Promise.allSettled(promises);

            gpGenerateBtn.disabled = false;
            gpGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
            gpGenerateBtn.innerHTML = originalBtnHTML;
            if (typeof doneSound !== 'undefined') doneSound.play();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }
};
