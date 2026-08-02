window.initFotoPolaroid = function(ctx = {}) {
    const {
        document = window.document,
        setupOptionButtons,
        getAspectRatioClass,
        lucide = window.lucide,
        convertHeicToJpg,
        getApiErrorMessage,
        doneSound,
        errorSound,
        switchTab,
        API_KEY = window.API_KEY,
        GENERATE_URL = window.GENERATE_URL
    } = ctx;

    const tabFotoPolaroid = document.getElementById('tab-foto-polaroid');
    if (tabFotoPolaroid) {
        tabFotoPolaroid.addEventListener('click', () => {
            if (typeof switchTab === 'function') {
                switchTab('foto-polaroid');
            }
        });

        const fpUploadInput = document.getElementById('fp-upload-input');
        const fpPreviewGrid = document.getElementById('fp-preview-grid');
        const fpStyleOptions = document.getElementById('fp-style-options');
        const fpCustomStyleContainer = document.getElementById('fp-custom-style-container');
        const fpCustomStyleInput = document.getElementById('fp-custom-style-input');
        const fpRatioOptions = document.getElementById('fp-ratio-options');
        const fpCountSlider = document.getElementById('fp-count-slider');
        const fpCountValue = document.getElementById('fp-count-value');
        const fpGenerateBtn = document.getElementById('fp-generate-btn');
        const fpResultsPlaceholder = document.getElementById('fp-results-placeholder');
        const fpResultsGrid = document.getElementById('fp-results-grid');
        const fpAiToggle = document.getElementById('fp-ai-toggle');
        const fpConceptText = document.getElementById('fp-concept-text');
        let fpUploadedPhotos = [];

        function fpUpdateGenerateState() {
            if (fpGenerateBtn) {
                fpGenerateBtn.disabled = fpUploadedPhotos.length === 0;
            }
        }

        function fpRenderPreview() {
            if (!fpPreviewGrid) return;
            fpPreviewGrid.innerHTML = '';
            if (fpUploadedPhotos.length === 0) {
                fpPreviewGrid.classList.add('hidden');
                fpUpdateGenerateState();
                return;
            }
            fpPreviewGrid.classList.remove('hidden');
            fpUploadedPhotos.forEach((photo, index) => {
                const item = document.createElement('div');
                item.className = 'relative aspect-square rounded-xl overflow-hidden border border-slate-200 group';

                const img = document.createElement('img');
                img.src = photo.dataUrl;
                img.className = 'w-full h-full object-cover';
                item.appendChild(img);

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity';
                removeBtn.innerHTML = '<i data-lucide="x" class="w-3 h-3"></i>';
                removeBtn.addEventListener('click', () => {
                    fpUploadedPhotos.splice(index, 1);
                    fpRenderPreview();
                });
                item.appendChild(removeBtn);

                fpPreviewGrid.appendChild(item);
            });
            if (lucide && lucide.createIcons) lucide.createIcons();
            fpUpdateGenerateState();
        }

        if (fpCountSlider && fpCountValue) {
            fpCountSlider.addEventListener('input', (e) => {
                fpCountValue.textContent = e.target.value;
            });
        }

        if (fpUploadInput) {
            fpUploadInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;

                const remainingSlots = 5 - fpUploadedPhotos.length;
                if (remainingSlots <= 0) {
                    alert("Maksimal 5 foto.");
                    fpUploadInput.value = '';
                    return;
                }

                const filesToProcess = files.slice(0, remainingSlots);
                if (files.length > remainingSlots) {
                    alert("Maksimal 5 foto.");
                }

                for (const file of filesToProcess) {
                    try {
                        let processed = file;
                        if (typeof convertHeicToJpg === 'function') {
                            processed = await convertHeicToJpg(file);
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const dataUrl = ev.target.result;
                            const parts = dataUrl.split(',');
                            const mimeMatch = parts[0].match(/:(.*?);/);
                            if (!mimeMatch || !parts[1]) return;
                            fpUploadedPhotos.push({
                                base64: parts[1],
                                mimeType: mimeMatch[1],
                                dataUrl
                            });
                            fpRenderPreview();
                        };
                        reader.readAsDataURL(processed);
                    } catch (err) {
                        console.error("File processing error:", err);
                    }
                }

                fpUploadInput.value = '';
            });
        }
        if (fpStyleOptions) {
            if (typeof setupOptionButtons === 'function') {
                setupOptionButtons(fpStyleOptions);
            }
            fpStyleOptions.addEventListener('click', () => {
                const selected = fpStyleOptions.querySelector('.selected');
                const isCustom = selected?.dataset.value === 'custom';
                if (fpCustomStyleContainer) {
                    fpCustomStyleContainer.classList.toggle('hidden', !isCustom);
                }
                if (isCustom && fpCustomStyleInput) {
                    fpCustomStyleInput.focus();
                }
            });
        }
        if (fpRatioOptions) {
            if (typeof setupOptionButtons === 'function') {
                setupOptionButtons(fpRatioOptions);
            }
        }
        if (fpGenerateBtn) {
            fpUpdateGenerateState();
            fpGenerateBtn.addEventListener('click', async () => {
                if (fpUploadedPhotos.length < 1) {
                    return;
                }
                const originalBtnHTML = fpGenerateBtn.innerHTML;
                const count = fpCountSlider ? parseInt(fpCountSlider.value) : 1;
                if (fpResultsPlaceholder) fpResultsPlaceholder.classList.add('hidden');
                if (fpResultsGrid) {
                    fpResultsGrid.classList.remove('hidden');
                    fpResultsGrid.innerHTML = '';
                    fpResultsGrid.className = `grid ${getResultGridCols(count)} gap-4`;
                }
                fpGenerateBtn.disabled = true;
                fpGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Sedang Meracik...</span>`;
                fpGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');

                const base64ToBlob = (base64, mimeType) => {
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    return new Blob([byteArray], { type: mimeType });
                };

                const selectedStyle = fpStyleOptions?.querySelector('.selected')?.dataset.value || 'classic';
                const selectedRatio = fpRatioOptions?.querySelector('.selected')?.dataset.value || '1:1';
                const customStyleValue = fpCustomStyleInput?.value.trim();
                let styleDesc = "";
                if (selectedStyle === 'classic') styleDesc = "Classic Polaroid Collage (clean instant frames, balanced spacing, timeless look)";
                else if (selectedStyle === 'vintage') styleDesc = "Vintage Polaroid Collage (aged paper tone, film grain, nostalgic warmth)";
                else if (selectedStyle === 'minimal') styleDesc = "Minimal Polaroid Collage (simple layout, clean background, airy composition)";
                else if (selectedStyle === 'warm') styleDesc = "Warm Tone Polaroid Collage (golden highlights, cozy feel, soft contrast)";
                else if (selectedStyle === 'pastel') styleDesc = "Pastel Polaroid Collage (soft pastel palette, gentle shadows, dreamy mood)";
                else if (selectedStyle === 'retro') styleDesc = "Retro Film Polaroid Collage (retro color cast, film texture, playful vibe)";
                else if (selectedStyle === 'travel') styleDesc = "Travel Polaroid Collage (adventure mood, postcard vibe, candid framing)";
                else if (selectedStyle === 'wedding') styleDesc = "Wedding Polaroid Collage (romantic tone, elegant spacing, soft highlights)";
                else if (selectedStyle === 'scrapbook') styleDesc = "Scrapbook Polaroid Collage (handmade texture, tape accents, craft feel)";
                else if (selectedStyle === 'modern') styleDesc = "Modern Polaroid Collage (clean geometry, contemporary layout, crisp edges)";
                else if (selectedStyle === 'custom') styleDesc = customStyleValue ? `Custom Polaroid Collage (${customStyleValue})` : "Custom Polaroid Collage";
                else styleDesc = "Polaroid Collage";

                let conceptText = '';
                if (fpAiToggle?.checked && fpConceptText) {
                    const rawConcept = fpConceptText.textContent.trim();
                    if (rawConcept && !rawConcept.toLowerCase().includes('konsep akan muncul')) {
                        conceptText = rawConcept;
                    }
                }

                const generationPromises = Array.from({ length: count }, (_, index) => {
                    const card = document.createElement('div');
                    const aspectClass = typeof getAspectRatioClass === 'function' ? getAspectRatioClass(selectedRatio) : 'aspect-square';
                    card.className = `rounded-2xl border border-slate-200 shadow-none overflow-hidden bg-white flex flex-col items-center justify-center ${aspectClass}`;
                    card.innerHTML = `<div class="flex flex-col items-center justify-center gap-3"><div class="spinner"></div><span class="text-xs font-medium text-slate-400 animate-pulse">Sedang Memproses...</span></div>`;
                    if (fpResultsGrid) fpResultsGrid.appendChild(card);
                    return (async () => {
                        try {
                            let prompt = `Create a single high-quality polaroid collage using ALL the ${fpUploadedPhotos.length} images provided.
Style: ${styleDesc}.
Aspect Ratio: ${selectedRatio}.
The result should be a professional, visually appealing polaroid collage with white borders and natural photo feel.
This is variation ${index + 1}.`;
                            if (conceptText) {
                                prompt += ` AI Concept: ${conceptText}.`;
                            }
                            const formData = new FormData();
                            fpUploadedPhotos.forEach((photo) => {
                                formData.append('images[]', base64ToBlob(photo.base64, photo.mimeType));
                            });
                            formData.append('instruction', prompt);
                            formData.append('aspectRatio', selectedRatio);
                            
                            const generateUrl = typeof GENERATE_URL !== 'undefined' ? GENERATE_URL : '/generate';
                            const apiKey = typeof API_KEY !== 'undefined' ? API_KEY : '';

                            const response = await fetch(`${generateUrl}`, {
                                method: 'POST',
                                headers: {
                                    'X-API-Key': apiKey
                                },
                                body: formData
                            });
                            
                            if (!response.ok) {
                                let errorMessage = "Gagal memproses gambar.";
                                if (typeof getApiErrorMessage === 'function') {
                                    errorMessage = await getApiErrorMessage(response);
                                }
                                throw new Error(errorMessage);
                            }
                            
                            const result = await response.json();
                            let imageUrl = result.imageUrl;
                            if (!imageUrl) throw new Error("Gagal membuat polaroid (No URL returned).");
                            if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                                imageUrl = `data:image/png;base64,${imageUrl}`;
                            }
                            const previewFn = `window.openTiImagePreview('${imageUrl}')`;
                            card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${typeof getAspectRatioClass === 'function' ? getAspectRatioClass(selectedRatio) : ''}`;
                            card.innerHTML = `
                                        <div class="relative w-full h-full group">
                                            <img src="${imageUrl}" class="w-full h-full object-cover" alt="Polaroid ${index + 1}">
                                            <div class="absolute bottom-2 right-2 flex gap-2">
                                                <button onclick="${previewFn}" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Lihat Fullscreen">
                                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                                </button>
                                                <a href="${imageUrl}" download="foto_polaroid_${Date.now()}_${index + 1}.png" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Unduh Gambar">
                                                    <i data-lucide="download" class="w-4 h-4"></i>
                                                </a>
                                            </div>
                                        </div>`;
                            if (typeof doneSound !== 'undefined') doneSound.play();
                        } catch (error) {
                            if (typeof errorSound !== 'undefined') errorSound.play();
                            card.innerHTML = `<div class="flex flex-col items-center justify-center p-4 text-center h-full"><i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mb-2"></i><p class="text-xs text-red-500 break-words w-full">${error.message}</p></div>`;
                        } finally {
                            if (lucide && lucide.createIcons) lucide.createIcons();
                        }
                    })();
                });

                try {
                    await Promise.allSettled(generationPromises);
                } finally {
                    fpGenerateBtn.disabled = false;
                    fpGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
                    fpGenerateBtn.innerHTML = originalBtnHTML;
                    if (lucide && lucide.createIcons) lucide.createIcons();
                }
            });
        }
    }
}
