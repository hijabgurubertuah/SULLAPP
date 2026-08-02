window.initFotoKolase = function (ctx = {}) {
    const {
        document,
        lucide,
        convertHeicToJpg,
        base64ToBlob,
        GENERATE_URL,
        API_KEY,
        getApiErrorMessage,
        doneSound
    } = ctx;

    const fkUploadInput = document.getElementById('fk-upload-input');
    const fkPreviewGrid = document.getElementById('fk-preview-grid');
    const fkStyleOptions = document.getElementById('fk-style-options');
    const fkRatioOptions = document.getElementById('fk-ratio-options');
    const fkGenerateBtn = document.getElementById('fk-generate-btn');
    const fkResultsPlaceholder = document.getElementById('fk-results-placeholder');
    const fkResultsGrid = document.getElementById('fk-results-grid');
    const fkTextInput = document.getElementById('fk-text-input');
    const fkCountSlider = document.getElementById('fk-count-slider');
    const fkCountValue = document.getElementById('fk-count-value');

    let uploadedPhotos = [];

    if (fkCountSlider && fkCountValue) {
        fkCountSlider.addEventListener('input', (e) => {
            fkCountValue.textContent = e.target.value;
        });
    }

    if (fkUploadInput) {
        fkUploadInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            if (uploadedPhotos.length + files.length > 5) {
                alert("Maksimal 5 foto.");
                return;
            }

            for (const file of files) {
                try {
                    const processed = await convertHeicToJpg(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        uploadedPhotos.push(ev.target.result);
                        updateFkPreview();
                    };
                    reader.readAsDataURL(processed);
                } catch (err) {
                    console.error("File processing error:", err);
                }
            }
        });
    }

    function updateFkPreview() {
        if (!fkPreviewGrid) return;
        fkPreviewGrid.innerHTML = '';
        if (uploadedPhotos.length > 0) {
            fkPreviewGrid.classList.remove('hidden');
            uploadedPhotos.forEach((src, idx) => {
                const div = document.createElement('div');
                div.className = 'relative aspect-square rounded-lg overflow-hidden border border-slate-200 group';
                div.innerHTML = `
                        <img src="${src}" class="w-full h-full object-cover">
                        <button onclick="removeFkPhoto(${idx})" class="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    `;
                fkPreviewGrid.appendChild(div);
            });
            if (lucide) lucide.createIcons();
        } else {
            fkPreviewGrid.classList.add('hidden');
        }
    }

    window.removeFkPhoto = (index) => {
        uploadedPhotos.splice(index, 1);
        updateFkPreview();
    };

    [fkStyleOptions, fkRatioOptions].forEach(parent => {
        if (parent) {
            parent.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn) {
                    parent.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            });
        }
    });

    if (fkGenerateBtn) {
        fkGenerateBtn.addEventListener('click', async () => {
            if (uploadedPhotos.length < 2) {
                alert("Mohon unggah minimal 2 foto.");
                return;
            }

            const count = fkCountSlider ? parseInt(fkCountSlider.value) : 1;
            const originalBtnHTML = fkGenerateBtn.innerHTML;
            const originalBtnStyle = fkGenerateBtn.style.background;

            if (fkResultsPlaceholder) fkResultsPlaceholder.classList.add('hidden');
            if (fkResultsGrid) {
                fkResultsGrid.classList.remove('hidden');
                fkResultsGrid.innerHTML = `
                        <div id="fk-cards-area" class="grid ${getResultGridCols(count)} gap-6 w-full mt-4"></div>
                    `;
            }

            const fkCardsArea = document.getElementById('fk-cards-area');
            const fkMainLoader = document.getElementById('fk-main-loader');

            fkGenerateBtn.disabled = true;
            fkGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Sedang Meracik...</span>`;
            fkGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');

            for (let i = 0; i < count; i++) {
                const card = document.createElement('div');
                const ratio = fkRatioOptions.querySelector('.selected').dataset.value;
                let aspectClass = 'aspect-square';
                if (ratio === '16:9') aspectClass = 'aspect-video';
                else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                else if (ratio === '16:9') aspectClass = 'aspect-video';
                else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                else if (ratio === 'auto' || ratio === 'Auto') aspectClass = 'aspect-auto min-h-[300px]';

                card.className = `card bg-gray-50 border border-gray-200 flex flex-col items-center justify-center w-full ${aspectClass} rounded-2xl animate-pulse`;
                card.innerHTML = `<div class="spinner"></div>`;
                if (fkCardsArea) fkCardsArea.appendChild(card);
            }
            if (lucide) lucide.createIcons();

            const generateCollage = async (index) => {
                if (!fkCardsArea) return;
                const card = fkCardsArea.children[index];
                try {
                    const style = fkStyleOptions.querySelector('.selected').dataset.value;
                    const ratio = fkRatioOptions.querySelector('.selected').dataset.value;
                    const textVal = fkTextInput.value.trim();


                    let styleDesc = "";
                    if (style === 'modern') styleDesc = "Modern Stack Collage (dynamic overlapping layers with artistic shadows and depth)";
                    else if (style === 'retro') styleDesc = "Retro Film Collage (film strip style with sprocket holes, grainy texture, cinematic feel)";
                    else if (style === 'free') styleDesc = "Free Form Creative Collage (artistic scattered arrangement with varying sizes and angles)";
                    else if (style === 'polaroid') styleDesc = "Polaroid Style Collage (instant camera frames with white borders, slightly tilted, scattered on surface)";
                    else if (style === 'scrapbook') styleDesc = "Scrapbook Style Collage (handmade aesthetic with tape, stickers, decorative elements, paper textures)";
                    else if (style === 'magazine') styleDesc = "Magazine Editorial Collage (high fashion layout, bold typography spaces, clean professional cuts)";
                    else if (style === 'aesthetic') styleDesc = "Aesthetic Mood Board Collage (soft colors, dreamy vibes, harmonious color palette, Pinterest style)";
                    else if (style === 'mosaic') styleDesc = "Mosaic Tile Collage (small uniform tiles creating a larger cohesive image pattern)";
                    else if (style === 'minimalist') styleDesc = "Minimalist Clean Collage (generous white space, simple arrangement, elegant and modern)";
                    else if (style === 'vintage') styleDesc = "Vintage Postcard Collage (aged paper, sepia tones, nostalgic stamps and postmarks aesthetic)";

                    let prompt = `Create a single high-quality photo collage using ALL the ${uploadedPhotos.length} images provided.
                            Style: ${styleDesc}.
                            Aspect Ratio: ${ratio}.
                            ${textVal ? `Add this text artistically: "${textVal}"` : ""}
                            The result should be a professional, visually appealing collage that combines all images seamlessly into one single output image.
                            This is variation ${index + 1}.`;

                    const formData = new FormData();

                    uploadedPhotos.forEach(dataUrl => {
                        const matches = dataUrl.match(/^data:(.+?);base64,(.+)$/);
                        if (matches) {
                            formData.append('images[]', base64ToBlob(matches[2], matches[1]));
                        }
                    });

                    formData.append('instruction', prompt);
                    if (ratio && ratio !== 'auto' && ratio !== 'Auto') {
                        formData.append('aspectRatio', ratio);
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
                        const previewFn = `window.openTiImagePreview('${imageUrl}')`;

                        card.className = `card overflow-hidden relative bg-white flex items-center justify-center w-full rounded-2xl shadow-sm group ${ratio === 'auto' ? 'aspect-auto' : ''}`;
                        card.style.aspectRatio = ratio === 'auto' ? 'auto' : '';
                        card.innerHTML = `
                                        <img src="${imageUrl}" class="w-full h-full object-contain">
                                        <div class="absolute bottom-3 right-3 flex gap-2">
                                            <button onclick="${previewFn}" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Lihat Fullscreen">
                                                <i data-lucide="eye" class="w-4 h-4"></i>
                                            </button>
                                            <a href="${imageUrl}" download="foto_kolase_${Date.now()}.png" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Unduh Gambar">
                                                <i data-lucide="download" class="w-4 h-4"></i>
                                            </a>
                                        </div>
                                    `;
                    } else {
                        throw new Error("Gagal membuat kolase (No URL returned).");
                    }

                } catch (error) {
                    console.error(`Error collage ${index}:`, error);
                    card.innerHTML = `<div class="flex flex-col items-center justify-center p-4 text-center h-full"><i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mb-2"></i><p class="text-xs text-red-500 break-words w-full">${error.message}</p></div>`;
                    card.classList.remove('animate-pulse');
                } finally {
                    if (lucide) lucide.createIcons();
                }
            };

            const promises = [];
            for (let i = 0; i < count; i++) {
                promises.push(generateCollage(i));
            }

            await Promise.allSettled(promises);

            if (fkMainLoader) fkMainLoader.classList.add('hidden');

            fkGenerateBtn.disabled = false;
            fkGenerateBtn.innerHTML = originalBtnHTML;
            fkGenerateBtn.style.background = originalBtnStyle;
            fkGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
            if (typeof doneSound !== 'undefined') doneSound.play();
        });
    }
};
