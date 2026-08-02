window.initBatikTenun = function({
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
    const uploadBox = document.getElementById('btk-upload-box');
    if (!uploadBox) return;

    const imageInput = document.getElementById('btk-image-input');
    const placeholder = document.getElementById('btk-placeholder');
    const preview = document.getElementById('btk-preview');
    const removeBtn = document.getElementById('btk-remove-btn');
    const generateBtn = document.getElementById('btk-generate-btn');

    const countSlider = document.getElementById('btk-count-slider');
    const countValue = document.getElementById('btk-count-value');

    const resultsPlaceholder = document.getElementById('btk-results-placeholder');
    const resultsContainer = document.getElementById('btk-results-container');
    const resultsGrid = document.getElementById('btk-results-grid');
    const clearResultsBtn = document.getElementById('btk-clear-results');
    const customInput = document.getElementById('btk-custom-input');

    const refInput = document.getElementById('btk-ref-input');
    const refPlaceholder = document.getElementById('btk-ref-placeholder');
    const refPreview = document.getElementById('btk-ref-preview');
    const refRemoveBtn = document.getElementById('btk-ref-remove-btn');

    let selectedFabric = 'batik';
    let selectedMotif = 'Parang';
    let selectedColor = 'cokelat sogan klasik';
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

    setupOptionButtons('btk-fabric-options', (value) => selectedFabric = value);
    setupOptionButtons('btk-motif-options', (value) => selectedMotif = value);
    setupOptionButtons('btk-color-options', (value) => selectedColor = value);
    setupOptionButtons('btk-ratio-options', (value) => selectedRatio = value);

    if (countSlider && countValue) {
        countSlider.addEventListener('input', () => {
            countValue.textContent = `${countSlider.value} Foto`;
        });
    }

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('border-emerald-400');
    });
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('border-emerald-400');
    });
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('border-emerald-400');
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

            const ratioContainer = document.getElementById('btk-ratio-options');
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
            if (file) handleReferenceImageUpload(file);
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
            loadingCard.id = `btk-loading-card-${i}`;
            loadingCard.innerHTML = `
                <div class="spinner"></div>
                <p class="text-sm text-slate-600 mt-4 text-center">Menerapkan motif ${i + 1}...</p>
            `;
            resultsGrid.appendChild(loadingCard);
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        const generatePromises = Array.from({ length: resultCount }, (_, i) => generateBatik(i));
        await Promise.allSettled(generatePromises);

        generateBtn.disabled = false;
        generateBtn.innerHTML = originalHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    async function generateBatik(index) {
        const card = document.getElementById(`btk-loading-card-${index}`);
        try {
            const prompt = buildPrompt(customInput ? customInput.value.trim() : '');

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
                        <a href="${result.imageUrl}" download="batik_tenun_${index + 1}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                `;
                if (typeof doneSound !== 'undefined' && doneSound.play) doneSound.play();
            } else {
                throw new Error('Invalid response from API');
            }
        } catch (error) {
            console.error(`Error generating batik ${index + 1}:`, error);
            card.innerHTML = `<div class="p-4 text-center text-red-500 text-xs">${error.message}</div>`;
            if (typeof errorSound !== 'undefined' && errorSound.play) errorSound.play();
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function buildPrompt(customMotif) {
        const fabricLabel = selectedFabric === 'tenun' ? 'traditional Indonesian woven tenun textile' : 'traditional Indonesian batik textile';

        let prompt = `Transform the clothing/outfit worn by the person in this photo into ${fabricLabel}. `;

        if (customMotif) {
            prompt += `Motif description: ${customMotif}. `;
        } else {
            prompt += `Apply the "${selectedMotif}" motif with ${selectedColor} color palette. `;
        }

        if (referenceImage) {
            prompt += `Use the second image strictly as the reference for the fabric pattern, motif, and color. `;
        }

        prompt += `Keep the person's face, skin tone, hairstyle, body pose, expression, and background completely unchanged. `;
        prompt += `Only the fabric/clothing changes into the chosen ${selectedFabric} pattern, with realistic fabric texture, natural folds, accurate draping, and proper lighting that matches the original photo. `;
        prompt += `Make the motif detailed, authentic, and culturally accurate. High quality photorealistic result. Aspect ratio: ${selectedRatio}.`;

        return prompt;
    }
};
