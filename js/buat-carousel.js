window.initBuatCarousel = function ({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    API_KEY,
    CHAT_URL,
    GENERATE_URL,
    getApiErrorMessage,
    showContentModal,
    downloadDataURI,
    JSZip,
    saveAs,
    doneSound,
    errorSound
}) {
    const crslImageInput = document.getElementById('crsl-image-input');
    const crslUploadBox = document.getElementById('crsl-upload-box');
    const crslPreview = document.getElementById('crsl-preview');
    const crslPlaceholder = document.getElementById('crsl-placeholder');
    const crslRemoveBtn = document.getElementById('crsl-remove-btn');
    const crslSlidesSlider = document.getElementById('crsl-slides-slider');
    const crslSlidesDisplay = document.getElementById('crsl-slides-display');
    const crslRatioOptions = document.getElementById('crsl-ratio-options');
    const crslStyleOptions = document.getElementById('crsl-style-options');
    const crslCustomStyleContainer = document.getElementById('crsl-custom-style-container');
    const crslCustomStyleInput = document.getElementById('crsl-custom-style-input');
    const crslScriptEditorContainer = document.getElementById('crsl-script-editor-container');
    const crslGenerateBtn = document.getElementById('crsl-generate-btn');
    const crslResultsContainer = document.getElementById('crsl-results-container');
    const crslResultsGrid = document.getElementById('crsl-results-grid');
    const crslScriptSection = document.getElementById('crsl-script-section');
    const crslAutoPopulateBtn = document.getElementById('crsl-auto-populate-btn');
    const crslAutoScriptBtn = document.getElementById('crsl-auto-script-btn');
    const crslNameInput = document.getElementById('crsl-name-input');
    const crslDescInput = document.getElementById('crsl-desc-input');
    const crslScriptTypeOptions = document.getElementById('crsl-script-type-options');
    const crslKustomScriptInput = document.getElementById('crsl-kustom-script-input');
    const crslKustomScriptContainer = document.getElementById('crsl-kustom-script-container');

    if (crslSlidesSlider) {
        crslSlidesSlider.addEventListener('input', () => {
            if (crslSlidesDisplay) crslSlidesDisplay.textContent = `${crslSlidesSlider.value} Slide`;
            
            // VIP Logic
            if (parseInt(crslSlidesSlider.value) > 1 && typeof showUpgradeVipPopup === 'function') {
                showUpgradeVipPopup();
                crslSlidesSlider.value = 1;
                if (crslSlidesDisplay) crslSlidesDisplay.textContent = "1 Slide";
            }
        });
    }

    let crslImageData = null;
    const generatedCarousels = {};
    
    // Model selection elements
    const modelOptions = document.getElementById('crsl-model-options');
    const psHint = document.getElementById('crsl-ps-hint');
    let privateServerActive = false;
    
    // Model endpoints mapping
    const crslModelEndpoints = {
        'nanobanana': 'generate',
        'nanobanana2': 'imagegemini2'
    };
    
    // Get endpoint based on selected model
    function getEndpointForModel() {
        const selectedModel = modelOptions ? (modelOptions.querySelector('.selected')?.dataset.value || 'nanobanana') : 'nanobanana';
        const ep = crslModelEndpoints[selectedModel] || 'generate';
        
        // Gunakan BASE_URL_GROK hanya untuk imagegrok
        const grokEndpoints = ['imagegrok'];
        if (grokEndpoints.includes(ep) && typeof BASE_URL_GROK !== 'undefined' && BASE_URL_GROK) {
            return `${BASE_URL_GROK}/${ep}`;
        }
        
        // For other endpoints, use BASE_URL
        if (ep !== 'generate') {
            return `${BASE_URL}/${ep}`;
        }
        
        // Hanya nanobanana (generate) yang pakai GENERATE_URL
        return GENERATE_URL;
    }
    
    // Check Private Server status
    async function checkPrivateServerStatus() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) {
            privateServerActive = false;
            return;
        }
        
        try {
            const result = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
            privateServerActive = result.success && result.is_active;
        } catch (e) {
            console.error('Failed to check Private Server status', e);
            privateServerActive = false;
        }
    }
    
    // Handle model selection
    if (modelOptions) {
        modelOptions.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            const modelValue = btn.dataset.value;
            const isLocked = btn.dataset.locked === 'true';
            
            if (isLocked && !privateServerActive) {
                if (psHint) psHint.classList.remove('hidden');
                if (typeof window.showUpgradePrivateServerPopup === 'function') {
                    window.showUpgradePrivateServerPopup();
                }
                return;
            }
            
            modelOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            if (psHint) psHint.classList.add('hidden');
        });
    }
    
    // Initialize Private Server check
    checkPrivateServerStatus();

    function crslUpdateButtons() {
        const hasImage = !!crslImageData;
        const scriptTextareas = crslScriptEditorContainer.querySelectorAll('textarea');
        const scriptOk = scriptTextareas.length > 0 && Array.from(scriptTextareas).every(ta => ta.value.trim() !== '');
        
        // Check if we have enough script inputs for the slide count
        // Actually, allow generating without scripts? The code says:
        // const scriptTexts = ... map(ta => ta.value.trim());
        // So scripts can be empty strings.
        // But usually we want at least the image.
        
        crslGenerateBtn.disabled = !hasImage;
    }

    if (crslAutoPopulateBtn) {
        crslAutoPopulateBtn.addEventListener('click', async () => {
            if (!crslImageData) {
                alert("Upload gambar dulu ya untuk analisis otomatis!");
                return;
            }
            const originalHTML = crslAutoPopulateBtn.innerHTML;
            crslAutoPopulateBtn.disabled = true;
            crslAutoPopulateBtn.innerHTML = `<div class="spinner"></div>`;

            try {
                const formData = new FormData();
                formData.append('prompt', "Analyze this image. 1. Suggest a catchy and short product name (max 5 words). 2. Write a compelling product description (max 20 words). Both in Indonesian. Respond ONLY with a valid JSON object: {\"name\": \"...\", \"description\": \"...\"}. Do not wrap in markdown.");

                const byteCharacters = atob(crslImageData.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: crslImageData.mimeType });
                formData.append('images[]', blob, `image.jpg`);

                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: { 'X-API-Key': API_KEY },
                    body: formData
                });

                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                const result = await response.json();
                if (result.success && result.response) {
                    let data;
                    if (typeof result.response === 'object') {
                        data = result.response;
                    } else {
                        const responseStr = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                        let jsonStr = responseStr.trim().replace(/^```json/, '').replace(/```$/, '');
                        try {
                            data = JSON.parse(jsonStr);
                        } catch (e) {
                            console.warn("JSON Parse failed for auto populate", e);
                        }
                    }
                    if (data) {
                        if (data.name) crslNameInput.value = data.name;
                        if (data.description) crslDescInput.value = data.description;
                    }
                }
            } catch (error) {
                console.error("Auto Populate Error:", error);
                alert(error.message);
            } finally {
                crslAutoPopulateBtn.innerHTML = originalHTML;
                crslAutoPopulateBtn.disabled = false;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    setupOptionButtons(crslStyleOptions);
    crslStyleOptions.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button && button.dataset.value === 'custom') {
            crslCustomStyleContainer.classList.remove('hidden');
            crslCustomStyleInput.focus();
        } else {
            crslCustomStyleContainer.classList.add('hidden');
        }
    });

    crslCustomStyleInput.addEventListener('input', () => {
        const customStyleBtn = crslStyleOptions.querySelector('[data-value="custom"]');
        if (customStyleBtn && crslCustomStyleInput.value.trim()) {
            customStyleBtn.dataset.value = crslCustomStyleInput.value.trim();
        }
    });

    function crslDisplayScriptEditor() {
        const slideCount = parseInt(crslSlidesSlider.value);
        crslScriptEditorContainer.innerHTML = '';
        for (let i = 0; i < slideCount; i++) {
            const slideEl = document.createElement('div');
            slideEl.className = 'flex flex-col gap-1';
            slideEl.innerHTML = `
                <label for="crsl-slide-text-${i}" class="text-sm font-semibold text-gray-700">Slide ${i + 1} (Maksimal 15 kata)</label>
                <textarea id="crsl-slide-text-${i}" class="w-full p-2 text-sm rounded-lg" rows="2" placeholder="Isi konten slide (maksimal 15 kata)..."></textarea>
            `;
            crslScriptEditorContainer.appendChild(slideEl);
        }
        crslScriptEditorContainer.querySelectorAll('textarea').forEach(ta => {
            ta.addEventListener('input', () => {
                const words = ta.value.split(/\s+/).filter(w => w.length > 0);
                if (words.length > 15) {
                    ta.value = words.slice(0, 15).join(' ');
                }
                crslUpdateButtons();
            });
        });
        crslScriptEditorContainer.classList.remove('hidden');
        crslUpdateButtons();
    }

    setupImageUpload(crslImageInput, crslUploadBox, async (data) => {
        crslImageData = data;
        crslPreview.src = data.dataUrl;
        crslPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, crslRatioOptions);
        crslPreview.classList.remove('hidden');
        crslRemoveBtn.classList.remove('hidden');
        crslDisplayScriptEditor();
        crslUpdateButtons();
    });

    crslRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        crslImageData = null;
        crslImageInput.value = '';
        crslPreview.src = '#';
        crslPreview.classList.add('hidden');
        crslPlaceholder.classList.remove('hidden');
        crslRemoveBtn.classList.add('hidden');
        crslScriptEditorContainer.innerHTML = '';
        crslScriptEditorContainer.classList.add('hidden');
        crslUpdateButtons();
    });

    setupOptionButtons(crslRatioOptions);
    if (crslSlidesSlider) {
        crslSlidesSlider.addEventListener('input', () => {
            crslSlidesDisplay.textContent = crslSlidesSlider.value;
            if (crslImageData) crslDisplayScriptEditor();
        });
    }

    // Auto Script Logic
    if (crslScriptTypeOptions) {
        crslScriptTypeOptions.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && crslScriptTypeOptions.contains(button)) {
                Array.from(crslScriptTypeOptions.children).forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                if (button.dataset.type === 'kustom') {
                    crslKustomScriptContainer.classList.remove('hidden');
                } else {
                    crslKustomScriptContainer.classList.add('hidden');
                }
            }
        });
    }

    if (crslAutoScriptBtn) {
        crslAutoScriptBtn.addEventListener('click', async () => {
            if (!crslNameInput.value || !crslDescInput.value) {
                document.getElementById('crsl-auto-script-tooltip').classList.remove('hidden');
                setTimeout(() => document.getElementById('crsl-auto-script-tooltip').classList.add('hidden'), 3000);
                return;
            }

            const originalBtnHTML = crslAutoScriptBtn.innerHTML;
            crslAutoScriptBtn.disabled = true;
            crslAutoScriptBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menulis...</span>`;

            // Set placeholders
            const textareas = crslScriptEditorContainer.querySelectorAll('textarea');
            textareas.forEach(ta => {
                ta.value = "AI sedang menulis...";
                ta.disabled = true;
            });

            try {
                const slideCount = parseInt(crslSlidesSlider.value);
                let scriptType = crslScriptTypeOptions.querySelector('.selected').dataset.type;
                if (scriptType === 'kustom') {
                    scriptType = crslKustomScriptInput.value.trim() || 'Showcase';
                }

                const productName = crslNameInput.value;
                const productDesc = crslDescInput.value;

                const systemPrompt = `You are a specialized social media script generator.
TASK: Create a ${slideCount}-slide carousel script for "${productName}" (${productDesc}).
TYPE: ${scriptType}
LANGUAGE: Indonesian

CRITICAL OUTPUT RULES:
1. RETURN ONLY A RAW JSON ARRAY of strings.
2. NO conversational text (e.g., "Here is your script", "Tentu").
3. NO markdown formatting (no **bold**, no *italic*, no bullet points).
4. NO slide numbers, prefixes, or titles in the strings (e.g., NO "Slide 1:", NO "Judul:").
5. Each string must be short, punchy, and under 20 words.
6. If you cannot generate JSON, just list the raw text for each slide separated by newlines, without any labels.

EXAMPLE OUTPUT:
["script text slide pertama", "script text slide pertama", "script text slide pertama"]

GENERATE THE JSON ARRAY NOW:`;

                const userQuery = `Product: ${productName}\nDescription: ${productDesc}\nSlides: ${slideCount}`;

                const formData = new FormData();
                formData.append('prompt', systemPrompt + "\n\n" + userQuery);

                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': API_KEY
                    },
                    body: formData
                });

                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                const result = await response.json();

                if (result.success && result.response) {
                    let scriptArray = [];

                    // Check if response is already an array
                    if (Array.isArray(result.response)) {
                        scriptArray = result.response;
                    } else {
                        // Response is a string, parse it
                        const responseStr = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                        let jsonStr = responseStr.replace(/```json/g, '').replace(/```/g, '').trim();

                        // Strategy 1: Direct JSON Parse
                        try {
                            // Find first [ and last ]
                            const firstBracket = jsonStr.indexOf('[');
                            const lastBracket = jsonStr.lastIndexOf(']');
                            if (firstBracket !== -1 && lastBracket !== -1) {
                                const potentialJson = jsonStr.substring(firstBracket, lastBracket + 1);
                                scriptArray = JSON.parse(potentialJson);
                            } else {
                                throw new Error("No JSON brackets found");
                            }
                        } catch (e) {
                            console.warn("JSON Parse failed, trying Fallback Strategy 2 (Regex Extraction)", e);
                            
                            // Strategy 2: Regex for "Slide X:" or "**Slide X**" patterns
                            const lines = jsonStr.split(/\n\s*\n/);
                            if (lines.length >= slideCount) {
                                scriptArray = lines.filter(l => l.trim().length > 0).slice(0, slideCount);
                            } else {
                                // Fallback to line-by-line if double newline didn't give enough
                                scriptArray = jsonStr.split('\n').filter(line => line.trim().length > 5 && !line.toLowerCase().includes('slide') && !line.includes('Here is')).slice(0, slideCount);
                            }
                        }
                    }

                    if (Array.isArray(scriptArray) && scriptArray.length > 0) {
                        textareas.forEach((ta, index) => {
                            let content = scriptArray[index] || '';
                            if (typeof content !== 'string') content = JSON.stringify(content);
                            
                            // Aggressive Cleanup
                            content = content
                                .replace(/^Slide \d+[:.]?\s*/i, '') // Remove "Slide 1:"
                                .replace(/^\d+[:.]?\s*/, '')      // Remove "1."
                                .replace(/^["']|["']$/g, '')      // Remove quotes
                                .replace(/\*\*/g, '')             // Remove bold
                                .replace(/Title:|Judul:|Isi:|Content:/i, '') // Remove labels
                                .trim();

                            ta.value = content;
                        });
                    } else {
                         // Absolute fallback: just fill with raw response chunks
                        const chunks = jsonStr.split('\n').filter(x => x.trim().length > 10).slice(0, slideCount);
                        textareas.forEach((ta, index) => {
                            ta.value = chunks[index] || (index === 0 ? "Gagal memproses format AI. Coba lagi." : "");
                        });
                    }
                } else {
                    throw new Error(result.error || "Gagal membuat script");
                }
            } catch (error) {
                console.error("Auto Script Error:", error);
                alert("Gagal membuat script: " + error.message);
                textareas.forEach(ta => ta.value = "Gagal. Coba lagi.");
            } finally {
                crslAutoScriptBtn.innerHTML = originalBtnHTML;
                crslAutoScriptBtn.disabled = false;
                textareas.forEach(ta => ta.disabled = false);
                crslUpdateButtons();
                textareas.forEach(ta => ta.dispatchEvent(new Event('input', { bubbles: true })));
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    crslGenerateBtn.addEventListener('click', async () => {
        const originalBtnHTML = crslGenerateBtn.innerHTML;
        crslGenerateBtn.disabled = true;
        document.getElementById('crsl-results-placeholder').classList.add('hidden');
        const slideCount = parseInt(crslSlidesSlider.value);
        const aspectRatio = crslRatioOptions.querySelector('.selected').dataset.value;
        let style = crslStyleOptions.querySelector('.selected').dataset.value;
        if (style === 'custom') {
            style = crslCustomStyleInput.value.trim() || 'Minimalis & Cerah';
        }
        const scriptTexts = Array.from(crslScriptEditorContainer.querySelectorAll('textarea')).map(ta => ta.value.trim());
        const cleanProductName = 'carousel';
        crslGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Slide (0/${slideCount})</span>`;
        crslResultsContainer.classList.remove('hidden');
        crslResultsGrid.innerHTML = '';
        try {
            const [width, height] = aspectRatio.split(':').map(Number);
            const isPortrait = height > width;
            const frameClass = isPortrait ? 'desktop-carousel-frame' : '';
            const cardId = `carousel-result-${Date.now()}`;
            const resultCard = document.createElement('div');
            resultCard.id = cardId;
            resultCard.className = 'card p-4 space-y-3';
            resultCard.innerHTML = `
                    <div class="${frameClass}">
                        <div class="carousel-container ${getAspectRatioClass(aspectRatio)} bg-gray-200 flex items-center justify-center">
                            <div class="spinner"></div>
                        </div>
                    </div>
                    <div class="flex justify-between items-center mt-3">
                        <h4 class="font-semibold text-gray-800">Carousel - Gaya ${style}</h4>
                         <button data-carousel-id="${cardId}" class="crsl-open-download-btn result-action-btn download-btn" title="Unduh Semua Slide">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </button>
                    </div>
                `;
            crslResultsGrid.appendChild(resultCard);
            lucide.createIcons();
            let generatedImages = [];
            for (let i = 0; i < slideCount; i++) {
                const slideText = scriptTexts[i] || '';

                const words = slideText.split(/\s+/).filter(w => w.length > 0);
                const limitedText = words.slice(0, 15).join(' ');
                const slideData = await generateSingleCarouselSlide(i + 1, limitedText, style, aspectRatio);
                generatedImages.push({
                    src: `data:image/png;base64,${slideData}`,
                    title: `Slide ${i + 1}`,
                    text: limitedText
                });
                crslGenerateBtn.querySelector('span').textContent = `Membuat Slide (${i + 1}/${slideCount})`;
            }
            generatedCarousels[cardId] = {
                productName: cleanProductName,
                images: generatedImages
            };
            renderCarouselResult(cardId, generatedImages, style, aspectRatio);
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error("Error generating carousel:", error);
            crslResultsGrid.innerHTML = `<div class="col-span-1 text-center p-4 text-red-600"><p class="break-all">Gagal membuat carousel: ${error.message}</p></div>`;
        } finally {
            crslGenerateBtn.innerHTML = originalBtnHTML;
            crslUpdateButtons();
        }
    });

    async function generateSingleCarouselSlide(slideNumber, slideText, style, aspectRatio) {

        let finalPrompt = `Create a professional and visually appealing product marketing image for a carousel slide.
            - Product: Use the provided image as the central product.
            - Style: The overall aesthetic must be '${style}'.
            - Task: Create a unique background or scene that showcases the product. For this slide (number ${slideNumber}), create a slightly different composition or background to ensure variety.`;

        if (slideText && slideText.trim()) {
            finalPrompt += `
                 - CRITICAL: Add the following text directly onto the image in a visually appealing way: "${slideText}"
                 - The text should be clearly readable, well-positioned, and complement the overall design.
                 - Ensure the text integrates naturally with the product and background.`;
        }

        finalPrompt += `
            - The final image must have an aspect ratio of ${aspectRatio}.`;

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
        formData.append('images[]', base64ToBlob(crslImageData.base64, crslImageData.mimeType));
        formData.append('instruction', finalPrompt);
        formData.append('aspectRatio', aspectRatio);

        const endpoint = getEndpointForModel();
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-API-Key': API_KEY
            },
            body: formData
        });

        if (!response.ok) throw new Error(await getApiErrorMessage(response));
        const result = await response.json();

        if (!result.success || !result.imageUrl) throw new Error("No image data from AI for this slide.");


        const imgResp = await fetch(result.imageUrl);
        const blob = await imgResp.blob();
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                resolve(base64data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function renderCarouselResult(cardId, images, style, aspectRatio) {
        const card = document.getElementById(cardId);
        if (!card) return;

        let currentIndex = 0;
        const slideCount = images.length;

        const slidesHTML = images.map((img, i) => `
            <div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                <img src="${img.src}" class="w-full h-full object-contain" alt="${img.title}">
            </div>
        `).join('');
        
        const dotsHTML = images.map((_, i) => `<div class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide-to="${i}"></div>`).join('');
        const carouselContainer = card.querySelector('.carousel-container');
        carouselContainer.innerHTML = `
            <div class="carousel-slides">${slidesHTML}</div>
            <button class="carousel-nav prev"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>
            <button class="carousel-nav next"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
            <div class="carousel-dots">${dotsHTML}</div>
        `;
        
        setupCarousel(cardId);
        lucide.createIcons();
    }

    function setupCarousel(carouselId) {
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;
        const slides = carousel.querySelector('.carousel-slides');
        const dots = carousel.querySelectorAll('.carousel-dot');
        let currentIndex = 0;
        const slideCount = dots.length;

        function goToSlide(index) {
            if (index < 0) index = slideCount - 1;
            if (index >= slideCount) index = 0;
            currentIndex = index;
            slides.style.transform = `translateX(-${currentIndex * 100}%)`;
            dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
        }

        carousel.querySelector('.prev').addEventListener('click', () => goToSlide(currentIndex - 1));
        carousel.querySelector('.next').addEventListener('click', () => goToSlide(currentIndex + 1));
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.slideTo);
                goToSlide(index);
            });
        });
    }

    document.body.addEventListener('click', (e) => {
        const openDownloadBtn = e.target.closest('.crsl-open-download-btn');
        if (openDownloadBtn) {
            e.preventDefault();
            const carouselId = openDownloadBtn.dataset.carouselId;
            showCarouselDownloadModal(carouselId);
        }
    });

    function showCarouselDownloadModal(carouselId) {
        const carouselData = generatedCarousels[carouselId];
        if (!carouselData) return;
        const productName = carouselData.productName;
        const images = carouselData.images;
        let slidesHTML = images.map((img, index) => `
                <div class="flex items-center justify-between p-2 bg-slate-700 rounded-md">
                    <div class="flex items-center gap-3">
                        <img src="${img.src}" class="w-12 h-12 object-cover rounded">
                        <span class="font-medium text-slate-300">${img.title}</span>
                    </div>
                    <button 
                        data-src="${img.src}" 
                        data-filename="${productName}_slide_${index + 1}.jpg"
                        class="crsl-individual-download-btn bg-slate-600 hover:bg-slate-500 text-white p-2 rounded-full" 
                        title="Unduh Slide ${index + 1} (JPG)">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </button>
                </div>
            `).join('');
        const bodyHTML = `
                <div class="space-y-4">
                     <button id="crsl-download-zip-btn" class="w-full flex items-center justify-center gap-2 bg-teal-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-700 transition">
                        <i data-lucide="file-archive" class="w-5 h-5"></i>
                        <span>Unduh Semua sebagai ZIP (JPG)</span>
                    </button>
                    <div id="crsl-zip-status" class="text-center text-sm text-slate-400 h-5"></div>
                    <div class="text-center text-sm font-semibold text-slate-400">Atau unduh per slide:</div>
                    <div id="crsl-individual-downloads-container" class="space-y-2">${slidesHTML}</div>
                </div>
            `;
        showContentModal(`Unduh Carousel: ${productName}`, bodyHTML);
        lucide.createIcons();
        document.getElementById('crsl-individual-downloads-container').addEventListener('click', (e) => {
            const btn = e.target.closest('.crsl-individual-download-btn');
            if (btn) {
                downloadDataURI(btn.dataset.src, btn.dataset.filename);
            }
        });
        document.getElementById('crsl-download-zip-btn').addEventListener('click', () => handleZipDownload(carouselId));
    }

    async function handleZipDownload(carouselId) {
        const carouselData = generatedCarousels[carouselId];
        if (!carouselData || typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
            alert('Gagal memuat library untuk ZIP. Coba lagi atau unduh satu per satu.');
            return;
        }
        const btn = document.getElementById('crsl-download-zip-btn');
        const statusEl = document.getElementById('crsl-zip-status');
        
        try {
            btn.disabled = true;
            statusEl.textContent = "Sedang mengompres...";
            
            const zip = new JSZip();
            const folder = zip.folder(`${carouselData.productName}_carousel`);
            
            const images = carouselData.images;
            for(let i=0; i<images.length; i++) {
                const img = images[i];
                // Remove header
                const base64 = img.src.split(',')[1];
                folder.file(`${carouselData.productName}_slide_${i+1}.jpg`, base64, {base64: true});
            }
            
            const content = await zip.generateAsync({type:"blob"});
            saveAs(content, `${carouselData.productName}_carousel.zip`);
            statusEl.textContent = "Selesai!";
        } catch(e) {
            console.error(e);
            statusEl.textContent = "Gagal mengompres.";
        } finally {
            btn.disabled = false;
        }
    }
};
