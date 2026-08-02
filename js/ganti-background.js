window.initGantiBackground = function({
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
    const imageInput = document.getElementById('gb-image-input');
    const uploadBox = document.getElementById('gb-upload-box');
    const placeholder = document.getElementById('gb-placeholder');
    const preview = document.getElementById('gb-preview');
    const removeBtn = document.getElementById('gb-remove-btn');
    const generateBtn = document.getElementById('gb-generate-btn');
    
    const countSlider = document.getElementById('gb-count-slider');
    const countValue = document.getElementById('gb-count-value');
    
    const resultsPlaceholder = document.getElementById('gb-results-placeholder');
    const resultsContainer = document.getElementById('gb-results-container');
    const resultsGrid = document.getElementById('gb-results-grid');
    const clearResultsBtn = document.getElementById('gb-clear-results');
    const customInput = document.getElementById('gb-custom-input');

    const refInput = document.getElementById('gb-ref-input');
    const refPlaceholder = document.getElementById('gb-ref-placeholder');
    const refPreview = document.getElementById('gb-ref-preview');
    const refRemoveBtn = document.getElementById('gb-ref-remove-btn');

    let selectedBackground = 'nature';
    let selectedStyle = 'realistic';
    let selectedLighting = 'natural';
    let selectedRatio = '1:1';
    let uploadedImage = null;
    let referenceImage = null;

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

    setupOptionButtons('gb-bg-options', (value) => selectedBackground = value);
    setupOptionButtons('gb-style-options', (value) => selectedStyle = value);
    setupOptionButtons('gb-lighting-options', (value) => selectedLighting = value);
    setupOptionButtons('gb-ratio-options', (value) => selectedRatio = value);

    if (countSlider && countValue) {
        countSlider.addEventListener('input', () => {
            const count = countSlider.value;
            countValue.textContent = `${count} Foto`;
        });
    }

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('border-sky-400');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('border-sky-400');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('border-sky-400');
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
        let processedFile = file;
        
        if (file.name.toLowerCase().endsWith('.heic')) {
            if (typeof convertHeicToJpg === 'function') {
                try {
                    processedFile = await convertHeicToJpg(file);
                } catch (err) {
                    console.error('HEIC conversion failed:', err);
                    alert('Gagal mengkonversi file HEIC. Silakan gunakan format JPG/PNG.');
                    return;
                }
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImage = e.target.result;
            preview.src = uploadedImage;
            placeholder.classList.add('hidden');
            preview.classList.remove('hidden');
            removeBtn.classList.remove('hidden');
            
            const ratioContainer = document.getElementById('gb-ratio-options');
            if (autoSelectClosestRatio && ratioContainer) {
                autoSelectClosestRatio(uploadedImage, ratioContainer);
            }
        };
        reader.readAsDataURL(processedFile);
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

    if (refInput) {
        refInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleReferenceImageUpload(file);
            }
        });
    }

    async function handleReferenceImageUpload(file) {
        let processedFile = file;
        
        if (file.name.toLowerCase().endsWith('.heic')) {
            if (typeof convertHeicToJpg === 'function') {
                try {
                    processedFile = await convertHeicToJpg(file);
                } catch (err) {
                    console.error('HEIC conversion failed:', err);
                    alert('Gagal mengkonversi file HEIC. Silakan gunakan format JPG/PNG.');
                    return;
                }
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            referenceImage = e.target.result;
            refPreview.src = referenceImage;
            refPlaceholder.classList.add('hidden');
            refPreview.classList.remove('hidden');
            refRemoveBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(processedFile);
    }

    if (refRemoveBtn) {
        refRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            referenceImage = null;
            refPreview.src = '';
            refPreview.classList.add('hidden');
            refPlaceholder.classList.remove('hidden');
            refRemoveBtn.classList.add('hidden');
            refInput.value = '';
        });
    }

    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', () => {
            resultsGrid.innerHTML = '';
            resultsContainer.classList.add('hidden');
            resultsPlaceholder.classList.remove('hidden');
        });
    }

    function getGridCols(count) {
        return (parseInt(count) || 1) > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';
    }

    generateBtn.addEventListener('click', async () => {
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

        if (!uploadedImage) {
            alert('Silakan unggah foto terlebih dahulu!');
            return;
        }

        const originalHTML = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<div class="spinner"></div><span class="ml-2">Memproses...</span>';

        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        const resultCount = countSlider ? parseInt(countSlider.value) : 1;
        const aspectClass = getAspectRatioClass(selectedRatio);
        
        resultsGrid.className = `grid ${getGridCols(resultCount)} gap-4`;
        resultsGrid.innerHTML = '';

        for (let i = 0; i < resultCount; i++) {
            const loadingCard = document.createElement('div');
            loadingCard.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${aspectClass} flex flex-col items-center justify-center`;
            loadingCard.id = `gb-loading-card-${i}`;
            loadingCard.innerHTML = `
                <div class="spinner"></div>
                <p class="text-sm text-slate-600 mt-4 text-center">Mengganti background ${i + 1}...</p>
            `;
            resultsGrid.appendChild(loadingCard);
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        const generatePromises = Array.from({ length: resultCount }, (_, i) => 
            generateBackground(i)
        );

        await Promise.allSettled(generatePromises);

        generateBtn.disabled = false;
        generateBtn.innerHTML = originalHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    async function generateBackground(index) {
        const card = document.getElementById(`gb-loading-card-${index}`);
        
        try {
            const customBg = customInput.value.trim();
            const prompt = buildPrompt(customBg);

            const blob = await fetch(uploadedImage).then(r => r.blob());
            const formData = new FormData();
            formData.append('images[]', blob, 'image.jpg');
            
            if (referenceImage) {
                const refBlob = await fetch(referenceImage).then(r => r.blob());
                formData.append('images[]', refBlob, 'reference.jpg');
            }
            
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
                        <a href="${result.imageUrl}" download="ganti_background_${index + 1}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                `;
                
                if (typeof doneSound !== 'undefined' && doneSound.play) {
                    doneSound.play();
                }
            } else {
                throw new Error('Invalid response from API');
            }
        } catch (error) {
            console.error(`Error generating background ${index + 1}:`, error);
            card.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">${error.message}</div>`;
            
            if (typeof errorSound !== 'undefined' && errorSound.play) {
                errorSound.play();
            }
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function buildPrompt(customBackground) {
        const backgroundDescriptions = {
            'nature': 'beautiful natural outdoor scenery with lush green landscape, trees, and natural environment',
            'studio': 'professional photography studio setting with clean backdrop and studio lighting',
            'urban': 'modern urban cityscape with buildings, streets, and contemporary architecture',
            'office': 'professional office environment with modern workspace and business setting',
            'beach': 'stunning beach scenery with ocean waves, sand, and coastal atmosphere',
            'mountain': 'majestic mountain landscape with peaks, valleys, and scenic mountain views'
        };

        const styleDescriptions = {
            'realistic': 'photorealistic rendering with natural details and authentic appearance',
            'artistic': 'artistic interpretation with creative visual styling and aesthetic enhancement',
            'minimal': 'minimalist clean design with simple composition and uncluttered background'
        };

        const lightingDescriptions = {
            'natural': 'natural daylight with soft ambient lighting and realistic shadows',
            'soft': 'soft diffused lighting with gentle glow and subtle highlights',
            'dramatic': 'dramatic lighting with strong contrast and cinematic atmosphere',
            'studio-light': 'professional studio lighting setup with controlled illumination'
        };

        let prompt = `Replace and change the background of this photo. `;
        
        if (referenceImage) {
            prompt += `Use the second image as reference for the new background style and composition. `;
        }
        
        if (customBackground) {
            prompt += `New background: ${customBackground}. `;
        } else {
            prompt += `Background setting: ${backgroundDescriptions[selectedBackground]}. `;
        }
        
        prompt += `Style: ${styleDescriptions[selectedStyle]}. `;
        prompt += `Lighting: ${lightingDescriptions[selectedLighting]}. `;
        prompt += `Keep the main subject perfectly intact with precise edge detection and natural blending. Ensure the background seamlessly integrates with the subject with proper depth of field and realistic perspective. Match the lighting and color tone between subject and background. High quality photorealistic result. Aspect ratio: ${selectedRatio}.`;

        return prompt;
    }
};
