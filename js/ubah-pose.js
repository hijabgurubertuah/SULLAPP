window.initUbahPose = function ({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    API_KEY,
    GENERATE_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    const cpUploadBox = document.getElementById('cp-upload-box');
    const cpImageInput = document.getElementById('cp-image-input');
    const cpPreview = document.getElementById('cp-preview');
    const cpPlaceholder = document.getElementById('cp-placeholder');
    const cpRemoveBtn = document.getElementById('cp-remove-btn');
    const cpPromptInput = document.getElementById('cp-prompt-input');
    const cpRatioOptions = document.getElementById('cp-ratio-options');
    const cpGenerateBtn = document.getElementById('cp-generate-btn');
    const cpResultsContainer = document.getElementById('cp-results-container');
    const cpResultsGrid = document.getElementById('cp-results-grid');
    const cpResultCountSlider = document.getElementById('cp-result-count-slider');
    const cpResultCountDisplay = document.getElementById('cp-result-count-display');

    if (cpResultCountSlider && cpResultCountDisplay) {
        cpResultCountSlider.addEventListener('input', function() {
            cpResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }
    let cpImageData = null;

    function cpUpdateButtons() {
        if (cpGenerateBtn) {
            cpGenerateBtn.disabled = !cpImageData || cpPromptInput.value.trim() === '';
        }
    }

    document.querySelectorAll('.cp-pose-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (cpPromptInput) {
                cpPromptInput.value = btn.querySelector('span').textContent;
                cpUpdateButtons();
            }
        });
    });

    if (cpImageInput && cpUploadBox) {
        setupImageUpload(cpImageInput, cpUploadBox, (data) => {
            cpImageData = data;
            if (cpPreview) cpPreview.src = data.dataUrl;
            if (cpPlaceholder) cpPlaceholder.classList.add('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, cpRatioOptions);
            if (cpPreview) cpPreview.classList.remove('hidden');
            if (cpRemoveBtn) cpRemoveBtn.classList.remove('hidden');
            cpUpdateButtons();
        });
    }

    if (cpRemoveBtn) {
        cpRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cpImageData = null;
            if (cpImageInput) cpImageInput.value = '';
            if (cpPreview) {
                cpPreview.src = '#';
                cpPreview.classList.add('hidden');
            }
            if (cpPlaceholder) cpPlaceholder.classList.remove('hidden');
            if (cpRemoveBtn) cpRemoveBtn.classList.add('hidden');
            cpUpdateButtons();
            const placeholder = document.getElementById('cp-results-placeholder');
            if (placeholder) placeholder.classList.remove('hidden');
            if (cpResultsContainer) cpResultsContainer.classList.add('hidden');
            if (cpResultsGrid) cpResultsGrid.innerHTML = '';
        });
    }

    if (cpPromptInput) cpPromptInput.addEventListener('input', cpUpdateButtons);
    if (cpRatioOptions) setupOptionButtons(cpRatioOptions);

    if (cpGenerateBtn) {
        cpGenerateBtn.addEventListener('click', async () => {
            const originalBtnHTML = cpGenerateBtn.innerHTML;
            cpGenerateBtn.disabled = true;
            cpGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Mengubah Pose...</span>`;
            const placeholder = document.getElementById('cp-results-placeholder');
            if (placeholder) placeholder.classList.add('hidden');
            
            let aspectRatio = '1:1';
            const selectedRatio = cpRatioOptions.querySelector('.selected');
            if (selectedRatio) aspectRatio = selectedRatio.dataset.value;
            
            const aspectClass = getAspectRatioClass(aspectRatio);
            if (cpResultsContainer) cpResultsContainer.classList.remove('hidden');
            if (cpResultsGrid) {
                const resultCount = cpResultCountSlider ? parseInt(cpResultCountSlider.value) : 1;
                cpResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-4 md:gap-6`;
                cpResultsGrid.innerHTML = '';
                
                for (let i = 1; i <= resultCount; i++) {
                    const card = document.createElement('div');
                    card.id = `cp-card-${i}`;
                    card.className = `card overflow-hidden transition-all ${aspectClass} bg-gray-100 flex items-center justify-center`;
                    card.innerHTML = `<div class="spinner"></div>`;
                    cpResultsGrid.appendChild(card);
                }
            }
            if (lucide) lucide.createIcons();
            const resultCount = cpResultCountSlider ? parseInt(cpResultCountSlider.value) : 1;
            const generationPromises = Array.from({ length: resultCount }, (_, i) => i + 1).map(i => generateReposedImage(i, aspectRatio));
            await Promise.allSettled(generationPromises);
            cpGenerateBtn.disabled = false;
            cpGenerateBtn.innerHTML = originalBtnHTML;
            if (lucide) lucide.createIcons();
        });
    }

    async function generateReposedImage(id, aspectRatio) {
        const card = document.getElementById(`cp-card-${id}`);
        try {
            const prompt = `Recreate the person in this image but change their pose to "${cpPromptInput.value.trim()}". Maintain the same person, clothing, and background. This is variation ${id}.`;

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
            formData.append('images[]', base64ToBlob(cpImageData.base64, cpImageData.mimeType));
            formData.append('instruction', prompt);
            if (aspectRatio) {
                formData.append('aspectRatio', aspectRatio);
            }

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (result.success && result.imageUrl) {
                const imageUrl = result.imageUrl;
                card.innerHTML = `
                        <img src="${imageUrl}" class="w-full h-full object-cover">
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                            <a href="${imageUrl}" download="pose_change_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        </div>`;
                card.className = `card relative w-full overflow-hidden group ${getAspectRatioClass(aspectRatio)}`;
                doneSound.play();
            } else {
                throw new Error("Respon tidak valid dari API (No URL).");
            }
        } catch (error) {
            errorSound.play();
            console.error(`Error for reposed card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            if (lucide) lucide.createIcons();
        }
    }
};
