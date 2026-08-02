window.initBabyBorn = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    generatePhotographerImage,
    autoSelectClosestRatio
}) {
    const sfBabyInput = document.getElementById('sf-baby-input');
    const sfBabyUploadBox = document.getElementById('sf-baby-upload-box');
    const sfBabyPreview = document.getElementById('sf-baby-preview');
    const sfBabyPlaceholder = document.getElementById('sf-baby-placeholder');
    const sfBabyRemoveBtn = document.getElementById('sf-baby-remove-btn');
    const sfBabyGenerateBtn = document.getElementById('sf-baby-generate-btn');
    const sfBabyThemeOptions = document.getElementById('sf-baby-theme-options');
    const sfBabyThemeCustomContainer = document.getElementById('sf-baby-theme-custom-container');
    let sfBabyData = { data: null, isValid: false };
    let sfBabyTooltipShown = false;

    function sfBabyUpdateBtn() { 
        if (sfBabyGenerateBtn) sfBabyGenerateBtn.disabled = !sfBabyData.isValid; 
    }

    if (sfBabyInput && sfBabyUploadBox) {
        setupImageUpload(sfBabyInput, sfBabyUploadBox, async (data) => {
            sfBabyData.data = data;
            if (sfBabyPreview) sfBabyPreview.src = data.dataUrl;
            if (sfBabyPlaceholder) sfBabyPlaceholder.classList.add('hidden');
            if (sfBabyPreview) sfBabyPreview.classList.remove('hidden');
            if (sfBabyRemoveBtn) sfBabyRemoveBtn.classList.remove('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('sf-baby-ratio-options'));
            sfBabyData.isValid = true;
            sfBabyUpdateBtn();
            if (sfBabyData.isValid && !sfBabyTooltipShown) {
                const tooltip = document.getElementById('sf-baby-custom-tooltip');
                if (tooltip) {
                    tooltip.classList.add('visible');
                    setTimeout(() => {
                        tooltip.classList.remove('visible');
                    }, 5000);
                    sfBabyTooltipShown = true;
                }
            }
        });
    }

    if (sfBabyRemoveBtn) {
        sfBabyRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sfBabyData = { data: null, isValid: false };
            if (sfBabyInput) sfBabyInput.value = '';
            if (sfBabyPreview) {
                sfBabyPreview.src = '#';
                sfBabyPreview.classList.add('hidden');
            }
            if (sfBabyPlaceholder) sfBabyPlaceholder.classList.remove('hidden');
            sfBabyRemoveBtn.classList.add('hidden');
            sfBabyUpdateBtn();
            sfBabyTooltipShown = false;
            const tooltip = document.getElementById('sf-baby-custom-tooltip');
            if (tooltip) tooltip.classList.remove('visible');
            const resultsPlaceholder = document.getElementById('sf-baby-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            const resultsContainer = document.getElementById('sf-baby-results-container');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            const resultsGrid = document.getElementById('sf-baby-results-grid');
            if (resultsGrid) resultsGrid.innerHTML = '';
        });
    }

    setupOptionButtons(document.getElementById('sf-baby-gender-options'));
    setupOptionButtons(sfBabyThemeOptions);
    setupOptionButtons(document.getElementById('sf-baby-ratio-options'));
    setupOptionButtons(document.getElementById('sf-baby-decor-options'), true);

    if (sfBabyThemeOptions) {
        sfBabyThemeOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            if (button.dataset.value === 'Kustom') {
                if (sfBabyThemeCustomContainer) sfBabyThemeCustomContainer.classList.remove('hidden');
                const customInput = document.getElementById('sf-baby-theme-custom-input');
                if (customInput) customInput.focus();
            } else {
                if (sfBabyThemeCustomContainer) sfBabyThemeCustomContainer.classList.add('hidden');
            }
        });
    }

    if (sfBabyGenerateBtn) {
        sfBabyGenerateBtn.addEventListener('click', () => {
            const resultsPlaceholder = document.getElementById('sf-baby-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
            
            let gender = 'Laki-laki';
            const genderSelected = document.querySelector('#sf-baby-gender-options .selected');
            if (genderSelected) gender = genderSelected.dataset.value;

            let theme = 'Studio Putih Minimalis';
            const themeSelected = document.querySelector('#sf-baby-theme-options .selected');
            if (themeSelected) theme = themeSelected.dataset.value;

            if (theme === 'Kustom') {
                const customThemeInput = document.getElementById('sf-baby-theme-custom-input');
                theme = (customThemeInput && customThemeInput.value.trim()) || 'Studio Putih Minimalis dengan properti lucu';
            }

            let aspectRatio = '1:1';
            const ratioSelected = document.querySelector('#sf-baby-ratio-options .selected');
            if (ratioSelected) aspectRatio = ratioSelected.dataset.value;

            const nameInput = document.getElementById('sf-baby-name');
            const name = nameInput ? nameInput.value.trim() : '';

            const dobInput = document.getElementById('sf-baby-dob');
            const dob = dobInput ? dobInput.value.trim() : '';

            const decorSelected = document.querySelector('#sf-baby-decor-options .selected');
            const decor = decorSelected ? decorSelected.dataset.value : null;

            let prompt = `A professional studio photoshoot of the baby from the provided image. CRITICAL: Retain the baby's exact face and features. The baby is a ${gender}. The clothing, props, and overall theme should be suitable for a baby ${gender}.
            Theme: ${theme}. `;
            if (name) prompt += `Elegantly add the name "${name}" in a soft, beautiful font. `;
            if (dob) prompt += `Elegantly add the birth date "${dob}" in a soft, beautiful font. `;
            if (decor) prompt += `Include gentle decorations like flowers, soft pillows, or stuffed animals, fitting for a baby ${gender}. `;
            prompt += `The final image must be high-quality, photorealistic, and heartwarming.`;
            
            const countSlider = document.getElementById('bb-count-slider');
            const numOutputs = countSlider ? parseInt(countSlider.value) : 1;
            
            generatePhotographerImage('baby', prompt, sfBabyData.data, aspectRatio, null, numOutputs);
        });
    }

    function setBabyImageData(data) {
        sfBabyData.data = data;
        if (sfBabyPreview) sfBabyPreview.src = data.dataUrl;
        if (sfBabyPlaceholder) sfBabyPlaceholder.classList.add('hidden');
        if (sfBabyPreview) sfBabyPreview.classList.remove('hidden');
        if (sfBabyRemoveBtn) sfBabyRemoveBtn.classList.remove('hidden');
        sfBabyData.isValid = true;
        sfBabyUpdateBtn();
    }

    return { setBabyImageData };
};
