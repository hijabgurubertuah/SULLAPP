window.initFotoEraSejarah = function({
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
    const uploadBox = document.getElementById('fes-upload-box');
    if (!uploadBox) return;

    const imageInput = document.getElementById('fes-image-input');
    const placeholder = document.getElementById('fes-placeholder');
    const preview = document.getElementById('fes-preview');
    const removeBtn = document.getElementById('fes-remove-btn');
    const generateBtn = document.getElementById('fes-generate-btn');
    const extraInput = document.getElementById('fes-extra-input');
    const countSlider = document.getElementById('fes-count-slider');
    const countValue = document.getElementById('fes-count-value');
    const resultsPlaceholder = document.getElementById('fes-results-placeholder');
    const resultsContainer = document.getElementById('fes-results-container');
    const resultsGrid = document.getElementById('fes-results-grid');
    const clearResultsBtn = document.getElementById('fes-clear-results');

    let selectedEra = 'Kerajaan Majapahit';
    let selectedStyle = 'photorealistic portrait';
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

    setupOptionButtons('fes-era-options', (value) => selectedEra = value);
    setupOptionButtons('fes-style-options', (value) => selectedStyle = value);
    setupOptionButtons('fes-ratio-options', (value) => selectedRatio = value);

    if (countSlider && countValue) {
        countSlider.addEventListener('input', () => {
            countValue.textContent = `${countSlider.value} Foto`;
        });
    }

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('border-amber-400');
    });
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('border-amber-400');
    });
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('border-amber-400');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
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

            const ratioContainer = document.getElementById('fes-ratio-options');
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
        if (!uploadedImage) {
            alert('Silakan unggah foto wajah terlebih dahulu!');
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
            loadingCard.id = `fes-loading-card-${i}`;
            loadingCard.innerHTML = `
                <div class="spinner"></div>
                <p class="text-sm text-slate-600 mt-4 text-center">Memasuki era ${selectedEra}...</p>
            `;
            resultsGrid.appendChild(loadingCard);
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        const generatePromises = Array.from({ length: resultCount }, (_, i) => generateEraPhoto(i));
        await Promise.allSettled(generatePromises);

        generateBtn.disabled = false;
        generateBtn.innerHTML = originalHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    async function generateEraPhoto(index) {
        const card = document.getElementById(`fes-loading-card-${index}`);
        try {
            const prompt = buildPrompt();

            const blob = await fetch(uploadedImage).then(r => r.blob());
            const formData = new FormData();
            formData.append('images[]', blob, 'face.jpg');
            formData.append('instruction', prompt);
            formData.append('aspectRatio', selectedRatio);

            const apiKey = getApiKey();
            const headers = {};
            if (apiKey) headers['X-API-Key'] = apiKey;

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
                        <a href="${result.imageUrl}" download="foto_era_sejarah_${index + 1}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                `;
                if (typeof doneSound !== 'undefined' && doneSound.play) doneSound.play();
            } else {
                throw new Error('Invalid response from API');
            }
        } catch (error) {
            console.error(`Error generating era sejarah ${index + 1}:`, error);
            card.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">${error.message}</div>`;
            if (typeof errorSound !== 'undefined' && errorSound.play) errorSound.play();
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function buildPrompt() {
        const extra = extraInput ? extraInput.value.trim() : '';

        let prompt = `Transform the person's appearance in this photo to look like they are living in the ${selectedEra} era of Indonesian history. `;
        prompt += `Apply ${selectedStyle} aesthetic. `;
        prompt += `Dress the person in authentic period-accurate clothing, accessories, and cultural elements of ${selectedEra}. `;
        prompt += `Include appropriate historical background setting, lighting, and atmosphere that matches the ${selectedEra} period. `;

        if (extra) {
            prompt += `Additional details: ${extra}. `;
        }

        prompt += `Keep the person's face, facial features, skin tone, and expression completely intact and recognizable. `;
        prompt += `Only change the clothing, accessories, hairstyle, and environment to match the historical era. `;
        prompt += `High quality photorealistic result with rich historical detail. Aspect ratio: ${selectedRatio}.`;

        return prompt;
    }
};
