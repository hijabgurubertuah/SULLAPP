window.initRetouchWajah = function ({
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
    const prImageInput = document.getElementById('pr-image-input');
    const prUploadBox = document.getElementById('pr-upload-box');
    const prPreview = document.getElementById('pr-preview');
    const prPlaceholder = document.getElementById('pr-placeholder');
    const prRemoveBtn = document.getElementById('pr-remove-btn');
    const prGenerateBtn = document.getElementById('pr-generate-btn');
    const prResultsContainer = document.getElementById('pr-results-container');
    const prPresetOptions = document.getElementById('pr-preset-options');
    const prManualOptions = document.getElementById('pr-panel-manual');
    const prRatioOptions = document.getElementById('pr-ratio-options');
    const prExtraInput = document.getElementById('pr-extra-input');
    const prResultCountSlider = document.getElementById('pr-result-count-slider');
    const prResultCountDisplay = document.getElementById('pr-result-count-display');

    if (prResultCountSlider && prResultCountDisplay) {
        prResultCountSlider.addEventListener('input', function() {
            prResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    const prDownloadLink = document.getElementById('pr-download-link');
    const prDownloadSection = document.getElementById('pr-download-section');
    let prImageData = null;
    let prCurrentMode = 'auto';

    function switchRetouchTab(mode) {
        prCurrentMode = mode;
        ['auto', 'preset', 'manual', 'clean'].forEach(m => {
            const tab = document.getElementById(`pr-tab-${m}`);
            const panel = document.getElementById(`pr-panel-${m}`);
            if (tab) tab.classList.toggle('selected', m === mode);
            if (panel) panel.classList.toggle('hidden', m !== mode);
        });
    }

    ['auto', 'preset', 'manual', 'clean'].forEach(mode => {
        const tab = document.getElementById(`pr-tab-${mode}`);
        if (tab) {
            tab.addEventListener('click', () => switchRetouchTab(mode));
        }
    });

    if (prPresetOptions) setupOptionButtons(prPresetOptions);
    if (prManualOptions) setupOptionButtons(prManualOptions, true);
    if (prRatioOptions) setupOptionButtons(prRatioOptions);

    if (prRatioOptions) {
        prRatioOptions.addEventListener('click', () => {
            const selected = prRatioOptions.querySelector('.selected');
            if (selected && !prResultsContainer.classList.contains('hidden')) {
                applyPrAspectRatio(selected.dataset.value);
            }
        });
    }

    setupImageUpload(prImageInput, prUploadBox, (data) => {
        prImageData = data;
        prPreview.src = data.dataUrl;
        prPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, prRatioOptions);
        prPreview.classList.remove('hidden');
        prRemoveBtn.classList.remove('hidden');
        prGenerateBtn.disabled = false;
    });

    prRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prImageData = null;
        prImageInput.value = '';
        prPreview.src = '#';
        prPreview.classList.add('hidden');
        prPlaceholder.classList.remove('hidden');
        prRemoveBtn.classList.add('hidden');
        prGenerateBtn.disabled = true;
        const placeholder = document.getElementById('pr-results-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
        prResultsContainer.classList.add('hidden');
        prDownloadSection.classList.add('hidden');
        prResultsContainer.innerHTML = '';
    });

    function initBeforeAfterSlider(container, beforeSrc, afterSrc) {
        container.innerHTML = `
            <div class="ba-slider-container">
                <img src="${afterSrc}" class="ba-image-img" style="z-index: 1;">
                <div class="ba-resize-div" style="position: absolute; top: 0; left: 0; height: 100%; width: 50%; overflow: hidden; z-index: 2; border-right: 2px solid white;">
                    <img src="${beforeSrc}" class="ba-image-img" style="width: ${container.clientWidth}px; max-width: none;">
                </div>
                <div class="ba-slider-handle" style="left: 50%;">
                    <div class="ba-slider-circle"><i data-lucide="move-horizontal" class="w-4 h-4 text-slate-600"></i></div>
                </div>
                <div class="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-20">Before</div>
                <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-20">After</div>
            </div>
        `;
        if (lucide) lucide.createIcons();
        const slider = container.querySelector('.ba-slider-container');
        const resizeDiv = container.querySelector('.ba-resize-div');
        const handle = container.querySelector('.ba-slider-handle');
        const beforeImg = resizeDiv.querySelector('img');

        const updateWidths = () => {
            if (beforeImg && container) {
                beforeImg.style.width = `${container.clientWidth}px`;
            }
        };
        window.addEventListener('resize', updateWidths);

        const move = (e) => {
            const rect = slider.getBoundingClientRect();
            let x = (e.clientX || e.touches[0].clientX) - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const percent = (x / rect.width) * 100;
            resizeDiv.style.width = `${percent}%`;
            handle.style.left = `${percent}%`;
        };
        slider.addEventListener('mousemove', move);
        slider.addEventListener('touchmove', move);
    }

    const prAspectRatioClasses = ['aspect-square', 'aspect-[3/4]', 'aspect-[4/3]', 'aspect-video', 'aspect-[9/16]'];

    function applyPrAspectRatio(ratio) {
        const aspectClass = getAspectRatioClass(ratio);
        prResultsContainer.classList.remove(...prAspectRatioClasses);
        prResultsContainer.classList.add(aspectClass);
        requestAnimationFrame(() => {
            const beforeImg = prResultsContainer.querySelector('.ba-resize-div img');
            if (beforeImg) {
                beforeImg.style.width = `${prResultsContainer.clientWidth}px`;
            }
        });
    }

    prGenerateBtn.addEventListener('click', async () => {
        const originalText = prGenerateBtn.innerHTML;
        prGenerateBtn.disabled = true;
        prGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Mempermak Wajah...</span>`;

        try {
            let prompt = "";
            const baseInstruction = "High-end professional beauty retouch. Maintain skin texture realism (do not blur excessively). ";
            
            if (prCurrentMode === 'auto') {
                prompt = baseInstruction + "Automatically smooth skin, even out skin tone, remove redness/oil/minor blemishes, sharpen eyes, and subtly brighten the face. Keep it natural.";
            } else if (prCurrentMode === 'preset') {
                const selectedPreset = prPresetOptions.querySelector('.selected');
                const preset = selectedPreset ? selectedPreset.dataset.value : 'Soft Beauty';
                
                if (preset === 'Soft Beauty') prompt = baseInstruction + "Soft beauty style. Keep freckles if any, soft skin, very natural look.";
                else if (preset === 'Korean Glass Skin') prompt = baseInstruction + "Korean glass skin effect. Dewy finish, glowing skin, soft facial contouring, soft gradient lips.";
                else if (preset === 'Glam & Model') prompt = baseInstruction + "Glamour model look. Sharp jawline, piercing eyes, high contrast professional lighting, flawless makeup.";
                else if (preset === 'Baby Face') prompt = baseInstruction + "Baby face effect. Make the face look younger, softer, smoother, slightly rounder features.";
                else if (preset === 'Manly Edition') prompt = baseInstruction + "Male grooming retouch. Define jawline, subtle skin smoothing while keeping masculine texture, remove fatigue signs.";
            } else if (prCurrentMode === 'manual') {
                const features = Array.from(prManualOptions.querySelectorAll('.selected')).map(b => b.dataset.feature).join(', ');
                if (!features) throw new Error("Pilih setidaknya satu fitur manual.");
                prompt = baseInstruction + `Apply these specific adjustments: ${features}.`;
            } else if (prCurrentMode === 'clean') {
                prompt = baseInstruction + "Dermatological cleanup. Strictly focus on removing acne, pimples, blackheads, whiteheads, small scars, and dark spots. Do not alter facial structure or makeup.";
            }

            const extraInstruction = (prExtraInput?.value || '').trim();
            if (extraInstruction) {
                prompt = `${prompt} Additional instructions: ${extraInstruction}.`;
            }

            const base64ToBlob = (base64, mimeType) => {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], {
                    type: mimeType
                });
            };

            const formData = new FormData();
            formData.append('images[]', base64ToBlob(prImageData.base64, prImageData.mimeType));
            formData.append('instruction', prompt);

            const selectedRatioBtn = prRatioOptions.querySelector('.selected');
            const aspectRatio = selectedRatioBtn ? selectedRatioBtn.dataset.value : '1:1';
            formData.append('aspectRatio', aspectRatio);

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (!result.success || !result.imageUrl) throw new Error("No image data.");

            let resultUrl = result.imageUrl;
            if (!resultUrl.startsWith('http') && !resultUrl.startsWith('data:')) {
                resultUrl = `data:image/png;base64,${resultUrl}`;
            }

            const placeholder = document.getElementById('pr-results-placeholder');
            if (placeholder) placeholder.classList.add('hidden');
            
            prResultsContainer.classList.remove('hidden');
            prDownloadSection.classList.remove('hidden');
            applyPrAspectRatio(aspectRatio);
            initBeforeAfterSlider(prResultsContainer, prImageData.dataUrl, resultUrl);
            
            prDownloadLink.href = resultUrl;
            prDownloadLink.download = `retouch_wajah_${Date.now()}.png`;
            doneSound.play();
        } catch (error) {
            errorSound.play();
            alert(`${error.message}`);
        } finally {
            prGenerateBtn.disabled = false;
            prGenerateBtn.innerHTML = originalText;
            if (lucide) lucide.createIcons();
        }
    });
};