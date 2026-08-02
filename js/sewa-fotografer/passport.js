window.initPassport = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    generatePhotographerImage
}) {
    const sfPassportAttireOptions = document.getElementById('sf-passport-attire-options');
    const sfPassportSchoolContainer = document.getElementById('sf-passport-school-options-container');
    const sfPassportSchoolOptions = document.getElementById('sf-passport-school-options');
    
    const sfPassportInput = document.getElementById('sf-passport-input');
    const sfPassportUploadBox = document.getElementById('sf-passport-upload-box');
    const sfPassportPreview = document.getElementById('sf-passport-preview');
    const sfPassportPlaceholder = document.getElementById('sf-passport-placeholder');
    const sfPassportRemoveBtn = document.getElementById('sf-passport-remove-btn');
    const sfPassportGenerateBtn = document.getElementById('sf-passport-generate-btn');
    const sfPassportResultCountSlider = document.getElementById('sf-passport-result-count-slider');
    const sfPassportResultCountDisplay = document.getElementById('sf-passport-result-count-display');
    const sfPassportCustomAttireContainer = document.getElementById('sf-passport-custom-attire-container');
    const sfPassportCustomAttireRefInput = document.getElementById('sf-passport-custom-attire-ref-input');
    const sfPassportCustomAttireRefUploadBox = document.getElementById('sf-passport-custom-attire-ref-upload-box');
    const sfPassportCustomAttireRefPreview = document.getElementById('sf-passport-custom-attire-ref-preview');
    const sfPassportCustomAttireRefPlaceholder = document.getElementById('sf-passport-custom-attire-ref-placeholder');
    const sfPassportCustomAttireRefRemoveBtn = document.getElementById('sf-passport-custom-attire-ref-remove-btn');
    const sfPassportBgOptions = document.getElementById('sf-passport-bg-options');
    const sfPassportCustomBgContainer = document.getElementById('sf-passport-custom-bg-container');
    const sfPassportCustomBgColor = document.getElementById('sf-passport-custom-bg-color');
    const sfPassportCustomBgText = document.getElementById('sf-passport-custom-bg-text');
    
    let sfPassportData = { data: null, isValid: false };
    let sfPassportCustomRefData = null;
    
    function sfPassportUpdateBtn() { sfPassportGenerateBtn.disabled = !sfPassportData.isValid; }
    
    setupImageUpload(sfPassportInput, sfPassportUploadBox, async (data) => {
        sfPassportData.data = data;
        sfPassportPreview.src = data.dataUrl;
        sfPassportPlaceholder.classList.add('hidden');
        sfPassportPreview.classList.remove('hidden');
        sfPassportRemoveBtn.classList.remove('hidden');
        sfPassportData.isValid = true;
        sfPassportUpdateBtn();
    });
    
    sfPassportRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfPassportData = { data: null, isValid: false };
        sfPassportInput.value = '';
        sfPassportPreview.src = '#';
        sfPassportPreview.classList.add('hidden');
        sfPassportPlaceholder.classList.remove('hidden');
        sfPassportRemoveBtn.classList.add('hidden');
        sfPassportUpdateBtn();
        document.getElementById('sf-passport-results-placeholder').classList.remove('hidden');
        document.getElementById('sf-passport-results-container').classList.add('hidden');
        document.getElementById('sf-passport-results-grid').innerHTML = '';
    });
    
    setupOptionButtons(sfPassportBgOptions);
    setupOptionButtons(sfPassportAttireOptions);
    
    // Handle custom background color toggle
    if (sfPassportBgOptions) {
        sfPassportBgOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            if (button.dataset.value === 'Kustom') {
                sfPassportCustomBgContainer.classList.remove('hidden');
            } else {
                sfPassportCustomBgContainer.classList.add('hidden');
            }
        });
    }
    setupOptionButtons(sfPassportSchoolOptions);
    setupOptionButtons(document.getElementById('sf-passport-size-options'));
    
    if (sfPassportResultCountSlider && sfPassportResultCountDisplay) {
        sfPassportResultCountSlider.addEventListener('input', function() {
            sfPassportResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }
    
    sfPassportAttireOptions.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        if (button.dataset.value === 'Sekolah') {
            sfPassportSchoolContainer.classList.remove('hidden');
        } else {
            sfPassportSchoolContainer.classList.add('hidden');
        }
        if (button.dataset.value === 'Kustom') {
            sfPassportCustomAttireContainer.classList.remove('hidden');
        } else {
            sfPassportCustomAttireContainer.classList.add('hidden');
        }
    });
    
    setupImageUpload(sfPassportCustomAttireRefInput, sfPassportCustomAttireRefUploadBox, (data) => {
        sfPassportCustomRefData = data;
        sfPassportCustomAttireRefPreview.src = data.dataUrl;
        sfPassportCustomAttireRefPlaceholder.classList.add('hidden');
        sfPassportCustomAttireRefPreview.classList.remove('hidden');
        sfPassportCustomAttireRefRemoveBtn.classList.remove('hidden');
    });
    
    sfPassportCustomAttireRefRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfPassportCustomRefData = null;
        sfPassportCustomAttireRefInput.value = '';
        sfPassportCustomAttireRefPreview.src = '#';
        sfPassportCustomAttireRefPreview.classList.add('hidden');
        sfPassportCustomAttireRefPlaceholder.classList.remove('hidden');
        sfPassportCustomAttireRefRemoveBtn.classList.add('hidden');
    });
    
    sfPassportGenerateBtn.addEventListener('click', () => {
        document.getElementById('sf-passport-results-placeholder').classList.add('hidden');
        let background = document.querySelector('#sf-passport-bg-options .selected').dataset.value;
        
        // Handle custom background color
        if (background === 'Kustom') {
            const customText = sfPassportCustomBgText.value.trim();
            if (customText) {
                background = customText;
            } else {
                // Use color picker value, convert hex to color name approximation
                const hexColor = sfPassportCustomBgColor.value;
                background = `solid color ${hexColor}`;
            }
        }
        let attire = document.querySelector('#sf-passport-attire-options .selected').dataset.value;
        let size = document.querySelector('#sf-passport-size-options .selected').dataset.value;
        const aspectRatioForApi = (size === '9:16' || size === '4:6') ? '9:16' : size;
        let customRefDataForApi = null;
        const noChangeAttire = !!document.getElementById('sf-passport-attire-nochange') && document.getElementById('sf-passport-attire-nochange').checked;
        if (!noChangeAttire) {
            if (attire === 'Sekolah') {
                const schoolLevel = document.querySelector('#sf-passport-school-options .selected').dataset.value;
                attire = `Ganti dengan seragam sekolah ${schoolLevel} khas Indonesia`;
            } else if (attire === 'Kustom') {
                const customText = document.getElementById('sf-passport-custom-attire-input').value.trim();
                if (sfPassportCustomRefData) {
                    attire = `Ganti dengan pakaian yang sangat mirip dengan gambar referensi pakaian (gambar ketiga).`;
                    if (customText) {
                        attire += ` Deskripsi tambahan: ${customText}.`;
                    }
                    customRefDataForApi = sfPassportCustomRefData;
                } else if (customText) {
                    attire = `Ganti dengan pakaian berikut: ${customText}.`;
                } else {
                    attire = 'Ganti dengan pakaian formal standar (kemeja putih).';
                }
            } else {
                attire = `Ganti dengan ${attire}`;
            }
        } else {
            attire = null;
        }
        let prompt = `Create a formal passport photo using the person from the image. CRITICAL: Do not alter the person's face.`;
        const clothingText = noChangeAttire ? 'Clothing: Keep the original clothing exactly as-is. Do not change or replace clothing.' : `Clothing: ${attire}.`;
        if (background === 'Hitam Putih') {
            prompt += `
                Background: Replace the background with a solid plain color.
                ${clothingText}
                The final image must be a clear, front-facing headshot with professional lighting.
                CRITICAL: The ENTIRE image (face, clothing, background) MUST be Black and White (Grayscale). Do not produce any color.`;
        } else {
            // Check if background contains hex color code
            if (background.includes('#')) {
                prompt += `
                Background: Replace the background with a ${background}.
                ${clothingText}
                The final image must be a clear, front-facing headshot with professional lighting.`;
            } else {
                prompt += `
                Background: Replace the background with a solid ${background} color.
                ${clothingText}
                The final image must be a clear, front-facing headshot with professional lighting.`;
            }
        }
        const numOutputs = parseInt(sfPassportResultCountSlider.value) || 1;
        generatePhotographerImage('passport', prompt, sfPassportData.data, aspectRatioForApi, customRefDataForApi, numOutputs);
    });

    function setPassportImageData(data) {
        sfPassportData.data = data;
        sfPassportPreview.src = data.dataUrl;
        sfPassportPlaceholder.classList.add('hidden');
        sfPassportPreview.classList.remove('hidden');
        sfPassportRemoveBtn.classList.remove('hidden');
        sfPassportData.isValid = true;
        sfPassportUpdateBtn();
    }

    return {
        setPassportImageData
    };
};
