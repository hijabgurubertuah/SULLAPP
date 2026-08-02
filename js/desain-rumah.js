window.initDesainRumah = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    API_KEY,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound,
    getImageAspectRatio,
    getClosestStandardRatio
}) {
    
    const drTabInterior = document.getElementById('dr-tab-interior');
    const drTabEksterior = document.getElementById('dr-tab-eksterior');
    const drContentInterior = document.getElementById('dr-content-interior');
    const drContentEksterior = document.getElementById('dr-content-eksterior');
    
    function switchDesainRumahTab(tabName) {
        const isInteriorActive = tabName === 'interior';
        drTabInterior.classList.toggle('active', isInteriorActive);
        drTabEksterior.classList.toggle('active', !isInteriorActive);
        drContentInterior.classList.toggle('hidden', !isInteriorActive);
        drContentEksterior.classList.toggle('hidden', isInteriorActive);
    }
    
    if (drTabInterior && drTabEksterior) {
        drTabInterior.addEventListener('click', () => switchDesainRumahTab('interior'));
        drTabEksterior.addEventListener('click', () => switchDesainRumahTab('eksterior'));
    }

    const drInteriorRoomInput = document.getElementById('dr-interior-room-input');
    const drInteriorRoomUploadBox = document.getElementById('dr-interior-room-upload-box');
    const drInteriorRoomPreview = document.getElementById('dr-interior-room-preview');
    const drInteriorRoomPlaceholder = document.getElementById('dr-interior-room-placeholder');
    const drInteriorRemoveRoomBtn = document.getElementById('dr-interior-remove-room-btn');
    const drInteriorFurniturePrompt = document.getElementById('dr-interior-furniture-prompt');
    const drInteriorAddFurnitureBtn = document.getElementById('dr-interior-add-furniture-btn');
    const drInteriorAiFurnitureContainer = document.getElementById('dr-interior-ai-furniture-container');
    const drInteriorAiFurniturePlaceholder = document.getElementById('dr-interior-ai-furniture-placeholder');
    const drInteriorManualFurnitureContainer = document.getElementById('dr-interior-manual-furniture-container');
    const drInteriorInstructionInput = document.getElementById('dr-interior-instruction-input');
    const drInteriorMagicInstructionBtn = document.getElementById('dr-interior-magic-instruction-btn');
    const drInteriorMagicInstructionTooltip = document.getElementById('dr-interior-magic-instruction-tooltip');
    const drInteriorRatioOptions = document.getElementById('dr-interior-ratio-options');
    const drInteriorResultCountSlider = document.getElementById('dr-interior-result-count-slider');
    const drInteriorResultCountDisplay = document.getElementById('dr-interior-result-count-display');
    const drInteriorGenerateBtn = document.getElementById('dr-interior-generate-btn');
    const drInteriorResultsContainer = document.getElementById('dr-interior-results-container');
    const drInteriorResultsGrid = document.getElementById('dr-interior-results-grid');
    
    let drInteriorRoomData = null;
    let drInteriorAiFurniture = [];
    let drInteriorManualFurniture = [];
    let drInteriorMagicInstructionTooltipShown = false;

    function drInteriorUpdateGenerateButtonState() {
        const hasRoom = !!drInteriorRoomData;
        const hasFurniture = drInteriorAiFurniture.length > 0 || drInteriorManualFurniture.length > 0;
        const hasInstruction = drInteriorInstructionInput.value.trim() !== '';
        drInteriorGenerateBtn.disabled = !hasRoom || !hasFurniture || !hasInstruction;
        drInteriorAddFurnitureBtn.disabled = !hasRoom || drInteriorFurniturePrompt.value.trim() === '';
        drInteriorMagicInstructionBtn.disabled = !hasRoom || !hasFurniture;
        if (!drInteriorMagicInstructionBtn.disabled && !drInteriorMagicInstructionTooltipShown) {
            drInteriorMagicInstructionTooltip.classList.add('visible');
            drInteriorMagicInstructionTooltipShown = true;
            setTimeout(() => {
                drInteriorMagicInstructionTooltip.classList.remove('visible');
            }, 5000);
        }
    }

    if (drInteriorInstructionInput) {
        drInteriorInstructionInput.addEventListener('input', drInteriorUpdateGenerateButtonState);
    }

    function drInteriorSetRoomImage(data) {
        drInteriorRoomData = data;
        drInteriorRoomPreview.src = data.dataUrl;
        drInteriorRoomPlaceholder.classList.add('hidden');
        drInteriorRoomPreview.classList.remove('hidden');
        drInteriorRemoveRoomBtn.classList.remove('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, drInteriorRatioOptions);
        drInteriorUpdateGenerateButtonState();
    }

    if (drInteriorRoomInput) {
        setupImageUpload(drInteriorRoomInput, drInteriorRoomUploadBox, drInteriorSetRoomImage);
    }

    if (drInteriorRemoveRoomBtn) {
        drInteriorRemoveRoomBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            drInteriorRoomData = null;
            drInteriorRoomInput.value = '';
            drInteriorRoomPreview.src = '#';
            drInteriorRoomPreview.classList.add('hidden');
            drInteriorRoomPlaceholder.classList.remove('hidden');
            drInteriorRemoveRoomBtn.classList.add('hidden');
            document.getElementById('dr-interior-results-placeholder').classList.remove('hidden');
            drInteriorResultsContainer.classList.add('hidden');
            drInteriorResultsGrid.innerHTML = '';
            drInteriorUpdateGenerateButtonState();
        });
    }

    if (drInteriorFurniturePrompt) {
        drInteriorFurniturePrompt.addEventListener('input', drInteriorUpdateGenerateButtonState);
    }

    if (drInteriorAddFurnitureBtn) {
        drInteriorAddFurnitureBtn.addEventListener('click', async () => {
            const prompt = drInteriorFurniturePrompt.value.trim();
            if (!prompt) return;
            const originalBtnHTML = drInteriorAddFurnitureBtn.innerHTML;
            drInteriorAddFurnitureBtn.disabled = true;
            drInteriorAddFurnitureBtn.innerHTML = `<img src="/assets/sflogo.gif" class="w-4 h-4 object-contain">`;
            drInteriorAiFurniturePlaceholder.classList.add('hidden');
            const loaderItem = document.createElement('div');
            loaderItem.className = 'aspect-square bg-slate-50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200';
            loaderItem.innerHTML = `<img src="/assets/sflogo.gif" class="w-6 h-6 object-contain opacity-70">`;
            drInteriorAiFurnitureContainer.appendChild(loaderItem);
            try {
                const finalPrompt = `A photorealistic image of a single piece of furniture: ${prompt}. The furniture should be on a plain white background, front view, no shadows.`;
                const formData = new FormData();
                formData.append('instruction', finalPrompt);
                formData.append('aspectRatio', '1:1');
                const response = await fetch(`${GENERATE_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': API_KEY
                    },
                    body: formData
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                const result = await response.json();
                if (!result.success || !result.imageUrl) throw new Error("No image data from AI.");
                const imgResp = await fetch(result.imageUrl);
                const blob = await imgResp.blob();
                const reader = new FileReader();
                const base64Data = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                const furnitureData = {
                    base64: base64Data,
                    mimeType: 'image/png',
                    dataUrl: result.imageUrl
                };
                drInteriorAiFurniture.push(furnitureData);
                drInteriorRenderAiFurniture();
                drInteriorFurniturePrompt.value = '';
            } catch (error) {
                console.error("Error generating AI furniture:", error);
                alert(`Gagal membuat furnitur: ${error.message}`);
                if (drInteriorAiFurniture.length === 0) drInteriorAiFurniturePlaceholder.classList.remove('hidden');
            } finally {
                loaderItem.remove();
                drInteriorAddFurnitureBtn.innerHTML = originalBtnHTML;
                lucide.createIcons();
                drInteriorUpdateGenerateButtonState();
            }
        });
    }

    function drInteriorRenderAiFurniture() {
        drInteriorAiFurnitureContainer.innerHTML = '';
        if (drInteriorAiFurniture.length === 0) {
            drInteriorAiFurnitureContainer.appendChild(drInteriorAiFurniturePlaceholder);
            drInteriorAiFurniturePlaceholder.classList.remove('hidden');
        } else {
            drInteriorAiFurniturePlaceholder.classList.add('hidden');
        }
        drInteriorAiFurniture.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'relative aspect-square furniture-item';
            div.innerHTML = `
                    <img src="${item.dataUrl}" class="w-full h-full object-contain rounded-md border">
                    <button data-index="${index}" class="dr-interior-remove-ai-furniture absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                `;
            drInteriorAiFurnitureContainer.appendChild(div);
        });
        lucide.createIcons();
        drInteriorUpdateGenerateButtonState();
    }

    if (drInteriorAiFurnitureContainer) {
        drInteriorAiFurnitureContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.dr-interior-remove-ai-furniture');
            if (removeBtn) {
                const index = parseInt(removeBtn.dataset.index);
                drInteriorAiFurniture.splice(index, 1);
                drInteriorRenderAiFurniture();
            }
        });
    }

    function drInteriorRenderManualFurnitureSlots() {
        if (!drInteriorManualFurnitureContainer) return;
        drInteriorManualFurnitureContainer.innerHTML = '';
        drInteriorManualFurniture.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'relative aspect-square furniture-item';
            div.innerHTML = `
                    <img src="${item.dataUrl}" class="w-full h-full object-contain rounded-md border">
                    <button data-index="${index}" class="dr-interior-remove-manual-furniture absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                `;
            drInteriorManualFurnitureContainer.appendChild(div);
        });
        const slotId = `dr-interior-manual-furniture-input-${Date.now()}`;
        const uploadSlot = document.createElement('div');
        uploadSlot.className = 'relative aspect-square';
        uploadSlot.innerHTML = `
                <label for="${slotId}" class="file-input-label rounded-md !p-1 h-full">
                    <i data-lucide="plus" class="w-6 h-6 text-gray-400"></i>
                </label>
                <input type="file" id="${slotId}" class="dr-interior-manual-input hidden" accept="image/png, image/jpeg, image/webp, .heic, .HEIC">
            `;
        drInteriorManualFurnitureContainer.appendChild(uploadSlot);
        setupImageUpload(document.getElementById(slotId), uploadSlot.querySelector('label'), (data) => {
            drInteriorManualFurniture.push(data);
            drInteriorRenderManualFurnitureSlots();
        });
        drInteriorManualFurnitureContainer.querySelectorAll('.dr-interior-remove-manual-furniture').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                drInteriorManualFurniture.splice(index, 1);
                drInteriorRenderManualFurnitureSlots();
            });
        });
        lucide.createIcons();
        drInteriorUpdateGenerateButtonState();
    }

    if (drInteriorMagicInstructionBtn) {
        drInteriorMagicInstructionBtn.addEventListener('click', async () => {
            const originalBtnHTML = drInteriorMagicInstructionBtn.innerHTML;
            drInteriorMagicInstructionBtn.disabled = true;
            drInteriorMagicInstructionBtn.innerHTML = `<img src="/assets/sflogo.gif" class="w-4 h-4 object-contain">`;
            try {
                const formData = new FormData();
                formData.append('prompt', 'Analisa foto ruangan (gambar pertama) dan furnitur (gambar berikutnya), lalu buat instruksi tata letak singkat dalam Bahasa Indonesia. Jawab hanya teks instruksi tanpa pembukaan.');
                const base64ToBlob = (base64, mimeType) => {
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    return new Blob([byteArray], { type: mimeType });
                };
                formData.append('images[]', base64ToBlob(drInteriorRoomData.base64, drInteriorRoomData.mimeType), 'room.jpg');
                [...drInteriorAiFurniture, ...drInteriorManualFurniture].forEach((furniture, index) => {
                    formData.append('images[]', base64ToBlob(furniture.base64, furniture.mimeType), `furniture_${index + 1}.jpg`);
                });
                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': API_KEY
                    },
                    body: formData
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                const result = await response.json();
                if (result.success && result.response) {
                    const responseStr = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                    drInteriorInstructionInput.value = responseStr.trim();
                } else {
                    throw new Error(result.error || 'Gagal membuat instruksi');
                }
            } catch (error) {
                console.error("Error generating magic instruction:", error);
                drInteriorInstructionInput.value = `Gagal membuat instruksi: ${error.message}`;
            } finally {
                drInteriorMagicInstructionBtn.innerHTML = originalBtnHTML;
                lucide.createIcons();
                drInteriorUpdateGenerateButtonState();
            }
        });
    }

    if (drInteriorResultsGrid) {
        drInteriorResultsGrid.addEventListener('click', (e) => {
            const card = e.target.closest('[id^="dr-interior-card-"]');
            if (!card) return;
            if (card.querySelector('[data-dr-click-loading="1"]')) return;
            const overlay = document.createElement('div');
            overlay.dataset.drClickLoading = '1';
            overlay.className = 'absolute inset-0 flex items-center justify-center bg-black/10';
            overlay.innerHTML = `<img src="/assets/sflogo.gif" class="w-10 h-10 object-contain">`;
            if (window.getComputedStyle) {
                const computed = window.getComputedStyle(card);
                if (computed && computed.position === 'static') card.style.position = 'relative';
            }
            card.appendChild(overlay);
            setTimeout(() => overlay.remove(), 700);
        });
    }

    setupOptionButtons(drInteriorRatioOptions);

    if (drInteriorResultCountSlider && drInteriorResultCountDisplay) {
        drInteriorResultCountSlider.addEventListener('input', function() {
            drInteriorResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    if (drInteriorGenerateBtn) {
        drInteriorGenerateBtn.addEventListener('click', async () => {
            const originalBtnHTML = drInteriorGenerateBtn.innerHTML;
            drInteriorGenerateBtn.disabled = true;
            drInteriorGenerateBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin text-teal-400 mr-2"></i><span>Mendesain Ruangan...</span>`;
            document.getElementById('dr-interior-results-placeholder').classList.add('hidden');
            let selectedRatioValue = drInteriorRatioOptions.querySelector('.selected').dataset.value;
            let apiAspectRatio = selectedRatioValue;
            if (selectedRatioValue === 'Auto') {
                try {
                    const ratio = await getImageAspectRatio(drInteriorRoomData);
                    apiAspectRatio = getClosestStandardRatio(ratio);
                } catch {
                    apiAspectRatio = '1:1';
                }
            }
            drInteriorResultsContainer.classList.remove('hidden');
            drInteriorResultsGrid.innerHTML = '';
            const numOutputs = parseInt(drInteriorResultCountSlider.value) || 1;
            drInteriorResultsGrid.className = `grid ${getResultGridCols(numOutputs)} gap-4 md:gap-6`;
            for (let i = 1; i <= numOutputs; i++) {
                const card = document.createElement('div');
                card.id = `dr-interior-card-${i}`;
                card.className = `relative bg-white border border-slate-200 shadow-none flex flex-col items-center justify-center rounded-2xl overflow-hidden`;
                if (selectedRatioValue !== 'Auto') {
                    card.classList.add(getAspectRatioClass(selectedRatioValue));
                } else {
                    card.classList.add(getAspectRatioClass(apiAspectRatio));
                }
                card.innerHTML = `
                            <div class="flex flex-col items-center justify-center gap-3">
                                <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-teal-500/50"></i>
                                <p class="text-[10px] font-bold text-slate-400 animate-pulse uppercase tracking-widest">Sedang Memproses...</p>
                            </div>`;
                drInteriorResultsGrid.appendChild(card);
            }
            lucide.createIcons();
            const generationPromises = Array.from({ length: numOutputs }, (_, i) => i + 1).map(i => generateSingleInteriorDesign(i, apiAspectRatio));
            await Promise.allSettled(generationPromises);
            drInteriorGenerateBtn.disabled = false;
            drInteriorGenerateBtn.innerHTML = originalBtnHTML;
            lucide.createIcons();
        });
    }

    async function generateSingleInteriorDesign(id, aspectRatio) {
        const card = document.getElementById(`dr-interior-card-${id}`);
        try {
            const instruction = drInteriorInstructionInput.value.trim();
            let prompt = `Your task is to photorealistically place furniture items into an existing room photo. You are given one primary image (the room) and multiple secondary images (the furniture).
                ABSOLUTE RULES: 1. DO NOT CHANGE THE ROOM's structure, walls, floor, or windows. 2. ONLY ADD the provided furniture items. 3. USE ALL furniture items provided. 4. INTEGRATE REALISTICALLY with correct scale, perspective, lighting, and shadows.
                USER'S PLACEMENT GUIDE: "${instruction}".
                FINAL OUTPUT: A single, photorealistic composite image showing the original room with the new furniture added. This is design variation number ${id}.`;
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
            formData.append('images[]', base64ToBlob(drInteriorRoomData.base64, drInteriorRoomData.mimeType));
            [...drInteriorAiFurniture, ...drInteriorManualFurniture].forEach(furniture => {
                formData.append('images[]', base64ToBlob(furniture.base64, furniture.mimeType));
            });
            formData.append('instruction', prompt);
            formData.append('aspectRatio', aspectRatio);
            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });
            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();
            if (!result.success || !result.imageUrl) throw new Error("No image data from AI for this design.");
            if (result.imageUrl) {
                const imageUrl = result.imageUrl;
                card.innerHTML = `
                        <div class="relative w-full h-full group">
                            <img src="${imageUrl}" class="w-full h-full object-cover" alt="Desain Interior">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            <div class="absolute bottom-2 right-2 flex gap-1">
                                <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <a href="${imageUrl}" download="desain_interior_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                    <i data-lucide="download" class="w-4 h-4"></i>
                                </a>
                            </div>
                        </div>`;
                card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio)}`;
                doneSound.play();
            }
        } catch (error) {
            errorSound.play();
            console.error(`Error for interior design card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }
    
    drInteriorRenderManualFurnitureSlots();

    // Eksterior Logic
    const drEksteriorHouseInput = document.getElementById('dr-eksterior-house-input');
    const drEksteriorHouseUploadBox = document.getElementById('dr-eksterior-house-upload-box');
    const drEksteriorHousePreview = document.getElementById('dr-eksterior-house-preview');
    const drEksteriorHousePlaceholder = document.getElementById('dr-eksterior-house-placeholder');
    const drEksteriorRemoveHouseBtn = document.getElementById('dr-eksterior-remove-house-btn');
    const drEksteriorStyleOptions = document.getElementById('dr-eksterior-style-options');
    const drEksteriorKustomContainer = document.getElementById('dr-eksterior-kustom-container');
    const drEksteriorKustomInput = document.getElementById('dr-eksterior-kustom-input');
    const drEksteriorInstructionInput = document.getElementById('dr-eksterior-instruction-input');
    const drEksteriorMagicInstructionBtn = document.getElementById('dr-eksterior-magic-instruction-btn');
    const drEksteriorMagicInstructionTooltip = document.getElementById('dr-eksterior-magic-instruction-tooltip');
    const drEksteriorRatioOptions = document.getElementById('dr-eksterior-ratio-options');
    const drEksteriorResultCountSlider = document.getElementById('dr-eksterior-result-count-slider');
    const drEksteriorResultCountDisplay = document.getElementById('dr-eksterior-result-count-display');
    const drEksteriorGenerateBtn = document.getElementById('dr-eksterior-generate-btn');
    const drEksteriorResultsContainer = document.getElementById('dr-eksterior-results-container');
    const drEksteriorResultsGrid = document.getElementById('dr-eksterior-results-grid');
    
    let drEksteriorHouseData = null;
    let drEksteriorMagicInstructionTooltipShown = false;

    function drEksteriorUpdateGenerateButtonState() {
        const hasImage = !!drEksteriorHouseData;
        const hasStyle = drEksteriorStyleOptions.querySelector('.selected') !== null;
        const hasInstruction = drEksteriorInstructionInput.value.trim() !== '';
        drEksteriorGenerateBtn.disabled = !hasImage || !hasStyle || !hasInstruction;
        drEksteriorMagicInstructionBtn.disabled = !hasImage || !hasStyle;
        if (!drEksteriorMagicInstructionBtn.disabled && !drEksteriorMagicInstructionTooltipShown) {
            drEksteriorMagicInstructionTooltip.classList.add('visible');
            drEksteriorMagicInstructionTooltipShown = true;
            setTimeout(() => {
                drEksteriorMagicInstructionTooltip.classList.remove('visible');
            }, 5000);
        }
    }

    if (drEksteriorHouseInput) {
        setupImageUpload(drEksteriorHouseInput, drEksteriorHouseUploadBox, (data) => {
            drEksteriorHouseData = data;
            drEksteriorHousePreview.src = data.dataUrl;
            drEksteriorHousePlaceholder.classList.add('hidden');
            drEksteriorHousePreview.classList.remove('hidden');
            drEksteriorRemoveHouseBtn.classList.remove('hidden');
            drEksteriorUpdateGenerateButtonState();
        });
    }

    if (drEksteriorRemoveHouseBtn) {
        drEksteriorRemoveHouseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            drEksteriorHouseData = null;
            drEksteriorHouseInput.value = '';
            drEksteriorHousePreview.src = '#';
            drEksteriorHousePreview.classList.add('hidden');
            drEksteriorHousePlaceholder.classList.remove('hidden');
            drEksteriorRemoveHouseBtn.classList.add('hidden');
            document.getElementById('dr-eksterior-results-placeholder').classList.remove('hidden');
            drEksteriorResultsContainer.classList.add('hidden');
            drEksteriorResultsGrid.innerHTML = '';
            drEksteriorUpdateGenerateButtonState();
            drEksteriorMagicInstructionTooltip.classList.remove('visible');
            drEksteriorMagicInstructionTooltipShown = false;
        });
    }

    setupOptionButtons(drEksteriorStyleOptions, true);
    
    if (drEksteriorStyleOptions) {
        drEksteriorStyleOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.value === 'Kustom') {
                drEksteriorKustomContainer.classList.toggle('hidden', !button.classList.contains('selected'));
            }
            drEksteriorUpdateGenerateButtonState();
        });
    }

    if (drEksteriorInstructionInput) {
        drEksteriorInstructionInput.addEventListener('input', drEksteriorUpdateGenerateButtonState);
    }
    
    setupOptionButtons(drEksteriorRatioOptions);

    if (drEksteriorResultCountSlider && drEksteriorResultCountDisplay) {
        drEksteriorResultCountSlider.addEventListener('input', function() {
            drEksteriorResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    if (drEksteriorMagicInstructionBtn) {
        drEksteriorMagicInstructionBtn.addEventListener('click', async () => {
            const originalBtnHTML = drEksteriorMagicInstructionBtn.innerHTML;
            drEksteriorMagicInstructionBtn.disabled = true;
            drEksteriorMagicInstructionBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-teal-500"></i>`;
            lucide.createIcons();
            try {
                const selectedStyles = Array.from(drEksteriorStyleOptions.querySelectorAll('.selected')).map(btn => {
                    if (btn.dataset.value === 'Kustom') {
                        return drEksteriorKustomInput.value.trim();
                    }
                    return btn.dataset.value;
                }).filter(Boolean);
                const formData = new FormData();
                formData.append('prompt', `Analisa foto rumah ini dan tema renovasi: ${selectedStyles.join(', ')}. Buat instruksi desain singkat dalam Bahasa Indonesia. Jawab hanya teks instruksi tanpa pembukaan. Balas dalam plain text tanpa format markdown.`);
                const base64ToBlob = (base64, mimeType) => {
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    return new Blob([byteArray], { type: mimeType });
                };
                formData.append('images[]', base64ToBlob(drEksteriorHouseData.base64, drEksteriorHouseData.mimeType), 'house.jpg');
                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': API_KEY
                    },
                    body: formData
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                const result = await response.json();
                if (result.success && result.response) {
                    const responseStr = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                    drEksteriorInstructionInput.value = responseStr.trim();
                    drEksteriorUpdateGenerateButtonState();
                } else {
                    throw new Error(result.error || 'Gagal membuat instruksi');
                }
            } catch (error) {
                console.error("Error generating magic instruction:", error);
                drEksteriorInstructionInput.value = `Gagal membuat instruksi: ${error.message}`;
            } finally {
                drEksteriorMagicInstructionBtn.innerHTML = originalBtnHTML;
                lucide.createIcons();
                drEksteriorUpdateGenerateButtonState();
            }
        });
    }

    if (drEksteriorGenerateBtn) {
        drEksteriorGenerateBtn.addEventListener('click', async () => {
            const originalBtnHTML = drEksteriorGenerateBtn.innerHTML;
            drEksteriorGenerateBtn.disabled = true;
            drEksteriorGenerateBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin text-teal-400 mr-2"></i><span>Mendesain Ulang...</span>`;
            document.getElementById('dr-eksterior-results-placeholder').classList.add('hidden');
            let selectedRatioValue = drEksteriorRatioOptions.querySelector('.selected').dataset.value;
            let apiAspectRatio = selectedRatioValue;
            if (selectedRatioValue === 'Auto') {
                try {
                    const ratio = await getImageAspectRatio(drEksteriorHouseData);
                    apiAspectRatio = getClosestStandardRatio(ratio);
                } catch {
                    apiAspectRatio = '1:1';
                }
            }
            drEksteriorResultsContainer.classList.remove('hidden');
            drEksteriorResultsGrid.innerHTML = '';
            const numOutputs = parseInt(drEksteriorResultCountSlider.value) || 1;
            drEksteriorResultsGrid.className = `grid ${getResultGridCols(numOutputs)} gap-4 md:gap-6`;
            for (let i = 1; i <= numOutputs; i++) {
                const card = document.createElement('div');
                card.id = `dr-eksterior-card-${i}`;
                card.className = `relative bg-white border border-slate-200 shadow-none flex flex-col items-center justify-center rounded-2xl overflow-hidden`;
                if (selectedRatioValue !== 'Auto') {
                    card.classList.add(getAspectRatioClass(selectedRatioValue));
                } else {
                    card.classList.add(getAspectRatioClass(apiAspectRatio));
                }
                card.innerHTML = `
                            <div class="flex flex-col items-center justify-center gap-3">
                                <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-teal-500/50"></i>
                                <p class="text-[10px] font-bold text-slate-400 animate-pulse uppercase tracking-widest">Sedang Memproses...</p>
                            </div>`;
                drEksteriorResultsGrid.appendChild(card);
            }
            lucide.createIcons();
            const generationPromises = Array.from({ length: numOutputs }, (_, i) => i + 1).map(i => generateSingleEksteriorDesign(i, apiAspectRatio));
            await Promise.allSettled(generationPromises);
            drEksteriorGenerateBtn.disabled = false;
            drEksteriorGenerateBtn.innerHTML = originalBtnHTML;
            lucide.createIcons();
        });
    }

    async function generateSingleEksteriorDesign(id, aspectRatio) {
        const card = document.getElementById(`dr-eksterior-card-${id}`);
        try {
            const selectedStyles = Array.from(drEksteriorStyleOptions.querySelectorAll('.selected')).map(btn => {
                if (btn.dataset.value === 'Kustom') return drEksteriorKustomInput.value.trim();
                return btn.dataset.value;
            }).filter(Boolean);
            const instruction = drEksteriorInstructionInput.value.trim();
            const prompt = `Redesign the exterior of the house in the provided image. CRITICAL: Maintain the core structure and shape of the original house. Focus only on changing the facade, colors, materials, and landscaping as instructed.
                - Renovation Themes: ${selectedStyles.join(', ')}.
                - Detailed Instructions: "${instruction}".
                The final result must be a photorealistic image of the redesigned house exterior. This is design variation number ${id}.`;
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
            formData.append('images[]', base64ToBlob(drEksteriorHouseData.base64, drEksteriorHouseData.mimeType));
            formData.append('instruction', prompt);
            formData.append('aspectRatio', aspectRatio);
            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });
            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();
            if (!result.success || !result.imageUrl) throw new Error("No image data from AI for this design.");
            if (result.imageUrl) {
                const imageUrl = result.imageUrl;
                card.innerHTML = `
                        <div class="relative w-full h-full group">
                            <img src="${imageUrl}" class="w-full h-full object-cover" alt="Desain Eksterior">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            <div class="absolute bottom-2 right-2 flex gap-1">
                                <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <a href="${imageUrl}" download="desain_eksterior_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                    <i data-lucide="download" class="w-4 h-4"></i>
                                </a>
                            </div>
                        </div>`;
                card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio)}`;
                doneSound.play();
            }
        } catch (error) {
            errorSound.play();
            console.error(`Error for eksterior design card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }

    return {
        drInteriorSetRoomImage,
        switchDesainRumahTab
    };
}
