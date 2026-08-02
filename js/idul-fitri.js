window.initIdulFitri = function(ctx) {
    const {
        document,
        setupImageUpload,
        setupOptionButtons,
        generatePhotographerImage,
        autoSelectClosestRatio,
        lucide,
        convertHeicToJpg,
        API_KEY,
        CHAT_URL,
        getApiErrorMessage
    } = ctx;

    const uploadContainer = document.getElementById('sf-idulfitri-upload-container');
    const generateBtn = document.getElementById('sf-idulfitri-generate-btn');
    const resultCountSlider = document.getElementById('sf-idulfitri-result-count-slider');
    const resultCountDisplay = document.getElementById('sf-idulfitri-result-count-display');
    const nb2Link = document.getElementById('sf-idulfitri-nb2-link');

    if (!uploadContainer || !generateBtn) {
        return;
    }

    let uploadedImages = [];
    const MAX_IMAGES = 5;
    const MIN_IMAGES = 1;
    const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

    function updateButtons() {
        const uploadedCount = uploadedImages.filter(img => img !== null).length;
        generateBtn.disabled = uploadedCount < MIN_IMAGES;
    }

    function renderUploadSlots() {
        uploadContainer.innerHTML = '';
        uploadedImages = uploadedImages.filter(img => img !== null);
        
        // Always show at least 1 empty slot
        if (uploadedImages.length === 0) {
            uploadedImages.push(null);
        }
        
        // If last slot is filled and we haven't reached max, add new empty slot
        if (uploadedImages[uploadedImages.length - 1] !== null && uploadedImages.length < MAX_IMAGES) {
            uploadedImages.push(null);
        }
        
        uploadedImages.forEach((imgData, index) => {
            const slot = document.createElement('div');
            slot.className = 'relative aspect-square group transition-all duration-300';
            
            if (imgData) {
                slot.innerHTML = `
                <div class="w-full h-full rounded-2xl overflow-hidden border-2 border-teal-100 shadow-sm relative">
                    <img src="${imgData.dataUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <button data-index="${index}" class="sf-idulfitri-remove-btn absolute -top-2 -right-2 bg-white text-red-500 border border-red-100 rounded-full p-1.5 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
            `;
            } else {
                slot.innerHTML = `
                <label for="sf-idulfitri-input-${index}" class="flex flex-col items-center justify-center w-full h-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-300 cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 hover:text-teal-500 transition-all duration-300">
                    <i data-lucide="plus" class="w-6 h-6 mb-1 opacity-80 group-hover:scale-110 transition-transform"></i>
                    <span class="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2">Upload</span>
                </label>
                <input type="file" id="sf-idulfitri-input-${index}" data-index="${index}" class="sf-idulfitri-file-input hidden" accept="image/png, image/jpeg, image/webp, .heic, .HEIC">
            `;
            }
            uploadContainer.appendChild(slot);
        });
        
        lucide.createIcons();
        attachSlotListeners();
        updateButtons();
    }

    function attachSlotListeners() {
        document.querySelectorAll('.sf-idulfitri-file-input').forEach(input => {
            setupImageUpload(input, input.previousElementSibling, (data) => {
                const index = parseInt(input.dataset.index);
                uploadedImages[index] = data;
                renderUploadSlots();
                if (autoSelectClosestRatio && index === 0) autoSelectClosestRatio(data.dataUrl, document.getElementById('sf-idulfitri-ratio-options'));
            });
        });

        document.querySelectorAll('.sf-idulfitri-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                uploadedImages.splice(index, 1);
                renderUploadSlots();
            });
        });
    }

    function getValidPhotos() {
        return uploadedImages.filter(img => img !== null);
    }

    // Setup option buttons
    setupOptionButtons(document.getElementById('sf-idulfitri-style-options'));
    setupOptionButtons(document.getElementById('sf-idulfitri-ratio-options'));
    setupOptionButtons(document.getElementById('sf-idulfitri-frame-options'));

    // Result count slider
    if (resultCountSlider && resultCountDisplay) {
        resultCountSlider.addEventListener('input', function() {
            resultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    // Nano Banana 2 link -> go to Addons tab
    if (nb2Link) {
        nb2Link.addEventListener('click', () => {
            if (window.SF_TAB_MAPPING && typeof window.switchTab === 'function') {
                // Find addons tab button and click it
                const addonsBtn = document.getElementById('tab-addons');
                if (addonsBtn) addonsBtn.click();
            }
        });
    }

    // Generate
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            // Check if VIP on Pro version
            if (typeof window.IS_VIP_APP !== 'undefined' && window.IS_VIP_APP === false) {
                // Show upgrade modal
                const upgradeModal = document.getElementById('upgrade-vip-modal');
                if (upgradeModal) {
                    upgradeModal.classList.add('active');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } else if (typeof window.showUpgradeVipPopup === 'function') {
                    window.showUpgradeVipPopup();
                }
                return;
            }

            const resultsPlaceholder = document.getElementById('sf-idulfitri-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');

            const validPhotos = getValidPhotos();
            if (validPhotos.length === 0) return;

            let style = 'Foto keluarga Idul Fitri di depan rumah yang dihias dengan ketupat dan lampu hias, suasana hangat dan bahagia';
            const styleSelected = document.querySelector('#sf-idulfitri-style-options .selected');
            if (styleSelected) style = styleSelected.dataset.value;

            let aspectRatio = '1:1';
            const ratioSelected = document.querySelector('#sf-idulfitri-ratio-options .selected');
            if (ratioSelected) aspectRatio = ratioSelected.dataset.value;

            let frame = 'tanpa bingkai, foto full tanpa border';
            const frameSelected = document.querySelector('#sf-idulfitri-frame-options .selected');
            if (frameSelected) frame = frameSelected.dataset.value;

            const additionalInput = document.getElementById('sf-idulfitri-additional-input');
            const additionalText = additionalInput ? additionalInput.value.trim() : '';

            const photoCount = validPhotos.length;
            const photoDesc = photoCount === 1
                ? 'the person from the uploaded photo'
                : `all ${photoCount} people from the uploaded photos together in one group photo`;

            let prompt = `Create a beautiful and professional Eid al-Fitr (Idul Fitri / Lebaran) themed photograph featuring ${photoDesc}. CRITICAL: Preserve each person's exact face, features, and identity from the reference photos. Style & Setting: ${style}. Frame/Border: ${frame}. The photo should capture the joy and warmth of Eid celebration with traditional Islamic festive atmosphere. Everyone should look happy and well-dressed in their best Muslim attire. OUTPUT LANGUAGE: Bahasa Indonesia.`;

            if (additionalText) {
                prompt += ` Additional instructions: ${additionalText}`;
            }

            const numOutputs = parseInt(resultCountSlider.value) || 1;

            // Convert all photos to base64 format expected by generatePhotographerImage
            const imagesData = validPhotos.map((photo, idx) => {
                const base64Data = photo.dataUrl.split(',')[1];
                return {
                    base64: base64Data,
                    mimeType: photo.mimeType,
                    idx
                };
            });

            // If multiple photos, append info to prompt
            if (photoCount > 1) {
                prompt += ` IMPORTANT: This is a group photo with ${photoCount} different people. Each person's face must be clearly visible and accurately preserved from the reference images.`;
            }

            generatePhotographerImage('idulfitri', prompt, imagesData, aspectRatio, null, numOutputs);
        });
    }

    // Example carousel popup
    const showExampleBtn = document.getElementById('sf-idulfitri-show-example');
    if (showExampleBtn) {
        showExampleBtn.addEventListener('click', () => {
            const exampleImages = [
                '/assets/idulfitri_foto_1.jpg',
                '/assets/idulfitri_foto_2.jpg',
                '/assets/idulfitri_foto_3.jpg'
            ];

            const overlay = document.createElement('div');
            overlay.className = 'idulfitri-example-overlay';
            overlay.innerHTML = `
                <img src="${exampleImages[0]}" alt="Contoh Hasil Idul Fitri" id="idulfitri-example-img">
                <button class="idulfitri-example-close" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
                <button class="idulfitri-example-nav prev" aria-label="Previous">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button class="idulfitri-example-nav next" aria-label="Next">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <div class="idulfitri-example-dots">
                    ${exampleImages.map((_, idx) => `<div class="idulfitri-example-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`).join('')}
                </div>
            `;

            document.body.appendChild(overlay);
            setTimeout(() => overlay.style.opacity = '1', 10);

            let currentIndex = 0;
            let autoPlayInterval = null;

            const imgElement = overlay.querySelector('#idulfitri-example-img');
            const dots = overlay.querySelectorAll('.idulfitri-example-dot');
            const prevBtn = overlay.querySelector('.idulfitri-example-nav.prev');
            const nextBtn = overlay.querySelector('.idulfitri-example-nav.next');
            const closeBtn = overlay.querySelector('.idulfitri-example-close');

            const goToSlide = (index) => {
                currentIndex = index;
                imgElement.src = exampleImages[currentIndex];
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
            };

            const nextSlide = () => {
                const next = (currentIndex + 1) % exampleImages.length;
                goToSlide(next);
            };

            const prevSlide = () => {
                const prev = (currentIndex - 1 + exampleImages.length) % exampleImages.length;
                goToSlide(prev);
            };

            const startAutoPlay = () => {
                autoPlayInterval = setInterval(nextSlide, 4000);
            };

            const stopAutoPlay = () => {
                if (autoPlayInterval) {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = null;
                }
            };

            const closeOverlay = () => {
                stopAutoPlay();
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            };

            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                stopAutoPlay();
                prevSlide();
                startAutoPlay();
            });

            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                stopAutoPlay();
                nextSlide();
                startAutoPlay();
            });

            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeOverlay();
            });

            dots.forEach((dot) => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    stopAutoPlay();
                    const index = parseInt(dot.dataset.index);
                    goToSlide(index);
                    startAutoPlay();
                });
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeOverlay();
            });

            document.addEventListener('keydown', function handleEsc(e) {
                if (e.key === 'Escape') {
                    closeOverlay();
                    document.removeEventListener('keydown', handleEsc);
                }
            });

            startAutoPlay();
        });
    }

    // Initialize upload slots
    renderUploadSlots();
};
