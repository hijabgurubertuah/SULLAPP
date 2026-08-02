window.initArtKarikatur = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    API_KEY,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    
    const akImageInput = document.getElementById('ak-image-input');
    const akUploadBox = document.getElementById('ak-upload-box');
    const akPreview = document.getElementById('ak-preview');
    const akPlaceholder = document.getElementById('ak-placeholder');
    const akRemoveBtn = document.getElementById('ak-remove-btn');
    const akTypeOptions = document.getElementById('ak-type-options');
    const akStyleOptions = document.getElementById('ak-style-options');
    const akCustomStyleContainer = document.getElementById('ak-custom-style-container');
    const akCustomStyleInput = document.getElementById('ak-custom-style-input');
    const akPromptInput = document.getElementById('ak-prompt-input');
    const akMagicPromptBtn = document.getElementById('ak-magic-prompt-btn');
    const akRatioOptions = document.getElementById('ak-ratio-options');
    const akResultCountSlider = document.getElementById('sf-karikatur-result-count-slider');
    const akResultCountDisplay = document.getElementById('sf-karikatur-result-count-display');
    const akGenerateBtn = document.getElementById('ak-generate-btn');
    const akResultsContainer = document.getElementById('ak-results-container');
    const akResultsGrid = document.getElementById('ak-results-grid');
    
    let akImageData = null;
    
    function akUpdateButtons() {
        akGenerateBtn.disabled = !akImageData;
        if (akMagicPromptBtn) akMagicPromptBtn.disabled = !akImageData;
    }

    function akSetImage(data) {
        akImageData = data;
        akPreview.src = data.dataUrl;
        akPlaceholder.classList.add('hidden');
        akPreview.classList.remove('hidden');
        akRemoveBtn.classList.remove('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, akRatioOptions);
        akUpdateButtons();
    }
    
    if (akImageInput) {
        setupImageUpload(akImageInput, akUploadBox, akSetImage);
    }
    
    if (akRemoveBtn) {
        akRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            akImageData = null;
            akImageInput.value = '';
            akPreview.src = '#';
            akPreview.classList.add('hidden');
            akPlaceholder.classList.remove('hidden');
            akRemoveBtn.classList.add('hidden');
            document.getElementById('ak-results-placeholder').classList.remove('hidden');
            akResultsContainer.classList.add('hidden');
            akResultsGrid.innerHTML = '';
            akUpdateButtons();
        });
    }
    
    const artStyles = [
        { label: 'Cat Air', value: 'Lukisan Cat Air (Watercolor)' },
        { label: 'Impresionis', value: 'Lukisan Impresionisme' },
        { label: 'Digital Art', value: 'Seni Digital Fotorealistis' },
        { label: 'Stencil B&W', value: 'Seni Stensil Hitam Putih (High Contrast)' },
        { label: 'Lukisan Minyak', value: 'Lukisan Cat Minyak Klasik' },
        { label: 'Sketsa Pensil', value: 'Sketsa Pensil Hitam Putih' },
        { label: 'Kustom', value: 'Kustom' }
    ];
    
    const caricatureStyles = [
        { label: '3D Kartun', value: 'Gaya Kartun 3D Pixar' },
        { label: 'Anime', value: 'Gaya Anime Jepang' },
        { label: 'Stiker Lucu', value: 'Stiker Chibi yang Menggemaskan' },
        { label: 'Komik US', value: 'Gaya Komik Amerika' },
        { label: 'Klasik', value: 'Karikatur Klasik dengan Kepala Besar' },
        { label: 'Kustom', value: 'Kustom' }
    ];
    
    function renderAkStyles(type) {
        if (!akStyleOptions) return;
        const styles = type === 'art' ? artStyles : caricatureStyles;
        akStyleOptions.innerHTML = styles.map((style, index) => `
                <button data-value="${style.value}" class="option-btn ${index === 0 ? 'selected' : ''} justify-center">${style.label}</button>
            `).join('');
        setupOptionButtons(akStyleOptions);
        akCustomStyleContainer.classList.add('hidden');
    }
    
    setupOptionButtons(akTypeOptions);
    setupOptionButtons(akRatioOptions);
    
    if (akResultCountSlider && akResultCountDisplay) {
        akResultCountSlider.addEventListener('input', function() {
            akResultCountDisplay.textContent = this.value + ' Gambar';
            const generateBtnSpan = akGenerateBtn.querySelector('span');
            if (generateBtnSpan && akTypeOptions) {
                const currentType = akTypeOptions.querySelector('.selected').dataset.value;
                if (currentType.toLowerCase().includes('karikatur')) {
                    generateBtnSpan.textContent = `Buat ${this.value} Karikatur`;
                } else {
                    generateBtnSpan.textContent = `Buat ${this.value} Karya Seni`;
                }
            }
        });
    }
    
    if (akTypeOptions) {
        akTypeOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const generateBtnSpan = akGenerateBtn.querySelector('span');
            const count = akResultCountSlider ? akResultCountSlider.value : 1;
            if (button.dataset.value.toLowerCase().includes('karikatur')) {
                renderAkStyles('caricature');
                if (generateBtnSpan) generateBtnSpan.textContent = `Buat ${count} Karikatur`;
            } else {
                renderAkStyles('art');
                if (generateBtnSpan) generateBtnSpan.textContent = `Buat ${count} Karya Seni`;
            }
        });
    }
    
    if (akStyleOptions) {
        akStyleOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.value === 'Kustom') {
                akCustomStyleContainer.classList.remove('hidden');
                akCustomStyleInput.focus();
            } else if (button) {
                akCustomStyleContainer.classList.add('hidden');
            }
        });
    }
    
    renderAkStyles('art');
    
    if (akMagicPromptBtn) {
        akMagicPromptBtn.addEventListener('click', async () => {
            if (!akImageData) return;
            const originalBtnHTML = akMagicPromptBtn.innerHTML;
            akMagicPromptBtn.disabled = true;
            akMagicPromptBtn.innerHTML = `<div class="spinner"></div>`;
            try {
                const type = akTypeOptions.querySelector('.selected').dataset.value;
                let style = akStyleOptions.querySelector('.selected').dataset.value;
                if (style === 'Kustom') {
                    style = akCustomStyleInput.value.trim() || 'Seni Digital';
                }
                const apiUrl = `${CHAT_URL}`;
                const systemPrompt = `You are a creative art director. Analyze the user's photo, their chosen art type, and style. Based on these, write a concise, descriptive instruction in Indonesian that adds creative details to the final image. For example, 'Tambahkan latar belakang pemandangan kota di malam hari dengan lampu neon' or 'Buat ekspresi wajah menjadi tersenyum lebar dan gembira'. Respond ONLY with the instruction text.`;
                const userQuery = `Analisis foto ini. Jenis: ${type}. Gaya: ${style}. Buatkan satu instruksi tambahan yang kreatif.`;
                const payload = {
                    contents: [{ parts: [{ text: userQuery }, { inlineData: { mimeType: akImageData.mimeType, data: akImageData.base64 } }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                };
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                const result = await response.json();
                akPromptInput.value = result.candidates[0].content.parts[0].text.trim();
            } catch (error) {
                console.error("Error generating magic prompt for art:", error);
                akPromptInput.value = `Gagal membuat instruksi: ${error.message}`;
            } finally {
                akMagicPromptBtn.innerHTML = originalBtnHTML;
                akUpdateButtons();
            }
        });
    }
    
    if (akGenerateBtn) {
        akGenerateBtn.addEventListener('click', async () => {
            const originalBtnHTML = akGenerateBtn.innerHTML;
            akGenerateBtn.disabled = true;
            akGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Karya...</span>`;
            document.getElementById('ak-results-placeholder').classList.add('hidden');
            const aspectRatio = akRatioOptions.querySelector('.selected').dataset.value;
            const aspectClass = getAspectRatioClass(aspectRatio);
            const numOutputs = parseInt(akResultCountSlider.value) || 1;

            akResultsContainer.classList.remove('hidden');
            akResultsGrid.innerHTML = '';
            akResultsGrid.className = `grid ${getResultGridCols(numOutputs)} gap-4 md:gap-6`;
            for (let i = 1; i <= numOutputs; i++) {
                const card = document.createElement('div');
                card.id = `ak-card-${i}`;
                card.className = `card overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                card.innerHTML = `<div class="spinner"></div>`;
                akResultsGrid.appendChild(card);
            }
            lucide.createIcons();
            const generationPromises = Array.from({ length: numOutputs }, (_, i) => i + 1).map(i => generateSingleArtImage(i, aspectRatio));
            await Promise.allSettled(generationPromises);
            akGenerateBtn.disabled = false;
            akGenerateBtn.innerHTML = originalBtnHTML;
            lucide.createIcons();
        });
    }

    async function generateSingleArtImage(id, aspectRatio) {
        const card = document.getElementById(`ak-card-${id}`);
        try {
            const type = akTypeOptions.querySelector('.selected').dataset.value;
            let style = akStyleOptions.querySelector('.selected').dataset.value;
            if (style === 'Kustom') {
                style = akCustomStyleInput.value.trim() || 'Seni Digital';
            }
            const instruction = akPromptInput.value.trim();
            let prompt = `Transform the person in the provided photo into a high-quality piece of art. CRITICAL: Retain the person's key facial features and likeness, but render them in the new style.
                - Type of Artwork: ${type}.
                - Artistic Style: ${style}.`;

            if (style.includes('Stensil')) {
                prompt += ` CRITICAL STYLE INSTRUCTION: Create a high-contrast Black and White Vector Stencil art. Use ONLY solid black and solid white colors (no gray, no shading, no gradients). It should look like a vinyl decal, sports team logo graphic, or Banksy style art. Strong shadows, clean sharp lines, minimalistic but recognizable.`;
            }

            if (type.toLowerCase().includes('karikatur')) {
                prompt += ` Exaggerate the facial features slightly for a humorous and recognizable caricature effect.`
            }

            if (instruction) {
                prompt += `\n- Additional User Instructions: ${instruction}. Please follow these instructions closely.`
            }
            prompt += ` The final result should be a beautiful, professional, and creative masterpiece. This is variation number ${id}.`;

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
            formData.append('images[]', base64ToBlob(akImageData.base64, akImageData.mimeType));
            formData.append('instruction', prompt);
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

            if (!result.success || !result.imageUrl) throw new Error("No image data received from API.");
            const imageUrl = result.imageUrl;
            card.innerHTML = `
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <a href="${imageUrl}" download="karya_seni_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>`;
            card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio)}`;
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error for art/caricature card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }

    return {
        akSetImage
    };
}