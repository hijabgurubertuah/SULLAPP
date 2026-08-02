window.initPotretCinta = function ({
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
    const pcManInput = document.getElementById('pc-man-input');
    const pcManUploadBox = document.getElementById('pc-man-upload-box');
    const pcManPreview = document.getElementById('pc-man-preview');
    const pcManPlaceholder = document.getElementById('pc-man-placeholder');
    const pcRemoveManBtn = document.getElementById('pc-remove-man-btn');

    const pcWomanInput = document.getElementById('pc-woman-input');
    const pcWomanUploadBox = document.getElementById('pc-woman-upload-box');
    const pcWomanPreview = document.getElementById('pc-woman-preview');
    const pcWomanPlaceholder = document.getElementById('pc-woman-placeholder');
    const pcRemoveWomanBtn = document.getElementById('pc-remove-woman-btn');

    const pcPoseOptions = document.getElementById('pc-pose-options');
    const pcToneOptions = document.getElementById('pc-tone-options');
    const pcRatioOptions = document.getElementById('pc-ratio-options');
    const pcGenerateBtn = document.getElementById('pc-generate-btn');
    const pcResultsContainer = document.getElementById('pc-results-container');
    const pcResultsGrid = document.getElementById('pc-results-grid');
    const pcResultCountSlider = document.getElementById('pc-result-count-slider');
    const pcResultCountDisplay = document.getElementById('pc-result-count-display');

    if (pcResultCountSlider && pcResultCountDisplay) {
        pcResultCountSlider.addEventListener('input', function() {
            pcResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    let pcManData = null;
    let pcWomanData = null;

    function pcUpdateButtons() {
        pcGenerateBtn.disabled = !pcManData || !pcWomanData;
    }

    setupImageUpload(pcManInput, pcManUploadBox, (data) => {
        pcManData = data;
        pcManPreview.src = data.dataUrl;
        pcManPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, pcRatioOptions);
        pcManPreview.classList.remove('hidden');
        pcRemoveManBtn.classList.remove('hidden');
        pcUpdateButtons();
    });

    pcRemoveManBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pcManData = null;
        pcManInput.value = '';
        pcManPreview.src = '#';
        pcManPreview.classList.add('hidden');
        pcManPlaceholder.classList.remove('hidden');
        pcRemoveManBtn.classList.add('hidden');
        pcUpdateButtons();
    });

    setupImageUpload(pcWomanInput, pcWomanUploadBox, (data) => {
        pcWomanData = data;
        pcWomanPreview.src = data.dataUrl;
        pcWomanPlaceholder.classList.add('hidden');
        pcWomanPreview.classList.remove('hidden');
        pcRemoveWomanBtn.classList.remove('hidden');
        pcUpdateButtons();
    });

    pcRemoveWomanBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pcWomanData = null;
        pcWomanInput.value = '';
        pcWomanPreview.src = '#';
        pcWomanPreview.classList.add('hidden');
        pcWomanPlaceholder.classList.remove('hidden');
        pcRemoveWomanBtn.classList.add('hidden');
        pcUpdateButtons();
    });

    setupOptionButtons(pcPoseOptions);
    setupOptionButtons(pcToneOptions);
    setupOptionButtons(pcRatioOptions);

    pcGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = pcGenerateBtn.innerHTML;
        pcGenerateBtn.disabled = true;
        pcGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menciptakan Momen...</span>`;

        document.getElementById('pc-results-placeholder').classList.add('hidden');
        pcResultsContainer.classList.remove('hidden');
        pcResultsGrid.innerHTML = '';

        const aspectRatio = pcRatioOptions.querySelector('.selected').dataset.value;
        const aspectClass = getAspectRatioClass(aspectRatio);
        
        const resultCount = pcResultCountSlider ? parseInt(pcResultCountSlider.value) : 1;
        pcResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-4`;

        for (let i = 1; i <= resultCount; i++) {
            const card = document.createElement('div');
            card.id = `pc-card-${i}`;
            card.className = `card overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
            card.innerHTML = `<div class="spinner"></div>`;
            pcResultsGrid.appendChild(card);
        }
        lucide.createIcons();

        const generationPromises = Array.from({ length: resultCount }, (_, i) => i + 1).map(i => generatePotretCintaImage(i, aspectRatio));
        await Promise.allSettled(generationPromises);

        pcGenerateBtn.disabled = false;
        pcGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });

    async function generatePotretCintaImage(id, aspectRatio) {
        const card = document.getElementById(`pc-card-${id}`);
        try {
            const poseData = pcPoseOptions.querySelector('.selected').dataset.value;
            const toneValue = pcToneOptions.querySelector('.selected').dataset.value;

            let posePrompt = "";
            if (poseData.includes("Hidung Bersentuhan")) {
                posePrompt = "Pose: Intimate profile close-up. The Man is positioned lower in the frame, tilting his head slightly up. The Woman is positioned slightly higher, looking down. Their noses are gently touching or about to touch. They are smiling softly and romantically at each other. The composition creates a sense of deep affection.";
            } else {
                posePrompt = `Pose: ${poseData}. The couple should be very close, showing deep intimacy and connection.`;
            }

            let lightingPrompt = "";
            let colorPrompt = "";

            if (toneValue === 'bw') {
                lightingPrompt = "High contrast chiaroscuro studio lighting, dramatic shadows, rim lighting on profile to highlight facial contours.";
                colorPrompt = "Black and white photography, monochrome, deep blacks, high fidelity, fine art style.";
            } else if (toneValue === 'sepia') {
                lightingPrompt = "Soft vintage studio lighting, warm glow.";
                colorPrompt = "Sepia tone, vintage film grain aesthetic, classic look.";
            } else {
                lightingPrompt = "Cinematic studio lighting, teal and orange undertones, dramatic mood.";
                colorPrompt = "Rich cinematic colors, deep saturation, moody atmosphere.";
            }

            const prompt = `Create a highly artistic, emotional studio portrait of the couple from the source images.
                CRITICAL: You MUST use the exact faces of the Man and Woman provided. Preserve their facial identity perfectly.
                ${posePrompt}
                Background: Solid pure black or very dark void to isolate the subjects.
                Style: ${colorPrompt} ${lightingPrompt}
                Details: Sharp focus on faces/eyes, visible skin texture, emotional expression.
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
            formData.append('images[]', base64ToBlob(pcManData.base64, pcManData.mimeType));
            formData.append('images[]', base64ToBlob(pcWomanData.base64, pcWomanData.mimeType));
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
                            <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar"><i data-lucide="eye" class="w-4 h-4"></i></button>
                            <a href="${imageUrl}" download="potret_cinta_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        </div>`;
                card.classList.remove('bg-gray-100', 'flex', 'items-center', 'justify-center');
                card.classList.add('relative');
                doneSound.play();
            } else {
                throw new Error("Respon tidak valid.");
            }
        } catch (error) {
            errorSound.play();
            console.error(`Error for potret cinta card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }
};
