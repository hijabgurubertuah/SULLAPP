window.initTimeMachine = function({
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
    const imageInput = document.getElementById('tm-image-input');
    const uploadBox = document.getElementById('tm-upload-box');
    const placeholder = document.getElementById('tm-placeholder');
    const preview = document.getElementById('tm-preview');
    const removeBtn = document.getElementById('tm-remove-btn');
    const generateBtn = document.getElementById('tm-generate-btn');
    
    const countSlider = document.getElementById('tm-count-slider');
    const countValue = document.getElementById('tm-count-value');
    
    const resultsPlaceholder = document.getElementById('tm-results-placeholder');
    const resultsContainer = document.getElementById('tm-results-container');
    const resultsGrid = document.getElementById('tm-results-grid');
    const clearResultsBtn = document.getElementById('tm-clear-results');
    const elementsInput = document.getElementById('tm-elements-input');

    let selectedEra = '1920s';
    let selectedStyle = 'period-accurate';
    let selectedPhoto = 'film';
    let selectedRatio = '1:1';
    let uploadedImage = null;

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

    setupOptionButtons('tm-era-options', (value) => selectedEra = value);
    setupOptionButtons('tm-style-options', (value) => selectedStyle = value);
    setupOptionButtons('tm-photo-options', (value) => selectedPhoto = value);
    setupOptionButtons('tm-ratio-options', (value) => selectedRatio = value);

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
            
            const ratioContainer = document.getElementById('tm-ratio-options');
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
            loadingCard.id = `tm-loading-card-${i}`;
            loadingCard.innerHTML = `
                <div class="spinner"></div>
                <p class="text-sm text-slate-600 mt-4">Time traveling ${i + 1}...</p>
            `;
            resultsGrid.appendChild(loadingCard);
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        const generatePromises = Array.from({ length: resultCount }, (_, i) => 
            generateTimeTravel(i)
        );

        await Promise.allSettled(generatePromises);

        generateBtn.disabled = false;
        generateBtn.innerHTML = originalHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    async function generateTimeTravel(index) {
        const card = document.getElementById(`tm-loading-card-${index}`);
        
        try {
            const elements = elementsInput.value.trim();
            const prompt = buildPrompt(elements);

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
                        <a href="${result.imageUrl}" download="time_machine_${index + 1}.png" class="result-action-btn download-btn" title="Unduh Gambar">
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
            console.error(`Error generating time travel ${index + 1}:`, error);
            card.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">${error.message}</div>`;
            
            if (typeof errorSound !== 'undefined' && errorSound.play) {
                errorSound.play();
            }
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function buildPrompt(customElements) {
        const eraDescriptions = {
            '1920s': 'the Roaring Twenties era with flapper fashion, art deco style, and jazz age aesthetics',
            '1950s': 'the 1950s era with classic vintage style, retro fashion, and post-war optimism',
            '1970s': 'the groovy 1970s era with disco fashion, bohemian style, and vibrant colors',
            '1990s': 'the 1990s era with grunge fashion, pop culture references, and nostalgic vibes',
            '2050s': 'a futuristic 2050s era with advanced technology, sci-fi elements, and modern aesthetics',
            'ancient': 'an ancient historical period with classical architecture, traditional clothing, and historical authenticity'
        };

        const outfitStyleDescriptions = {
            'period-accurate': 'authentic period-accurate clothing and accessories that perfectly match the historical era, historically accurate fashion details',
            'modern-mix': 'creative blend of period elements with modern fashion touches, contemporary interpretation of historical style',
            'fantasy': 'imaginative fantasy-inspired interpretation of the era with artistic liberty, dramatic and theatrical period costume design'
        };

        const photoDescriptions = {
            'film': 'shot on vintage film camera with natural grain and authentic film photography characteristics',
            'polaroid': 'instant polaroid style with characteristic color cast and instant photo aesthetic',
            'studio': 'professional studio photography with controlled lighting and polished composition',
            'candid': 'candid street photography style with natural moments and documentary feel'
        };

        let prompt = `Transform this photo into ${eraDescriptions[selectedEra]}. `;
        prompt += `Outfit style: ${outfitStyleDescriptions[selectedStyle]}. `;
        prompt += `Photography style: ${photoDescriptions[selectedPhoto]}. `;
        
        if (customElements) {
            prompt += `Additional elements: ${customElements}. `;
        }
        
        prompt += `Maintain the subject's identity and facial features while adapting clothing, hairstyle, background, and overall aesthetic to perfectly match the selected time period. Ensure photorealistic quality and historical accuracy. Aspect ratio: ${selectedRatio}.`;

        return prompt;
    }
};
