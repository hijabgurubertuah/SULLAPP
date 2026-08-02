window.initHapusBg = function (ctx) {
    const {
        document,
        setupImageUpload,
        setupOptionButtons,
        lucide,
        getApiKey,
        GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound
    } = ctx;

    const hbgImageInput = document.getElementById('hbg-image-input');
    const hbgUploadBox = document.getElementById('hbg-upload-box');
    const hbgPreview = document.getElementById('hbg-preview');
    const hbgPlaceholder = document.getElementById('hbg-placeholder');
    const hbgRemoveBtn = document.getElementById('hbg-remove-btn');
    const hbgGenerateBtn = document.getElementById('hbg-generate-btn');
    const hbgResultsContainer = document.getElementById('hbg-results-container');
    const hbgResultsGrid = document.getElementById('hbg-results-grid');
    const hbgRatioOptions = document.getElementById('hbg-ratio-options');
    const hbgResultsPlaceholder = document.getElementById('hbg-results-placeholder');
    const hbgResultCountSlider = document.getElementById('hbg-result-count-slider');
    const hbgResultCountDisplay = document.getElementById('hbg-result-count-display');

    if (!hbgImageInput || !hbgGenerateBtn || !hbgResultsGrid || !hbgRatioOptions) {
        return;
    }

    let hbgImageData = null;
    const hbgRatioValues = [
        { value: '1:1', ratio: 1 },
        { value: '3:4', ratio: 3 / 4 },
        { value: '4:3', ratio: 4 / 3 },
        { value: '9:16', ratio: 9 / 16 },
        { value: '16:9', ratio: 16 / 9 },
    ];

    function selectHbgRatio(value) {
        const target = hbgRatioOptions.querySelector(`[data-value="${value}"]`);
        if (!target) return;
        Array.from(hbgRatioOptions.children).forEach((btn) => btn.classList.remove('selected'));
        target.classList.add('selected');
    }

    function getClosestHbgRatio(width, height) {
        if (!width || !height) return null;
        const targetRatio = width / height;
        let closest = hbgRatioValues[0];
        let smallestDiff = Math.abs(closest.ratio - targetRatio);
        for (let i = 1; i < hbgRatioValues.length; i++) {
            const diff = Math.abs(hbgRatioValues[i].ratio - targetRatio);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closest = hbgRatioValues[i];
            }
        }
        return closest.value;
    }

    function autoSelectHbgRatio(dataUrl) {
        const img = new Image();
        img.onload = () => {
            const closestRatio = getClosestHbgRatio(img.width, img.height);
            if (closestRatio) selectHbgRatio(closestRatio);
        };
        img.src = dataUrl;
    }

    function hbgUpdateButtons() {
        hbgGenerateBtn.disabled = !hbgImageData;
    }

    setupOptionButtons(hbgRatioOptions);
    
    if (hbgResultCountSlider && hbgResultCountDisplay) {
        hbgResultCountSlider.addEventListener('input', () => {
            let val = parseInt(hbgResultCountSlider.value);
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;

            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                hbgResultCountSlider.value = 1;
                val = 1;
            }
            hbgResultCountDisplay.textContent = `${val} Gambar`;
        });
    }

    setupImageUpload(hbgImageInput, hbgUploadBox, (data) => {
        hbgImageData = data;
        hbgPreview.src = data.dataUrl;
        hbgPlaceholder.classList.add('hidden');
        hbgPreview.classList.remove('hidden');
        hbgRemoveBtn.classList.remove('hidden');
        hbgUpdateButtons();
        autoSelectHbgRatio(data.dataUrl);
    });

    hbgRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hbgImageData = null;
        hbgImageInput.value = '';
        hbgPreview.src = '#';
        hbgPreview.classList.add('hidden');
        hbgPlaceholder.classList.remove('hidden');
        hbgRemoveBtn.classList.add('hidden');
        if (hbgResultsPlaceholder) hbgResultsPlaceholder.classList.remove('hidden');
        if (hbgResultsContainer) hbgResultsContainer.classList.add('hidden');
        hbgResultsGrid.innerHTML = '';
        hbgUpdateButtons();
    });

    function analyzeImageColor(base64Data) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx2d = canvas.getContext('2d');
                canvas.width = 100;
                canvas.height = 100;
                ctx2d.drawImage(img, 0, 0, 100, 100);
                const data = ctx2d.getImageData(0, 0, 100, 100).data;
                let greenPixelCount = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    if (g > r + 30 && g > b + 30) greenPixelCount++;
                }
                resolve(greenPixelCount > 20 ? 'magenta' : 'green');
            };
            img.src = `data:image/png;base64,${base64Data}`;
        });
    }

    function makeTransparent(imageSrc, colorKey = 'green') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx2d = canvas.getContext('2d');
                ctx2d.drawImage(img, 0, 0);
                const imageData = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    let isBackground = false;
                    let alpha = 255;

                    if (colorKey === 'green') {
                        const maxRB = Math.max(r, b);
                        if (g > maxRB) {
                            const excessGreen = g - maxRB;
                            data[i + 1] = maxRB;
                            if (excessGreen > 20) isBackground = true;
                            else alpha = Math.max(0, 255 - (excessGreen * 12));
                        }
                    } else if (colorKey === 'magenta') {
                        if (r > g + 40 && b > g + 40) isBackground = true;
                    }

                    if (isBackground) data[i + 3] = 0;
                    else if (alpha < 255) data[i + 3] = alpha;
                }
                ctx2d.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    }

    async function generateSingleHbgImage(id) {
        const card = document.getElementById(`hbg-card-${id}`);
        if (!card) return;
        try {
            const maskColor = await analyzeImageColor(hbgImageData.base64);
            const maskInstruction = maskColor === 'magenta'
                ? 'solid, pure Magenta color (RGB 255, 0, 255 or Hex #FF00FF)'
                : 'solid, pure Green color (RGB 0, 255, 0 or Hex #00FF00)';
            const selectedRatio = hbgRatioOptions.querySelector('.selected')?.dataset.value || '1:1';

            const prompt = `Process the image. Completely replace the entire background with a ${maskInstruction}. 
        CRITICAL: Keep the main subject EXACTLY as it is. Do not change the subject's lighting, color, or shape. The edges between the subject and the background must be sharp and precise. The final image must maintain an aspect ratio of ${selectedRatio}. This is variation ${id}.`;

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
            formData.append('images[]', base64ToBlob(hbgImageData.base64, hbgImageData.mimeType));
            formData.append('instruction', prompt);
            formData.append('aspectRatio', selectedRatio);

            const apiHeaders = typeof getApiKey === 'function' ? { 'X-API-Key': getApiKey() } : {};
            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: apiHeaders,
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (result.success && result.imageUrl) {
                const bgUrl = result.imageUrl;
                const transparentUrl = await makeTransparent(bgUrl, maskColor);
                card.className = "relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full";
                card.innerHTML = `
                <div class="relative w-full h-full group bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-gray-100/50">
                    <img src="${transparentUrl}" class="w-full h-auto object-contain max-h-[600px] mx-auto">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div class="absolute bottom-3 right-3 flex gap-2">
                        <button data-img-src="${transparentUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${transparentUrl}" download="sulapfoto_nomg_${id}.png" class="result-action-btn download-btn" title="Unduh PNG Transparan">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>`;
                if (doneSound) doneSound.play();
            } else {
                throw new Error("Respon tidak valid.");
            }
        } catch (error) {
            if (errorSound) errorSound.play();
            card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center bg-white rounded-lg border border-red-200">${error.message}</div>`;
        }
    }

    hbgGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = hbgGenerateBtn.innerHTML;
        hbgGenerateBtn.disabled = true;
        hbgGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa Warna...</span>`;
        if (hbgResultsPlaceholder) hbgResultsPlaceholder.classList.add('hidden');
        if (hbgResultsContainer) hbgResultsContainer.classList.remove('hidden');
        hbgResultsGrid.innerHTML = '';
        
        const resultCount = hbgResultCountSlider ? parseInt(hbgResultCountSlider.value) : 1;
        hbgResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-4`;

        for (let i = 1; i <= resultCount; i++) {
            const card = document.createElement('div');
            card.id = `hbg-card-${i}`;
            card.className = `relative bg-white border border-slate-200 shadow-none flex flex-col items-center justify-center rounded-2xl overflow-hidden w-full aspect-square`;
            card.innerHTML = `
                <div class="flex flex-col items-center justify-center p-12 gap-3">
                    <div class="spinner"></div>
                    <p class="text-[10px] font-bold text-slate-400 animate-pulse uppercase tracking-widest">Memproses...</p>
                </div>`;
            hbgResultsGrid.appendChild(card);
        }
        lucide.createIcons();
        
        const generationPromises = Array.from({length: resultCount}, (_, i) => i + 1).map(i => generateSingleHbgImage(i));
        await Promise.allSettled(generationPromises);
        
        hbgGenerateBtn.disabled = false;
        hbgGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });
};
