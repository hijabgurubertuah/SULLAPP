window.initPrewedding = function ({
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
    errorSound,
    showContentModal,
    hideAndClearModal
}) {
    const pwPerson1Input = document.getElementById('pw-person1-input');
    const pwPerson1UploadBox = document.getElementById('pw-person1-upload-box');
    const pwPerson1Preview = document.getElementById('pw-person1-preview');
    const pwPerson1Placeholder = document.getElementById('pw-person1-placeholder');
    const pwRemovePerson1Btn = document.getElementById('pw-remove-person1-btn');
    const pwPerson1Validation = document.getElementById('pw-person1-validation');
    const pwPerson2Input = document.getElementById('pw-person2-input');
    const pwPerson2UploadBox = document.getElementById('pw-person2-upload-box');
    const pwPerson2Preview = document.getElementById('pw-person2-preview');
    const pwPerson2Placeholder = document.getElementById('pw-person2-placeholder');
    const pwRemovePerson2Btn = document.getElementById('pw-remove-person2-btn');
    const pwPerson2Validation = document.getElementById('pw-person2-validation');
    const pwRefInput = document.getElementById('pw-ref-input');
    const pwRefUploadBox = document.getElementById('pw-ref-upload-box');
    const pwRefPreview = document.getElementById('pw-ref-preview');
    const pwRefPlaceholder = document.getElementById('pw-ref-placeholder');
    const pwRemoveRefBtn = document.getElementById('pw-remove-ref-btn');
    const pwTypeSelect = document.getElementById('pw-type-select');
    const pwPreweddingOptions = document.getElementById('pw-prewedding-options');
    const pwWeddingOptions = document.getElementById('pw-wedding-options');
    const pwStyleOptionsPrewedding = document.getElementById('pw-style-options-prewedding');
    const pwLocationOptionsPrewedding = document.getElementById('pw-location-options-prewedding');
    const pwStyleOptionsWedding = document.getElementById('pw-style-options-wedding');
    const pwLocationOptionsWedding = document.getElementById('pw-location-options-wedding');
    const pwWatermarkInput = document.getElementById('pw-watermark-input');
    const pwAdditionalPrompt = document.getElementById('pw-additional-prompt');
    const pwRatioOptions = document.getElementById('pw-ratio-options');
    const pwResultCountSlider = document.getElementById('pw-result-count-slider');
    const pwResultCountDisplay = document.getElementById('pw-result-count-display');
    const pwGenerateBtn = document.getElementById('pw-generate-btn');
    const pwResultsContainer = document.getElementById('pw-results-container');
    const pwResultsGrid = document.getElementById('pw-results-grid');
    let pwPerson1Data = { data: null, isValid: false };
    let pwPerson2Data = { data: null, isValid: false };
    let pwRefData = null;
    let pwSelectedInternational = null;
    function pwUpdateGenerateButtonState() {
        pwGenerateBtn.disabled = !(pwPerson1Data.isValid && pwPerson2Data.isValid);
    }
    setupImageUpload(pwPerson1Input, pwPerson1UploadBox, (data) => {
        pwPerson1Data.data = data;
        pwPerson1Preview.src = data.dataUrl;
        pwPerson1Placeholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, pwRatioOptions);
        pwPerson1Preview.classList.remove('hidden');
        pwRemovePerson1Btn.classList.remove('hidden');
        pwPerson1Data.isValid = true;
        pwPerson1Validation.textContent = '✓ Foto valid';
        pwPerson1Validation.className = 'validation-status text-center text-green-600';
        pwUpdateGenerateButtonState();
    });
    pwRemovePerson1Btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pwPerson1Data = { data: null, isValid: false };
        pwPerson1Input.value = '';
        pwPerson1Preview.src = '#';
        pwPerson1Preview.classList.add('hidden');
        pwPerson1Placeholder.classList.remove('hidden');
        pwRemovePerson1Btn.classList.add('hidden');
        pwPerson1Validation.textContent = '';
        pwUpdateGenerateButtonState();
        document.getElementById('pw-results-placeholder').classList.remove('hidden');
        pwResultsContainer.classList.add('hidden');
        pwResultsGrid.innerHTML = '';
    });
    setupImageUpload(pwPerson2Input, pwPerson2UploadBox, (data) => {
        pwPerson2Data.data = data;
        pwPerson2Preview.src = data.dataUrl;
        pwPerson2Placeholder.classList.add('hidden');
        pwPerson2Preview.classList.remove('hidden');
        pwRemovePerson2Btn.classList.remove('hidden');
        pwPerson2Data.isValid = true;
        pwPerson2Validation.textContent = '✓ Foto valid';
        pwPerson2Validation.className = 'validation-status text-center text-green-600';
        pwUpdateGenerateButtonState();
    });
    pwRemovePerson2Btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pwPerson2Data = { data: null, isValid: false };
        pwPerson2Input.value = '';
        pwPerson2Preview.src = '#';
        pwPerson2Preview.classList.add('hidden');
        pwPerson2Placeholder.classList.remove('hidden');
        pwRemovePerson2Btn.classList.add('hidden');
        pwPerson2Validation.textContent = '';
        pwUpdateGenerateButtonState();
        document.getElementById('pw-results-placeholder').classList.remove('hidden');
        pwResultsContainer.classList.add('hidden');
        pwResultsGrid.innerHTML = '';
    });
    setupImageUpload(pwRefInput, pwRefUploadBox, (data) => {
        pwRefData = data;
        pwRefPreview.src = data.dataUrl;
        pwRefPlaceholder.classList.add('hidden');
        pwRefPreview.classList.remove('hidden');
        pwRemoveRefBtn.classList.remove('hidden');
    });
    pwRemoveRefBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pwRefData = null;
        pwRefInput.value = '';
        pwRefPreview.src = '#';
        pwRefPreview.classList.add('hidden');
        pwRefPlaceholder.classList.remove('hidden');
        pwRemoveRefBtn.classList.add('hidden');
    });
    function showInternationalStyleModal() {
        const internationalList = [
            'Korean Hanbok', 'Japanese Kimono', 'Indian Sari & Sherwani', 'Scottish Kilt & Gown',
            'Chinese Qipao & Tang Suit', 'Moroccan Kaftan & Djellaba', 'Vietnamese Ao Dai', 'Thai Chut Thai',
            'Western White Gown & Tuxedo', 'Nigerian Aso Oke', 'Ghanian Kente Cloth', 'Turkish Bindalli & Suit',
            'Russian Sarafan & Kosovorotka', 'Mexican Charro Suit & China Poblana', 'Masai Shuka (Kenya/Tanzania)'
        ];
        const styleButtonsHTML = internationalList.map(style =>
            `<button class="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors international-choice-btn" data-value="${style}">${style}</button>`
        ).join('');
        const bodyHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">${styleButtonsHTML}</div>`;
        showContentModal("Pilih Pakaian Pernikahan Internasional", bodyHTML);
        document.querySelectorAll('.international-choice-btn').forEach(button => {
            button.addEventListener('click', () => {
                pwSelectedInternational = button.dataset.value;
                const internationalBtn = document.getElementById('pw-international-btn');
                internationalBtn.innerHTML = `International (${pwSelectedInternational.split(' ')[0]})`;
                Array.from(pwStyleOptionsWedding.children).forEach(btn => btn.classList.remove('selected'));
                internationalBtn.classList.add('selected');
                hideAndClearModal();
            });
        });
    }
    pwStyleOptionsWedding.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('button');
        if (clickedButton && pwStyleOptionsWedding.contains(clickedButton)) {
            if (clickedButton.id === 'pw-international-btn') {
                e.preventDefault();
                showInternationalStyleModal();
            } else {
                pwSelectedInternational = null;
                document.getElementById('pw-international-btn').textContent = 'International';
                Array.from(pwStyleOptionsWedding.children).forEach(btn => btn.classList.remove('selected'));
                clickedButton.classList.add('selected');
            }
        }
    });
    setupOptionButtons(pwStyleOptionsPrewedding);
    setupOptionButtons(pwLocationOptionsPrewedding);
    setupOptionButtons(pwLocationOptionsWedding);
    setupOptionButtons(pwRatioOptions);
    
    if (pwResultCountSlider && pwResultCountDisplay) {
        pwResultCountSlider.addEventListener('input', function() {
            pwResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    pwTypeSelect.addEventListener('change', () => {
        if (pwTypeSelect.value === 'wedding') {
            pwPreweddingOptions.classList.add('hidden');
            pwWeddingOptions.classList.remove('hidden');
        } else {
            pwPreweddingOptions.classList.remove('hidden');
            pwWeddingOptions.classList.add('hidden');
        }
    });
    pwGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = pwGenerateBtn.innerHTML;
        pwGenerateBtn.disabled = true;
        pwGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Foto...</span>`;
        document.getElementById('pw-results-placeholder').classList.add('hidden');
        const aspectRatio = pwRatioOptions.querySelector('.selected').dataset.value;
        const aspectClass = getAspectRatioClass(aspectRatio);
        const numOutputs = parseInt(pwResultCountSlider.value) || 1;

        pwResultsContainer.classList.remove('hidden');
        pwResultsGrid.innerHTML = '';
        pwResultsGrid.className = `grid ${getResultGridCols(numOutputs)} gap-4`;
        for (let i = 1; i <= numOutputs; i++) {
            const card = document.createElement('div');
            card.id = `pw-card-${i}`;
            card.className = `card overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
            card.innerHTML = `<div class="spinner"></div>`;
            pwResultsGrid.appendChild(card);
        }
        lucide.createIcons();
        const generationPromises = Array.from({ length: numOutputs }, (_, i) => i + 1).map(i => generateSinglePreWeddingImage(i, aspectRatio));
        await Promise.allSettled(generationPromises);
        pwGenerateBtn.disabled = false;
        pwGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });
    async function generateSinglePreWeddingImage(id, aspectRatio) {
        const card = document.getElementById(`pw-card-${id}`);
        try {
            card.innerHTML = `<div class="text-center p-2"><div class="spinner"></div><p class="text-xs mt-2 text-gray-600">Mengunci wajah & membuat adegan...</p></div>`;
            lucide.createIcons();

            const type = pwTypeSelect.value;
            let style, location;
            if (type === 'wedding') {
                style = pwStyleOptionsWedding.querySelector('.selected').dataset.value;
                location = pwLocationOptionsWedding.querySelector('.selected').dataset.value;
                if (style === 'International Attire' && pwSelectedInternational) {
                    style = `International Wedding Theme. The couple MUST wear authentic, traditional wedding attire from ${pwSelectedInternational}.`;
                }
            } else {
                style = pwStyleOptionsPrewedding.querySelector('.selected').dataset.value;
                location = pwLocationOptionsPrewedding.querySelector('.selected').dataset.value;
            }
            const watermark = pwWatermarkInput.value.trim();
            const additionalInstruction = pwAdditionalPrompt.value.trim();
            const cameraShot = document.getElementById('pw-camera-select').value;
            let prompt = `Create a photorealistic ${type} photograph. You are given two source images containing the faces of the couple to be depicted.
CRITICAL RULE: You MUST use the exact faces from the source images. Preserve their facial identity, structure, and likeness perfectly. Do NOT generate new or different faces.
Place this couple in the following scene:
- Scene Description: A romantic pose together.
- Camera Shot: ${cameraShot}.
- Location: ${location}.
- Style & Attire: ${style}. The couple's clothing should match this theme.
- Quality: High-resolution, sharp, and flawlessly blended.`;
            if (watermark) {
                prompt += `\n- Watermark: Add the text "${watermark}" subtly and elegantly in a corner.`;
            }
            if (additionalInstruction) {
                prompt += `\n- Additional Instruction: ${additionalInstruction}`;
            }
            if (pwRefData) {
                prompt += `\n- Reference Image: The third image provided is for style, color, and composition inspiration ONLY. DO NOT copy the people or faces from this reference image.`;
            }
            prompt += `\nThis is variation ${id}.`;

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
            formData.append('images[]', base64ToBlob(pwPerson1Data.data.base64, pwPerson1Data.data.mimeType));
            formData.append('images[]', base64ToBlob(pwPerson2Data.data.base64, pwPerson2Data.data.mimeType));

            if (pwRefData) {
                formData.append('images[]', base64ToBlob(pwRefData.base64, pwRefData.mimeType));
            }

            formData.append('instruction', prompt);
            if (aspectRatio) {
                formData.append('aspectRatio', aspectRatio);
            }

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!response.ok) throw new Error(`${await getApiErrorMessage(response)}`);
            const result = await response.json();

            if (!result.success || !result.imageUrl) {
                throw new Error("Gagal membuat gambar dari API.");
            }
            const imageUrl = result.imageUrl;
            
            // Create card content (animate icon auto-injected by global observer)
            const cardInner = `
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <a href="${imageUrl}" download="prewedding_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>`;
            
            card.innerHTML = cardInner;
            card.className = `card relative w-full overflow-hidden group ${getAspectRatioClass(aspectRatio)}`;
            
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error for pre-wedding card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }
};
