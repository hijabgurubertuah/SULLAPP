window.initUmrah = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    generatePhotographerImage,
    autoSelectClosestRatio
}) {
    const sfUmrahInput = document.getElementById('sf-umrah-input');
    const sfUmrahUploadBox = document.getElementById('sf-umrah-upload-box');
    const sfUmrahPreview = document.getElementById('sf-umrah-preview');
    const sfUmrahPlaceholder = document.getElementById('sf-umrah-placeholder');
    const sfUmrahRemoveBtn = document.getElementById('sf-umrah-remove-btn');
    const sfUmrahGenerateBtn = document.getElementById('sf-umrah-generate-btn');
    const sfUmrahResultCountSlider = document.getElementById('sf-umrah-result-count-slider');
    const sfUmrahResultCountDisplay = document.getElementById('sf-umrah-result-count-display');
    let sfUmrahData = { data: null, isValid: false };

    function sfUmrahUpdateBtn() { 
        if (sfUmrahGenerateBtn) sfUmrahGenerateBtn.disabled = !sfUmrahData.isValid; 
    }

    if (sfUmrahInput && sfUmrahUploadBox) {
        setupImageUpload(sfUmrahInput, sfUmrahUploadBox, async (data) => {
            sfUmrahData.data = data;
            if (sfUmrahPreview) sfUmrahPreview.src = data.dataUrl;
            if (sfUmrahPlaceholder) sfUmrahPlaceholder.classList.add('hidden');
            if (sfUmrahPreview) sfUmrahPreview.classList.remove('hidden');
            if (sfUmrahRemoveBtn) sfUmrahRemoveBtn.classList.remove('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('sf-umrah-ratio-options'));
            sfUmrahData.isValid = true;
            sfUmrahUpdateBtn();
        });
    }

    if (sfUmrahRemoveBtn) {
        sfUmrahRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sfUmrahData = { data: null, isValid: false };
            if (sfUmrahInput) sfUmrahInput.value = '';
            if (sfUmrahPreview) {
                sfUmrahPreview.src = '#';
                sfUmrahPreview.classList.add('hidden');
            }
            if (sfUmrahPlaceholder) sfUmrahPlaceholder.classList.remove('hidden');
            sfUmrahRemoveBtn.classList.add('hidden');
            sfUmrahUpdateBtn();
            const resultsPlaceholder = document.getElementById('sf-umrah-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            const resultsContainer = document.getElementById('sf-umrah-results-container');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            const resultsGrid = document.getElementById('sf-umrah-results-grid');
            if (resultsGrid) resultsGrid.innerHTML = '';
        });
    }

    setupOptionButtons(document.getElementById('sf-umrah-gender-options'));
    setupOptionButtons(document.getElementById('sf-umrah-attire-options'));
    setupOptionButtons(document.getElementById('sf-umrah-ratio-options'));
    setupOptionButtons(document.getElementById('sf-umrah-theme-options'));

    if (sfUmrahResultCountSlider && sfUmrahResultCountDisplay) {
        sfUmrahResultCountSlider.addEventListener('input', function() {
            sfUmrahResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    if (sfUmrahGenerateBtn) {
        sfUmrahGenerateBtn.addEventListener('click', () => {
            const resultsPlaceholder = document.getElementById('sf-umrah-results-placeholder');
            if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
            
            let gender = 'Laki-laki';
            const genderSelected = document.querySelector('#sf-umrah-gender-options .selected');
            if (genderSelected) gender = genderSelected.dataset.value;

            let attire = 'pakaian Ihram putih yang sesuai';
            const attireSelected = document.querySelector('#sf-umrah-attire-options .selected');
            if (attireSelected) attire = attireSelected.dataset.value;

            let aspectRatio = '1:1';
            const ratioSelected = document.querySelector('#sf-umrah-ratio-options .selected');
            if (ratioSelected) aspectRatio = ratioSelected.dataset.value;

            let theme = 'Gaya pemotretan modern & profesional...';
            const themeSelected = document.querySelector('#sf-umrah-theme-options .selected');
            if (themeSelected) theme = themeSelected.dataset.value;

            // Enhanced detailed attire instructions
            const attireDetails = {
                'pakaian Ihram putih yang sesuai': gender === 'Laki-laki' 
                    ? 'authentic white Ihram clothing (two white unstitched cloth pieces: izar wrapped around waist reaching ankles, and rida draped over left shoulder leaving right shoulder bare). No stitched clothing, no headcovering. Simple leather sandals. Clean, pristine white fabric with realistic texture and natural folds.'
                    : 'complete Ihram attire for women: long white or cream abaya/jilbab covering entire body except face and hands, white hijab fully covering hair and neck with no strands visible, modest and loose-fitting garments. Clean, pristine fabric with natural draping and realistic texture.',
                'pakaian bebas yang sopan (misal: kemeja koko atau batik untuk pria, gamis atau abaya untuk wanita)': gender === 'Laki-laki'
                    ? 'modest Islamic attire: clean pressed koko shirt (traditional Muslim shirt with mandarin collar) or elegant batik shirt with Islamic patterns, paired with dark trousers or sarong. Optional: traditional kopiah (Islamic cap) or turban. Neat, respectful appearance with quality fabric textures.'
                    : 'elegant modest Islamic clothing: flowing abaya or gamis (long dress) in solid colors (black, navy, burgundy, or earth tones) with beautiful fabric texture, full hijab covering hair completely with elegant draping, or optional niqab. Modest, graceful, and dignified appearance with high-quality fabric details.'
            };

            const detailedAttire = attireDetails[attire] || attire;
            
            let prompt = `Create an ultra-realistic, professional-quality photograph of the person from the uploaded image in a sacred Umrah/Hajj pilgrimage setting.

CRITICAL FACE PRESERVATION:
- The person's face MUST be EXACTLY preserved from the uploaded image with 100% accuracy
- Maintain precise facial features, skin tone, eye color, nose shape, lip shape, facial structure, and all unique characteristics
- Keep natural facial expressions and authentic appearance
- NO alterations to facial identity whatsoever - this is paramount
- Ensure perfect facial likeness and recognition

SUBJECT DETAILS:
- Gender: ${gender}
- Clothing: ${detailedAttire}
- Natural, respectful pose appropriate for the sacred location
- Authentic body proportions and realistic human anatomy
- Natural skin tones with proper lighting and subtle skin texture
- Genuine emotional expression showing reverence, peace, and spiritual devotion

SCENE AND LOCATION:
${theme}

PHOTOGRAPHY QUALITY REQUIREMENTS:
- Professional DSLR camera quality with tack-sharp focus on the subject
- Perfect exposure with balanced highlights and shadows
- Natural depth of field with subject in sharp focus and background appropriately blurred
- Realistic lighting that matches the environment (warm mosque lighting, golden hour sunlight, or natural daylight)
- Proper white balance for accurate color representation
- No artificial or unrealistic lighting effects
- Professional portrait composition following rule of thirds
- Appropriate framing with subject well-positioned in the scene

TECHNICAL SPECIFICATIONS:
- Ultra-high resolution with crisp, sharp details throughout
- Photorealistic rendering with natural textures (fabric, skin, architecture, marble, etc.)
- Accurate perspective and scale relative to the environment
- Realistic shadows and reflections matching light sources
- Natural color grading with warm, spiritual tones
- No visible AI artifacts, distortions, or unnatural elements
- Professional post-processing with subtle enhancements only

ATMOSPHERE AND AUTHENTICITY:
- Deeply respectful and reverent spiritual atmosphere
- Authentic Islamic architectural details with accurate proportions
- Realistic crowd elements if present (other pilgrims in natural poses)
- Cultural authenticity in all visual elements
- Peaceful, serene, and sacred ambiance
- Genuine religious and spiritual context
- NO disrespectful or inappropriate elements

OUTPUT QUALITY:
- Magazine-quality professional photograph
- Print-ready resolution and clarity
- Natural, believable composition as if taken by a professional photographer
- Perfect integration of subject into the sacred environment
- Seamless, realistic, and spiritually appropriate final image
- Ready for personal keepsake or sharing with family and friends`;

            
            const numOutputs = parseInt(sfUmrahResultCountSlider.value) || 1;
            generatePhotographerImage('umrah', prompt, sfUmrahData.data, aspectRatio, null, numOutputs);
        });
    }

    function setUmrahImageData(data) {
        sfUmrahData.data = data;
        if (sfUmrahPreview) sfUmrahPreview.src = data.dataUrl;
        if (sfUmrahPlaceholder) sfUmrahPlaceholder.classList.add('hidden');
        if (sfUmrahPreview) sfUmrahPreview.classList.remove('hidden');
        if (sfUmrahRemoveBtn) sfUmrahRemoveBtn.classList.remove('hidden');
        sfUmrahData.isValid = true;
        sfUmrahUpdateBtn();
    }

    return { setUmrahImageData };
};