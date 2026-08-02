window.initPerluasFoto = function (ctx) {
    const {
        document,
        setupImageUpload,
        lucide,
        getApiKey,
        GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound
    } = ctx;

    const epImageInput = document.getElementById('ep-image-input');
    const epUploadBox = document.getElementById('ep-upload-box');
    const epWorkspace = document.getElementById('ep-workspace');
    const epCanvasContainer = document.getElementById('ep-canvas-container');
    const epPreview = document.getElementById('ep-preview');
    const epResizeFrame = document.getElementById('ep-resize-frame');
    const epRatioSelect = document.getElementById('ep-ratio-select');
    const epWidthInput = document.getElementById('ep-width-input');
    const epHeightInput = document.getElementById('ep-height-input');
    const epGenerateBtn = document.getElementById('ep-generate-btn');
    const epResetBtn = document.getElementById('ep-reset-btn');
    const epResultsCard = document.getElementById('ep-results-card');
    const epResultsContainer = document.getElementById('ep-results-container');
    const epZoomControls = document.getElementById('ep-zoom-controls');
    const epZoomSlider = document.getElementById('ep-zoom-slider');
    const epZoomInBtn = document.getElementById('ep-zoom-in-btn');
    const epZoomOutBtn = document.getElementById('ep-zoom-out-btn');
    const epResultsPlaceholder = document.getElementById('ep-results-placeholder');
    const epResultCountSlider = document.getElementById('ep-result-count-slider');
    const epResultCountDisplay = document.getElementById('ep-result-count-display');

    if (!epImageInput || !epUploadBox || !epWorkspace || !epCanvasContainer || !epPreview || !epResizeFrame || !epRatioSelect || !epWidthInput || !epHeightInput || !epGenerateBtn || !epResetBtn || !epResultsCard || !epResultsContainer || !epZoomControls || !epZoomSlider || !epZoomInBtn || !epZoomOutBtn) {
        return;
    }

    let epImageData = null;
    let epOriginalImg = null;
    let epFrameState = { x: 0, y: 0, width: 0, height: 0 };
    let epImageState = { x: 0, y: 0, width: 0, height: 0 };
    let epDragState = { active: false, handle: null, startX: 0, startY: 0, startFrame: null, startImage: null };
    let epZoomLevel = 100; // Default di tengah slider (range 50-150)

    function epUpdateGenerateButton() {
        const hasImage = !!epOriginalImg;
        if (!hasImage) {
            epGenerateBtn.disabled = true;
            return;
        }
        const isExpanded = epFrameState.width > epImageState.width + 1 || epFrameState.height > epImageState.height + 1;
        epGenerateBtn.disabled = !isExpanded;
    }

    function epResetUI() {
        epImageData = null;
        epOriginalImg = null;
        epUploadBox.style.display = 'flex';
        epCanvasContainer.classList.add('hidden');
        epZoomControls.classList.add('hidden');
        epZoomControls.classList.add('hidden');
        epResultsCard.classList.add('hidden');
        if (epResultsPlaceholder) epResultsPlaceholder.classList.remove('hidden');
        epRatioSelect.disabled = true;
        epRatioSelect.value = 'original';
        epWidthInput.value = '';
        epHeightInput.value = '';
        epResetBtn.disabled = true;
        epResultsContainer.innerHTML = '';
        epUpdateGenerateButton();
    }

    function epUpdateZoomSliderUI() {
        const min = epZoomSlider.min;
        const max = epZoomSlider.max;
        const val = epZoomSlider.value;
        const percentage = ((val - min) * 100) / (max - min);
        epZoomSlider.style.backgroundSize = `${percentage}% 100%`;
    }

    function epApplyZoom(newZoomValue) {
        epZoomLevel = Math.max(parseInt(epZoomSlider.min), Math.min(parseInt(epZoomSlider.max), newZoomValue));
        epZoomSlider.value = epZoomLevel;
        epUpdateZoomSliderUI();
        if (!epOriginalImg) return;
        
        const workspaceRect = epWorkspace.getBoundingClientRect();
        const maxW = workspaceRect.width - 40;
        const maxH = workspaceRect.height - 40;
        
        let baseScale = 1;
        if (epOriginalImg.naturalWidth > maxW) baseScale = maxW / epOriginalImg.naturalWidth;
        if (epOriginalImg.naturalHeight * baseScale > maxH) baseScale = maxH / epOriginalImg.naturalHeight;
        
        const zoomMultiplier = epZoomLevel / 100;
        const finalScale = baseScale * zoomMultiplier;
        
        const newImgWidth = epOriginalImg.naturalWidth * finalScale;
        const newImgHeight = epOriginalImg.naturalHeight * finalScale;
        epImageState = { x: 0, y: 0, width: newImgWidth, height: newImgHeight };
        epFrameState = { ...epImageState };
        epUpdateFrameAndImagePositions();
        epWidthInput.value = epOriginalImg.naturalWidth;
        epHeightInput.value = epOriginalImg.naturalHeight;
        epRatioSelect.value = 'original';
        epUpdateGenerateButton();
    }

    function epUpdateFrameAndImagePositions() {
        epCanvasContainer.style.width = `${epFrameState.width}px`;
        epCanvasContainer.style.height = `${epFrameState.height}px`;
        epResizeFrame.style.left = `0px`;
        epResizeFrame.style.top = `0px`;
        epResizeFrame.style.width = `100%`;
        epResizeFrame.style.height = `100%`;
        epPreview.style.left = `${epImageState.x}px`;
        epPreview.style.top = `${epImageState.y}px`;
        epPreview.style.width = `${epImageState.width}px`;
        epPreview.style.height = `${epImageState.height}px`;
    }

    function epInitializeCanvas(img) {
        epOriginalImg = img;
        epUploadBox.style.display = 'none';
        epCanvasContainer.classList.remove('hidden');
        epZoomControls.classList.remove('hidden');
        epApplyZoom(100);
        epRatioSelect.disabled = false;
        epResetBtn.disabled = false;
    }

    setupImageUpload(epImageInput, epUploadBox, (data) => {
        epImageData = data;
        epPreview.src = data.dataUrl;
        const img = new Image();
        img.onload = () => epInitializeCanvas(img);
        img.src = data.dataUrl;
    });

    epResetBtn.addEventListener('click', epResetUI);
    epZoomSlider.addEventListener('input', () => epApplyZoom(parseInt(epZoomSlider.value)));
    epZoomInBtn.addEventListener('click', () => epApplyZoom(parseInt(epZoomSlider.value) + 10));
    epZoomOutBtn.addEventListener('click', () => epApplyZoom(parseInt(epZoomSlider.value) - 10));
    epRatioSelect.addEventListener('change', () => {
        if (!epOriginalImg) return;
        const ratioValue = epRatioSelect.value;
        if (ratioValue === 'original') {
            epApplyZoom(parseInt(epZoomSlider.value));
            return;
        }
        if (ratioValue === 'custom') { return; }
        const [wRatio, hRatio] = ratioValue.split(':').map(Number);
        const targetRatio = wRatio / hRatio;
        const originalDisplayRatio = epImageState.width / epImageState.height;
        let newFrameWidth, newFrameHeight;
        if (targetRatio > originalDisplayRatio) {
            newFrameHeight = epImageState.height;
            newFrameWidth = newFrameHeight * targetRatio;
        } else {
            newFrameWidth = epImageState.width;
            newFrameHeight = newFrameWidth / targetRatio;
        }
        epFrameState = { width: newFrameWidth, height: newFrameHeight, x: 0, y: 0 };
        epImageState.x = (newFrameWidth - epImageState.width) / 2;
        epImageState.y = (newFrameHeight - epImageState.height) / 2;
        epUpdateFrameAndImagePositions();
        const scale = epOriginalImg.naturalWidth / epImageState.width;
        epWidthInput.value = Math.round(newFrameWidth * scale);
        epHeightInput.value = Math.round(newFrameHeight * scale);
        epUpdateGenerateButton();
    });

    if (epResultCountSlider && epResultCountDisplay) {
        epResultCountSlider.addEventListener('input', () => {
            let val = parseInt(epResultCountSlider.value);
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;

            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                epResultCountSlider.value = 1;
                val = 1;
            }
            epResultCountDisplay.textContent = `${val} Gambar`;
        });
    }

    function epDragHandler(e) {
        if (!epDragState.active) return;
        if (e.cancelable) e.preventDefault();
        const currentX = e.touches ? e.touches[0].clientX : e.clientX;
        const currentY = e.touches ? e.touches[0].clientY : e.clientY;
        const dx = currentX - epDragState.startX;
        const dy = currentY - epDragState.startY;
        let effectiveDx = dx;
        let effectiveDy = dy;
        const direction = epDragState.handle.substring('ep-handle-'.length);
        if (direction === 'n' || direction === 's') { effectiveDx = 0; }
        if (direction === 'e' || direction === 'w') { effectiveDy = 0; }
        let newFrame = { ...epDragState.startFrame };
        let newImage = { ...epDragState.startImage };
        if (direction.includes('e')) { newFrame.width = epDragState.startFrame.width + effectiveDx; }
        if (direction.includes('w')) {
            newFrame.width = epDragState.startFrame.width - effectiveDx;
            newImage.x = epDragState.startImage.x - effectiveDx;
        }
        if (direction.includes('s')) { newFrame.height = epDragState.startFrame.height + effectiveDy; }
        if (direction.includes('n')) {
            newFrame.height = epDragState.startFrame.height - effectiveDy;
            newImage.y = epDragState.startImage.y - effectiveDy;
        }
        if (newFrame.width < newImage.width) {
            if (direction.includes('w')) { newImage.x += newFrame.width - newImage.width; }
            newFrame.width = newImage.width;
        }
        if (newFrame.height < newImage.height) {
            if (direction.includes('n')) { newImage.y += newFrame.height - newImage.height; }
            newFrame.height = newImage.height;
        }
        epFrameState = { x: 0, y: 0, width: newFrame.width, height: newFrame.height };
        epImageState.x = newImage.x;
        epImageState.y = newImage.y;
        epUpdateFrameAndImagePositions();
        const scale = epOriginalImg.naturalWidth / epImageState.width;
        epWidthInput.value = Math.round(epFrameState.width * scale);
        epHeightInput.value = Math.round(epFrameState.height * scale);
        epUpdateGenerateButton();
    }

    function epEndDragHandler() {
        if (!epDragState.active) return;
        epDragState.active = false;
        window.removeEventListener('mousemove', epDragHandler);
        window.removeEventListener('mouseup', epEndDragHandler);
        window.removeEventListener('touchmove', epDragHandler);
        window.removeEventListener('touchend', epEndDragHandler);
    }

    function epStartDragHandler(e) {
        const handle = e.target;
        if (!handle.classList.contains('ep-handle')) return;
        if (e.cancelable) e.preventDefault();
        epRatioSelect.value = 'custom';
        const isTouchEvent = !!e.touches;
        const startX = isTouchEvent ? e.touches[0].clientX : e.clientX;
        const startY = isTouchEvent ? e.touches[0].clientY : e.clientY;
        epDragState = {
            active: true, handle: handle.id, startX: startX, startY: startY,
            startFrame: { ...epFrameState }, startImage: { ...epImageState }
        };
        if (isTouchEvent) {
            window.addEventListener('touchmove', epDragHandler, { passive: false });
            window.addEventListener('touchend', epEndDragHandler);
        } else {
            window.addEventListener('mousemove', epDragHandler);
            window.addEventListener('mouseup', epEndDragHandler);
        }
    }

    epResizeFrame.addEventListener('mousedown', epStartDragHandler);
    epResizeFrame.addEventListener('touchstart', epStartDragHandler, { passive: false });

    async function generateSingleExpandedImage(id, compositeBase64, prompt, aspectRatio, mimeType = 'image/png') {
        const card = document.getElementById(`ep-card-${id}`);
        if (!card) return;
        try {
            const finalPrompt = `${prompt} This is creative variation number ${id}.`;
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
            formData.append('images[]', base64ToBlob(compositeBase64, mimeType));
            formData.append('instruction', finalPrompt);
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
            if (!result.success || !result.imageUrl) throw new Error("No image data.");
            const imageUrl = result.imageUrl;
            card.innerHTML = `
                    <div class="relative w-full h-full group">
                        <img src="${imageUrl}" class="w-full h-full object-cover" alt="Hasil Perluas Foto">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                            <a href="${imageUrl}" download="perluas_foto_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        </div>
                    </div>
                `;
            card.className = 'relative w-full rounded-2xl overflow-hidden group';
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error expanding photo for variation ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">Gagal (Variasi ${id}): ${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }

    epGenerateBtn.addEventListener('click', async () => {
        if (!epImageData) return;
        const originalBtnHTML = epGenerateBtn.innerHTML;
        epGenerateBtn.disabled = true;
        epGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Memperluas...</span>`;
        if (epResultsPlaceholder) epResultsPlaceholder.classList.add('hidden');
        epResultsCard.classList.remove('hidden');
        const finalAspectRatio = (epFrameState.height > 0) ? (epFrameState.width / epFrameState.height) : 1;
        const resultCount = epResultCountSlider ? parseInt(epResultCountSlider.value) : 1;
        epResultsContainer.innerHTML = `<div id="ep-results-grid" class="grid ${getResultGridCols(resultCount)} gap-4"></div>`;
        const resultsGrid = document.getElementById('ep-results-grid');
        for (let i = 1; i <= resultCount; i++) {
            const card = document.createElement('div');
            card.id = `ep-card-${i}`;
            card.className = 'relative bg-white border border-slate-200 shadow-none flex flex-col items-center justify-center rounded-2xl overflow-hidden';
            card.style.aspectRatio = finalAspectRatio;
            card.innerHTML = `
                        <div class="flex flex-col items-center justify-center gap-3">
                            <div class="spinner"></div>
                            <span class="text-xs font-medium text-slate-400 animate-pulse">Sedang Memproses...</span>
                        </div>`;
            resultsGrid.appendChild(card);
        }
        lucide.createIcons();
        try {
            const imgWidth = epImageState.width;
            const scale = epOriginalImg.naturalWidth / imgWidth;
            const targetWidth = Math.round(epFrameState.width * scale);
            const targetHeight = Math.round(epFrameState.height * scale);
            const imgX = Math.round(epImageState.x * scale);
            const imgY = Math.round(epImageState.y * scale);
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = targetWidth;
            compositeCanvas.height = targetHeight;
            const compositeCtx = compositeCanvas.getContext('2d');
            compositeCtx.drawImage(epOriginalImg, imgX, imgY);
            const compositeBase64 = compositeCanvas.toDataURL('image/png').split(',')[1];
            const prompt = `You are an expert outpainting AI with a single, strict directive: to fill the transparent canvas area around the provided image fragment.
                **ABSOLUTE NON-NEGOTIABLE RULES:**
                1.  **PRESERVE THE ORIGINAL 100%:** The content within the original image fragment is sacred. It MUST NOT be altered, retouched, or modified in any way. This includes, but is not limited to, objects, lighting, and textures.
                2.  **DO NOT CHANGE PEOPLE OR FACES:** This is the most critical rule. If there are people in the original image, their faces, bodies, clothing, and especially their facial expressions (smiling, neutral, etc.) MUST be preserved exactly as they are. Do not make a person smile if they are not smiling. Do not change their pose.
                3.  **FILL ONLY THE VOID:** Your sole task is to generate new, contextually relevant imagery *only* in the transparent areas of the canvas, seamlessly blending it with the edges of the original fragment.
                The final output must be a single, coherent, larger image where the original part is perfectly untouched. Do not add watermarks or text.`;
            let selectedRatio = epRatioSelect.value;
            if (!selectedRatio.includes(':')) {
                const w = epWidthInput.value;
                const h = epHeightInput.value;
                selectedRatio = (w && h) ? `${w}:${h}` : '1:1';
            }
            const generationPromises = Array.from({length: resultCount}, (_, i) => i + 1).map(i =>
                generateSingleExpandedImage(i, compositeBase64, prompt, selectedRatio, 'image/png')
            );
            await Promise.allSettled(generationPromises);
        } catch (error) {
            errorSound.play();
            console.error("Error preparing to expand photo:", error);
            epResultsContainer.innerHTML = `<div class="w-full col-span-1 text-red-500 p-4 text-center break-all">Gagal mempersiapkan gambar: ${error.message}</div>`;
        } finally {
            epGenerateBtn.disabled = false;
            epGenerateBtn.innerHTML = originalBtnHTML;
            lucide.createIcons();
        }
    });
};
