window.initBarbershop = function ({
    document,
    setupImageUpload,
    setupOptionButtons,
    showContentModal,
    hideAndClearModal,
    lucide,
    API_KEY,
    GENERATE_URL,
    getApiErrorMessage,
    doneSound,
    errorSound,
    getAspectRatioClass,
    autoSelectClosestRatio,
    getImageAspectRatio,
    getClosestStandardRatio
}) {
    const bsImageInput = document.getElementById('bs-image-input');
    const bsUploadBox = document.getElementById('bs-upload-box');
    const bsPreview = document.getElementById('bs-preview');
    const bsPlaceholder = document.getElementById('bs-placeholder');
    const bsRemoveBtn = document.getElementById('bs-remove-btn');
    const bsGenderOptions = document.getElementById('bs-gender-options');
    const bsStyleDisplay = document.getElementById('bs-style-display');
    const bsPilihGayaBtn = document.getElementById('bs-pilih-gaya-btn');
    const bsColorDisplay = document.getElementById('bs-color-display');
    const bsPilihWarnaBtn = document.getElementById('bs-pilih-warna-btn');
    const bsRatioOptions = document.getElementById('bs-ratio-options');
    const bsGenerateBtn = document.getElementById('bs-generate-btn');
    const bsResultsContainer = document.getElementById('bs-results-container');
    const bsResultsGrid = document.getElementById('bs-results-grid');
    const bsResultCountSlider = document.getElementById('bs-result-count-slider');
    const bsResultCountDisplay = document.getElementById('bs-result-count-display');

    if (bsResultCountSlider && bsResultCountDisplay) {
        bsResultCountSlider.addEventListener('input', function() {
            bsResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }
    let bsImageData = null;
    let bsSelectedGender = 'Pria';
    let bsSelectedStyle = { type: null, value: null };
    let bsSelectedColor = { type: null, value: null };

    const hairstyles = {
        pria: [
            { label: "1. High Fade Quiff", value: "a textured quiff with a high skin fade" },
            { label: "2. Skin Fade & Design Line", value: "a textured top with a high skin fade and a sharp design line" },
            { label: "3. Mid Fade Spiky Top", value: "a spiky textured top with a mid fade" },
            { label: "4. Taper Fade Pompadour", value: "a classic voluminous pompadour with a taper fade" },
            { label: "5. High Skin Fade", value: "a high skin fade with a textured top viewed from the side-back" },
            { label: "6. Hard Part Pompadour", value: "a voluminous pompadour with a shaved hard part line and a mid fade" },
            { label: "7. Slick Back Undercut", value: "a slicked-back top with a high fade undercut" },
            { label: "8. High Volume Textured Quiff", value: "a very high volume textured quiff with a high skin fade" },
            { label: "9. Side Part Low Fade", value: "a classic side part pompadour with a low fade" }
        ],
        wanita: ["Feather Cut", "Step Cut", "V Cut", "Bob Cut", "Wolf Cut", "Straight Layer Cut", "Curtain Bangs", "Face-Framing Layers"]
    };

    const hairColors = [
        { name: "Hitam Alami", value: "#1C1C1C", textValue: "Natural Black" },
        { name: "Cokelat Tua", value: "#3B2A22", textValue: "Dark Brown" },
        { name: "Cokelat Keemasan", value: "#A97E42", textValue: "Golden Brown" },
        { name: "Pirang Platinum", value: "#E1D6C6", textValue: "Platinum Blonde" },
        { name: "Merah Burgundy", value: "#800020", textValue: "Burgundy Red" },
        { name: "Abu-abu Silver", value: "#C0C0C0", textValue: "Silver Ash" },
        { name: "Biru Gelap", value: "#00008B", textValue: "Dark Blue" },
        { name: "Ungu Pastel", value: "#B19CD9", textValue: "Pastel Purple" },
    ];

    function bsUpdateButtons() {
        const hasImage = !!bsImageData;
        const hasStyle = !!bsSelectedStyle.type;
        const hasColor = !!bsSelectedColor.type;
        if (bsPilihGayaBtn) bsPilihGayaBtn.disabled = !hasImage;
        if (bsPilihWarnaBtn) bsPilihWarnaBtn.disabled = !hasImage;
        if (bsGenerateBtn) bsGenerateBtn.disabled = !hasImage || !hasStyle || !hasColor;
    }

    function bsResetSelections() {
        bsSelectedStyle = { type: null, value: null };
        bsSelectedColor = { type: null, value: null };
        if (bsStyleDisplay) bsStyleDisplay.value = '';
        if (bsColorDisplay) bsColorDisplay.value = '';
        bsUpdateButtons();
    }

    if (bsImageInput) {
        setupImageUpload(bsImageInput, bsUploadBox, (data) => {
            bsImageData = data;
            bsPreview.src = data.dataUrl;
            bsPlaceholder.classList.add('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, bsRatioOptions);
            bsPreview.classList.remove('hidden');
            bsRemoveBtn.classList.remove('hidden');
            bsUpdateButtons();
        });
    }

    if (bsRemoveBtn) {
        bsRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            bsImageData = null;
            bsImageInput.value = '';
            bsPreview.src = '#';
            bsPreview.classList.add('hidden');
            bsPlaceholder.classList.remove('hidden');
            bsRemoveBtn.classList.add('hidden');
            document.getElementById('bs-results-placeholder').classList.remove('hidden');
            bsResultsContainer.classList.add('hidden');
            bsResultsGrid.innerHTML = '';
            bsResetSelections();
            bsUpdateButtons();
        });
    }

    if (bsGenderOptions) {
        setupOptionButtons(bsGenderOptions);
        bsGenderOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button) {
                bsSelectedGender = button.dataset.value;
                bsResetSelections();
            }
        });
    }

    if (bsPilihGayaBtn) {
        bsPilihGayaBtn.addEventListener('click', () => {
            const isPria = bsSelectedGender === 'Pria';
            const styleList = isPria ? hairstyles.pria : hairstyles.wanita;
            const imageUrl = isPria
                ? 'https://keep-it-in-the-u-p-shopping-show.myshopify.com/cdn/shop/products/fafa2fafd8069c1c0a101e994bfa5022--barber-haircuts-haircut-men_1024x1024.jpg'
                : 'https://i.pinimg.com/1200x/6d/9d/00/6d9d00c6e0ae8adeae255a85ba87c1c8.jpg';
            
            const styleButtonsHTML = (isPria ? styleList.map(style =>
                `<button data-value="${style.value}" data-label="${style.label}" class="style-choice-btn w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">${style.label}</button>`
            ) : styleList.map(style =>
                `<button data-value="${style}" data-label="${style}" class="style-choice-btn w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors">${style}</button>`
            )).join('');

            const bodyHTML = `
                <div class="space-y-4">
                    <img src="${imageUrl}" class="w-full h-auto max-h-64 object-contain rounded-lg border border-slate-600 mb-4">
                    <p class="text-sm text-slate-300">Pilih dari Daftar:</p>
                    <div id="style-predefined-options" class="grid grid-cols-2 md:grid-cols-3 gap-2">${styleButtonsHTML}</div>
                    <button id="style-kustom-toggle-btn" class="style-choice-btn w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors" data-type="kustom">
                        Kustom
                    </button>
                    <div id="style-custom-options" class="hidden space-y-4 border-t border-slate-600 pt-4 mt-4">
                        <div>
                            <label for="style-custom-input" class="block text-sm font-medium text-slate-300 mb-2">Tulis Gaya Kustom:</label>
                            <input type="text" id="style-custom-input" placeholder="Contoh: Cepmek, Mullet, dsb." class="w-full p-2 rounded-md bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                        </div>
                    </div>
                    <button id="style-apply-btn" class="w-full bg-teal-600 text-white font-semibold py-2 mt-4 rounded-lg hover:bg-teal-700">Terapkan</button>
                </div>
            `;
            
            showContentModal('Pilih Gaya Rambut', bodyHTML);
            if (lucide && lucide.createIcons) lucide.createIcons();
            
            const customOptionsContainer = document.getElementById('style-custom-options');
            const allChoiceBtns = document.querySelectorAll('.style-choice-btn');
            let selectedButton = null;
            
            allChoiceBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    allChoiceBtns.forEach(b => b.classList.remove('!bg-teal-600'));
                    btn.classList.add('!bg-teal-600');
                    selectedButton = btn;
                    
                    if (btn.dataset.type === 'kustom') {
                        customOptionsContainer.classList.remove('hidden');
                    } else {
                        customOptionsContainer.classList.add('hidden');
                    }
                });
            });
            
            document.getElementById('style-apply-btn').addEventListener('click', () => {
                if (!selectedButton) {
                    alert('Silakan pilih salah satu gaya atau Kustom.');
                    return;
                }
                
                const customInput = document.getElementById('style-custom-input');
                if (selectedButton.dataset.type === 'kustom') {
                    if (customInput.value.trim()) {
                        bsSelectedStyle = { type: 'custom', value: customInput.value.trim() };
                        bsStyleDisplay.value = bsSelectedStyle.value;
                    } else {
                        alert('Untuk Kustom, harap tulis gaya yang diinginkan.');
                        return;
                    }
                } else {
                    bsSelectedStyle = { type: 'predefined', value: selectedButton.dataset.value };
                    bsStyleDisplay.value = selectedButton.dataset.label;
                }
                
                bsUpdateButtons();
                hideAndClearModal();
            });
        });
    }

    if (bsPilihWarnaBtn) {
        bsPilihWarnaBtn.addEventListener('click', () => {
            const colorSwatches = hairColors.map(color => `
                <button data-value="${color.textValue}" data-name="${color.name}" class="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors color-choice-btn flex items-center gap-3">
                    <span class="w-5 h-5 rounded-full border border-slate-500" style="background-color: ${color.value};"></span>
                    <span>${color.name}</span>
                </button>
            `).join('');
            
            const bodyHTML = `
                <div class="space-y-4">
                    <p class="text-sm text-slate-300">Pilih dari palet warna:</p>
                    <div class="grid grid-cols-2 gap-2">${colorSwatches}</div>
                    <div class="text-center text-xs font-semibold text-slate-400">ATAU</div>
                    <div>
                        <label for="color-custom-input" class="block text-sm font-medium text-slate-300 mb-2">Tulis Warna Kustom:</label>
                        <input type="text" id="color-custom-input" placeholder="Contoh: Merah Api, Hijau Neon, dsb." class="w-full p-2 rounded-md bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500">
                    </div>
                    <button id="color-apply-btn" class="w-full bg-teal-600 text-white font-semibold py-2 mt-4 rounded-lg hover:bg-teal-700">Terapkan</button>
                </div>
            `;
            
            showContentModal('Pilih Warna Rambut', bodyHTML);
            
            document.querySelectorAll('.color-choice-btn').forEach(btn => {
                btn.onclick = () => {
                    bsSelectedColor = { type: 'predefined', value: btn.dataset.value };
                    bsColorDisplay.value = btn.dataset.name;
                    bsUpdateButtons();
                    hideAndClearModal();
                };
            });
            
            document.getElementById('color-apply-btn').addEventListener('click', () => {
                const customValue = document.getElementById('color-custom-input').value.trim();
                if (customValue) {
                    bsSelectedColor = { type: 'custom', value: customValue };
                    bsColorDisplay.value = customValue;
                    bsUpdateButtons();
                    hideAndClearModal();
                } else {
                    hideAndClearModal(); // Or show alert
                }
            });
        });
    }

    if (bsRatioOptions) {
        setupOptionButtons(bsRatioOptions);
    }

    if (bsGenerateBtn) {
        bsGenerateBtn.addEventListener('click', async () => {
            const originalBtnHTML = bsGenerateBtn.innerHTML;
            bsGenerateBtn.disabled = true;
            bsGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Mengubah Gaya...</span>`;
            document.getElementById('bs-results-placeholder').classList.add('hidden');
            
            let selectedRatioValue = bsRatioOptions.querySelector('.selected').dataset.value;
            let apiAspectRatio = selectedRatioValue;
            
            if (selectedRatioValue === 'Auto') {
                try {
                    const ratio = await getImageAspectRatio(bsImageData);
                    apiAspectRatio = `${ratio}:${1}`; // Or handle format as needed
                    // Actually, if getImageAspectRatio returns float, this might need adjustment.
                    // Assuming getClosestStandardRatio handles it, or the API handles it.
                    // In original code: apiAspectRatio = `${ratio}:${1}`;
                    // But wait, the original code had:
                    // const ratio = await getImageAspectRatio(bsImageData);
                    // apiAspectRatio = `${ratio}:${1}`;
                } catch {
                    apiAspectRatio = '1:1';
                }
            }
            
            bsResultsContainer.classList.remove('hidden');
            bsResultsGrid.innerHTML = '';
            
            const resultCount = bsResultCountSlider ? parseInt(bsResultCountSlider.value) : 1;
            bsResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-4 md:gap-5`;
            
            for (let i = 1; i <= resultCount; i++) {
                const card = document.createElement('div');
                card.id = `bs-card-${i}`;
                card.className = `card overflow-hidden bg-gray-100 flex items-center justify-center`;
                
                if (selectedRatioValue === 'Auto') {
                    const [w, h] = apiAspectRatio.split(':');
                    card.style.aspectRatio = `${w} / ${h}`;
                } else {
                    card.classList.add(getAspectRatioClass(selectedRatioValue));
                }
                
                card.innerHTML = `<div class="spinner"></div>`;
                bsResultsGrid.appendChild(card);
            }
            
            if (lucide && lucide.createIcons) lucide.createIcons();
            
            const generationPromises = Array.from({ length: resultCount }, (_, i) => i + 1).map(i => generateSingleBarbershopImage(i, apiAspectRatio));
            await Promise.allSettled(generationPromises);
            
            bsGenerateBtn.disabled = false;
            bsGenerateBtn.innerHTML = originalBtnHTML;
            if (lucide && lucide.createIcons) lucide.createIcons();
        });
    }

    async function generateSingleBarbershopImage(id, aspectRatio) {
        const card = document.getElementById(`bs-card-${id}`);
        try {
            card.innerHTML = `<div class="text-center p-2"><div class="spinner"></div><p class="text-xs mt-2 text-gray-600">Mengganti gaya rambut...</p></div>`;
            if (lucide && lucide.createIcons) lucide.createIcons();

            const styleInstruction = bsSelectedStyle.value;
            const colorInstruction = bsSelectedColor.value;
            const inpaintPrompt = `You are an expert virtual hairstylist. Your task is to completely replace the hairstyle of the person in the image.
- New Hairstyle: "${styleInstruction}"
- New Hair Color: "${colorInstruction}"
CRITICAL RULE FOR SHORTENING HAIR: If the requested new hairstyle is shorter than the original, you MUST also realistically remove any parts of the old long hair visible outside the main masked area (e.g., hair resting on the neck, shoulders, or back). You must convincingly reconstruct the person's neck, shoulders, and clothing that might have been previously obscured by the old hair.
PRESERVATION RULE: The person's face, the background, and clothing (unless it was previously covered by long hair that is now being removed) MUST remain identical to the original image.
The final result must be photorealistic. This is variation ${id}.`;

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
            formData.append('images[]', base64ToBlob(bsImageData.base64, bsImageData.mimeType));
            formData.append('instruction', inpaintPrompt);

            if (aspectRatio && aspectRatio !== 'Auto') {
                formData.append('aspectRatio', aspectRatio);
            }

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!response.ok) throw new Error(`Gagal mengganti rambut: ${await getApiErrorMessage(response)}`);
            const result = await response.json();

            if (!result.success || !result.imageUrl) {
                throw new Error("No image data received from API.");
            }
            const imageUrl = result.imageUrl;
            card.innerHTML = `
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <a href="${imageUrl}" download="gaya_rambut_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>`;
            card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio)}`;
            if (doneSound) doneSound.play();
        } catch (error) {
            if (errorSound) errorSound.play();
            console.error(`Error for barbershop card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            if (lucide && lucide.createIcons) lucide.createIcons();
        }
    }
};
