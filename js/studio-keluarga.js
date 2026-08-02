window.initStudioKeluarga = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    generatePhotographerImage,
    getImageAspectRatio,
    getClosestStandardRatio
}) {
    const skInput = document.getElementById('sk-upload-input');
    const skUploadBox = document.getElementById('sk-upload-box');
    const skPlaceholder = document.getElementById('sk-placeholder');
    const skGenerateBtn = document.getElementById('sf-sk-generate-btn');
    
    const skLightingOptions = document.getElementById('sk-lighting-options');
    const skLightingCustomContainer = document.getElementById('sk-lighting-custom-container');
    const skBgOptions = document.getElementById('sk-bg-options');
    const skBgCustomContainer = document.getElementById('sk-bg-custom-container');
    
    const skOutfitToggle = document.getElementById('sk-outfit-toggle');
    const skOutfitSection = document.getElementById('sk-outfit-section');
    const skOutfitOptions = document.getElementById('sk-outfit-options');
    const skOutfitCustomContainer = document.getElementById('sk-outfit-custom-container');
    
    const skFrameOptions = document.getElementById('sk-frame-options');
    const skFrameCustomContainer = document.getElementById('sk-frame-custom-container');
    
    let skImages = [];

    function skUpdateBtn() {
        if (skGenerateBtn) skGenerateBtn.disabled = skImages.length === 0;
    }

    function processSkFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const base64 = dataUrl.split(',')[1];
                const mimeType = file.type || 'image/jpeg';
                resolve({ dataUrl, base64, mimeType });
            };
            reader.readAsDataURL(file);
        });
    }

    function renderSkThumbnails() {
        const grid = document.getElementById('sk-thumbnails-grid');
        if (!grid) return;

        if (skImages.length === 0) {
            grid.classList.add('hidden');
            grid.innerHTML = '';
            if (skPlaceholder) skPlaceholder.classList.remove('hidden');
            if (skUploadBox) skUploadBox.classList.remove('hidden');
            skUpdateBtn();
            return;
        }

        grid.classList.remove('hidden');
        if (skPlaceholder) skPlaceholder.classList.add('hidden');
        if (skUploadBox) skUploadBox.classList.add('hidden');
        grid.innerHTML = '';

        skImages.forEach((img, idx) => {
            const div = document.createElement('div');
            div.className = 'relative rounded-xl overflow-hidden bg-slate-100 aspect-square';
            div.innerHTML = `
                <img src="${img.dataUrl}" class="w-full h-full object-cover">
                <button type="button" data-idx="${idx}" class="sk-remove-thumb absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-all shadow-md z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
            `;
            grid.appendChild(div);
        });

        if (skImages.length < 6) {
            const addCell = document.createElement('label');
            addCell.htmlFor = 'sk-upload-input';
            addCell.className = 'relative rounded-xl aspect-square bg-slate-50 border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50 transition-all flex flex-col items-center justify-center cursor-pointer';
            addCell.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-teal-500"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                <span class="text-[10px] text-slate-500 mt-1 font-medium">Tambah</span>
            `;
            grid.appendChild(addCell);
        }

        skUpdateBtn();
    }

    // Handle file input change (supports multiple)
    if (skInput) {
        skInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            const remaining = 6 - skImages.length;
            const toProcess = files.slice(0, remaining);
            const processed = await Promise.all(toProcess.map(processSkFile));
            skImages.push(...processed);
            skInput.value = '';

            // Auto-detect ratio from first new image if array was empty
            if (skImages.length === processed.length && getImageAspectRatio && getClosestStandardRatio) {
                try {
                    const ratio = await getImageAspectRatio(processed[0]);
                    const closestRatio = getClosestStandardRatio(ratio);
                    document.querySelectorAll('#sk-ratio-options button').forEach(btn => {
                        btn.classList.remove('selected');
                        if (btn.dataset.value === closestRatio) btn.classList.add('selected');
                    });
                } catch (err) { /* ignore */ }
            }

            renderSkThumbnails();
        });
    }

    // Remove individual thumbnail
    const skThumbGrid = document.getElementById('sk-thumbnails-grid');
    if (skThumbGrid) {
        skThumbGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.sk-remove-thumb');
            if (!btn) return;
            const idx = parseInt(btn.dataset.idx);
            skImages.splice(idx, 1);
            renderSkThumbnails();
            if (skImages.length === 0) {
                const resultsPlaceholder = document.getElementById('sk-results-placeholder');
                if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
                const resultsContainer = document.getElementById('sf-sk-results-container');
                if (resultsContainer) resultsContainer.classList.add('hidden');
                const resultsGrid = document.getElementById('sf-sk-results-grid');
                if (resultsGrid) resultsGrid.innerHTML = '';
            }
        });
    }

    // Setup basic option buttons
    setupOptionButtons(skLightingOptions);
    setupOptionButtons(skBgOptions);
    setupOptionButtons(skOutfitOptions);
    setupOptionButtons(document.getElementById('sk-frame-options'));
    setupOptionButtons(document.getElementById('sk-ratio-options'));

    // Setup Custom inputs logic
    if (skLightingOptions) {
        skLightingOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            if (button.dataset.value === 'Kustom') {
                if (skLightingCustomContainer) skLightingCustomContainer.classList.remove('hidden');
            } else {
                if (skLightingCustomContainer) skLightingCustomContainer.classList.add('hidden');
            }
        });
    }

    if (skBgOptions) {
        skBgOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            if (button.dataset.value === 'Kustom') {
                if (skBgCustomContainer) skBgCustomContainer.classList.remove('hidden');
            } else {
                if (skBgCustomContainer) skBgCustomContainer.classList.add('hidden');
            }
        });
    }

    if (skOutfitOptions) {
        skOutfitOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            if (button.dataset.value === 'Kustom') {
                if (skOutfitCustomContainer) skOutfitCustomContainer.classList.remove('hidden');
            } else {
                if (skOutfitCustomContainer) skOutfitCustomContainer.classList.add('hidden');
            }
        });
    }

    if (skFrameOptions) {
        skFrameOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            if (button.dataset.value === 'Kustom') {
                if (skFrameCustomContainer) skFrameCustomContainer.classList.remove('hidden');
            } else {
                if (skFrameCustomContainer) skFrameCustomContainer.classList.add('hidden');
            }
        });
    }

    // Toggle Outfit Section
    if (skOutfitToggle && skOutfitSection) {
        skOutfitToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                skOutfitSection.classList.remove('hidden');
            } else {
                skOutfitSection.classList.add('hidden');
            }
        });
    }

    if (skGenerateBtn) {
        skGenerateBtn.addEventListener('click', async () => {
            if (skImages.length === 0) return;

            // Check for PRO version access - Show VIP upgrade modal
            if (typeof window.IS_VIP_APP !== 'undefined' && window.IS_VIP_APP === false) {
                const upgradeModal = document.getElementById('upgrade-vip-modal');
                if (upgradeModal) {
                    upgradeModal.classList.add('active');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } else if (typeof window.showUpgradeVipPopup === 'function') {
                    window.showUpgradeVipPopup();
                }
                return;
            }

            const resultsPlaceholder = document.getElementById('sk-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
            
            // Get Lighting
            let lighting = 'Professional Studio Lighting';
            const lightingSelected = document.querySelector('#sk-lighting-options .selected');
            if (lightingSelected) {
                lighting = lightingSelected.dataset.value;
                if (lighting === 'Kustom') {
                    const customInput = document.getElementById('sk-lighting-custom-input');
                    lighting = (customInput && customInput.value.trim()) || 'Professional Studio Lighting';
                }
            }

            // Get Background
            let background = 'Seamless White Paper Backdrop';
            const bgSelected = document.querySelector('#sk-bg-options .selected');
            if (bgSelected) {
                background = bgSelected.dataset.value;
                if (background === 'Kustom') {
                    const customInput = document.getElementById('sk-bg-custom-input');
                    background = (customInput && customInput.value.trim()) || 'Professional Studio Background';
                }
            }

            // Get Outfit
            let outfitPrompt = '';
            if (skOutfitToggle && skOutfitToggle.checked) {
                let outfit = 'Matching White Shirts and Blue Jeans';
                const outfitSelected = document.querySelector('#sk-outfit-options .selected');
                if (outfitSelected) {
                    outfit = outfitSelected.dataset.value;
                    if (outfit === 'Kustom') {
                        const customInput = document.getElementById('sk-outfit-custom-input');
                        outfit = (customInput && customInput.value.trim()) || 'Matching elegant clothes';
                    }
                }
                outfitPrompt = `Everyone in the family is wearing: ${outfit}. `;
            }

            // Get Frame
            let framePrompt = '';
            const frameSelected = document.querySelector('#sk-frame-options .selected');
            if (frameSelected && frameSelected.dataset.value !== 'none') {
                let frameValue = frameSelected.dataset.value;
                if (frameValue === 'Kustom') {
                    const customInput = document.getElementById('sk-frame-custom-input');
                    frameValue = (customInput && customInput.value.trim()) || 'With elegant frame';
                }
                framePrompt = `The final image is enclosed in a ${frameValue}. `;
            }

            let aspectRatio = '1:1';
            const ratioSelected = document.querySelector('#sk-ratio-options .selected');
            if (ratioSelected) aspectRatio = ratioSelected.dataset.value;

            const multiPhotoNote = skImages.length > 1
                ? `${skImages.length} reference photos of the same family are provided — use all of them to reconstruct every family member's face and identity accurately. `
                : '';
            let prompt = `A professional family studio photoshoot. ${multiPhotoNote}CRITICAL: Retain the exact faces, identities, and number of people from the reference image(s). 
            Lighting: ${lighting}. 
            Background: ${background}. 
            ${outfitPrompt}
            ${framePrompt}
            The final image must be high-quality, photorealistic, and heartwarming family portrait.`;
            
            const countSlider = document.getElementById('sk-count-slider');
            const numOutputs = countSlider ? parseInt(countSlider.value) : 1;
            
            generatePhotographerImage('sk', prompt, skImages, aspectRatio, null, numOutputs);
        });
    }

    function setKeluargaImageData(data) {
        if (skImages.length < 6) {
            skImages.push(data);
            renderSkThumbnails();
        }
    }

    // Example before-after popup
    const showExampleBtn = document.getElementById('sk-show-example');
    if (showExampleBtn) {
        showExampleBtn.addEventListener('click', () => {
            const overlay = document.createElement('div');
            overlay.className = 'sk-example-overlay';
            overlay.innerHTML = `
                <div class="flex flex-row items-center justify-center w-full max-w-4xl px-4">
                    <div class="flex-1 min-w-0 -mr-4">
                        <div class="relative rounded-2xl overflow-hidden shadow-2xl bg-slate-50">
                            <img src="/assets/foto-keluarga.png" alt="Before" class="w-full h-auto block">
                            <div class="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 bg-slate-900/90 backdrop-blur-sm px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded sm:rounded-lg">
                                <span class="text-white text-[9px] sm:text-sm font-bold uppercase tracking-wider">Before</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex-shrink-0 z-10 mx-1 sm:mx-2">
                        <div class="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-teal-500 flex items-center justify-center shadow-2xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="sm:w-6 sm:h-6"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0 -ml-4">
                        <div class="relative rounded-2xl overflow-hidden shadow-2xl bg-slate-50">
                            <img src="/assets/foto-keluarga2.jpg" alt="After" class="w-full h-auto block">
                            <div class="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 bg-teal-600/90 backdrop-blur-sm px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded sm:rounded-lg">
                                <span class="text-white text-[9px] sm:text-sm font-bold uppercase tracking-wider">After</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button class="sk-example-close" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
            `;

            document.body.appendChild(overlay);
            setTimeout(() => overlay.style.opacity = '1', 10);

            const closeBtn = overlay.querySelector('.sk-example-close');

            const closeOverlay = () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            };

            closeBtn.addEventListener('click', closeOverlay);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeOverlay();
            });

            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    closeOverlay();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        });
    }

    return { setKeluargaImageData };
};