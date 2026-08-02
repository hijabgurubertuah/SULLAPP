window.initPotretCinta2 = function ({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    API_KEY,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    const pcManInput = document.getElementById('pc2-man-input');
    const pcManUploadBox = document.getElementById('pc2-man-upload-box');
    const pcManPreview = document.getElementById('pc2-man-preview');
    const pcManPlaceholder = document.getElementById('pc2-man-placeholder');
    const pcRemoveManBtn = document.getElementById('pc2-remove-man-btn');

    const pcWomanInput = document.getElementById('pc2-woman-input');
    const pcWomanUploadBox = document.getElementById('pc2-woman-upload-box');
    const pcWomanPreview = document.getElementById('pc2-woman-preview');
    const pcWomanPlaceholder = document.getElementById('pc2-woman-placeholder');
    const pcRemoveWomanBtn = document.getElementById('pc2-remove-woman-btn');

    const pcPoseOptions = document.getElementById('pc2-pose-options');
    const pcPoseCustomContainer = document.getElementById('pc2-pose-custom-container');
    const pcPoseCustomInput = document.getElementById('pc2-pose-custom-input');

    const pcToneOptions = document.getElementById('pc2-tone-options');
    const pcToneCustomContainer = document.getElementById('pc2-tone-custom-container');
    const pcToneCustomInput = document.getElementById('pc2-tone-custom-input');

    const pcRatioOptions = document.getElementById('pc2-ratio-options');
    const pcResultSlider = document.getElementById('pc2-count-slider');
    const pcSliderValue = document.getElementById('pc2-count-value');
    const pcGenerateBtn = document.getElementById('pc2-generate-btn');
    const pcResultsContainer = document.getElementById('pc2-results-container');
    const pcResultsGrid = document.getElementById('pc2-results-grid');
    const pcPoseSection = document.getElementById('pc2-pose-section');
    const pcToneSection = document.getElementById('pc2-tone-section');
    const pcThemeOptions = document.getElementById('pc2-theme-options');
    const pcAiConceptInfo = document.getElementById('pc2-ai-concept-info');
    const pcAiConceptText = document.getElementById('pc2-ai-concept-text');

    // Use /generate endpoint - interceptor will route to correct endpoint based on selected model
    const getEndpointUrl = () => {
        return GENERATE_URL;
    };
    
    let NANO_URL = getEndpointUrl();

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
    if (pcThemeOptions) setupOptionButtons(pcThemeOptions);

    // Handle Custom Pose Toggle
    pcPoseOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            if (btn.dataset.value === 'custom') {
                pcPoseCustomContainer.classList.remove('hidden');
                pcPoseCustomInput.focus();
            } else {
                pcPoseCustomContainer.classList.add('hidden');
            }
        }
    });

    // Handle Custom Tone Toggle
    pcToneOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            if (btn.dataset.value === 'custom') {
                pcToneCustomContainer.classList.remove('hidden');
                pcToneCustomInput.focus();
            } else {
                pcToneCustomContainer.classList.add('hidden');
            }
        }
    });

    // Helper: Show Mini Popup
    function showLimitPopup(message) {
        // Remove existing popup if any
        const existingPopup = document.getElementById('pc2-limit-popup');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.id = 'pc2-limit-popup';
        popup.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg z-[9999] transition-all duration-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-4';
        popup.style.maxWidth = '90%';
        popup.style.width = 'max-content';
        popup.innerHTML = `<i data-lucide="info" class="w-3.5 h-3.5 text-yellow-400"></i><span>${message}</span>`;
        document.body.appendChild(popup);
        
        if (lucide && lucide.createIcons) {
            lucide.createIcons({
                root: popup
            });
        }

        setTimeout(() => {
            popup.classList.add('opacity-0', '-translate-y-4');
            setTimeout(() => {
                popup.remove();
            }, 300);
        }, 3000);
    }

    pcResultSlider.addEventListener('input', () => {
        pcSliderValue.textContent = `${pcResultSlider.value} Gambar`;
    });

    pcGenerateBtn.addEventListener('click', async () => {
        // Check for PRO version access
        if (window.location.pathname.includes('/pro') || (typeof window.IS_VIP_APP !== 'undefined' && !window.IS_VIP_APP)) {
            const upgradeModal = document.getElementById('upgrade-vip-modal');
            if (upgradeModal) {
                upgradeModal.style.display = 'flex';
                
                // Ensure close button works
                const closeBtn = document.getElementById('upgrade-vip-modal-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        upgradeModal.style.display = 'none';
                    }, { once: true }); // Use once to prevent multiple listeners accumulation
                }
                
                // Click outside to close
                upgradeModal.addEventListener('click', (e) => {
                    if (e.target === upgradeModal) {
                        upgradeModal.style.display = 'none';
                    }
                });
            }
            return;
        }

        // Update endpoint URL in case Private Server model changed
        NANO_URL = getEndpointUrl();

        const originalBtnHTML = pcGenerateBtn.innerHTML;
        pcGenerateBtn.disabled = true;
        pcGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menciptakan Momen 2.0...</span>`;

        document.getElementById('pc2-results-placeholder').classList.add('hidden');
        pcResultsContainer.classList.remove('hidden');
        pcResultsGrid.innerHTML = '';

        const aspectRatio = pcRatioOptions.querySelector('.selected').dataset.value;
        const aspectClass = getAspectRatioClass(aspectRatio);
        const outputCount = Math.max(1, parseInt(pcResultSlider.value, 10) || 1);
        pcResultsGrid.className = `grid ${getResultGridCols(outputCount)} gap-4`;

        for (let i = 1; i <= outputCount; i++) {
            const card = document.createElement('div');
            card.id = `pc2-card-${i}`;
            card.className = `relative group rounded-2xl overflow-hidden border border-slate-100 shadow-md bg-slate-50 flex flex-col items-center justify-center ${aspectClass}`;
            card.innerHTML = `
                <div class="spinner"></div>
                <p class="text-xs text-slate-500 font-medium animate-pulse" id="pc2-status-${i}">Menyiapkan...</p>
            `;
            pcResultsGrid.appendChild(card);
        }
        lucide.createIcons();

        const generationPromises = [];
        for (let i = 1; i <= outputCount; i++) {
            generationPromises.push(generatePotretCintaImage(i, aspectRatio));
        }
        await Promise.allSettled(generationPromises);

        pcGenerateBtn.disabled = false;
        pcGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });

    async function generatePotretCintaImage(id, aspectRatio) {
        const card = document.getElementById(`pc2-card-${id}`);
        const statusEl = document.getElementById(`pc2-status-${id}`);
        
        // Status messages array
        const loadingMessages = [
            "Menganalisis foto...",
            "Mendeteksi wajah...",
            "Menerapkan gaya...",
            "Menyesuaikan lighting...",
            "Finishing sentuhan akhir..."
        ];
        
        let msgIndex = 0;
        const statusInterval = setInterval(() => {
            if (statusEl) {
                statusEl.textContent = loadingMessages[msgIndex % loadingMessages.length];
                msgIndex++;
            }
        }, 2000);

        try {
            // Build prompt directly from user selections
            const poseBtn = pcPoseOptions.querySelector('.selected');
            const toneBtn = pcToneOptions.querySelector('.selected');
            
            let poseValue = poseBtn.dataset.value;
            let toneValue = toneBtn.dataset.value;

            // Handle Custom Pose
            if (poseValue === 'custom') {
                poseValue = pcPoseCustomInput.value.trim();
                if (!poseValue) poseValue = "Romantic couple pose"; // Fallback
            }

            // Handle Custom Tone
            if (toneValue === 'custom') {
                toneValue = pcToneCustomInput.value.trim();
            }

            let posePrompt = "";
            if (poseValue.includes("Hidung Bersentuhan")) {
                posePrompt = "Pose: Intimate profile close-up. The Man is positioned lower in the frame, tilting his head slightly up. The Woman is positioned slightly higher, looking down. Their noses are gently touching or about to touch. They are smiling softly and romantically at each other. The composition creates a sense of deep affection.";
            } else if (poseValue.includes("Saling Menatap")) {
                posePrompt = "Pose: Face to face, gazing deeply into each other's eyes. Romantic and intimate connection, soft smiles, showing love and affection.";
            } else if (poseValue.includes("Ciuman Kening")) {
                posePrompt = "Pose: The Man gently kissing the Woman's forehead. Tender, protective, and loving gesture. Woman's eyes closed, peaceful expression.";
            } else if (poseValue.includes("Tertawa")) {
                posePrompt = "Pose: Candid laughing moment together. Natural, joyful, authentic happiness. Looking at each other or camera with genuine smiles.";
            } else if (poseValue.includes("Pelukan")) {
                posePrompt = "Pose: Back hug, the Man embracing the Woman from behind. Warm, protective, intimate. Both looking content and in love.";
            } else if (poseValue.includes("Duduk")) {
                posePrompt = "Pose: Sitting casually together, relaxed and comfortable. Natural intimacy, leaning towards each other.";
            } else if (poseValue.includes("Berjalan")) {
                posePrompt = "Pose: Walking hand in hand together. Dynamic, romantic, showing partnership and journey together.";
            } else if (poseValue.includes("Melamar")) {
                posePrompt = "Pose: Proposal moment, the Man on one knee. Emotional, romantic, capturing the special moment of commitment.";
            } else if (poseValue.includes("Berdansa")) {
                posePrompt = "Pose: Dancing together, close embrace. Romantic, elegant, showing connection through movement.";
            } else if (poseValue.includes("Menyandar")) {
                posePrompt = "Pose: Woman leaning on Man's shoulder. Comfortable, trusting, peaceful intimacy.";
            } else if (poseValue === 'custom') {
                posePrompt = `Pose: ${poseValue}. The couple should be very close, showing deep intimacy and connection.`;
            } else {
                posePrompt = `Pose: ${poseValue}. The couple should be very close, showing deep intimacy and connection.`;
            }

            let lightingPrompt = "";
            let colorPrompt = "";

            if (toneValue === 'bw') {
                lightingPrompt = "High contrast chiaroscuro studio lighting, dramatic shadows, rim lighting on profile to highlight facial contours.";
                colorPrompt = "Black and white photography, monochrome, deep blacks, high fidelity, fine art style.";
            } else if (toneValue === 'sepia') {
                lightingPrompt = "Soft vintage studio lighting, warm glow.";
                colorPrompt = "Sepia tone, vintage film grain aesthetic, classic look.";
            } else if (toneValue === 'pastel') {
                lightingPrompt = "Soft, diffused, bright studio lighting, airy atmosphere.";
                colorPrompt = "Pastel color palette, soft pinks, blues, and creams, dreamy and romantic aesthetic.";
            } else if (toneValue === 'moody') {
                lightingPrompt = "Low key lighting, deep shadows, mysterious atmosphere.";
                colorPrompt = "Dark, moody colors, desaturated tones with rich blacks, emotional and intense.";
            } else if (toneBtn.dataset.value === 'custom') {
                lightingPrompt = "Professional studio lighting suited for the description.";
                colorPrompt = toneValue;
            } else {
                lightingPrompt = "Cinematic studio lighting, teal and orange undertones, dramatic mood.";
                colorPrompt = "Rich cinematic colors, deep saturation, moody atmosphere.";
            }

            const prompt = `Create a highly artistic, emotional studio portrait of the couple from the source images.
                CRITICAL: You MUST use the exact faces of the Man and Woman provided. Preserve their facial identity perfectly.
                ${posePrompt}
                Background: Solid pure black or very dark void to isolate the subjects (unless specified otherwise in tone).
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

            const response = await fetch(`${NANO_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));

            const result = await response.json();

            if (result.success && result.imageUrl) {
                clearInterval(statusInterval); // Stop status updates
                const imageUrl = result.imageUrl;
                card.innerHTML = `
                        <img src="${imageUrl}" class="w-full h-full object-cover">
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar"><i data-lucide="eye" class="w-4 h-4"></i></button>
                            <a href="${imageUrl}" download="potret_cinta_2_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        </div>`;
                card.classList.remove('bg-slate-50', 'flex', 'flex-col', 'items-center', 'justify-center', 'border', 'border-slate-100', 'shadow-md');
                card.classList.add('relative');
                doneSound.play();
            } else {
                throw new Error("Respon tidak valid.");
            }
        } catch (error) {
            clearInterval(statusInterval); // Stop status updates
            errorSound.play();
            console.error(`Error for potret cinta 2 card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
            card.classList.remove('bg-slate-50', 'flex', 'flex-col', 'items-center', 'justify-center');
            card.classList.add('flex', 'items-center', 'justify-center', 'bg-red-50');
        } finally {
            lucide.createIcons();
        }
    }
};
