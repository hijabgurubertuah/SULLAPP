window.initBabyV2 = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    generatePhotographerImage,
    autoSelectClosestRatio
}) {
    const sfBabyV2Input = document.getElementById('sf-baby-v2-input');
    const sfBabyV2UploadBox = document.getElementById('sf-baby-v2-upload-box');
    const sfBabyV2Preview = document.getElementById('sf-baby-v2-preview');
    const sfBabyV2Placeholder = document.getElementById('sf-baby-v2-placeholder');
    const sfBabyV2RemoveBtn = document.getElementById('sf-baby-v2-remove-btn');
    const sfBabyV2GenerateBtn = document.getElementById('sf-baby-v2-generate-btn');
    const sfBabyV2ThemeOptions = document.getElementById('sf-baby-v2-theme-options');
    let sfBabyV2Data = { data: null, isValid: false };

    function sfBabyV2UpdateBtn() { 
        if (sfBabyV2GenerateBtn) sfBabyV2GenerateBtn.disabled = !sfBabyV2Data.isValid; 
    }

    if (sfBabyV2Input && sfBabyV2UploadBox) {
        setupImageUpload(sfBabyV2Input, sfBabyV2UploadBox, async (data) => {
            sfBabyV2Data.data = data;
            if (sfBabyV2Preview) sfBabyV2Preview.src = data.dataUrl;
            if (sfBabyV2Placeholder) sfBabyV2Placeholder.classList.add('hidden');
            if (sfBabyV2Preview) sfBabyV2Preview.classList.remove('hidden');
            if (sfBabyV2RemoveBtn) sfBabyV2RemoveBtn.classList.remove('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('sf-baby-v2-ratio-options'));
            sfBabyV2Data.isValid = true;
            sfBabyV2UpdateBtn();
        });
    }

    if (sfBabyV2RemoveBtn) {
        sfBabyV2RemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sfBabyV2Data = { data: null, isValid: false };
            if (sfBabyV2Input) sfBabyV2Input.value = '';
            if (sfBabyV2Preview) {
                sfBabyV2Preview.src = '#';
                sfBabyV2Preview.classList.add('hidden');
            }
            if (sfBabyV2Placeholder) sfBabyV2Placeholder.classList.remove('hidden');
            sfBabyV2RemoveBtn.classList.add('hidden');
            sfBabyV2UpdateBtn();
            const resultsPlaceholder = document.getElementById('sf-baby-v2-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            const resultsContainer = document.getElementById('sf-baby-v2-results-container');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            const resultsGrid = document.getElementById('sf-baby-v2-results-grid');
            if (resultsGrid) resultsGrid.innerHTML = '';
        });
    }

    setupOptionButtons(sfBabyV2ThemeOptions);
    setupOptionButtons(document.getElementById('sf-baby-v2-ratio-options'));

    // Slider update
    const countSlider = document.getElementById('baby-v2-count-slider');
    const countValue = document.getElementById('baby-v2-count-value');
    if (countSlider && countValue) {
        countSlider.addEventListener('input', () => {
            const val = parseInt(countSlider.value);
            countValue.textContent = `${val} Gambar`;
            
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;
            
            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) {
                        upgradeVipModal.classList.add('active');
                    }
                }
                countSlider.value = 1;
                countValue.textContent = '1 Gambar';
            }
        });
    }

    if (sfBabyV2GenerateBtn) {
        sfBabyV2GenerateBtn.addEventListener('click', () => {
            // Check VIP status first - Pro version should always show upgrade modal
            const isVip = window.IS_VIP_APP === true;
            
            if (!isVip) {
                const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                if (upgradeVipModal) {
                    upgradeVipModal.classList.add('active');
                } else if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                }
                return;
            }
            
            const resultsPlaceholder = document.getElementById('sf-baby-v2-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
            
            let theme = 'Doraemon theme with cute blue robot cat elements, Japanese manga style';
            const themeSelected = document.querySelector('#sf-baby-v2-theme-options .selected');
            if (themeSelected) theme = themeSelected.dataset.value;

            let aspectRatio = '1:1';
            const ratioSelected = document.querySelector('#sf-baby-v2-ratio-options .selected');
            if (ratioSelected) aspectRatio = ratioSelected.dataset.value;

            const nameInput = document.getElementById('sf-baby-v2-name');
            const name = nameInput ? nameInput.value.trim() : '';

            const ageInput = document.getElementById('sf-baby-v2-age');
            const age = ageInput ? ageInput.value.trim() : '';

            let prompt = `Create a professional, ultra-cute baby photoshoot with the baby from the provided image. 
CRITICAL: You MUST preserve the baby's exact face, facial features, and identity from the source image.

Theme: ${theme}

The image should feature:
- A beautiful, colorful frame border matching the theme
- Multiple smaller circular photo frames within the design showing the same baby in cute poses
- The baby's photo as the main centerpiece
- Theme-appropriate decorative elements, characters, and patterns
- Vibrant, cheerful colors matching the character theme
- Professional studio quality with perfect lighting`;

            if (name) {
                prompt += `\n- The baby's name "${name}" displayed elegantly in the design`;
            }
            if (age) {
                prompt += `\n- Age or birth date "${age}" shown beautifully in the layout`;
            }

            prompt += `\n\nStyle: Playful, colorful, professional baby photography with cartoon character theme integration.
The final result should look like a premium baby photo frame/poster with multiple photo spots and decorative themed elements.
High quality, photorealistic baby with stylized themed background and frame design.`;
            
            const numOutputs = countSlider ? parseInt(countSlider.value) : 1;
            
            generatePhotographerImage('baby-v2', prompt, sfBabyV2Data.data, aspectRatio, null, numOutputs);
        });
    }

    function setBabyV2ImageData(data) {
        sfBabyV2Data.data = data;
        if (sfBabyV2Preview) sfBabyV2Preview.src = data.dataUrl;
        if (sfBabyV2Placeholder) sfBabyV2Placeholder.classList.add('hidden');
        if (sfBabyV2Preview) sfBabyV2Preview.classList.remove('hidden');
        if (sfBabyV2RemoveBtn) sfBabyV2RemoveBtn.classList.remove('hidden');
        sfBabyV2Data.isValid = true;
        sfBabyV2UpdateBtn();
    }

    return { setBabyV2ImageData };
};
