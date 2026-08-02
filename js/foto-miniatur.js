window.initFotoMiniatur = function(ctx) {
    const { 
        document, 
        setupImageUpload, 
        setupOptionButtons, 
        updateSliderProgress, 
        getAspectRatioClass, 
        lucide, 
        getApiKey, 
        GENERATE_URL, 
        getApiErrorMessage, 
        doneSound, 
        errorSound,
        autoSelectClosestRatio
    } = ctx;

    const fmImageInput = document.getElementById('fm-image-input');
    const fmUploadBox = document.getElementById('fm-upload-box');
    const fmPreview = document.getElementById('fm-preview');
    const fmPlaceholder = document.getElementById('fm-placeholder');
    const fmRemoveBtn = document.getElementById('fm-remove-btn');
    const fmCountSlider = document.getElementById('fm-count-slider');
    const fmCountDisplay = document.getElementById('fm-count-display');
    const fmRatioOptions = document.getElementById('fm-ratio-options');
    const fmAdditionalInstruction = document.getElementById('fm-additional-instruction');
    const fmGenerateBtn = document.getElementById('fm-generate-btn');
    const fmResultsContainer = document.getElementById('fm-results-container');
    const fmResultsGrid = document.getElementById('fm-results-grid');
    let fmImageData = null;

    const miniatureConcepts = [
        "miniatur duduk di atas mouse komputer yang sedang digunakan.",
        "figur kecil berpose di atas kamera DSLR dengan lensa besar.",
        "miniatur berada di tepi piring berisi makanan sungguhan.",
        "action figure meluncur di rel sendok logam seperti skateboard.",
        "figur kecil sedang mendaki dinding cangkir teh dengan tali.",
        "miniatur memandangi layar monitor berisi foto dirinya.",
        "figur kecil berjemur di atas keyboard mekanikal berlampu RGB.",
        "miniatur sedang memperbaiki earphone dengan obeng mini.",
        "figur kecil berdiri di atas roti panggang yang masih hangat.",
        "miniatur berada di dalam jam tangan transparan.",
        "figur kecil bersembunyi di antara kelopak bunga mawar.",
        "miniatur sedang melukis di kanvas kecil di atas meja kayu.",
        "action figure memanjat botol parfum kaca yang tinggi.",
        "figur kecil membaca koran mini di kursi ruang tamu mungil.",
        "miniatur berada di atas drone yang sedang terbang rendah.",
        "action figure sedang bermain skateboard di atas ruler besi.",
        "figur kecil duduk di atas headphone besar dengan pose santai.",
        "miniatur sedang selfie menggunakan kamera dari kertas mini.",
        "figur kecil berada di antara balok lego raksasa.",
        "miniatur tidur di atas bantal dari kapas putih."
    ];

    function fmUpdateButtons() {
        if (fmGenerateBtn) {
            fmGenerateBtn.disabled = !fmImageData;
        }
    }

    if (fmCountSlider) {
        fmCountSlider.addEventListener('input', () => {
            if (fmCountDisplay) fmCountDisplay.textContent = fmCountSlider.value;
            updateSliderProgress(fmCountSlider);
        });
        updateSliderProgress(fmCountSlider);
    }

    setupImageUpload(fmImageInput, fmUploadBox, (data) => {
        fmImageData = data;
        fmPreview.src = data.dataUrl;
        fmPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, fmRatioOptions);
        fmPreview.classList.remove('hidden');
        fmRemoveBtn.classList.remove('hidden');
        fmUpdateButtons();
    });

    if (fmRemoveBtn) {
        fmRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fmImageData = null;
            fmImageInput.value = '';
            fmPreview.src = '#';
            fmPreview.classList.add('hidden');
            fmPlaceholder.classList.remove('hidden');
            fmRemoveBtn.classList.add('hidden');
            const resultsPlaceholder = document.getElementById('fm-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            fmResultsContainer.classList.add('hidden');
            fmResultsGrid.innerHTML = '';
            fmUpdateButtons();
        });
    }

    if (fmRatioOptions) {
        setupOptionButtons(fmRatioOptions);
    }

    if (fmGenerateBtn) {
        fmGenerateBtn.addEventListener('click', async () => {
            const originalBtnHTML = fmGenerateBtn.innerHTML;
            fmGenerateBtn.disabled = true;
            const count = parseInt(fmCountSlider.value);
            const additionalInstruction = fmAdditionalInstruction ? fmAdditionalInstruction.value.trim() : '';
            fmGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Miniatur (0/${count})</span>`;
            const resultsPlaceholder = document.getElementById('fm-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
            const aspectRatio = fmRatioOptions.querySelector('.selected').dataset.value;
            const aspectClass = getAspectRatioClass(aspectRatio);
            fmResultsContainer.classList.remove('hidden');
            fmResultsGrid.innerHTML = '';
            fmResultsGrid.className = `grid ${getResultGridCols(count)} gap-5`;
            for (let i = 1; i <= count; i++) {
                const card = document.createElement('div');
                card.id = `fm-card-${i}`;
                card.className = `rounded-2xl border border-slate-200 shadow-none overflow-hidden bg-white flex flex-col items-center justify-center ${aspectClass}`;
                card.innerHTML = `
                    <div class="flex flex-col items-center justify-center gap-3">
                        <div class="spinner"></div>
                        <span class="text-xs font-medium text-slate-400 animate-pulse">Sedang Memproses...</span>
                    </div>`;
                fmResultsGrid.appendChild(card);
            }
            lucide.createIcons();
            try {
                const shuffledConcepts = [...miniatureConcepts].sort(() => 0.5 - Math.random());
                const selectedConcepts = shuffledConcepts.slice(0, count);
                const generationPromises = selectedConcepts.map((concept, index) =>
                    generateSingleMiniatureImage(index + 1, fmImageData, concept, aspectRatio, additionalInstruction)
                        .then(() => {
                            fmGenerateBtn.querySelector('span').textContent = `Membuat Miniatur (${index + 1}/${count})`;
                        })
                );
                await Promise.allSettled(generationPromises);
            } catch (error) {
                console.error("Error during miniature generation process:", error);
                fmResultsGrid.innerHTML = `<div class="col-span-1 text-center py-10 text-red-500"><p class="break-all">Terjadi kesalahan: ${error.message}</p></div>`;
            } finally {
                fmGenerateBtn.disabled = false;
                fmGenerateBtn.innerHTML = originalBtnHTML;
                lucide.createIcons();
            }
        });
    }

    async function generateSingleMiniatureImage(id, imageData, conceptString, aspectRatio, additionalInstruction) {
        const card = document.getElementById(`fm-card-${id}`);
        try {

            const base64ToBlob = (base64, mimeType) => {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: mimeType });
            };

            let prompt = `Create a stunning macro photography miniature scene with tilt-shift effect featuring a tiny realistic human figure.

CRITICAL REQUIREMENTS - FULL BODY VISIBILITY:
- Show the COMPLETE FULL BODY from head to toe, no body parts cut off or cropped
- The miniature person must be ENTIRELY VISIBLE in frame with space around them
- Position the tiny figure with clear separation from frame edges
- Ensure all limbs, head, and feet are fully shown

MINIATURE CONCEPT:
${conceptString}

SUBJECT PRESERVATION:
- Maintain exact facial features, skin tone, hair style and color from the original photo
- Keep the same clothing style, colors, and patterns
- Preserve identity, gender, age, and body proportions accurately
- The person should look like a shrunken real human, not a toy or doll

MINIATURE TRANSFORMATION:
- Scale: The person is tiny (2-5cm tall) in a normal-sized real-world environment
- Texture: Realistic human skin, fabric, and hair textures at miniature scale
- Proportions: Natural human body proportions, just extremely small
- Style: Photorealistic miniature human, NOT action figure, NOT plastic toy, NOT cartoon

PHOTOGRAPHY & ENVIRONMENT:
- Tilt-shift macro photography with shallow depth of field
- The miniature is sharp and in focus, background has beautiful bokeh blur
- Dramatic scale contrast between tiny person and giant everyday objects
- Cinematic lighting with soft shadows to emphasize the small scale
- Creative, whimsical, and visually striking composition
- The environment should feel real and tangible, not CGI or artificial

COMPOSITION RULES:
- Full body must be completely visible with breathing room around the figure
- Position the miniature prominently but with context of the larger environment
- Use leading lines and perspective to emphasize the tiny scale
- Avoid any cropping of body parts at frame edges`;
            if (additionalInstruction) {
                prompt += `\n- Additional Instructions: ${additionalInstruction}`;
            }

            const formData = new FormData();
            formData.append('images[]', base64ToBlob(imageData.base64, imageData.mimeType));
            formData.append('instruction', prompt);
            formData.append('aspectRatio', aspectRatio);

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                cache: "no-store",
                headers: {
                    'X-API-Key': getApiKey()
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (!result.success || !result.imageUrl) throw new Error("No image data received from API.");
            const imageUrl = result.imageUrl;
            const title = `Konsep Miniatur #${id}`;
            card.innerHTML = `
            <div class="relative w-full h-full group">
                <img src="${imageUrl}" class="w-full h-full object-cover" alt="${title}">
                <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <h4 class="absolute bottom-2 left-3 text-white font-bold text-sm pointer-events-none drop-shadow-md">${conceptString}</h4>
                <div class="absolute bottom-2 right-2 flex gap-1">
                    <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <a href="${imageUrl}" download="miniatur_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>`;
            card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio)}`;
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error for miniature card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }

    return {
        setFmImageData: (data) => {
            fmImageData = data;
            fmPreview.src = data.dataUrl;
            fmPlaceholder.classList.add('hidden');
            fmPreview.classList.remove('hidden');
            fmRemoveBtn.classList.remove('hidden');
            fmUpdateButtons();
        }
    };
};
