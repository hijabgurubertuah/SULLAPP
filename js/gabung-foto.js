window.initGabungFoto = function (ctx) {
    const {
        document,
        setupImageUpload,
        setupOptionButtons,
        getAspectRatioClass,
        lucide,
        getApiKey,
        GENERATE_URL,
        CHAT_URL,
        getApiErrorMessage,
        doneSound,
        errorSound,
        convertHeicToJpg,
        autoSelectClosestRatio
    } = ctx;

    const ggUploadContainer = document.getElementById('gg-upload-container');
    const ggPromptInput = document.getElementById('gg-prompt-input');
    const ggGenerateBtn = document.getElementById('gg-generate-btn');
    const ggResultsContainer = document.getElementById('gg-results-container');
    const ggResultsGrid = document.getElementById('gg-results-grid');
    const ggRatioOptions = document.getElementById('gg-ratio-options');
    const ggMagicPromptBtn = document.getElementById('gg-magic-prompt-btn');
    const ggResultCountSlider = document.getElementById('gg-result-count-slider');
    const ggResultCountDisplay = document.getElementById('gg-result-count-display');

    if (!ggUploadContainer || !ggPromptInput || !ggGenerateBtn || !ggResultsGrid || !ggRatioOptions) {
        return;
    }

    let ggUploadedImages = [];
    const MAX_IMAGES = 5;
    const MIN_IMAGES = 2;
    const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

    const syncGlobalUploads = () => {
        window.ggUploadedImages = ggUploadedImages;
    };

    setupOptionButtons(ggRatioOptions);

    function ggUpdateButtons() {
        const uploadedCount = ggUploadedImages.filter(img => img !== null).length;
        ggGenerateBtn.disabled = uploadedCount < MIN_IMAGES || ggPromptInput.value.trim() === '';
    }

    function ggRenderUploadSlots() {
        ggUploadContainer.innerHTML = '';
        ggUploadedImages = ggUploadedImages.filter(img => img !== null);
        while (ggUploadedImages.length < MIN_IMAGES) {
            ggUploadedImages.push(null);
        }
        if (ggUploadedImages[ggUploadedImages.length - 1] !== null && ggUploadedImages.length < MAX_IMAGES) {
            ggUploadedImages.push(null);
        }
        ggUploadedImages.forEach((imgData, index) => {
            const slot = document.createElement('div');
            slot.className = 'relative aspect-square group transition-all duration-300';
            if (imgData) {
                slot.innerHTML = `
                <div class="w-full h-full rounded-2xl overflow-hidden border-2 border-teal-100 shadow-sm relative">
                    <img src="${imgData.dataUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <button data-index="${index}" class="gg-remove-btn absolute -top-2 -right-2 bg-white text-red-500 border border-red-100 rounded-full p-1.5 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
            `;
            } else {
                slot.innerHTML = `
                <label for="gg-image-input-${index}" class="flex flex-col items-center justify-center w-full h-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-300 cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 hover:text-teal-500 transition-all duration-300">
                    <i data-lucide="plus" class="w-6 h-6 mb-1 opacity-80 group-hover:scale-110 transition-transform"></i>
                    <span class="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2">Upload</span>
                </label>
                <input type="file" id="gg-image-input-${index}" data-index="${index}" class="gg-image-input hidden" accept="image/png, image/jpeg, image/webp, .heic, .HEIC">
            `;
            }
            ggUploadContainer.appendChild(slot);
        });
        syncGlobalUploads();
        lucide.createIcons();
        ggAttachSlotListeners();
        ggUpdateButtons();
    }

    function ggAttachSlotListeners() {
        document.querySelectorAll('.gg-image-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const index = parseInt(e.target.dataset.index);
                const file = e.target.files[0];
                if (file) {
                    if (file.size > MAX_UPLOAD_BYTES) {
                        if (window.showUploadLimitPopup) window.showUploadLimitPopup();
                        input.value = '';
                        return;
                    }
                    try {
                        const processedFile = await convertHeicToJpg(file);
                        const reader = new FileReader();
                        reader.onload = (re) => {
                            const parts = re.target.result.split(',');
                            const mimeType = parts[0].match(/:(.*?);/)[1];
                            const base64 = parts[1];
                            ggUploadedImages[index] = { base64, mimeType, dataUrl: re.target.result };
                            ggRenderUploadSlots();
                        };
                        reader.readAsDataURL(processedFile);
                    } catch (error) {
                        console.error("Error attaching slot listener:", error);
                    }
                }
            });
        });
        document.querySelectorAll('.gg-remove-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                ggUploadedImages[index] = null;
                ggRenderUploadSlots();
            });
        });
        document.querySelectorAll('label[for^="gg-image-input-"]').forEach(label => {
            setupImageUpload(document.getElementById(label.getAttribute('for')), label, (data) => {
                const index = parseInt(label.getAttribute('for').split('-').pop());
                ggUploadedImages[index] = data;
                ggRenderUploadSlots();
                if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('gg-ratio-options'));
            });
        });
    }

    if (ggResultCountSlider && ggResultCountDisplay) {
        ggResultCountSlider.addEventListener('input', () => {
            let val = parseInt(ggResultCountSlider.value);
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;

            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                ggResultCountSlider.value = 1;
                val = 1;
            }
            ggResultCountDisplay.textContent = `${val} Gambar`;
        });
    }

    ggPromptInput.addEventListener('input', ggUpdateButtons);

    ggGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = ggGenerateBtn.innerHTML;
        ggGenerateBtn.disabled = true;
        ggGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Sedang Meracik...</span>`;
        let aspectRatio = ggRatioOptions.querySelector('.selected').dataset.value;
        if (aspectRatio === 'Auto') {
            const firstImage = ggUploadedImages.find(img => img !== null);
            if (firstImage) {
                try {
                    const img = new Image();
                    img.src = firstImage.dataUrl;
                    await new Promise(r => img.onload = r);
                    const ratio = img.naturalWidth / img.naturalHeight;
                    if (ratio > 1.2) {
                        aspectRatio = '16:9';
                    } else if (ratio < 0.8) {
                        aspectRatio = '9:16';
                    } else {
                        aspectRatio = '1:1';
                    }
                } catch (e) {
                    console.error("Gagal deteksi rasio, default ke 1:1", e);
                    aspectRatio = '1:1';
                }
            } else {
                aspectRatio = '1:1';
            }
        }
        const aspectClass = getAspectRatioClass(aspectRatio);
        const placeholder = document.getElementById('gg-results-placeholder');
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
        ggResultsGrid.classList.remove('hidden');
        const resultCount = ggResultCountSlider ? parseInt(ggResultCountSlider.value) : 1;
        ggResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-3 sm:gap-5`;
        ggResultsGrid.innerHTML = '';
        for (let i = 1; i <= resultCount; i++) {
            const card = document.createElement('div');
            card.id = `gg-card-${i}`;
            card.className = `rounded-2xl border border-slate-200 dark:border-slate-700 shadow-none overflow-hidden bg-white dark:bg-slate-800 flex flex-col items-center justify-center ${aspectClass}`;
            card.innerHTML = `
                <div class="flex flex-col items-center justify-center gap-3">
                    <div class="spinner"></div>
                    <span class="text-xs font-medium text-slate-400 dark:text-slate-300 animate-pulse">Sedang Memproses...</span>
                </div>`;
            ggResultsGrid.appendChild(card);
        }
        lucide.createIcons();
        const generationPromises = Array.from({length: resultCount}, (_, i) => i + 1).map(i => ggGenerateSingleImage(i, aspectRatio));
        await Promise.allSettled(generationPromises);
        ggGenerateBtn.disabled = false;
        ggGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });

    async function ggGenerateSingleImage(id, aspectRatio) {
        const card = document.getElementById(`gg-card-${id}`);
        try {
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
            ggUploadedImages.filter(img => img !== null).forEach(img => {
                formData.append('images[]', base64ToBlob(img.base64, img.mimeType));
            });

            const prompt = `${ggPromptInput.value.trim()}. This is variation number ${id}.`;
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

            if (!result.success || !result.imageUrl) throw new Error("Respon API tidak valid (tidak ada data gambar).");
            let imageUrl = result.imageUrl;
            if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                imageUrl = `data:image/png;base64,${imageUrl}`;
            }
            card.innerHTML = `
                <img src="${imageUrl}" class="w-full h-full object-cover">
                <div class="absolute bottom-2 right-2 flex gap-1">
                    <button data-img-src="${imageUrl}" class="view-btn result-action-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors" title="Lihat Gambar">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <a href="${imageUrl}" download="gabungan_${id}.png" class="result-action-btn download-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors" title="Unduh Gambar">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </a>
                </div>`;
            card.classList.remove('bg-gray-100', 'flex', 'items-center', 'justify-center');
            card.classList.add('relative');
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error for card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }

    ggRenderUploadSlots();

    function addGgImage(data) {
        const emptySlotIndex = ggUploadedImages.findIndex(img => img === null);
        if (emptySlotIndex !== -1) {
            ggUploadedImages[emptySlotIndex] = data;
        } else if (ggUploadedImages.length < MAX_IMAGES) {
            ggUploadedImages.push(data);
        }
        ggRenderUploadSlots();
    }

    if (ggMagicPromptBtn) {
        ggMagicPromptBtn.addEventListener('click', async () => {
            let imagesToProcess = [];
            if (Array.isArray(ggUploadedImages)) {
                imagesToProcess = ggUploadedImages.filter(img => img !== null);
            }

            if (imagesToProcess.length === 0) {
                const imgElements = document.querySelectorAll('#gg-upload-container img');
                imgElements.forEach(imgEl => {
                    const src = imgEl.src;
                    if (src && src.startsWith('data:image')) {
                        try {
                            const parts = src.split(',');
                            const mimeMatch = parts[0].match(/:(.*?);/);
                            if (mimeMatch && parts[1]) {
                                imagesToProcess.push({
                                    base64: parts[1],
                                    mimeType: mimeMatch[1]
                                });
                            }
                        } catch (e) {
                            console.warn("Failed to parse image from DOM", e);
                        }
                    }
                });
            }

            if (imagesToProcess.length < 2) {
                alert("Upload minimal 2 gambar dulu ya!");
                return;
            }

            const originalBtnHTML = ggMagicPromptBtn.innerHTML;
            ggMagicPromptBtn.disabled = true;
            ggMagicPromptBtn.innerHTML = `<div class="spinner"></div>`;

            try {
                const formData = new FormData();
                formData.append('prompt', "Analisa gambar-gambar ini, lalu buatkan instruksi untuk menggabungkannya menjadi satu gambar baru. Respond ONLY with the prompt text itself, without any introductory phrases.respon in indonesian language");
                imagesToProcess.forEach((img, index) => {
                    const byteCharacters = atob(img.base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: img.mimeType });
                    formData.append('images[]', blob, `image${index}.jpg`);
                });

                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': getApiKey()
                    },
                    body: formData
                });

                if (!response.ok) throw new Error("Gagal menghubungi AI");
                const result = await response.json();

                if (result.success && result.response) {
                    const responseStr = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                    ggPromptInput.value = responseStr.trim();
                    ggPromptInput.dispatchEvent(new Event('input'));
                } else {
                    throw new Error(result.error || "Gagal membuat prompt");
                }
            } catch (error) {
                console.error("Magic Prompt Error:", error);
                alert("Gagal membuat magic prompt: " + error.message);
            } finally {
                ggMagicPromptBtn.innerHTML = originalBtnHTML;
                ggMagicPromptBtn.disabled = false;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    return {
        addGgImage
    };
};
