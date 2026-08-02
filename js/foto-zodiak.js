window.initFotoZodiak = function({
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
    const generateBtn = document.getElementById('fzd-generate-btn');
    if (!generateBtn) return;

    const uploadBox = document.getElementById('fzd-upload-box');
    const imageInput = document.getElementById('fzd-image-input');
    const placeholder = document.getElementById('fzd-placeholder');
    const preview = document.getElementById('fzd-preview');
    const removeBtn = document.getElementById('fzd-remove-btn');
    const extraInput = document.getElementById('fzd-extra-input');
    const countSlider = document.getElementById('fzd-count-slider');
    const countValue = document.getElementById('fzd-count-value');
    const resultsPlaceholder = document.getElementById('fzd-results-placeholder');
    const resultsContainer = document.getElementById('fzd-results-container');
    const resultsGrid = document.getElementById('fzd-results-grid');
    const clearResultsBtn = document.getElementById('fzd-clear-results');

    let selectedZodiak = 'Leo';
    let selectedZodiakTheme = 'lion king of the savanna royalty';
    let selectedStyle = 'epic fantasy portrait, dramatic lighting';
    let selectedRatio = '1:1';
    let uploadedImage = null;

    function setupOptionButtons(containerId, callback, themeCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (callback) callback(btn.dataset.value);
                if (themeCallback && btn.dataset.theme) themeCallback(btn.dataset.theme);
            });
        });
    }

    setupOptionButtons('fzd-zodiak-options', (value) => selectedZodiak = value, (theme) => selectedZodiakTheme = theme);
    setupOptionButtons('fzd-style-options', (value) => selectedStyle = value);
    setupOptionButtons('fzd-ratio-options', (value) => selectedRatio = value);

    if (countSlider && countValue) {
        countSlider.addEventListener('input', () => {
            countValue.textContent = `${countSlider.value} Foto`;
        });
    }

    if (uploadBox) {
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('border-indigo-400');
        });
        uploadBox.addEventListener('dragleave', () => {
            uploadBox.classList.remove('border-indigo-400');
        });
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('border-indigo-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageUpload(file);
            }
        });
    }

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleImageUpload(file);
        });
    }

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
            if (preview) {
                preview.src = uploadedImage;
                if (placeholder) placeholder.classList.add('hidden');
                preview.classList.remove('hidden');
                if (removeBtn) removeBtn.classList.remove('hidden');
            }

            const ratioContainer = document.getElementById('fzd-ratio-options');
            if (autoSelectClosestRatio && ratioContainer) {
                autoSelectClosestRatio(uploadedImage, ratioContainer);
            }
        };
        reader.readAsDataURL(processedFile);
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadedImage = null;
            if (preview) {
                preview.src = '';
                preview.classList.add('hidden');
            }
            if (placeholder) placeholder.classList.remove('hidden');
            removeBtn.classList.add('hidden');
            if (imageInput) imageInput.value = '';
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
            loadingCard.id = `fzd-loading-card-${i}`;
            loadingCard.innerHTML = `
                <div class="spinner"></div>
                <p class="text-sm text-slate-600 mt-4 text-center">Membangkitkan energi ${selectedZodiak}...</p>
            `;
            resultsGrid.appendChild(loadingCard);
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        const generatePromises = Array.from({ length: resultCount }, (_, i) => generateZodiakPhoto(i));
        await Promise.allSettled(generatePromises);

        generateBtn.disabled = false;
        generateBtn.innerHTML = originalHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    async function generateZodiakPhoto(index) {
        const card = document.getElementById(`fzd-loading-card-${index}`);
        try {
            const prompt = buildPrompt();
            const formData = new FormData();

            if (uploadedImage) {
                const blob = await fetch(uploadedImage).then(r => r.blob());
                formData.append('images[]', blob, 'face.jpg');
                formData.append('instruction', prompt);
            } else {
                formData.append('prompt', prompt);
            }

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
                        <a href="${result.imageUrl}" download="foto_zodiak_${selectedZodiak.toLowerCase()}_${index + 1}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                `;
                if (typeof doneSound !== 'undefined' && doneSound.play) doneSound.play();
            } else {
                throw new Error('Invalid response from API');
            }
        } catch (error) {
            console.error(`Error generating zodiak photo ${index + 1}:`, error);
            card.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">${error.message}</div>`;
            if (typeof errorSound !== 'undefined' && errorSound.play) errorSound.play();
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function buildPrompt() {
        const extra = extraInput ? extraInput.value.trim() : '';
        const hasImage = !!uploadedImage;

        let prompt = '';

        if (hasImage) {
            prompt += `Transform the person in this photo into a ${selectedStyle} portrait representing the ${selectedZodiak} zodiac sign. `;
            prompt += `Keep the person's face, facial structure, skin tone, and recognizable features intact. `;
        } else {
            prompt += `Create a stunning ${selectedStyle} portrait of a person representing the ${selectedZodiak} zodiac sign. `;
        }

        prompt += `Theme: ${selectedZodiakTheme}. `;
        prompt += `Incorporate rich ${selectedZodiak} zodiac symbolism: celestial elements, constellation motifs, and the essence of the ${selectedZodiak} archetype. `;
        prompt += `The composition should feel epic, mystical, and deeply connected to the ${selectedZodiak} zodiac energy and mythology. `;
        prompt += `Use dramatic lighting, rich colors, and intricate fantasy details. `;

        if (extra) {
            prompt += `Additional details: ${extra}. `;
        }

        prompt += `High quality, highly detailed, professional fantasy art. Aspect ratio: ${selectedRatio}.`;

        return prompt;
    }
};
