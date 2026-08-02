window.initFaceSwap = function (ctx) {
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

    const fswTargetInput = document.getElementById('fsw-target-input');
    const fswTargetUploadBox = document.getElementById('fsw-target-upload-box');
    const fswTargetPreview = document.getElementById('fsw-target-preview');
    const fswTargetPlaceholder = document.getElementById('fsw-target-placeholder');
    const fswRemoveTargetBtn = document.getElementById('fsw-remove-target-btn');
    const fswSourceInput = document.getElementById('fsw-source-input');
    const fswSourceUploadBox = document.getElementById('fsw-source-upload-box');
    const fswSourcePreview = document.getElementById('fsw-source-preview');
    const fswSourcePlaceholder = document.getElementById('fsw-source-placeholder');
    const fswRemoveSourceBtn = document.getElementById('fsw-remove-source-btn');
    const fswRatioOptions = document.getElementById('fsw-ratio-options');
    const fswGenerateBtn = document.getElementById('fsw-generate-btn');
    const fswResultsPlaceholder = document.getElementById('fsw-results-placeholder');
    const fswResultsContainer = document.getElementById('fsw-results-container');
    const fswResultsGrid = document.getElementById('fsw-results-grid');
    const fswResultCountSlider = document.getElementById('fsw-result-count-slider');
    const fswResultCountDisplay = document.getElementById('fsw-result-count-display');

    if (!fswTargetInput || !fswSourceInput || !fswRatioOptions || !fswGenerateBtn || !fswResultsGrid) {
        return;
    }

    let fswTargetData = null;
    let fswSourceData = null;
    let faceApiModelsLoaded = false;

    function waitForFaceApi(maxWait = 10000) {
        return new Promise((resolve, reject) => {
            if (typeof window.faceapi !== 'undefined') {
                resolve();
                return;
            }
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (typeof window.faceapi !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                } else if (Date.now() - startTime > maxWait) {
                    clearInterval(checkInterval);
                    reject(new Error('face-api.js tidak tersedia setelah menunggu'));
                }
            }, 100);
        });
    }

    async function loadFaceApiModels() {
        if (faceApiModelsLoaded) return true;
        try {
            await waitForFaceApi();
            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
            await Promise.all([
                window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            ]);
            faceApiModelsLoaded = true;
            return true;
        } catch (error) {
            alert("Gagal memuat komponen deteksi wajah. Coba muat ulang halaman.");
            return false;
        }
    }

    function fswUpdateButtons() {
        fswGenerateBtn.disabled = !fswTargetData || !fswSourceData;
    }

    setupImageUpload(fswTargetInput, fswTargetUploadBox, (data) => {
        fswTargetData = data;
        fswTargetPreview.src = data.dataUrl;
        fswTargetPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, fswRatioOptions);
        fswTargetPreview.classList.remove('hidden');
        fswRemoveTargetBtn.classList.remove('hidden');
        fswUpdateButtons();
        loadFaceApiModels();
    });

    fswRemoveTargetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fswTargetData = null;
        fswTargetInput.value = '';
        fswTargetPreview.src = '#';
        fswTargetPreview.classList.add('hidden');
        fswTargetPlaceholder.classList.remove('hidden');
        fswRemoveTargetBtn.classList.add('hidden');
        if (fswResultsPlaceholder) fswResultsPlaceholder.classList.remove('hidden');
        if (fswResultsContainer) fswResultsContainer.classList.add('hidden');
        fswResultsGrid.innerHTML = '';
        fswUpdateButtons();
    });

    setupImageUpload(fswSourceInput, fswSourceUploadBox, (data) => {
        fswSourceData = data;
        fswSourcePreview.src = data.dataUrl;
        fswSourcePlaceholder.classList.add('hidden');
        fswSourcePreview.classList.remove('hidden');
        fswRemoveSourceBtn.classList.remove('hidden');
        fswUpdateButtons();
        loadFaceApiModels();
    });

    fswRemoveSourceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fswSourceData = null;
        fswSourceInput.value = '';
        fswSourcePreview.src = '#';
        fswSourcePreview.classList.add('hidden');
        fswSourcePlaceholder.classList.remove('hidden');
        fswRemoveSourceBtn.classList.add('hidden');
        if (fswResultsPlaceholder) fswResultsPlaceholder.classList.remove('hidden');
        if (fswResultsContainer) fswResultsContainer.classList.add('hidden');
        fswResultsGrid.innerHTML = '';
        fswUpdateButtons();
    });

    setupOptionButtons(fswRatioOptions);

    if (fswResultCountSlider && fswResultCountDisplay) {
        fswResultCountSlider.addEventListener('input', () => {
            let val = parseInt(fswResultCountSlider.value);
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;

            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                fswResultCountSlider.value = 1;
                val = 1;
            }
            fswResultCountDisplay.textContent = `${val} Gambar`;
        });
    }

    async function getTargetImageAspectRatio(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
            img.onerror = reject;
            img.src = imageData.dataUrl;
        });
    }

    async function createPastedComposite(targetData, sourceData) {
        const [targetImg, sourceImg] = await Promise.all([
            window.faceapi.fetchImage(targetData.dataUrl),
            window.faceapi.fetchImage(sourceData.dataUrl)
        ]);
        const [targetDetections, sourceDetections] = await Promise.all([
            window.faceapi.detectAllFaces(targetImg),
            window.faceapi.detectAllFaces(sourceImg)
        ]);
        if (targetDetections.length === 0) throw new Error("Wajah tidak terdeteksi di foto target.");
        if (sourceDetections.length === 0) throw new Error("Wajah tidak terdeteksi di foto sumber.");
        const targetFace = targetDetections.sort((a, b) => b.box.area - a.box.area)[0].box;
        const sourceFace = sourceDetections.sort((a, b) => b.box.area - a.box.area)[0].box;
        const canvas = document.createElement('canvas');
        canvas.width = targetImg.naturalWidth;
        canvas.height = targetImg.naturalHeight;
        const canvasCtx = canvas.getContext('2d');
        canvasCtx.drawImage(targetImg, 0, 0);
        const padding = sourceFace.width * 0.15;
        const sx = Math.max(0, sourceFace.x - padding);
        const sy = Math.max(0, sourceFace.y - padding);
        const sWidth = sourceFace.width + (padding * 2);
        const sHeight = sourceFace.height + (padding * 2);
        canvasCtx.drawImage(sourceImg, sx, sy, sWidth, sHeight, targetFace.x, targetFace.y, targetFace.width, targetFace.height);
        return canvas.toDataURL('image/png');
    }

    fswGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = fswGenerateBtn.innerHTML;
        fswGenerateBtn.disabled = true;
        if (fswResultsPlaceholder) fswResultsPlaceholder.classList.add('hidden');
        if (fswResultsContainer) fswResultsContainer.classList.remove('hidden');
        fswResultsGrid.innerHTML = '';
        try {
            fswGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisis Wajah...</span>`;
            const modelsLoaded = await loadFaceApiModels();
            if (!modelsLoaded) throw new Error("Model deteksi wajah gagal dimuat.");
            const pastedCompositeDataUrl = await createPastedComposite(fswTargetData, fswSourceData);
            const parts = pastedCompositeDataUrl.split(',');
            const compositeMimeType = parts[0].match(/:(.*?);/)[1];
            const compositeBase64 = parts[1];
            const compositeData = { mimeType: compositeMimeType, base64: compositeBase64 };
            fswGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Sedang Menukar Wajah...</span>`;
            const selectedRatioValue = fswRatioOptions.querySelector('.selected').dataset.value;
            let apiAspectRatio = selectedRatioValue;
            if (selectedRatioValue === 'Auto') {
                apiAspectRatio = await getTargetImageAspectRatio(fswTargetData);
            }
            const resultCount = fswResultCountSlider ? parseInt(fswResultCountSlider.value) : 1;
            fswResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-5`;
            for (let i = 1; i <= resultCount; i++) {
                const card = document.createElement('div');
                card.id = `fsw-card-${i}`;
                card.className = `relative bg-white border border-slate-200 shadow-none flex flex-col items-center justify-center rounded-2xl overflow-hidden`;
                if (selectedRatioValue === 'Auto') {
                    card.style.aspectRatio = `${apiAspectRatio}`;
                } else {
                    card.classList.add(getAspectRatioClass(selectedRatioValue));
                }
                card.innerHTML = `
                    <div class="flex flex-col items-center justify-center gap-3">
                        <div class="spinner"></div>
                        <p class="text-[10px] font-bold text-slate-400 animate-pulse uppercase tracking-widest">Memproses...</p>
                    </div>`;
                fswResultsGrid.appendChild(card);
            }
            lucide.createIcons();
            const generationPromises = Array.from({length: resultCount}, (_, i) => i + 1).map(i =>
                generateSingleFaceSwapImage(i, compositeData, apiAspectRatio)
            );
            await Promise.allSettled(generationPromises);
        } catch (error) {
            fswResultsGrid.innerHTML = `<div class="col-span-1 text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
            if (errorSound) errorSound.play();
        } finally {
            fswGenerateBtn.disabled = false;
            fswGenerateBtn.innerHTML = originalBtnHTML;
            lucide.createIcons();
        }
    });

    async function generateSingleFaceSwapImage(id, compositeData, aspectRatio) {
        const card = document.getElementById(`fsw-card-${id}`);
        if (!card) return;
        try {
            const prompt = `fix by tidying up the face without changing the facial features
                This is generation attempt number ${id}. Follow all rules without deviation.`;

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
            formData.append('images[]', base64ToBlob(compositeData.base64, compositeData.mimeType));
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

            if (!result.success || !result.imageUrl) throw new Error("AI tidak mengembalikan gambar hasil.");
            const imageUrl = result.imageUrl;
            card.innerHTML = `
            <div class="relative w-full h-full group">
                <img src="${imageUrl}" class="w-full h-full object-cover" alt="Hasil Tukar Wajah">
                <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div class="absolute bottom-2 right-2 flex gap-1">
                    <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <a href="${imageUrl}" download="face_swap_result_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>`;
            card.className = `relative w-full rounded-2xl overflow-hidden group ${getAspectRatioClass(aspectRatio)}`;
            if (doneSound) doneSound.play();
        } catch (error) {
            if (errorSound) errorSound.play();
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">Gagal (Variasi ${id}): ${error.message}</div>`;
        }
    }
};
