window.initKids = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    generatePhotographerImage,
    autoSelectClosestRatio
}) {
    const sfKidsInput = document.getElementById('sf-kids-input');
    const sfKidsUploadBox = document.getElementById('sf-kids-upload-box');
    const sfKidsPreview = document.getElementById('sf-kids-preview');
    const sfKidsPlaceholder = document.getElementById('sf-kids-placeholder');
    const sfKidsRemoveBtn = document.getElementById('sf-kids-remove-btn');
    const sfKidsGenerateBtn = document.getElementById('sf-kids-generate-btn');
    const sfKidsResultCountSlider = document.getElementById('kids-result-count-slider');
    const sfKidsResultCountDisplay = document.getElementById('kids-result-count-display');

    if (sfKidsResultCountSlider && sfKidsResultCountDisplay) {
        sfKidsResultCountSlider.addEventListener('input', function() {
            sfKidsResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    const sfKidsAttireRefInput = document.getElementById('sf-kids-attire-ref-input');
    const sfKidsAttireRefUploadBox = document.getElementById('sf-kids-attire-ref-upload-box');
    const sfKidsAttireRefPreview = document.getElementById('sf-kids-attire-ref-preview');
    const sfKidsAttireRefPlaceholder = document.getElementById('sf-kids-attire-ref-placeholder');
    const sfKidsAttireRefRemoveBtn = document.getElementById('sf-kids-attire-ref-remove-btn');
    let sfKidsData = { data: null, isValid: false };
    let sfKidsAttireRefData = null;

    function sfKidsUpdateBtn() { 
        if (sfKidsGenerateBtn) sfKidsGenerateBtn.disabled = !sfKidsData.isValid; 
    }

    if (sfKidsInput && sfKidsUploadBox) {
        setupImageUpload(sfKidsInput, sfKidsUploadBox, async (data) => {
            sfKidsData.data = data;
            if (sfKidsPreview) sfKidsPreview.src = data.dataUrl;
            if (sfKidsPlaceholder) sfKidsPlaceholder.classList.add('hidden');
            if (sfKidsPreview) sfKidsPreview.classList.remove('hidden');
            if (sfKidsRemoveBtn) sfKidsRemoveBtn.classList.remove('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('sf-kids-ratio-options'));
            sfKidsData.isValid = true;
            sfKidsUpdateBtn();
        });
    }

    if (sfKidsRemoveBtn) {
        sfKidsRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sfKidsData = { data: null, isValid: false };
            if (sfKidsInput) sfKidsInput.value = '';
            if (sfKidsPreview) {
                sfKidsPreview.src = '#';
                sfKidsPreview.classList.add('hidden');
            }
            if (sfKidsPlaceholder) sfKidsPlaceholder.classList.remove('hidden');
            sfKidsRemoveBtn.classList.add('hidden');
            sfKidsUpdateBtn();
            const resultsPlaceholder = document.getElementById('sf-kids-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            const resultsContainer = document.getElementById('sf-kids-results-container');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            const resultsGrid = document.getElementById('sf-kids-results-grid');
            if (resultsGrid) resultsGrid.innerHTML = '';
        });
    }

    if (sfKidsAttireRefInput && sfKidsAttireRefUploadBox) {
        setupImageUpload(sfKidsAttireRefInput, sfKidsAttireRefUploadBox, (data) => {
            sfKidsAttireRefData = data;
            if (sfKidsAttireRefPreview) sfKidsAttireRefPreview.src = data.dataUrl;
            if (sfKidsAttireRefPlaceholder) sfKidsAttireRefPlaceholder.classList.add('hidden');
            if (sfKidsAttireRefPreview) sfKidsAttireRefPreview.classList.remove('hidden');
            if (sfKidsAttireRefRemoveBtn) sfKidsAttireRefRemoveBtn.classList.remove('hidden');
        });
    }

    if (sfKidsAttireRefRemoveBtn) {
        sfKidsAttireRefRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sfKidsAttireRefData = null;
            if (sfKidsAttireRefInput) sfKidsAttireRefInput.value = '';
            if (sfKidsAttireRefPreview) {
                sfKidsAttireRefPreview.src = '#';
                sfKidsAttireRefPreview.classList.add('hidden');
            }
            if (sfKidsAttireRefPlaceholder) sfKidsAttireRefPlaceholder.classList.remove('hidden');
            sfKidsAttireRefRemoveBtn.classList.add('hidden');
        });
    }

    setupOptionButtons(document.getElementById('sf-kids-gender-options'));
    setupOptionButtons(document.getElementById('sf-kids-ratio-options'));
    setupOptionButtons(document.getElementById('sf-kids-style-options'));
    setupOptionButtons(document.getElementById('sf-kids-expression-options'));

    if (sfKidsGenerateBtn) {
        sfKidsGenerateBtn.addEventListener('click', () => {
            const resultsPlaceholder = document.getElementById('sf-kids-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
            
            let gender = 'Laki-laki';
            const genderSelected = document.querySelector('#sf-kids-gender-options .selected');
            if (genderSelected) gender = genderSelected.dataset.value;

            let aspectRatio = '1:1';
            const ratioSelected = document.querySelector('#sf-kids-ratio-options .selected');
            if (ratioSelected) aspectRatio = ratioSelected.dataset.value;

            let style = 'Ceria Sekolah';
            const styleSelected = document.querySelector('#sf-kids-style-options .selected');
            if (styleSelected) style = styleSelected.dataset.value;

            let expression = 'Tersenyum';
            const expressionSelected = document.querySelector('#sf-kids-expression-options .selected');
            if (expressionSelected) expression = expressionSelected.dataset.value;

            const additionalPromptInput = document.getElementById('sf-kids-additional-prompt');
            let additionalPrompt = '';
            if (additionalPromptInput) additionalPrompt = additionalPromptInput.value.trim();

            let prompt = `Create a professional photo of the child from the image. CRITICAL: Preserve the child's exact face and features. The child is a ${gender}.
            Style: ${style}. The child should be posed and expressing: ${expression}. The background and clothing should match the chosen style. The final photo should be high-quality and vibrant.`;

            if (additionalPrompt) {
                prompt += ` Additional instructions: ${additionalPrompt}.`;
            }
            
            const numOutputs = sfKidsResultCountSlider ? parseInt(sfKidsResultCountSlider.value) : 1;
            
            if (sfKidsAttireRefData) {
                prompt += ` Use the second image as clothing reference. Replace the child's outfit to closely match the clothing reference.`;
                generatePhotographerImage('kids', prompt, sfKidsData.data, aspectRatio, sfKidsAttireRefData, numOutputs);
            } else {
                generatePhotographerImage('kids', prompt, sfKidsData.data, aspectRatio, null, numOutputs);
            }
        });
    }

    function setKidsImageData(data) {
        sfKidsData.data = data;
        if (sfKidsPreview) sfKidsPreview.src = data.dataUrl;
        if (sfKidsPlaceholder) sfKidsPlaceholder.classList.add('hidden');
        if (sfKidsPreview) sfKidsPreview.classList.remove('hidden');
        if (sfKidsRemoveBtn) sfKidsRemoveBtn.classList.remove('hidden');
        sfKidsData.isValid = true;
        sfKidsUpdateBtn();
    }

    return { setKidsImageData };
};