window.initAgeFilter = function(ctx = {}) {
    const {
        document = window.document,
        API_KEY = window.API_KEY,
        GENERATE_URL = window.GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound,
        switchTab,
        convertHeicToJpg,
        setupOptionButtons,
        autoSelectClosestRatio,
        lucide = window.lucide
    } = ctx;

    const tabAgeFilter = document.getElementById('tab-age-filter');
    if (tabAgeFilter) {
        tabAgeFilter.addEventListener('click', () => {
            if (typeof switchTab === 'function') switchTab('age-filter');
        });

        const afUploadInput = document.getElementById('af-upload-input');
        const afPreview = document.getElementById('af-preview');
        const afPlaceholder = document.getElementById('af-placeholder');
        const afRemoveBtn = document.getElementById('af-remove-btn');
        const afAgeSlider = document.getElementById('af-age-slider');
        const afAgeDisplay = document.getElementById('af-age-display');
        const afCountSlider = document.getElementById('af-count-slider');
        const afCountValue = document.getElementById('af-count-value');
        const afRatioOptions = document.getElementById('af-ratio-options');
        const afGenerateBtn = document.getElementById('af-generate-btn');
        const afResultsContainer = document.getElementById('af-results-container');
        const afResultsGrid = document.getElementById('af-results-grid');
        const afResultsPlaceholder = document.getElementById('af-results-placeholder');

        let afImageData = null;

        if (typeof setupOptionButtons === 'function') {
            setupOptionButtons(afRatioOptions);
        }

        if (afAgeSlider && afAgeDisplay) {
            afAgeSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                afAgeDisplay.textContent = `${val} Tahun`;
            });
        }

        if (afCountSlider && afCountValue) {
            afCountSlider.addEventListener('input', (e) => {
                afCountValue.textContent = e.target.value;
            });
        }

        if (afUploadInput) {
            afUploadInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const processed = await convertHeicToJpg(file);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        afImageData = { mimeType: file.type, base64: ev.target.result.split(',')[1] };
                        afPreview.src = ev.target.result;
                        afPreview.classList.remove('hidden');
                        afRemoveBtn.classList.remove('hidden');
                        afPlaceholder.classList.add('hidden');
                        
                        if (autoSelectClosestRatio && afRatioOptions) {
                            autoSelectClosestRatio(ev.target.result, afRatioOptions);
                        }
                    };
                    reader.readAsDataURL(processed);
                }
            });
        }

        if (afRemoveBtn) {
            afRemoveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                afUploadInput.value = '';
                afImageData = null;
                afPreview.src = '';
                afPreview.classList.add('hidden');
                afRemoveBtn.classList.add('hidden');
                afPlaceholder.classList.remove('hidden');
            });
        }

        if (afGenerateBtn) {
            afGenerateBtn.addEventListener('click', async () => {
                if (!afImageData) {
                    alert("Mohon unggah foto wajah terlebih dahulu.");
                    return;
                }

                const age = afAgeSlider.value;
                const count = parseInt(afCountSlider.value) || 1;
                const ratio = afRatioOptions.querySelector('.selected').dataset.value;

                const originalBtnHTML = afGenerateBtn.innerHTML;
                const originalBtnStyle = afGenerateBtn.style.background;

                afGenerateBtn.disabled = true;
                afGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Memproses Wajah (${age} Tahun)...</span>`;
                afGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');

                try {

                    afResultsPlaceholder.classList.add('hidden');
                    afResultsGrid.classList.remove('hidden');
                    afResultsGrid.className = `grid gap-4 ${getResultGridCols(count)}`;
                    afResultsGrid.innerHTML = '';

                    for (let i = 0; i < count; i++) {
                        const placeholder = document.createElement('div');
                        placeholder.id = `af-result-${i}`;
                        let aspectClass = 'aspect-square';
                        if (ratio === '16:9') aspectClass = 'aspect-video';
                        else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                        else if (ratio === '3:4') aspectClass = 'aspect-[3/4]';
                        else if (ratio === '4:3') aspectClass = 'aspect-[4/3]';

                        placeholder.className = `card ${aspectClass} w-full flex items-center justify-center bg-slate-50 border border-slate-200`;
                        placeholder.innerHTML = `<div class="spinner"></div>`;
                        afResultsGrid.appendChild(placeholder);
                    }

                    const generateSingleAge = async (index) => {
                        const card = document.getElementById(`af-result-${index}`);
                        try {
                            let ageDesc = "";
                            if (age < 5) ageDesc = "baby/toddler";
                            else if (age < 12) ageDesc = "child";
                            else if (age < 20) ageDesc = "teenager";
                            else if (age < 40) ageDesc = "young adult";
                            else if (age < 60) ageDesc = "middle aged";
                            else ageDesc = "elderly/old person";

                            const prompt = `Transform the person in this image to look exactly ${age} years old (${ageDesc}). 
                                    Maintain the original facial identity, pose, and background as much as possible, but apply realistic aging or rejuvenating effects (wrinkles, skin texture, hair color/volume) appropriate for a ${age} year old.
                                    Photorealistic, high quality. 
                                    Variation ${index + 1}.`;

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
                            formData.append('images[]', base64ToBlob(afImageData.base64, afImageData.mimeType));
                            formData.append('instruction', prompt);
                            if (ratio && ratio !== 'Auto') {
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
                                const previewFn = (typeof window.openTiImagePreview === 'function') ? `window.openTiImagePreview('${imageUrl}')` : `window.open('${imageUrl}', '_blank')`;

                                card.className = 'card overflow-hidden relative bg-white';
                                card.style.height = 'auto';
                                card.innerHTML = `
                                            <img src="${imageUrl}" class="w-full h-full object-contain shadow-sm cursor-pointer" onclick="${previewFn}">
                                            <div class="absolute bottom-2 right-2 flex gap-2">
                                                <button onclick="${previewFn}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                                </button>
                                                <a href="${imageUrl}" download="age_${age}_${Date.now()}_${index}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                                    <i data-lucide="download" class="w-4 h-4"></i>
                                                </a>
                                            </div>
                                        `;
                            } else {
                                throw new Error("Gagal membuat gambar (No URL returned).");
                            }
                        } catch (e) {
                            console.error(e);
                            card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words w-full">${e.message}</div>`;
                        }
                    };

                    const promises = [];
                    for (let i = 0; i < count; i++) promises.push(generateSingleAge(i));
                    await Promise.allSettled(promises);

                    if (typeof doneSound !== 'undefined') doneSound.play();

                } catch (e) {
                    if (typeof errorSound !== 'undefined') errorSound.play();
                    alert("Terjadi kesalahan: " + e.message);
                } finally {
                    afGenerateBtn.disabled = false;
                    afGenerateBtn.innerHTML = originalBtnHTML;
                    afGenerateBtn.style.background = originalBtnStyle;
                    afGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            });
        }
    }
};