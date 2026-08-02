window.initFoodPhotography = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    getApiKey,
    GENERATE_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    const imageInput = document.getElementById('food-image-input');
    const imageUploadBox = document.getElementById('food-upload-box');
    const imagePreview = document.getElementById('food-preview');
    const imagePlaceholder = document.getElementById('food-placeholder');
    const removeImageBtn = document.getElementById('food-remove-btn');
    
    const styleOptions = document.getElementById('food-style-options');
    const lightingOptions = document.getElementById('food-lighting-options');
    const backgroundOptions = document.getElementById('food-background-options');
    const compositionOptions = document.getElementById('food-composition-options');
    const propsInput = document.getElementById('food-props-input');
    const ratioOptions = document.getElementById('food-ratio-options');
    
    const countSlider = document.getElementById('food-count-slider');
    const countValue = document.getElementById('food-count-value');
    
    const generateBtn = document.getElementById('food-generate-btn');
    const generateBtnText = document.getElementById('food-generate-btn-text');
    
    const resultsContainer = document.getElementById('food-results-container');
    const resultsGrid = document.getElementById('food-results-grid');
    const resultsPlaceholder = document.getElementById('food-results-placeholder');
    const clearResultsBtn = document.getElementById('food-clear-results');

    if (!generateBtn) return;

    let foodImageData = null;
    let isGenerating = false;

    // --- Option Buttons (setup FIRST, before anything that can throw) ---
    if (styleOptions) setupOptionButtons(styleOptions);
    if (lightingOptions) setupOptionButtons(lightingOptions);
    if (backgroundOptions) setupOptionButtons(backgroundOptions);
    if (compositionOptions) setupOptionButtons(compositionOptions);
    if (ratioOptions) setupOptionButtons(ratioOptions);

    // --- Image Upload ---
    try {
        setupImageUpload(imageInput, imageUploadBox, (data) => {
            foodImageData = data;
            imagePreview.src = data.dataUrl;
            imagePlaceholder.classList.add('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, ratioOptions);
            imagePreview.classList.remove('hidden');
            removeImageBtn.classList.remove('hidden');
            updateGenerateButton();
        });
    } catch (e) { /* ignore if setup fails */ }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            foodImageData = null;
            imageInput.value = '';
            imagePreview.src = '#';
            imagePreview.classList.add('hidden');
            imagePlaceholder.classList.remove('hidden');
            removeImageBtn.classList.add('hidden');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            if (resultsGrid) resultsGrid.innerHTML = '';
            updateGenerateButton();
        });
    }

    // --- Count Slider ---
    if (countSlider && countValue) {
        countSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            countValue.textContent = `${val} Foto`;
            
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;
            
            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                countSlider.value = 1;
                countValue.textContent = "1 Foto";
                return;
            }

            if (generateBtnText) {
                generateBtnText.textContent = val > 1 ? `Generate ${val} Foto` : 'Generate';
            }
        });
    }

    // --- Clear Results ---
    if (clearResultsBtn && resultsGrid && resultsContainer && resultsPlaceholder) {
        clearResultsBtn.addEventListener('click', () => {
            resultsGrid.innerHTML = '';
            resultsContainer.classList.add('hidden');
            resultsPlaceholder.classList.remove('hidden');
            if (lucide) lucide.createIcons();
        });
    }

    // --- Update Generate Button State ---
    function updateGenerateButton() {
        if (foodImageData && !isGenerating) {
            generateBtn.disabled = false;
        } else {
            generateBtn.disabled = true;
        }
    }

    // --- Generate Button ---
    generateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isGenerating) return;
        
        // Check VIP status first - Pro version should always show upgrade modal
        const isVip = window.IS_VIP_APP === true;
        
        if (!isVip) {
            const upgradeVipModal = document.getElementById('upgrade-vip-modal');
            if (upgradeVipModal) {
                upgradeVipModal.classList.add('active');
                upgradeVipModal.style.display = 'flex';
                setTimeout(() => {
                    if (typeof lucide !== 'undefined' && lucide.createIcons) {
                        lucide.createIcons();
                    }
                }, 100);
            }
            if (typeof window.showUpgradeVipPopup === 'function') {
                window.showUpgradeVipPopup();
            }
            return;
        }
        
        if (!foodImageData) {
            alert('Silakan unggah foto makanan terlebih dahulu');
            return;
        }

        const selectedStyle = styleOptions.querySelector('.selected')?.dataset.value || 'professional';
        const selectedLighting = lightingOptions.querySelector('.selected')?.dataset.value || 'natural';
        const selectedBackground = backgroundOptions.querySelector('.selected')?.dataset.value || 'wooden';
        const selectedComposition = compositionOptions.querySelector('.selected')?.dataset.value || 'centered';
        const propsText = propsInput.value.trim();
        const selectedRatio = ratioOptions.querySelector('.selected')?.dataset.value || '1:1';
        const resultCount = parseInt(countSlider.value) || 1;

        const styleDescriptions = {
            'professional': 'professional food photography with perfect lighting and sharp details',
            'rustic': 'rustic food photography with natural wooden elements and earthy tones',
            'modern': 'modern minimalist food photography with clean lines and contemporary styling',
            'elegant': 'elegant luxury food photography with sophisticated presentation'
        };

        const lightingDescriptions = {
            'natural': 'natural daylight lighting',
            'soft': 'soft diffused studio lighting',
            'dramatic': 'dramatic side lighting with strong shadows'
        };

        const backgroundDescriptions = {
            'wooden': 'rustic wooden table background',
            'marble': 'elegant white marble surface',
            'clean': 'clean white minimalist background',
            'textured': 'textured concrete or stone surface'
        };

        const compositionDescriptions = {
            'centered': 'centered composition',
            'overhead': 'top-down overhead shot',
            'angle45': '45-degree angle view'
        };

        let prompt = `Professional food photography, ${styleDescriptions[selectedStyle]}, ${lightingDescriptions[selectedLighting]}, ${backgroundDescriptions[selectedBackground]}, ${compositionDescriptions[selectedComposition]}, high quality, appetizing presentation, depth of field, food styling`;
        
        if (propsText) {
            prompt += `, with props: ${propsText}`;
        }

        prompt += ', ultra detailed, 8k resolution, professional color grading, food magazine quality';

        isGenerating = true;
        generateBtn.disabled = true;
        generateBtnText.textContent = 'Generating...';
        
        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
        resultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
        resultsGrid.innerHTML = '';
        
        for (let i = 0; i < resultCount; i++) {
            const loadingCard = document.createElement('div');
            loadingCard.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full aspect-square flex flex-col items-center justify-center';
            loadingCard.id = `food-loading-card-${i}`;
            loadingCard.innerHTML = `
                <div class="spinner"></div>
                <p class="text-sm text-slate-600 mt-4">Membuat foto ${i + 1}...</p>
            `;
            resultsGrid.appendChild(loadingCard);
        }
        
        if (lucide) lucide.createIcons();

        const formData = new FormData();
        formData.append('instruction', prompt);
        formData.append('aspectRatio', selectedRatio);
        
        if (foodImageData) {
            if (foodImageData.blob) {
                formData.append('images[]', foodImageData.blob, foodImageData.filename || 'food.jpg');
            } else if (foodImageData.base64) {
                const byteCharacters = atob(foodImageData.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: foodImageData.mimeType || 'image/jpeg' });
                formData.append('images[]', blob, 'food.jpg');
            }
        }

        try {
            const apiKey = getApiKey();
            const headers = {};
            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }

            const generateSingle = async (index) => {
                try {
                    const response = await fetch(GENERATE_URL, {
                        method: 'POST',
                        headers,
                        body: formData
                    });
                    
                    if (!response.ok) throw new Error('Generate failed');
                    const data = await response.json();
                    
                    const loadingCard = document.getElementById(`food-loading-card-${index}`);
                    if (!loadingCard) return;
                    
                    if (data.success && data.imageUrl) {
                        loadingCard.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full';
                        loadingCard.innerHTML = `
                            <img src="${data.imageUrl}" alt="Foto Makanan ${index + 1}" class="w-full h-full object-contain shadow-sm">
                            <div class="absolute bottom-2 right-2 flex gap-2">
                                <button data-img-src="${data.imageUrl}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <a href="${data.imageUrl}" download="foto_makanan_${index + 1}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                    <i data-lucide="download" class="w-4 h-4"></i>
                                </a>
                            </div>
                        `;
                    } else {
                        loadingCard.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">Error: ${data.error || 'Unknown error'}</div>`;
                    }
                    
                    if (lucide) lucide.createIcons();
                } catch (error) {
                    const loadingCard = document.getElementById(`food-loading-card-${index}`);
                    if (loadingCard) {
                        loadingCard.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">Error: ${error.message}</div>`;
                    }
                }
            };
            
            const promises = [];
            for (let i = 0; i < resultCount; i++) {
                promises.push(generateSingle(i));
            }
            
            await Promise.allSettled(promises);
            
            if (lucide) lucide.createIcons();

            if (doneSound && typeof doneSound.play === 'function') {
                doneSound.play().catch(() => {});
            }

        } catch (error) {
            if (errorSound && typeof errorSound.play === 'function') {
                errorSound.play().catch(() => {});
            }
        } finally {
            isGenerating = false;
            generateBtn.disabled = false;
            generateBtnText.textContent = resultCount > 1 ? `Generate ${resultCount} Foto` : 'Generate';
        }
    });

    updateGenerateButton();
};
