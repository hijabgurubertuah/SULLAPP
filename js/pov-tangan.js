window.initPovTangan = function ({
    document,
    setupImageUpload,
    setupOptionButtons,
    updateSliderProgress,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    API_KEY,
    GENERATE_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    const ptImageInput = document.getElementById('pt-image-input');
    const ptUploadBox = document.getElementById('pt-upload-box');
    const ptPreview = document.getElementById('pt-preview');
    const ptPlaceholder = document.getElementById('pt-placeholder');
    const ptRemoveBtn = document.getElementById('pt-remove-btn');


    const ptInstructionInput = document.getElementById('pt-instruction-input');
    const ptCountSlider = document.getElementById('pt-count-slider');
    const ptCountDisplay = document.getElementById('pt-count-display');
    const ptRatioOptions = document.getElementById('pt-ratio-options');
    const ptGenerateBtn = document.getElementById('pt-generate-btn');
    const ptResultsContainer = document.getElementById('pt-results-container');
    const ptResultsGrid = document.getElementById('pt-results-grid');
    let ptImageData = null;
    function ptUpdateButtons() {
        const hasImage = !!ptImageData;

        ptGenerateBtn.disabled = !hasImage;

    }
    setupImageUpload(ptImageInput, ptUploadBox, (data) => {
        ptImageData = data;
        ptPreview.src = data.dataUrl;
        ptPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, ptRatioOptions);
        ptPreview.classList.remove('hidden');
        ptRemoveBtn.classList.remove('hidden');
        ptUpdateButtons();



    });
    ptRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ptImageData = null;
        ptImageInput.value = '';

        ptInstructionInput.value = '';
        ptPreview.src = '#';
        ptPreview.classList.add('hidden');
        ptPlaceholder.classList.remove('hidden');
        ptRemoveBtn.classList.add('hidden');
        document.getElementById('pt-results-placeholder').classList.remove('hidden');
        ptResultsContainer.classList.add('hidden');
        ptResultsGrid.innerHTML = '';
        ptUpdateButtons();
    });

    ptCountSlider.addEventListener('input', () => {
        ptCountDisplay.textContent = `${ptCountSlider.value} Gambar`;
        updateSliderProgress(ptCountSlider);
        
        // VIP Logic
        if (parseInt(ptCountSlider.value) > 1 && typeof showUpgradeVipPopup === 'function') {
            showUpgradeVipPopup();
            ptCountSlider.value = 1;
            ptCountDisplay.textContent = "1 Gambar";
            updateSliderProgress(ptCountSlider);
        }
    });
    updateSliderProgress(ptCountSlider);
    setupOptionButtons(ptRatioOptions);

    ptGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = ptGenerateBtn.innerHTML;
        ptGenerateBtn.disabled = true;
        const count = parseInt(ptCountSlider.value);
        ptGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Konsep (0/${count})</span>`;
        document.getElementById('pt-results-placeholder').classList.add('hidden');
        const aspectRatio = ptRatioOptions.querySelector('.selected').dataset.value;
        const aspectClass = getAspectRatioClass(aspectRatio);
        ptResultsContainer.classList.remove('hidden');
        ptResultsGrid.innerHTML = '';
        ptResultsGrid.className = `grid ${getResultGridCols(count)} gap-4 md:gap-6`;
        for (let i = 1; i <= count; i++) {
            const card = document.createElement('div');
            card.id = `pt-card-${i}`;
            card.className = `card overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
            card.innerHTML = `
                        <div class="text-center p-2">
                            <div class="spinner"></div>
                            <p class="text-xs mt-2 text-gray-600">Membuat Konsep...</p>
                        </div>
                    `;
            ptResultsGrid.appendChild(card);
        }
        lucide.createIcons();
        setTimeout(async () => {
            try {
                const concepts = await getHandPovConcepts(count);
                const generationPromises = concepts.map((concept, index) =>
                    generateSingleHandPovImage(index + 1, concept.prompt, aspectRatio)
                        .then(() => {
                            ptGenerateBtn.querySelector('span').textContent = `Membuat Foto (${index + 1}/${count})`;
                        })
                );
                await Promise.allSettled(generationPromises);
            } catch (error) {
                console.error("Error during POV Tangan generation:", error);
                ptResultsGrid.innerHTML = `<div class="col-span-1 text-center py-10 text-red-500"><p class="break-all">Terjadi kesalahan: ${error.message}</p></div>`;
            } finally {
                ptGenerateBtn.disabled = false;
                ptGenerateBtn.innerHTML = originalBtnHTML;
                lucide.createIcons();
            }
        }, 100);
    });
    async function getHandPovConcepts(count) {
        const concepts = [];
        const scenes = [
            {
                hand: 'elegant female hand with natural manicure',
                action: 'gently holding it between two fingers, presenting it to camera',
                bg: 'soft bokeh cafe background, warm golden hour light, shallow depth of field',
                lighting: 'warm diffused side lighting'
            },
            {
                hand: 'masculine hand with clean nails',
                action: 'placing it on a minimalist marble surface, fingers relaxed',
                bg: 'clean white marble countertop, softbox studio lighting, airy editorial look',
                lighting: 'bright even studio lighting'
            },
            {
                hand: 'female hand with skin tones visible, natural look',
                action: 'holding it up against the sky, arm slightly extended',
                bg: 'blurred lush green nature park, soft morning sunlight, dreamy atmosphere',
                lighting: 'backlit golden sunlight creating rim light effect'
            },
            {
                hand: 'well-groomed hand with subtle jewelry',
                action: 'unwrapping or revealing it on a luxury surface',
                bg: 'dark moody background with bokeh lights, cinematic noir style',
                lighting: 'dramatic single spotlight lighting'
            },
            {
                hand: 'casual hand, relaxed and natural',
                action: 'holding it casually while sitting at a cozy desk',
                bg: 'blurred cozy home interior, fairy lights bokeh, warm ambient light',
                lighting: 'warm indoor ambient lighting'
            }
        ];

        for (let i = 0; i < count; i++) {
            const s = scenes[i % scenes.length];
            concepts.push({
                prompt: `${s.hand} ${s.action}. Background: ${s.bg}. Lighting: ${s.lighting}.`
            });
        }

        return concepts;
    }
    async function generateSingleHandPovImage(id, conceptData, aspectRatio) {
        const card = document.getElementById(`pt-card-${id}`);
        const conceptPrompt = conceptData.prompt || conceptData;
        try {
            card.innerHTML = `
                        <div class="text-center p-2">
                            <div class="spinner"></div>
                            <p class="text-xs mt-2 text-gray-600">Menyusun Gambar...</p>
                        </div>
                    `;
            lucide.createIcons();

            const userNote = ptInstructionInput.value.trim();
            let finalPrompt = `Create a stunning, high-end product photography image in a realistic point-of-view (POV) style.

Product: Use the exact product from the provided reference image — preserve its shape, color, texture, branding, and details with 100% accuracy.

Scene & Composition: ${conceptPrompt}

Style requirements:
- Ultra-realistic, professional commercial photography quality
- Natural-looking hand with realistic skin texture and proportions
- Beautiful background bokeh (f/1.8 depth of field look)
- Rich color grading, high detail, cinematic mood
- The product must be the clear hero of the shot, in sharp focus
- No extra objects, no text, no watermarks

${userNote ? `Additional instruction: ${userNote}` : ''}
This is variation ${id}.`;

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
            
            formData.append('images[]', base64ToBlob(ptImageData.base64, ptImageData.mimeType));

            formData.append('instruction', finalPrompt);
            formData.append('aspectRatio', aspectRatio || 'IMAGE_ASPECT_RATIO_SQUARE');

            if (aspectRatio && aspectRatio !== 'Auto') {
                // already set
            } else {
                formData.append('aspectRatio', '1:1');
            }

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                cache: "no-store",
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (!result.success || !result.imageUrl) throw new Error("No image data from AI.");
            const imageUrl = result.imageUrl;
            card.innerHTML = `
                        <img src="${imageUrl}" class="w-full h-full object-cover">
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar"><i data-lucide="eye" class="w-4 h-4"></i></button>
                            <a href="${imageUrl}" download="pov_tangan_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        </div>`;
            card.className = `card relative w-full overflow-hidden group ${getAspectRatioClass(aspectRatio)}`;
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error for POV Tangan card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }
};
