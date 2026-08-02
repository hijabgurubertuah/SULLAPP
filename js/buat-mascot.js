window.initBuatMascot = function (ctx = {}) {
    const {
        document,
        setupOptionButtons,
        getAspectRatioClass,
        lucide,
        getApiKey,
        GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound
    } = ctx;

    const bmTypes = ["Robot", "Hewan", "Manusia", "Monster", "Alien", "Benda Mati", "Makanan", "Tanaman", "Makhluk Mitos", "Abstrak"];
    const bmStyles = ["3D Pixar Style", "Flat Design", "Anime/Manga", "Kartun Retro", "Sketsa Tangan", "Low Poly 3D", "Gradient Vector", "Line Art", "Voxel Art", "Realistic CGI"];
    const bmPersonalities = ["Ramah & Lucu", "Pemberani", "Pintar & Geeky", "Keren & Edgy", "Lucu & Konyol", "Profesional", "Santai", "Energik", "Misterius", "Pemarah"];
    const bmPoses = ["Berdiri Percaya Diri", "Melambaikan Tangan", "Berlari / Aksi", "Berpikir", "Melompat", "Menunjuk ke Atas", "Duduk Santai", "Terbang", "Memegang Papan", "Jempol"];

    const populateSelect = (id, options) => {
        const select = document.getElementById(id);
        if (!select) return;
        // Check if already populated to avoid duplication if init is called multiple times
        if (select.children.length > 0) return;
        
        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            select.appendChild(el);
        });
    };
    populateSelect('bm-type-select', bmTypes);
    populateSelect('bm-style-select', bmStyles);
    populateSelect('bm-personality-select', bmPersonalities);
    populateSelect('bm-pose-select', bmPoses);

    const bmGenerateBtn = document.getElementById('bm-generate-btn');
    const bmRatioOptions = document.getElementById('bm-ratio-options');
    const bmBgSelect = document.getElementById('bm-bg-select');
    const bmBgUploadContainer = document.getElementById('bm-bg-upload-container');
    const bmBgUploadInput = document.getElementById('bm-bg-upload-input');
    const bmBgPreview = document.getElementById('bm-bg-preview');
    const bmBgPreviewContainer = document.getElementById('bm-bg-preview-container');
    const bmBgRemoveBtn = document.getElementById('bm-bg-remove-btn');
    const bmResultsPlaceholder = document.getElementById('bm-results-placeholder');
    const bmResultsGrid = document.getElementById('bm-results-grid');
    const bmCountSlider = document.getElementById('bm-count-slider');
    const bmCountValue = document.getElementById('bm-count-value');
    let bmBgImageData = null;

    if (typeof setupOptionButtons === 'function') {
        setupOptionButtons(bmRatioOptions);
    }

    if (bmCountSlider && bmCountValue) {
        bmCountSlider.addEventListener('input', (e) => {
            bmCountValue.textContent = e.target.value;
        });
    }

    if (bmBgSelect) {
        bmBgSelect.addEventListener('change', () => {
            if (bmBgSelect.value === 'custom') {
                bmBgUploadContainer.classList.remove('hidden');
            } else {
                bmBgUploadContainer.classList.add('hidden');
                bmBgImageData = null;
            }
        });
    }

    if (bmBgUploadInput) {
        bmBgUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64 = ev.target.result.split(',')[1];
                    bmBgImageData = { mimeType: file.type, data: base64 };
                    bmBgPreview.src = ev.target.result;
                    bmBgPreviewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (bmBgRemoveBtn) {
        bmBgRemoveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            bmBgUploadInput.value = '';
            bmBgImageData = null;
            bmBgPreview.src = '';
            bmBgPreviewContainer.classList.add('hidden');
        });
    }

    if (bmGenerateBtn) {
        // Clone button to remove existing listeners
        const newBtn = bmGenerateBtn.cloneNode(true);
        bmGenerateBtn.parentNode.replaceChild(newBtn, bmGenerateBtn);
        
        newBtn.addEventListener('click', async () => {
            // Re-fetch API_KEY in case it changed
            const API_KEY = getApiKey ? getApiKey() : (window.API_KEY || "");
            
            const name = document.getElementById('bm-name-input').value.trim();
            const desc = document.getElementById('bm-desc-input').value.trim();
            if (!name || !desc) {
                alert("Mohon isi Nama Mascot dan Deskripsi.");
                return;
            }

            const type = document.getElementById('bm-type-select').value;
            const style = document.getElementById('bm-style-select').value;
            const personality = document.getElementById('bm-personality-select').value;
            const pose = document.getElementById('bm-pose-select').value;
            const bgMode = bmBgSelect.value;
            const ratio = bmRatioOptions.querySelector('.selected').dataset.value;
            const count = parseInt(bmCountSlider.value) || 1;

            let prompt = `Create a high-quality professional mascot character.
                     Name: "${name}".
                     Character Type: (translated to English: ${type}).
                     Style: ${style} (High Quality, Detailed).
                     Personality: (translated to English: ${personality}).
                     Pose: (translated to English: ${pose}).
                     Description/Context: "${desc}".
                     `;

            if (bgMode === 'solid') {
                prompt += ` Background: Clean Solid Color (White or matching simple color), high contrast with mascot.`;
            } else if (bgMode === 'gradient') {
                prompt += ` Background: Modern Aesthetic Gradient.`;
            } else if (bgMode === 'transparent') {
                prompt += ` Background: White (Easy to remove later). Keep the character isolated.`;
            } else if (bgMode === 'custom' && bmBgImageData) {
                prompt += ` Background: Incorporate the mascot naturally into the provided reference location/background image.`;
            }

            prompt += ` Aspect Ratio: ${ratio}. The mascot must be the main focus.`;

            const originalBtnHTML = newBtn.innerHTML;
            const originalBtnStyle = newBtn.style.background;

            newBtn.disabled = true;
            newBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Sedang Meracik Mascot...</span>`;
            newBtn.classList.add('cursor-not-allowed', '!opacity-100');

            try {


                bmResultsPlaceholder.classList.add('hidden');
                bmResultsGrid.classList.remove('hidden');
                bmResultsGrid.className = `grid gap-4 ${getResultGridCols(count)}`;
                bmResultsGrid.innerHTML = '';

                for (let i = 0; i < count; i++) {
                    const placeholder = document.createElement('div');
                    placeholder.id = `bm-result-${i}`;
                    let aspectClass = 'aspect-square';
                    // const ratio = bmRatioOptions.querySelector('.selected').dataset.value; // Already defined
                    if (ratio === '16:9') aspectClass = 'aspect-video';
                    else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                    // else if (ratio === '16:9') aspectClass = 'aspect-video'; // Duplicate
                    // else if (ratio === '9:16') aspectClass = 'aspect-[9/16]'; // Duplicate

                    placeholder.className = `card ${aspectClass} w-full flex items-center justify-center bg-slate-50 border border-slate-200`;
                    placeholder.innerHTML = `<div class="spinner"></div>`;
                    bmResultsGrid.appendChild(placeholder);
                }

                const generateSingleMascot = async (index) => {
                    const card = document.getElementById(`bm-result-${index}`);
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

                        const formData = new FormData();
                        let endpoint = '/generate';
                        const finalPrompt = prompt + ` Variation ${index + 1}.`;

                        if (bgMode === 'custom' && bmBgImageData) {
                            formData.append('images[]', base64ToBlob(bmBgImageData.data, bmBgImageData.mimeType));
                            formData.append('instruction', finalPrompt);
                            endpoint = '/generate';
                        } else {
                            formData.append('instruction', finalPrompt);
                            endpoint = '/generate';
                        }

                        formData.append('aspectRatio', ratio);

                        const response = await fetch(`${GENERATE_URL}`, {
                            method: 'POST',
                            headers: {
                                'X-API-Key': API_KEY
                            },
                            body: formData
                        });

                        if (!response.ok) throw new Error(await getApiErrorMessage(response));
                        const result = await response.json();

                        if (!result.success || !result.imageUrl) throw new Error("Gagal membuat mascot.");
                        const imageUrl = result.imageUrl;
                        const previewFn = (typeof window.openTiImagePreview === 'function') ? `window.openTiImagePreview('${imageUrl}')` : `window.open('${imageUrl}', '_blank')`;

                        card.className = `card overflow-hidden relative bg-white ${getAspectRatioClass(ratio)}`;
                        card.style.height = 'auto';
                        card.innerHTML = `
                                    <img src="${imageUrl}" class="w-full h-full object-contain shadow-sm cursor-pointer" onclick="${previewFn}">
                                    <div class="absolute bottom-2 right-2 flex gap-2">
                                        <button onclick="${previewFn}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                            <i data-lucide="eye" class="w-4 h-4"></i>
                                        </button>
                                        <a href="${imageUrl}" download="mascot_${name.replace(/\s+/g, '_')}_${index}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                            <i data-lucide="download" class="w-4 h-4"></i>
                                        </a>
                                    </div>
                                `;
                        if (typeof doneSound !== 'undefined') doneSound.play();

                    } catch (e) {
                        card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words w-full">${e.message}</div>`;
                    }
                };

                const promises = [];
                for (let i = 0; i < count; i++) promises.push(generateSingleMascot(i));
                await Promise.allSettled(promises);

            } catch (e) {
                if (typeof errorSound !== 'undefined') errorSound.play();
                alert("Error: " + e.message);
            } finally {
                newBtn.disabled = false;
                newBtn.innerHTML = originalBtnHTML;
                newBtn.style.background = originalBtnStyle;
                newBtn.classList.remove('cursor-not-allowed', '!opacity-100');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }
};
