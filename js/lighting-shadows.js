window.initLightingShadows = function (ctx) {
    const {
        document,
        setupImageUpload,
        setupOptionButtons,
        updateSliderProgress,
        getAspectRatioClass,
        autoSelectClosestRatio,
        lucide,
        getApiKey,
        GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound
    } = ctx;

    const lsImageInput = document.getElementById('ls-image-input');
    const lsUploadBox = document.getElementById('ls-upload-box');
    const lsPreview = document.getElementById('ls-preview');
    const lsPlaceholder = document.getElementById('ls-placeholder');
    const lsRemoveBtn = document.getElementById('ls-remove-btn');
    const lsCountSlider = document.getElementById('ls-count-slider');
    const lsCountDisplay = document.getElementById('ls-count-display');
    const lsRatioOptions = document.getElementById('ls-ratio-options');
    const lsDirectionOptions = document.getElementById('ls-direction-options');
    const lsLightTypeOptions = document.getElementById('ls-light-type-options');
    const lsShadowOptions = document.getElementById('ls-shadow-options');
    const lsParticlesOptions = document.getElementById('ls-particles-options');
    const lsDofOptions = document.getElementById('ls-dof-options');
    const lsAdditionalInstruction = document.getElementById('ls-additional-instruction');
    const lsGenerateBtn = document.getElementById('ls-generate-btn');
    const lsResultsContainer = document.getElementById('ls-results-container');
    const lsResultsGrid = document.getElementById('ls-results-grid');
    let lsImageData = null;

    const directionPrompts = {
        'front': 'Front-facing key light: soft, even illumination from the camera direction. Minimizes shadows on the subject for a clean, balanced look.',
        'side': 'Side lighting (Rembrandt-style): the main light source comes from the side, creating strong dimension, sculpting form, and dramatic shadow falloff on the opposite side of the product.',
        'back': 'Backlight / rim lighting: the main light source is behind the product, creating a glowing edge halo, separating the subject from the background, and producing long shadows toward the camera.'
    };

    const lightTypePrompts = {
        'golden-hour': 'Warm golden hour sunlight (late afternoon), soft amber and orange tones, long warm shadows, cinematic warm color grading, hazy gold rim light.',
        'hard-sunlight': 'Harsh midday sun, very hard contrasty lighting, crisp dark shadows with sharp edges, high dynamic range, sun-baked vibrant highlights, clear deep blue sky color cast.',
        'soft-studio': 'Soft studio lighting with large softbox, very even and diffused, smooth gradient shadows, neutral white balance, professional commercial product photography look.',
        'moody': 'Moody cinematic lighting, low-key dramatic ambience, deep rich shadows, single directional light source, teal-and-orange color grade, fine film grain, mysterious atmosphere.'
    };

    const shadowPrompts = {
        'none': '',
        'palm-leaves': 'Aesthetic palm leaf shadow gobo cast across the product and background, dappled tropical leaf silhouettes, organic foliage shadow pattern.',
        'window-blinds': 'Horizontal venetian window blind shadow stripes cast across the product and background, classic film-noir slatted light pattern.',
        'window-frame': 'Soft window frame shadow with cross/grid pane silhouette projected onto the product and background, golden window light shape.'
    };

    const particlePrompts = {
        'none': '',
        'dust-motes': 'Subtle floating dust motes / dust particles softly illuminated and drifting through the light beams, adding airy realism.',
        'magic-dust': 'Glowing magical dust particles and tiny bokeh sparkles floating through the air around the product, dreamy luminous specks for a dramatic feel.'
    };

    const dofPrompts = {
        'sharp': 'Deep depth of field, the entire scene is sharply in focus from foreground to background.',
        'medium-bokeh': 'Medium depth of field, the product is sharply in focus while the background has gentle natural bokeh blur.',
        'strong-bokeh': 'Very shallow depth of field, the product is razor-sharp while the background dissolves into smooth creamy bokeh with luminous out-of-focus highlights.'
    };

    function lsUpdateButtons() {
        if (lsGenerateBtn) {
            lsGenerateBtn.disabled = !lsImageData;
        }
    }

    if (lsCountSlider) {
        lsCountSlider.addEventListener('input', () => {
            if (lsCountDisplay) lsCountDisplay.textContent = `${lsCountSlider.value} Gambar`;
            updateSliderProgress(lsCountSlider);
        });
        updateSliderProgress(lsCountSlider);
    }

    setupImageUpload(lsImageInput, lsUploadBox, (data) => {
        lsImageData = data;
        lsPreview.src = data.dataUrl;
        lsPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, lsRatioOptions);
        lsPreview.classList.remove('hidden');
        lsRemoveBtn.classList.remove('hidden');
        lsUpdateButtons();
    });

    if (lsRemoveBtn) {
        lsRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            lsImageData = null;
            lsImageInput.value = '';
            lsPreview.src = '#';
            lsPreview.classList.add('hidden');
            lsPlaceholder.classList.remove('hidden');
            lsRemoveBtn.classList.add('hidden');
            const resultsPlaceholder = document.getElementById('ls-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            lsResultsContainer.classList.add('hidden');
            lsResultsGrid.innerHTML = '';
            lsUpdateButtons();
        });
    }

    [lsRatioOptions, lsDirectionOptions, lsLightTypeOptions, lsShadowOptions, lsParticlesOptions, lsDofOptions]
        .forEach(group => { if (group) setupOptionButtons(group); });

    function getSelectedValue(group, fallback) {
        if (!group) return fallback;
        const sel = group.querySelector('.selected');
        return sel ? sel.dataset.value : fallback;
    }

    function buildPrompt({ direction, lightType, shadow, particles, dof, additional }) {
        const parts = [];
        parts.push('Re-light this product photograph with a new lighting and shadow setup while perfectly preserving the original product.');
        parts.push('');
        parts.push('CRITICAL PRODUCT PRESERVATION:');
        parts.push('- Keep the exact same product: identical shape, proportions, colors, materials, textures, labels, logos, and any text on the product.');
        parts.push('- Do NOT redesign, redraw, deform, or replace the product. Do NOT alter its branding.');
        parts.push('- Maintain the original product orientation and pose unless physics of the new lighting demand a slightly different highlight position.');
        parts.push('');
        parts.push('LIGHTING DIRECTION:');
        parts.push(`- ${directionPrompts[direction] || directionPrompts.front}`);
        parts.push('');
        parts.push('LIGHT TYPE / MOOD:');
        parts.push(`- ${lightTypePrompts[lightType] || lightTypePrompts['soft-studio']}`);
        parts.push('');

        if (shadow && shadow !== 'none' && shadowPrompts[shadow]) {
            parts.push('SHADOW OVERLAY / GOBO:');
            parts.push(`- ${shadowPrompts[shadow]}`);
            parts.push('- The gobo shadow should fall naturally across the product surface AND onto the background/floor, consistent with the chosen light direction.');
            parts.push('');
        }

        if (particles && particles !== 'none' && particlePrompts[particles]) {
            parts.push('AIR PARTICLES:');
            parts.push(`- ${particlePrompts[particles]}`);
            parts.push('');
        }

        parts.push('DEPTH OF FIELD:');
        parts.push(`- ${dofPrompts[dof] || dofPrompts['medium-bokeh']}`);
        parts.push('');

        parts.push('OUTPUT REQUIREMENTS:');
        parts.push('- Photorealistic, professional commercial product photography quality.');
        parts.push('- Physically accurate shadows, reflections, and highlights consistent with the chosen light direction and type.');
        parts.push('- Clean, polished result with no visible artifacts.');

        if (additional) {
            parts.push('');
            parts.push('ADDITIONAL INSTRUCTIONS:');
            parts.push(`- ${additional}`);
        }

        return parts.join('\n');
    }

    if (lsGenerateBtn) {
        lsGenerateBtn.addEventListener('click', async () => {
            if (!lsImageData) return;
            const originalBtnHTML = lsGenerateBtn.innerHTML;
            lsGenerateBtn.disabled = true;

            const count = parseInt(lsCountSlider.value) || 1;
            const direction = getSelectedValue(lsDirectionOptions, 'front');
            const lightType = getSelectedValue(lsLightTypeOptions, 'soft-studio');
            const shadow = getSelectedValue(lsShadowOptions, 'none');
            const particles = getSelectedValue(lsParticlesOptions, 'none');
            const dof = getSelectedValue(lsDofOptions, 'medium-bokeh');
            const additional = lsAdditionalInstruction ? lsAdditionalInstruction.value.trim() : '';
            const aspectRatio = getSelectedValue(lsRatioOptions, '1:1');
            const aspectClass = getAspectRatioClass(aspectRatio);

            lsGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat (0/${count})</span>`;

            const resultsPlaceholder = document.getElementById('ls-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
            lsResultsContainer.classList.remove('hidden');
            lsResultsGrid.innerHTML = '';
            lsResultsGrid.className = `grid ${window.getResultGridCols ? window.getResultGridCols(count) : 'grid-cols-1'} gap-5`;

            for (let i = 1; i <= count; i++) {
                const card = document.createElement('div');
                card.id = `ls-card-${i}`;
                card.className = `rounded-2xl border border-slate-200 shadow-none overflow-hidden bg-white flex flex-col items-center justify-center ${aspectClass}`;
                card.innerHTML = `
                    <div class="flex flex-col items-center justify-center gap-3">
                        <div class="spinner"></div>
                        <span class="text-xs font-medium text-slate-400 animate-pulse">Sedang Memproses...</span>
                    </div>`;
                lsResultsGrid.appendChild(card);
            }
            lucide.createIcons();

            const prompt = buildPrompt({ direction, lightType, shadow, particles, dof, additional });

            try {
                let done = 0;
                const tasks = [];
                for (let i = 1; i <= count; i++) {
                    tasks.push(
                        generateSingle(i, lsImageData, prompt, aspectRatio).then(() => {
                            done += 1;
                            const span = lsGenerateBtn.querySelector('span');
                            if (span) span.textContent = `Membuat (${done}/${count})`;
                        })
                    );
                }
                await Promise.allSettled(tasks);
            } catch (error) {
                console.error('Error during Lighting & Shadows generation:', error);
                lsResultsGrid.innerHTML = `<div class="col-span-1 text-center py-10 text-red-500"><p class="break-all">Terjadi kesalahan: ${error.message}</p></div>`;
            } finally {
                lsGenerateBtn.disabled = false;
                lsGenerateBtn.innerHTML = originalBtnHTML;
                lucide.createIcons();
            }
        });
    }

    async function generateSingle(id, imageData, prompt, aspectRatio) {
        const card = document.getElementById(`ls-card-${id}`);
        try {
            const base64ToBlob = (base64, mimeType) => {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
            };

            const formData = new FormData();
            formData.append('images[]', base64ToBlob(imageData.base64, imageData.mimeType));
            formData.append('instruction', prompt);
            formData.append('aspectRatio', aspectRatio);

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                cache: 'no-store',
                headers: { 'X-API-Key': getApiKey() },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();
            if (!result.success || !result.imageUrl) throw new Error('No image data received from API.');

            const imageUrl = result.imageUrl;
            const title = `Lighting & Shadows #${id}`;
            card.innerHTML = `
                <div class="relative w-full h-full group">
                    <img src="${imageUrl}" class="w-full h-full object-cover" alt="${title}">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <h4 class="absolute bottom-2 left-3 text-white font-bold text-sm pointer-events-none drop-shadow-md">${title}</h4>
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${imageUrl}" download="lighting_shadows_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>`;
            card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio)}`;
            if (doneSound) doneSound.play();
        } catch (error) {
            if (errorSound) errorSound.play();
            console.error(`Error for Lighting & Shadows card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }

    return {
        setLsImageData: (data) => {
            lsImageData = data;
            lsPreview.src = data.dataUrl;
            lsPlaceholder.classList.add('hidden');
            lsPreview.classList.remove('hidden');
            lsRemoveBtn.classList.remove('hidden');
            lsUpdateButtons();
        }
    };
};
