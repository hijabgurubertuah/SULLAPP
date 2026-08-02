window.initBlurBackground = function({
    document,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    getApiKey,
    GENERATE_URL,
    getApiErrorMessage,
    doneSound,
    errorSound,
    convertHeicToJpg
}) {
    const imageInput = document.getElementById('blurbg-image-input');
    const uploadBox = document.getElementById('blurbg-upload-box');
    const placeholder = document.getElementById('blurbg-placeholder');
    const preview = document.getElementById('blurbg-preview');
    const removeBtn = document.getElementById('blurbg-remove-btn');
    const generateBtn = document.getElementById('blurbg-generate-btn');
    const generateBtnText = document.getElementById('blurbg-generate-btn-text');
    
    const countSlider = document.getElementById('blurbg-count-slider');
    const countValue = document.getElementById('blurbg-count-value');
    const detailInput = document.getElementById('blurbg-detail-input');
    
    const resultsPlaceholder = document.getElementById('blurbg-results-placeholder');
    const resultsContainer = document.getElementById('blurbg-results-container');
    const resultsGrid = document.getElementById('blurbg-results-grid');
    const clearResultsBtn = document.getElementById('blurbg-clear-results');

    let selectedBlur = 'medium';
    let selectedRatio = '1:1';
    let uploadedImage = null;

    function getGridCols(count) {
        return (parseInt(count) || 1) > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';
    }

    function setupOptionButtons(containerId, callback) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (callback) callback(btn.dataset.value);
            });
        });
    }

    setupOptionButtons('blurbg-blur-options', (value) => selectedBlur = value);
    setupOptionButtons('blurbg-ratio-options', (value) => selectedRatio = value);

    if (countSlider && countValue) {
        countSlider.addEventListener('input', () => {
            const count = countSlider.value;
            countValue.textContent = `${count} Foto`;
        });
    }

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('border-purple-400');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('border-purple-400');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('border-purple-400');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });

    async function handleImageUpload(file) {
        try {
            const processedFile = await convertHeicToJpg(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImage = e.target.result;
                preview.src = uploadedImage;
                placeholder.classList.add('hidden');
                preview.classList.remove('hidden');
                removeBtn.classList.remove('hidden');
                
                // Auto-select closest ratio
                const ratioContainer = document.getElementById('blurbg-ratio-options');
                if (autoSelectClosestRatio && ratioContainer) {
                    autoSelectClosestRatio(uploadedImage, ratioContainer);
                }
            };
            reader.readAsDataURL(processedFile);
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Gagal memproses gambar. Silakan coba lagi.');
        }
    }

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadedImage = null;
        preview.src = '';
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
        removeBtn.classList.add('hidden');
        imageInput.value = '';
    });

    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', () => {
            resultsGrid.innerHTML = '';
            resultsContainer.classList.add('hidden');
            resultsPlaceholder.classList.remove('hidden');
        });
    }

    generateBtn.addEventListener('click', async () => {
        if (!uploadedImage) {
            alert('Mohon unggah foto terlebih dahulu');
            return;
        }

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

        const count = parseInt(countSlider.value) || 1;

        const originalHTML = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i><span>Memproses...</span>';
        if (lucide) lucide.createIcons();

        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        const aspectClass = getAspectRatioClass(selectedRatio);
        resultsGrid.className = `grid ${getGridCols(count)} gap-4`;
        resultsGrid.innerHTML = '';

        const loadingCards = [];
        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.id = `blurbg-loading-card-${i}`;
            card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${aspectClass} flex flex-col items-center justify-center`;
            card.innerHTML = `
                <div class="spinner"></div>
                <p class="text-sm text-slate-600 mt-4 text-center">Memproses blur ${i + 1}...</p>
            `;
            resultsGrid.appendChild(card);
            loadingCards.push(card);
        }

        const promises = [];
        for (let i = 0; i < count; i++) {
            promises.push(generateBlurBackground(i));
        }

        await Promise.allSettled(promises);

        generateBtn.disabled = false;
        generateBtn.innerHTML = originalHTML;
        if (lucide) lucide.createIcons();
    });

    async function generateBlurBackground(index) {
        const card = document.getElementById(`blurbg-loading-card-${index}`);
        
        try {
            const prompt = buildPrompt();
            const blob = await fetch(uploadedImage).then(r => r.blob());
            const formData = new FormData();
            formData.append('images[]', blob, 'image.jpg');
            formData.append('instruction', prompt);
            formData.append('aspectRatio', selectedRatio);

            const apiKey = getApiKey();
            const headers = {};
            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }

            const response = await fetch(GENERATE_URL, {
                method: 'POST',
                headers,
                body: formData
            });

            if (!response.ok) {
                let errorMsg = 'Generate failed';
                if (getApiErrorMessage) {
                    errorMsg = await getApiErrorMessage(response);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    errorMsg = errorData.error || errorData.message || 'Generate failed';
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();

            if (result.success && result.imageUrl) {
                const aspectClass = getAspectRatioClass(selectedRatio);
                card.className = `card relative w-full overflow-hidden group ${aspectClass}`;
                card.innerHTML = `
                    <img src="${result.imageUrl}" class="w-full h-full object-cover rounded-lg">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${result.imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${result.imageUrl}" download="blur_bg_${index + 1}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                `;
                
                if (doneSound && doneSound.play) {
                    doneSound.play();
                }
            } else {
                throw new Error('Invalid response from API');
            }
        } catch (error) {
            console.error(`Error generating blur background ${index + 1}:`, error);
            card.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">${error.message}</div>`;
            
            if (errorSound && errorSound.play) {
                errorSound.play();
            }
        }
        
        if (lucide) lucide.createIcons();
    }

    function buildPrompt() {
        const blurDescriptions = {
            'subtle': 'Apply subtle background blur with gentle bokeh effect, keeping subject sharp and clear. Blur intensity: f/2.8 aperture equivalent, soft focus on background elements.',
            'medium': 'Apply medium background blur with natural bokeh effect, subject remains in perfect focus. Blur intensity: f/1.8 aperture equivalent, smooth background separation.',
            'strong': 'Apply strong background blur with pronounced bokeh effect, dramatic subject isolation. Blur intensity: f/1.4 aperture equivalent, creamy smooth background.',
            'extreme': 'Apply extreme background blur with maximum bokeh effect, complete background abstraction. Blur intensity: f/0.95 aperture equivalent, ultra-smooth dreamy background.'
        };

        let prompt = `${blurDescriptions[selectedBlur]} `;
        prompt += 'Maintain subject sharpness and detail. Create professional depth of field effect. ';
        
        const customDetail = detailInput.value.trim();
        if (customDetail) {
            prompt += `Additional blur specifications: ${customDetail}. `;
        }
        
        prompt += 'Preserve natural lighting and colors. Generate photorealistic blur with smooth transitions. ';
        prompt += `Output aspect ratio: ${selectedRatio}.`;

        return prompt;
    }
};
