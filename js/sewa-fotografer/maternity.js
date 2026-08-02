window.initMaternity = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    generatePhotographerImage,
    autoSelectClosestRatio
}) {
    const sfMaternityInput = document.getElementById('sf-maternity-input');
    const sfMaternityUploadBox = document.getElementById('sf-maternity-upload-box');
    const sfMaternityPreview = document.getElementById('sf-maternity-preview');
    const sfMaternityPlaceholder = document.getElementById('sf-maternity-placeholder');
    const sfMaternityRemoveBtn = document.getElementById('sf-maternity-remove-btn');
    const sfMaternityOptInput = document.getElementById('sf-maternity-opt-input');
    const sfMaternityOptUploadBox = document.getElementById('sf-maternity-opt-upload-box');
    const sfMaternityOptPreview = document.getElementById('sf-maternity-opt-preview');
    const sfMaternityOptPlaceholder = document.getElementById('sf-maternity-opt-placeholder');
    const sfMaternityOptRemoveBtn = document.getElementById('sf-maternity-opt-remove-btn');
    const sfMaternityGenerateBtn = document.getElementById('sf-maternity-generate-btn');
    const sfMaternityResultCountSlider = document.getElementById('maternity-result-count-slider');
    const sfMaternityResultCountDisplay = document.getElementById('maternity-result-count-display');

    if (sfMaternityResultCountSlider && sfMaternityResultCountDisplay) {
        sfMaternityResultCountSlider.addEventListener('input', function() {
            sfMaternityResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }
    
    let sfMaternityData = { data: null, isValid: false };
    let sfMaternityOptData = null;
    
    function sfMaternityUpdateBtn() { sfMaternityGenerateBtn.disabled = !sfMaternityData.isValid; }
    
    setupImageUpload(sfMaternityInput, sfMaternityUploadBox, async (data) => {
        sfMaternityData.data = data;
        if (sfMaternityPreview) sfMaternityPreview.src = data.dataUrl;
        if (sfMaternityPlaceholder) sfMaternityPlaceholder.classList.add('hidden');
        if (sfMaternityPreview) sfMaternityPreview.classList.remove('hidden');
        if (sfMaternityRemoveBtn) sfMaternityRemoveBtn.classList.remove('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('sf-maternity-ratio-options'));
        sfMaternityData.isValid = true;
        sfMaternityUpdateBtn();
    });
    
    sfMaternityRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfMaternityData = { data: null, isValid: false };
        sfMaternityInput.value = '';
        if (sfMaternityPreview) sfMaternityPreview.src = '#';
        if (sfMaternityPreview) sfMaternityPreview.classList.add('hidden');
        if (sfMaternityPlaceholder) sfMaternityPlaceholder.classList.remove('hidden');
        if (sfMaternityRemoveBtn) sfMaternityRemoveBtn.classList.add('hidden');
        sfMaternityPreview.src = '#';
        sfMaternityPreview.classList.add('hidden');
        sfMaternityPlaceholder.classList.remove('hidden');
        sfMaternityRemoveBtn.classList.add('hidden');
        sfMaternityUpdateBtn();
        document.getElementById('sf-maternity-results-placeholder').classList.remove('hidden');
        document.getElementById('sf-maternity-results-container').classList.add('hidden');
        document.getElementById('sf-maternity-results-grid').innerHTML = '';
    });
    
    setupImageUpload(sfMaternityOptInput, sfMaternityOptUploadBox, (data) => {
        sfMaternityOptData = data;
        sfMaternityOptPreview.src = data.dataUrl;
        sfMaternityOptPlaceholder.classList.add('hidden');
        sfMaternityOptPreview.classList.remove('hidden');
        sfMaternityOptRemoveBtn.classList.remove('hidden');
    });
    
    sfMaternityOptRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfMaternityOptData = null;
        sfMaternityOptInput.value = '';
        sfMaternityOptPreview.src = '#';
        sfMaternityOptPreview.classList.add('hidden');
        sfMaternityOptPlaceholder.classList.remove('hidden');
        sfMaternityOptRemoveBtn.classList.add('hidden');
    });
    
    setupOptionButtons(document.getElementById('sf-maternity-studio-options'));
    setupOptionButtons(document.getElementById('sf-maternity-ratio-options'));
    
    sfMaternityGenerateBtn.addEventListener('click', () => {
        document.getElementById('sf-maternity-results-placeholder').classList.add('hidden');
        const pose = document.getElementById('sf-maternity-pose-select').value;
        const wardrobe = document.getElementById('sf-maternity-wardrobe-select').value;
        const studio = document.querySelector('#sf-maternity-studio-options .selected').dataset.value;
        const custom = document.getElementById('sf-maternity-custom-input').value.trim();
        const aspectRatio = document.querySelector('#sf-maternity-ratio-options .selected').dataset.value;
        let prompt = `Create a professional studio maternity photoshoot of the woman from the provided image.
            CRITICAL: Preserve the woman's exact face and facial features.
            Pose: ${pose}. Wardrobe: Wearing ${wardrobe}.
            Setting/Background: ${studio}. The lighting should be soft, warm, and elegant suitable for maternity.
            Style: Professional photography, high resolution, emotive and beautiful.`;
        if (custom) prompt += ` Additional instructions: ${custom}.`;
        const numOutputs = sfMaternityResultCountSlider ? parseInt(sfMaternityResultCountSlider.value) : 1;
        if (sfMaternityOptData) {
            prompt += ` Important: Include the person(s) from the second provided image (partner/child) in the scene, interacting lovingly with the pregnant woman.`;
            generatePhotographerImage('maternity', prompt, sfMaternityData.data, aspectRatio, sfMaternityOptData, numOutputs);
        } else {
            generatePhotographerImage('maternity', prompt, sfMaternityData.data, aspectRatio, null, numOutputs);
        }
    });

    function setMaternityImageData(data) {
        sfMaternityData.data = data;
        sfMaternityPreview.src = data.dataUrl;
        sfMaternityPlaceholder.classList.add('hidden');
        sfMaternityPreview.classList.remove('hidden');
        sfMaternityRemoveBtn.classList.remove('hidden');
        sfMaternityData.isValid = true;
        sfMaternityUpdateBtn();
    }

    return { setMaternityImageData };
};
