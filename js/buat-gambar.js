
function initBuatGambar(config = {}) {
    const {
        setupOptionButtons = window.setupOptionButtons,
        setupLogoUpload = window.setupLogoUpload,
        setupLogoControls = window.setupLogoControls,
        setupSlider = window.setupSlider,
        API_KEY = window.API_KEY,
        GENERATE_URL = window.GENERATE_URL,
        getApiErrorMessage = window.getApiErrorMessage
    } = config;

    const tiPromptInput = document.getElementById('ti-prompt-input');
    const tiRatioOptions = document.getElementById('ti-ratio-options');
    const tiGenerateBtn = document.getElementById('ti-generate-btn');
    const tiResultsGrid = document.getElementById('ti-results-grid');
    const tiResultsPlaceholder = document.getElementById('ti-results-placeholder');
    const tiCountSlider = document.getElementById('ti-count-slider');
    const tiCountValue = document.getElementById('ti-count-value');

    if (!tiGenerateBtn) return;

    if (typeof setupOptionButtons === 'function') {
        setupOptionButtons(tiRatioOptions);
    }
    
    // Logo Data
    let tiLogoData = null;
    if (typeof setupLogoUpload === 'function') {
        setupLogoUpload('ti-logo-input', 'ti-logo-preview', 'ti-logo-remove', 'ti-logo-controls', (data) => {
            tiLogoData = data;
        });
    }

    if (typeof setupLogoControls === 'function') {
        setupLogoControls('ti-logo-position-options');
    }

    if (typeof setupSlider === 'function') {
        setupSlider('ti-logo-opacity-input', 'ti-logo-opacity-value', '%');
    }

    if (tiCountSlider && tiCountValue) {
        tiCountSlider.addEventListener('input', (e) => {
            tiCountValue.textContent = e.target.value;
        });
    }

    // Image Preview Modal Logic (shared or reused)
    const tiImagePreviewModal = document.getElementById('ti-image-preview-modal');
    const tiImagePreviewContent = document.getElementById('ti-image-preview-content');
    const tiCloseImagePreviewBtn = document.getElementById('ti-close-image-preview');
    const tiPreviewPrevBtn = document.getElementById('ti-preview-prev');
    const tiPreviewNextBtn = document.getElementById('ti-preview-next');
    let previewModalIndex = 0; // Local index tracking if needed

    let currentPreviewImages = [];

    window.openTiImagePreview = (url) => {
        if (!tiImagePreviewContent || !tiImagePreviewModal) return;
        
        currentPreviewImages = [];
        previewModalIndex = 0;
        
        // Universal lookup: Find the grid context for this image
        const allGrids = document.querySelectorAll('[id$="results-grid"], .grid');
        let found = false;

        for (const grid of allGrids) {
            const imgs = Array.from(grid.querySelectorAll('img'));
            // Check if this grid contains the image
            const idx = imgs.findIndex(img => img.src === url || img.getAttribute('src') === url);
            
            if (idx !== -1) {
                currentPreviewImages = imgs;
                previewModalIndex = idx;
                found = true;
                break;
            }
        }

        // Fallback: single image if context not found
        if (!found) {
            currentPreviewImages = [{src: url}];
            previewModalIndex = 0;
        }

        tiImagePreviewContent.src = url;
        tiImagePreviewModal.classList.remove('opacity-0', 'pointer-events-none');
    };

    const updatePreviewImage = (newIndex) => {
        if (currentPreviewImages.length === 0) return;

        if (newIndex < 0) newIndex = currentPreviewImages.length - 1;
        if (newIndex >= currentPreviewImages.length) newIndex = 0;

        previewModalIndex = newIndex;
        const img = currentPreviewImages[previewModalIndex];
        tiImagePreviewContent.src = img.src || img.getAttribute('src') || img;
    };

    if (tiPreviewPrevBtn) {
        tiPreviewPrevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updatePreviewImage(previewModalIndex - 1);
        });
    }

    if (tiPreviewNextBtn) {
        tiPreviewNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updatePreviewImage(previewModalIndex + 1);
        });
    }

    if (tiCloseImagePreviewBtn) {
        tiCloseImagePreviewBtn.addEventListener('click', () => {
            tiImagePreviewModal.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => { tiImagePreviewContent.src = ''; }, 300);
        });
    }

    if (tiImagePreviewModal) {
        tiImagePreviewModal.addEventListener('click', (e) => {
            if (e.target === tiImagePreviewModal) {
                if (tiCloseImagePreviewBtn) tiCloseImagePreviewBtn.click();
            }
        });
    }

    tiGenerateBtn.addEventListener('click', async () => {
        const promptText = tiPromptInput.value.trim();
        const count = parseInt(tiCountSlider.value) || 1;
        if (!promptText) {
            alert("Silakan masukkan deskripsi gambar terlebih dahulu.");
            return;
        }
        const originalBtnHTML = tiGenerateBtn.innerHTML;
        const originalBtnStyle = tiGenerateBtn.style.background;

        tiGenerateBtn.disabled = true;
        tiGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Membuat Gambar..</span>`;
        tiGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');

        const tips = [
            "AI sedang melukis imajinasimu...",
            "Menambahkan detail artistik...",
            "Mengatur pencahayaan yang sempurna...",
            "Sedang meracik pixel ajaib...",
            "Hampir selesai, bersiaplah terkejut!"
        ];

        try {
            const aspectRatio = tiRatioOptions.querySelector('.selected').dataset.value;

            tiResultsPlaceholder.classList.add('hidden');
            tiResultsGrid.classList.remove('hidden');
            tiResultsGrid.className = `grid gap-4 ${getResultGridCols(count)}`;
            tiResultsGrid.innerHTML = '';

            for (let i = 0; i < count; i++) {
                const placeholder = document.createElement('div');
                placeholder.id = `ti-result-${i}`;
                let aspectClass = 'aspect-square';
                if (aspectRatio === '16:9') aspectClass = 'aspect-video';
                else if (aspectRatio === '9:16') aspectClass = 'aspect-[9/16]';
                else if (aspectRatio === '4:3') aspectClass = 'aspect-[4/3]';
                else if (aspectRatio === '3:4') aspectClass = 'aspect-[3/4]';
                
                placeholder.className = `card ${aspectClass} w-full flex items-center justify-center bg-slate-50 border border-slate-200`;
                const randomTip = tips[Math.floor(Math.random() * tips.length)];
                placeholder.innerHTML = `
                            <div class="flex flex-col items-center gap-3 text-center p-4">
                                <div class="spinner"></div>
                                <div>
                                    <span class="text-sm font-semibold text-slate-600 block">Gambar ${i + 1}</span>
                                    <span class="text-xs text-slate-400 mt-1 block">${randomTip}</span>
                                </div>
                            </div>`;
                tiResultsGrid.appendChild(placeholder);
            }

            const generatePromise = async (index) => {
                const card = document.getElementById(`ti-result-${index}`);
                try {

                    const formData = new FormData();
                    formData.append('instruction', `Generate a high quality photorealistic image based on this description: ${promptText}. Aspect Ratio: ${aspectRatio}. Variation: ${index + 1}`);
                    if (aspectRatio && aspectRatio !== 'Auto') {
                        formData.append('aspectRatio', aspectRatio);
                    }

                    const response = await fetch(`${GENERATE_URL}`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': API_KEY
                        },
                        body: formData
                    });

                    if (!response.ok) throw new Error(typeof getApiErrorMessage === 'function' ? await getApiErrorMessage(response) : "API Error");
                    const result = await response.json();

                    if (!result.success || !result.imageUrl) throw new Error("Gagal membuat gambar (No data).");
                    const imageUrl = result.imageUrl;
                    let finalImageUrl = imageUrl;

                    if (tiLogoData && tiLogoData.base64) {
                        const position = document.querySelector('#ti-logo-position-options .selected')?.dataset.value || 'bottom-right';
                        const opacityInput = document.getElementById('ti-logo-opacity-input');
                        const opacity = opacityInput ? parseInt(opacityInput.value) / 100 : 0.3;
                        const sizeInput = document.getElementById('ti-logo-size-input');
                        const size = sizeInput ? parseInt(sizeInput.value) : 20;
                        try {
                            if (typeof applyLogoToImage === 'function') {
                                finalImageUrl = await applyLogoToImage(imageUrl, tiLogoData.base64, position, opacity, size);
                            }
                        } catch (e) {
                            console.error("Failed to apply logo", e);
                        }
                    }
                    
                    const getAspectRatioClass = (ratio) => {
                         if (ratio === '16:9') return 'aspect-video';
                         if (ratio === '9:16') return 'aspect-[9/16]';
                         if (ratio === '4:3') return 'aspect-[4/3]';
                         if (ratio === '3:4') return 'aspect-[3/4]';
                         return 'aspect-square';
                    };

                    card.className = `card overflow-hidden relative bg-white ${getAspectRatioClass(aspectRatio)}`;
                    card.style.height = 'auto';
                    card.innerHTML = `
                                <img src="${finalImageUrl}" class="w-full h-full object-contain shadow-sm cursor-pointer" onclick="openTiImagePreview('${finalImageUrl}')">
                                <div class="absolute bottom-2 right-2 flex gap-2">
                                    <button onclick="openTiImagePreview('${finalImageUrl}')" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                    </button>
                                    <a href="${finalImageUrl}" download="text_to_image_${Date.now()}_${index}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                        <i data-lucide="download" class="w-4 h-4"></i>
                                    </a>
                                </div>
                            `;
                } catch (e) {
                    console.error(`Error generating image ${index}:`, e);
                    card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words w-full">${e.message}</div>`;
                }
            };

            const promises = [];
            for (let i = 0; i < count; i++) {
                promises.push(generatePromise(i));
            }
            await Promise.allSettled(promises);
            if (typeof doneSound !== 'undefined') doneSound.play();
        } catch (e) {
            if (typeof errorSound !== 'undefined') errorSound.play();
            console.error(e);
            alert("Terjadi kesalahan utama: " + e.message);
        } finally {
            tiGenerateBtn.disabled = false;
            tiGenerateBtn.innerHTML = originalBtnHTML;
            tiGenerateBtn.style.background = originalBtnStyle;
            tiGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });
}
