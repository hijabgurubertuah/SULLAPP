window.initWedding2 = function ({
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
    errorSound,
    base64ToBlob,
    showContentModal,
    hideAndClearModal
}) {
    // --- Elements ---
    const manInput = document.getElementById('w2-man-input');
    const manUploadBox = document.getElementById('w2-man-upload-box');
    const manPreview = document.getElementById('w2-man-preview');
    const manPlaceholder = document.getElementById('w2-man-placeholder');
    const removeManBtn = document.getElementById('w2-remove-man-btn');

    const womanInput = document.getElementById('w2-woman-input');
    const womanUploadBox = document.getElementById('w2-woman-upload-box');
    const womanPreview = document.getElementById('w2-woman-preview');
    const womanPlaceholder = document.getElementById('w2-woman-placeholder');
    const removeWomanBtn = document.getElementById('w2-remove-woman-btn');

    const smartToggle = document.getElementById('w2-smart-toggle');
    const smartContainer = document.getElementById('w2-smart-container');
    const conceptPlaceholder = document.getElementById('w2-concept-placeholder');
    const conceptEditor = document.getElementById('w2-concept-editor');
    const magicBtn = document.getElementById('w2-magic-btn');
    const themeOptions = document.getElementById('w2-theme-options');

    const smartRefInput = document.getElementById('w2-smart-ref-input');
    const smartRefUploadBox = document.getElementById('w2-smart-ref-upload-box');
    const smartRefPlaceholder = document.getElementById('w2-smart-ref-placeholder');
    const smartRefPreview = document.getElementById('w2-smart-ref-preview');
    const removeSmartRefBtn = document.getElementById('w2-remove-smart-ref');

    const toneSelect = document.getElementById('w2-tone-select');
    const toneSection = document.getElementById('w2-tone-section');
    
    const clothingSelect = document.getElementById('w2-clothing-select');
    const clothingSection = document.getElementById('w2-clothing-section');
    const clothingCustomContainer = document.getElementById('w2-clothing-custom-container');
    const clothingText = document.getElementById('w2-clothing-text');
    const clothingInput = document.getElementById('w2-clothing-input');
    const clothingUploadBox = document.getElementById('w2-clothing-upload-box');
    const clothingPreview = document.getElementById('w2-clothing-preview');
    const removeClothingBtn = document.getElementById('w2-remove-clothing');

    const logoUploadBox = document.getElementById('w2-logo-upload-box');
    const logoInput = document.getElementById('w2-logo-input');
    const logoPreview = document.getElementById('w2-logo-preview');
    const removeLogoBtn = document.getElementById('w2-remove-logo');
    const logoControls = document.getElementById('w2-logo-controls');
    const logoPositionOptions = document.getElementById('w2-logo-position-options');
    const logoOpacityInput = document.getElementById('w2-logo-opacity-input');
    const logoOpacityValue = document.getElementById('w2-logo-opacity-value');
    const logoSizeInput = document.getElementById('w2-logo-size-input');

    const ratioOptions = document.getElementById('w2-ratio-options');
    const additionalPrompt = document.getElementById('w2-additional-prompt');
    const additionalSection = document.getElementById('w2-additional-section');
    
    const resultSlider = document.getElementById('w2-count-slider');
    const sliderValue = document.getElementById('w2-count-value');

    const generateBtn = document.getElementById('w2-generate-btn');
    const resultsContainer = document.getElementById('w2-results-container');
    const resultsGrid = document.getElementById('w2-results-grid');
    const resultsPlaceholder = document.getElementById('w2-results-placeholder');

    // --- State ---
    let manData = null;
    let womanData = null;
    let smartRefData = null;
    let logoData = null;
    let clothingData = null;

    // --- Helpers ---
    function updateGenerateButton() {
        if (manData && womanData) {
            generateBtn.disabled = false;
            generateBtn.classList.remove('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
            generateBtn.classList.add('bg-gradient-to-r', 'from-teal-500', 'to-emerald-500', 'text-white', 'hover:from-teal-600', 'hover:to-emerald-600', 'cursor-pointer');
        } else {
            generateBtn.disabled = true;
            generateBtn.classList.add('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
            generateBtn.classList.remove('bg-gradient-to-r', 'from-teal-500', 'to-emerald-500', 'text-white', 'hover:from-teal-600', 'hover:to-emerald-600', 'cursor-pointer');
        }
    }

    function setControlDisabled(el, disabled) {
        if (!el) return;
        if (typeof el.disabled === "boolean") el.disabled = disabled;
        el.classList.toggle('opacity-60', disabled);
        el.classList.toggle('cursor-not-allowed', disabled);
    }

    function applySmartModeState(isOn) {
        if (smartContainer) {
            if (isOn) smartContainer.classList.remove('hidden');
            else smartContainer.classList.add('hidden');
        }

        if (toneSection) toneSection.classList.toggle('hidden', isOn);
        if (clothingSection) clothingSection.classList.toggle('hidden', isOn);
        if (additionalSection) additionalSection.classList.toggle('hidden', isOn);

        setControlDisabled(toneSelect, isOn);
        setControlDisabled(clothingSelect, isOn);
        setControlDisabled(clothingText, isOn);
        setControlDisabled(additionalPrompt, isOn);
        if (clothingCustomContainer && isOn) {
            clothingCustomContainer.classList.add('hidden');
        }
    }

    function getConceptText() {
        if (!conceptEditor) return "";
        const text = conceptEditor.innerText || conceptEditor.textContent || "";
        return String(text).trim();
    }

    function syncConceptPlaceholder() {
        if (!conceptPlaceholder) return;
        conceptPlaceholder.classList.toggle('hidden', getConceptText().length > 0);
    }

    function updateMagicButtonState() {
        if (!magicBtn) return;
        setControlDisabled(magicBtn, false);
    }

    // --- Event Listeners: Man Photo ---
    setupImageUpload(manInput, manUploadBox, (data) => {
        manData = data;
        manPreview.src = data.dataUrl;
        manPreview.classList.remove('hidden');
        manPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, ratioOptions);
        removeManBtn.classList.remove('hidden');
        updateGenerateButton();
        updateMagicButtonState();
    });

    removeManBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        manData = null;
        manInput.value = '';
        manPreview.src = '';
        manPreview.classList.add('hidden');
        manPlaceholder.classList.remove('hidden');
        removeManBtn.classList.add('hidden');
        updateGenerateButton();
        updateMagicButtonState();
    });

    // --- Event Listeners: Woman Photo ---
    setupImageUpload(womanInput, womanUploadBox, (data) => {
        womanData = data;
        womanPreview.src = data.dataUrl;
        womanPreview.classList.remove('hidden');
        womanPlaceholder.classList.add('hidden');
        removeWomanBtn.classList.remove('hidden');
        updateGenerateButton();
        updateMagicButtonState();
    });

    removeWomanBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        womanData = null;
        womanInput.value = '';
        womanPreview.src = '';
        womanPreview.classList.add('hidden');
        womanPlaceholder.classList.remove('hidden');
        removeWomanBtn.classList.add('hidden');
        updateGenerateButton();
        updateMagicButtonState();
    });

    // --- Event Listeners: Clothing ---
    clothingSelect.addEventListener('change', () => {
        if (clothingSelect.value === 'custom') {
            clothingCustomContainer.classList.remove('hidden');
        } else {
            clothingCustomContainer.classList.add('hidden');
            // Reset clothing image data when switching away from custom
            if (clothingData) {
                clothingData = null;
                if (clothingInput) clothingInput.value = '';
                if (clothingPreview) {
                    clothingPreview.src = '';
                    clothingPreview.classList.add('hidden');
                }
                if (removeClothingBtn) removeClothingBtn.classList.add('hidden');
            }
        }
    });

    // --- Event Listeners: Clothing Image Upload ---
    if (clothingInput && clothingUploadBox && clothingPreview && removeClothingBtn) {
        setupImageUpload(clothingInput, clothingUploadBox, (data) => {
            clothingData = data;
            clothingPreview.src = data.dataUrl;
            clothingPreview.classList.remove('hidden');
            removeClothingBtn.classList.remove('hidden');
        });

        removeClothingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            clothingData = null;
            clothingInput.value = '';
            clothingPreview.src = '';
            clothingPreview.classList.add('hidden');
            removeClothingBtn.classList.add('hidden');
        });
    }

    if (smartToggle && smartContainer) {
        smartToggle.addEventListener('change', () => {
            applySmartModeState(Boolean(smartToggle.checked));
        });
        applySmartModeState(Boolean(smartToggle.checked));

        const smartToggleLabel = smartToggle.closest('label');
        if (smartToggleLabel && !smartToggleLabel.querySelector('[data-w2-smart-tooltip="1"]')) {
            smartToggleLabel.classList.add('relative');
            const tip = document.createElement('div');
            tip.dataset.w2SmartTooltip = '1';
            tip.className = 'absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-bold shadow-lg opacity-0 pointer-events-none transition-all duration-300 whitespace-nowrap';
            tip.textContent = 'Visual Wedding menakjubkan!';
            smartToggleLabel.appendChild(tip);
            requestAnimationFrame(() => {
                tip.classList.remove('opacity-0');
                tip.classList.add('opacity-100');
            });
            setTimeout(() => {
                tip.classList.add('opacity-0');
                setTimeout(() => tip.remove(), 300);
            }, 3500);
        }
    }

    if (conceptEditor) {
        conceptEditor.addEventListener('input', () => {
            syncConceptPlaceholder();
            updateMagicButtonState();
        });
        conceptEditor.addEventListener('blur', () => {
            syncConceptPlaceholder();
            updateMagicButtonState();
        });
        syncConceptPlaceholder();
        updateMagicButtonState();
    }

    if (smartRefInput && smartRefUploadBox && smartRefPreview && smartRefPlaceholder && removeSmartRefBtn) {
        setupImageUpload(smartRefInput, smartRefUploadBox, (data) => {
            smartRefData = data;
            smartRefPreview.src = data.dataUrl;
            smartRefPreview.classList.remove('hidden');
            smartRefPlaceholder.classList.add('hidden');
            removeSmartRefBtn.classList.remove('hidden');
        });

        removeSmartRefBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            smartRefData = null;
            smartRefInput.value = '';
            smartRefPreview.src = '';
            smartRefPreview.classList.add('hidden');
            smartRefPlaceholder.classList.remove('hidden');
            removeSmartRefBtn.classList.add('hidden');
        });
    }

    if (logoInput && logoUploadBox && logoPreview && removeLogoBtn && logoControls) {
        setupImageUpload(logoInput, logoUploadBox, (data) => {
            logoData = data;
            logoPreview.src = data.dataUrl;
            logoPreview.classList.remove('hidden');
            removeLogoBtn.classList.remove('hidden');
            logoControls.classList.remove('hidden');
        });

        removeLogoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            logoData = null;
            logoInput.value = '';
            logoPreview.src = '';
            logoPreview.classList.add('hidden');
            removeLogoBtn.classList.add('hidden');
            logoControls.classList.add('hidden');
        });
    }

    // --- Event Listeners: Ratio ---
    setupOptionButtons(ratioOptions);
    if (logoPositionOptions) setupOptionButtons(logoPositionOptions);
    if (themeOptions) setupOptionButtons(themeOptions);
    if (logoOpacityInput && logoOpacityValue) {
        const sync = () => { logoOpacityValue.textContent = `${logoOpacityInput.value}%`; };
        logoOpacityInput.addEventListener('input', sync);
        sync();
    }

    // Helper: Show Mini Popup
    function showLimitPopup(message) {
        // Remove existing popup if any
        const existingPopup = document.getElementById('w2-limit-popup');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.id = 'w2-limit-popup';
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

    // --- Event Listeners: Slider ---
    resultSlider.addEventListener('input', () => {
        sliderValue.textContent = `${resultSlider.value} Gambar`;
    });

    const getApiConfig = async () => {
        const rawBaseUrl = window.BASE_URL || '';
        const baseUrls = rawBaseUrl.split(',').map(u => u.trim()).filter(Boolean);
        const randomIndex = baseUrls.length > 0 ? Math.floor(Math.random() * baseUrls.length) : -1;
        const randomBase = randomIndex !== -1 ? baseUrls[randomIndex] : rawBaseUrl;
        const baseUrlClean = String(randomBase || '').replace(/\/$/, '');

        const apiHeaders = {};
        if (window.API_KEY) apiHeaders['X-API-Key'] = window.API_KEY;

        if (baseUrlClean && typeof window.ensureFrontendToken === 'function') {
            try {
                const token = await window.ensureFrontendToken(baseUrlClean);
                if (token) apiHeaders['Authorization'] = `Bearer ${token}`;
            } catch (e) { }
        }

        // Use /generate endpoint - interceptor will route to correct endpoint based on selected model
        const nanoEndpoint = `${baseUrlClean}/generate`;
        
        const chatEndpoint = `${baseUrlClean}/chat`;
        return { nanoEndpoint, chatEndpoint, apiHeaders };
    };

    const extractChatText = (result) => {
        const text = (result && result.success && result.response)
            ? result.response
            : (result?.response || result?.candidates?.[0]?.content?.parts?.[0]?.text || '');
        return String(text || '').trim();
    };

    const requestChat = async (chatEndpoint, apiHeaders, promptText, images) => {
        const formData = new FormData();
        formData.append('prompt', promptText);
        if (Array.isArray(images)) {
            images.forEach(img => {
                if (!img) return;
                if (base64ToBlob) {
                    formData.append('images[]', base64ToBlob(img.base64, img.mimeType));
                } else {
                    formData.append('images[]', img.dataUrl);
                }
            });
        }

        const response = await fetch(chatEndpoint, {
            method: 'POST',
            headers: apiHeaders,
            body: formData
        });

        if (!response.ok) {
            throw new Error(await getApiErrorMessage(response));
        }

        const result = await response.json();
        const text = extractChatText(result);
        if (!text) {
            throw new Error("Gagal mendapatkan hasil dari analisa /chat.");
        }
        return text;
    };

    const buildMagicConceptPrompt = (theme) => {
        let themeInstruction = '';
        if (theme === 'kemewahan') {
            themeInstruction = 'Tema: KEMEWAHAN - Fokus pada konsep mewah, elegan, glamor, luxury, dengan detail yang sophisticated dan eksklusif.';
        } else if (theme === 'imajinasi') {
            themeInstruction = 'Tema: IMAJINASI - Fokus pada konsep kreatif, imajinatif, fantasi, unik, out-of-the-box, magical, dan penuh kejutan.';
        } else {
            themeInstruction = 'Tema: RANDOM - Bebas berkreasi dengan tema apapun yang menarik.';
        }
        
        return `Buat 1 ide konsep wedding yang unik dan menarik.
${themeInstruction}

Aturan output:
- Panjang 15-20 kata
- Bahasa Indonesia
- Tanpa bullet, tanpa emoji, tanpa tanda kutip, tanpa JSON`;
    };

    const buildMagicConceptPromptStrict = (theme) => {
        let themeInstruction = '';
        if (theme === 'kemewahan') {
            themeInstruction = 'Tema: KEMEWAHAN - Fokus pada konsep mewah, elegan, glamor, luxury, dengan detail yang sophisticated dan eksklusif.';
        } else if (theme === 'imajinasi') {
            themeInstruction = 'Tema: IMAJINASI - Fokus pada konsep kreatif, imajinatif, fantasi, unik, out-of-the-box, magical, dan penuh kejutan.';
        } else {
            themeInstruction = 'Tema: RANDOM - Bebas berkreasi dengan tema apapun yang menarik.';
        }
        
        return `Buat 1 ide konsep wedding yang unik dan menarik.
${themeInstruction}

Aturan output:
- Tepat 18 kata
- Bahasa Indonesia
- Tanpa bullet, tanpa emoji, tanpa tanda kutip, tanpa JSON`;
    };

    const normalizeWords = (text, maxWords) => {
        const words = String(text || '').trim().split(/\s+/).filter(Boolean);
        return words.slice(0, maxWords);
    };

    const buildDetailedWeddingPromptRequest = ({ smartMode, concept, tone, attireStyle, extra, watermark, hasRef }) => {
        let p = `You are a professional wedding photographer and prompt engineer.
Your job: write ONE detailed text prompt for a photorealistic wedding photo generator.
Return ONLY the final prompt text. No markdown, no JSON, no explanations.

You will receive 2 source images containing the couple's faces (Man first, Woman second).
CRITICAL RULE: You MUST use the exact faces from the source images. Preserve their identity perfectly. Do NOT generate different faces.

Concept idea (may be empty): ${concept || "N/A"}`;

        if (smartMode) {
            p += `\nSMART MODE: Infer the best attire style concept and color tone / grading automatically based on the couple photos and any reference images.`;
        } else {
            p += `\nAttire style concept: ${attireStyle}\nColor tone / grading: ${tone}`;
        }
        p += `\n\nLOCATION RULE:
- Do NOT ask user for location input.
- If a location reference image is provided, match the venue/look from it.
- Otherwise, choose an appropriate wedding location concept that fits the attire style/concept.

SCENE & COMPOSITION:
- Romantic couple pose, natural interaction, realistic anatomy, hands and fingers correct.
- Professional wedding lighting, realistic shadows, depth of field.
- Ultra photorealistic, high resolution, crisp details, no artifacts.`;

        if (hasRef) {
            p += `\n- One additional image is provided as a reference. It may be attire OR location. Infer which it is and use it appropriately. Do NOT copy faces from it.`;
        }
        if (watermark) {
            p += `\n- Watermark: ${watermark}`;
        }
        if (extra) {
            p += `\n- Additional instruction: ${extra}`;
        }
        return p;
    };

    if (magicBtn) {
        magicBtn.addEventListener('click', async () => {
            if (!conceptEditor) return;

            const originalBtn = magicBtn.innerHTML;
            magicBtn.disabled = true;
            magicBtn.innerHTML = `<div class="spinner"></div>`;
            try {
                // Get selected theme
                const selectedTheme = themeOptions ? (themeOptions.querySelector('.selected')?.dataset.value || 'random') : 'random';
                
                const { chatEndpoint, apiHeaders } = await getApiConfig();
                let concept = await requestChat(
                    chatEndpoint,
                    apiHeaders,
                    buildMagicConceptPrompt(selectedTheme),
                    []
                );
                let words = normalizeWords(concept, 20);
                if (words.length < 15) {
                    concept = await requestChat(
                        chatEndpoint,
                        apiHeaders,
                        buildMagicConceptPromptStrict(selectedTheme),
                        []
                    );
                    words = normalizeWords(concept, 20);
                }
                conceptEditor.textContent = words.join(' ');
                syncConceptPlaceholder();
                updateMagicButtonState();
            } catch (error) {
                console.error(error);
                alert(error.message || "Gagal membuat ide konsep.");
            } finally {
                magicBtn.innerHTML = originalBtn;
                magicBtn.disabled = false;
                updateMagicButtonState();
            }
        });
    }

    // --- Generate ---
    generateBtn.addEventListener('click', async () => {
        if (!manData || !womanData) return;

        const originalBtnText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = `<div class="spinner"></div><span>Sedang Memproses...</span>`;
        generateBtn.classList.add('opacity-75');

        resultsContainer.classList.add('hidden');
        resultsGrid.innerHTML = '';
        resultsPlaceholder.classList.remove('hidden');

        try {
            const selectedRatioBtn = ratioOptions.querySelector('.selected');
            const ratio = selectedRatioBtn ? selectedRatioBtn.dataset.ratio : '9:16';
            const outputCount = Math.max(1, parseInt(resultSlider.value, 10) || 1);
            const baseStyle = clothingSelect.value === 'custom' ? (clothingText.value || 'Custom') : clothingSelect.value;
            const tone = toneSelect ? (toneSelect.value || 'Natural') : 'Natural';
            const aspectClass = getAspectRatioClass(ratio);

            resultsPlaceholder.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
            resultsGrid.innerHTML = '';
            resultsGrid.className = `grid ${getResultGridCols(outputCount)} gap-4`;

            for (let i = 1; i <= outputCount; i++) {
                const card = document.createElement('div');
                card.id = `w2-card-${i}`;
                card.className = `relative group rounded-2xl overflow-hidden border border-slate-100 shadow-md bg-slate-50 flex flex-col items-center justify-center ${aspectClass}`;
                card.innerHTML = `
                    <div class="spinner"></div>
                    <p class="text-xs text-slate-500 font-medium animate-pulse" id="w2-status-${i}">Menyiapkan...</p>
                `;
                resultsGrid.appendChild(card);
            }
            if (lucide) lucide.createIcons();

            const { nanoEndpoint, apiHeaders } = await getApiConfig();

            const createFormData = (instruction) => {
                const formData = new FormData();
                if (base64ToBlob) {
                    formData.append('images[]', base64ToBlob(manData.base64, manData.mimeType));
                    formData.append('images[]', base64ToBlob(womanData.base64, womanData.mimeType));
                    // Add clothing reference image if available
                    if (clothingData) {
                        formData.append('images[]', base64ToBlob(clothingData.base64, clothingData.mimeType));
                    }
                } else {
                    formData.append('images[]', manData.dataUrl);
                    formData.append('images[]', womanData.dataUrl);
                    // Add clothing reference image if available
                    if (clothingData) {
                        formData.append('images[]', clothingData.dataUrl);
                    }
                }
                formData.append('instruction', instruction);
                if (ratio) formData.append('aspectRatio', ratio);
                return formData;
            };

            const extractImageUrl = (result) => {
                if (Array.isArray(result) && result[0]) return result[0];
                if (result?.imageUrl) return result.imageUrl;
                if (result?.images?.[0]) return result.images[0];
                if (result?.output?.[0]) return result.output[0];
                if (result?.image) return result.image;
                return null;
            };

            const generateSingleWeddingImage = async (id) => {
                const card = document.getElementById(`w2-card-${id}`);
                const statusEl = document.getElementById(`w2-status-${id}`);
                try {
                    if (statusEl) statusEl.textContent = "Membuat prompt...";
                    
                    // Build prompt directly from user selections
                    const additionalInstructions = additionalPrompt.value.trim();
                    
                    let prompt = `Create a highly photorealistic, professional wedding photo of the couple from the source images.
CRITICAL: You MUST use the exact faces of the Man and Woman provided. Preserve their facial identity perfectly.

Attire Style: ${baseStyle}${clothingData ? ' (Use the clothing reference image provided as the third image for accurate attire details)' : ''}
Color Tone: ${tone}
Romantic couple pose, natural interaction, realistic anatomy, hands and fingers correct.
Professional wedding lighting, realistic shadows, depth of field.
Ultra photorealistic, high resolution, crisp details, no artifacts.`;

                    if (additionalInstructions) {
                        prompt += `\n\nAdditional Instructions: ${additionalInstructions}`;
                    }
                    
                    prompt += `\n\nThis is variation ${id}.`;

                    if (statusEl) statusEl.textContent = "Mengunggah...";
                    const formData = createFormData(prompt);
                    
                    if (statusEl) statusEl.textContent = "Memproses AI...";
                    const response = await fetch(nanoEndpoint, {
                        method: 'POST',
                        headers: apiHeaders,
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(await getApiErrorMessage(response));
                    }

                    if (statusEl) statusEl.textContent = "Mengunduh Hasil...";
                    const contentType = response.headers.get('content-type') || '';
                    let result;
                    if (contentType.includes('application/json')) {
                        result = await response.json();
                    } else {
                        const blob = await response.blob();
                        result = { imageUrl: URL.createObjectURL(blob) };
                    }

                    const imgUrl = extractImageUrl(result);
                    if (!imgUrl) {
                        throw new Error('Tidak ada gambar yang dihasilkan.');
                    }

                    let finalImgUrl = imgUrl;
                    if (logoData && logoData.base64 && typeof window.applyLogoToImage === 'function') {
                        const position = document.querySelector('#w2-logo-position-options .selected')?.dataset.value || 'bottom-right';
                        const opacity = logoOpacityInput ? parseInt(logoOpacityInput.value, 10) / 100 : 0.3;
                        const size = logoSizeInput ? parseInt(logoSizeInput.value, 10) : 150;
                        try {
                            finalImgUrl = await window.applyLogoToImage(finalImgUrl, logoData.base64, position, opacity, size);
                        } catch (e) {
                            console.error("Failed to apply logo", e);
                        }
                    }

                    // Create card with image and buttons (animate icon auto-injected by global observer)
                    const cardInner = `
                        <img src="${finalImgUrl}" class="w-full h-full object-cover cursor-pointer view-btn" data-img-src="${finalImgUrl}" alt="Wedding Result ${id}">
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <button class="view-btn result-action-btn" data-img-src="${finalImgUrl}" title="Lihat">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                            <a href="${finalImgUrl}" download="wedding-ai-${Date.now()}-${id}.png" class="result-action-btn download-btn" title="Unduh">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        </div>
                    `;
                    
                    card.innerHTML = cardInner;
                } catch (error) {
                    console.error(error);
                    card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message || 'Gagal membuat gambar.'}</div>`;
                } finally {
                    if (lucide) lucide.createIcons();
                }
            };

            const generationPromises = Array.from({ length: outputCount }, (_, index) => generateSingleWeddingImage(index + 1));
            await Promise.allSettled(generationPromises);
            if (doneSound) doneSound.play();
        } catch (error) {
            console.error(error);
            if (errorSound) errorSound.play();
            alert(error.message || "Terjadi kesalahan saat generate.");
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalBtnText;
            generateBtn.classList.remove('opacity-75');
        }
    });

    // Initial check
    updateGenerateButton();
};
