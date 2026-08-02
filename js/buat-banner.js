window.initBuatBanner = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    getApiKey,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    // DOM Elements
    const imageInput = document.getElementById('bnr-image-input');
    const imageUploadBox = document.getElementById('bnr-upload-box');
    const imagePreview = document.getElementById('bnr-preview');
    const imagePlaceholder = document.getElementById('bnr-placeholder');
    const removeImageBtn = document.getElementById('bnr-remove-btn');
    
    const descInput = document.getElementById('bnr-desc-input');
    const autoTextBtn = document.getElementById('bnr-auto-text-btn');
    const autoTextLoading = document.getElementById('bnr-auto-text-loading');
    
    const styleOptions = document.getElementById('bnr-style-options');
    const customStyleContainer = document.getElementById('bnr-custom-style-container');
    const customStyleInput = document.getElementById('bnr-custom-style-input');
    
    const ratioOptions = document.getElementById('bnr-ratio-options');
    const generateBtn = document.getElementById('bnr-generate-btn');
    const generateBtnText = document.getElementById('bnr-generate-btn-text');
    
    // Slider Elements
    const countSlider = document.getElementById('bnr-count-slider');
    const countValue = document.getElementById('bnr-count-value');
    
    const resultsContainer = document.getElementById('bnr-results-container');
    const resultsGrid = document.getElementById('bnr-results-grid');
    const resultsPlaceholder = document.getElementById('bnr-results-placeholder');

    let bannerImageData = null;
    let isGenerating = false;
    
    // Model selection elements
    const modelOptions = document.getElementById('bnr-model-options');
    const psHint = document.getElementById('bnr-ps-hint');
    let privateServerActive = false;
    
    // Model endpoints mapping
    const bnrModelEndpoints = {
        'nanobanana': 'generate',
        'nanobanana2': 'imagegemini2'
    };
    
    // Get endpoint based on selected model
    function getEndpointForModel() {
        const selectedModel = modelOptions ? (modelOptions.querySelector('.selected')?.dataset.value || 'nanobanana') : 'nanobanana';
        const ep = bnrModelEndpoints[selectedModel] || 'generate';
        
        // Gunakan BASE_URL_GROK hanya untuk imagegrok
        const grokEndpoints = ['imagegrok'];
        if (grokEndpoints.includes(ep) && typeof BASE_URL_GROK !== 'undefined' && BASE_URL_GROK) {
            return `${BASE_URL_GROK}/${ep}`;
        }
        
        // Hanya nanobanana (generate) yang pakai BASE_URL
        return GENERATE_URL.replace('generate', ep).replace('?generate', '?' + ep);
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

    // --- Slider Logic ---
    if (countSlider && countValue) {
        countSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            countValue.textContent = `${val} Banner`;
            
            // VIP Check
            if (val > 1 && typeof showUpgradeVipPopup === 'function') {
                showUpgradeVipPopup();
                countSlider.value = 1;
                countValue.textContent = "1 Banner";
            }

            if (generateBtnText) {
                generateBtnText.textContent = `Buat ${countSlider.value} Banner`;
            }
        });
    }

    // --- Image Upload Handling ---
    setupImageUpload(imageInput, imageUploadBox, (data) => {
        bannerImageData = data;
        imagePreview.src = data.dataUrl;
        imagePlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, ratioOptions);
        imagePreview.classList.remove('hidden');
        removeImageBtn.classList.remove('hidden');
        updateGenerateButton();
    });

    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bannerImageData = null;
        imageInput.value = '';
        imagePreview.src = '#';
        imagePreview.classList.add('hidden');
        imagePlaceholder.classList.remove('hidden');
        removeImageBtn.classList.add('hidden');
        
        // Reset results
        resultsContainer.classList.add('hidden');
        resultsPlaceholder.classList.remove('hidden');
        resultsGrid.innerHTML = '';
        
        updateGenerateButton();
    });

    // --- Style Selection ---
    styleOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Update UI
        styleOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Handle Custom Style
        const value = btn.dataset.value;
        if (value === 'Kustom') {
            customStyleContainer.classList.remove('hidden');
            customStyleInput.focus();
        } else {
            customStyleContainer.classList.add('hidden');
        }
    });

    // --- Ratio Selection ---
    setupOptionButtons(ratioOptions);

    // --- Auto Text Generation ---
    autoTextBtn.addEventListener('click', async () => {
        if (autoTextLoading.classList.contains('hidden') === false) return; // Already loading
        
        const currentText = descInput.value.trim();
        const selectedStyleBtn = styleOptions.querySelector('.selected');
        const styleValue = selectedStyleBtn ? selectedStyleBtn.dataset.value : 'Modern';
        const selectedStyle = styleValue === 'Kustom' ? (customStyleInput.value.trim() || 'Modern') : styleValue;
        
        const selectedRatioBtn = ratioOptions.querySelector('.selected');
        const selectedRatio = selectedRatioBtn ? selectedRatioBtn.dataset.value : '9:16';
        
        let prompt = "Analisa konten gambar yang diunggah, identifikasi subjek utama, suasana, dan konteks visual. Berdasarkan analisa tersebut, buat SATU kalimat teks banner iklan yang relevan dengan gambar, singkat, persuasif, dan punchy dalam Bahasa Indonesia (6–10 kata). Sertakan kata aksi atau manfaat jelas. Gaya: " + selectedStyle + ". Rasio: " + selectedRatio + ". Jika ada teks awal pengguna, gunakan sebagai konteks tambahan: \"" + (currentText || "") + "\". Balas hanya kalimat final tanpa tanda kutip.";

        // UI Loading
        autoTextLoading.classList.remove('hidden');
        autoTextBtn.disabled = true;
        autoTextBtn.classList.add('opacity-50');
        
        // Change sparkles icon to loading spinner (replace icon directly)
        const iconContainer = autoTextBtn.querySelector('i[data-lucide="sparkles"]');
        if (iconContainer) {
            iconContainer.outerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        try {
            const formData = new FormData();
            formData.append('prompt', prompt);
            
            // Append image if available
            if (bannerImageData) {
                const base64ToBlob = (base64, mimeType) => {
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    return new Blob([byteArray], { type: mimeType });
                };
                
                const blob = base64ToBlob(bannerImageData.base64, bannerImageData.mimeType);
                formData.append('images', blob, 'input-image.jpg'); 
            }

            const response = await fetch(`${CHAT_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': getApiKey()
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));

            const data = await response.json();
            let generatedText = "";

            if (data.response) {
                generatedText = data.response;
            } else if (data.candidates && data.candidates.length > 0) {
                generatedText = data.candidates[0].content.parts[0].text;
            } else if (data.choices && data.choices[0] && data.choices[0].message) {
                generatedText = data.choices[0].message.content;
            }

            if (generatedText) {
                generatedText = generatedText.trim();
                // Remove quotes if any
                generatedText = generatedText.replace(/^["']|["']$/g, '');
                descInput.value = generatedText;
                updateGenerateButton();
            }
        } catch (error) {
            console.error('Auto text error:', error);
        } finally {
            autoTextLoading.classList.add('hidden');
            autoTextBtn.disabled = false;
            autoTextBtn.classList.remove('opacity-50');
            
            // Restore sparkles icon (replace back)
            const loaderIcon = autoTextBtn.querySelector('i[data-lucide="loader-2"]');
            if (loaderIcon) {
                loaderIcon.outerHTML = '<i data-lucide="sparkles" class="w-3 h-3"></i>';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    });

    // --- Generate Button Logic ---
    descInput.addEventListener('input', updateGenerateButton);

    function updateGenerateButton() {
        const hasImage = !!bannerImageData;
        // Requirement: Must have image. Text is optional but recommended.
        generateBtn.disabled = !hasImage;
    }

    generateBtn.addEventListener('click', async () => {
        if (isGenerating) return;

        // Final Validation
        if (!bannerImageData) {
            alert('Mohon unggah gambar terlebih dahulu.');
            return;
        }

        const text = descInput.value.trim();
        const selectedStyleBtn = styleOptions.querySelector('.selected');
        const styleValue = selectedStyleBtn ? selectedStyleBtn.dataset.value : 'Modern';
        const style = styleValue === 'Kustom' ? customStyleInput.value.trim() : styleValue;
        
        const selectedRatioBtn = ratioOptions.querySelector('.selected');
        const ratio = selectedRatioBtn ? selectedRatioBtn.dataset.value : '9:16';
        const count = parseInt(countSlider.value) || 1;

        // UI Loading
        isGenerating = true;
        generateBtn.disabled = true;
        const originalBtnContent = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 mr-2 animate-spin"></i><span>Sedang Memproses...</span>';
        
        resultsContainer.classList.add('hidden');
        resultsPlaceholder.classList.remove('hidden');
        resultsPlaceholder.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="spinner"></div>
                <p class="text-slate-600 font-medium">Sedang meracik ${count} banner ajaib...</p>
                <p class="text-slate-400 text-sm mt-1">Estimasi waktu: ${count * 10} detik</p>
            </div>
        `;
        
        const base64ToBlob = (base64, mimeType) => {
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        };

        const imageBlob = base64ToBlob(bannerImageData.base64, bannerImageData.mimeType);

        let allImages = [];
        let errors = [];

        // Detailed style instructions for maximum quality
        const styleInstructions = {
            'Minimalis': `Create a minimalist advertisement banner with clean, simple design. Use ample negative space, minimal elements, and a monochromatic or limited color palette (2-3 colors max). Typography should be simple, modern sans-serif fonts. Focus on one central visual element. Remove all unnecessary decorations. Embrace white/empty space. Clean lines, geometric shapes, and subtle shadows only.`,
            'Modern': `Create a modern, contemporary advertisement banner. Use bold geometric shapes, vibrant gradients, and dynamic layouts. Incorporate trendy design elements like abstract patterns, overlapping layers, and asymmetric composition. Typography: bold sans-serif with varying weights. Color palette: vibrant, high-contrast colors with gradient accents. Add subtle 3D effects, depth, and shadows for dimension.`,
            'Elegan': `Create an elegant, sophisticated advertisement banner. Use refined serif or script fonts with generous letter spacing. Incorporate gold, silver, deep navy, burgundy, or muted earth tones. Add subtle textures like silk, marble, or watercolor. Use symmetrical layouts with refined borders or decorative frames. Soft lighting effects, subtle gradients, and delicate ornamental details. Premium, luxurious aesthetic.`,
            'Bold': `Create a bold, impactful advertisement banner with high visual energy. Use extra-bold, heavy typography that dominates the composition. Employ high-contrast color combinations (black/yellow, red/white, blue/orange). Add strong geometric shapes, thick borders, and dramatic shadows. Use vibrant, saturated colors. Dynamic angles, powerful visual hierarchy, and attention-grabbing elements. Make it impossible to ignore.`,
            'Retro': `Create a retro/vintage advertisement banner inspired by 1960s-1980s design. Use groovy fonts, psychedelic patterns, or old-school typography. Color palette: warm oranges, mustard yellows, browns, teals, and cream. Add halftone dots, sunburst rays, distressed textures, or grainy film effects. Nostalgic visual elements like vinyl records, cassette tapes, old TV aesthetics, or retro badges. Fun, playful, throwback vibes.`,
            'Pastel': `Create a soft, pastel-themed advertisement banner with dreamy aesthetics. Use gentle pastel colors: baby pink, mint green, lavender, peach, powder blue, and cream. Add soft gradients, watercolor textures, and cloud-like elements. Typography: rounded, friendly fonts. Incorporate soft bokeh effects, gentle lighting, and ethereal visual elements. Calming, soothing, Instagram-worthy aesthetic with delicate details.`,
            'Luxury': `Create a premium luxury advertisement banner exuding exclusivity. Use opulent materials: gold foil effects, marble textures, silk fabrics, diamond sparkles. Color palette: black, gold, platinum silver, deep purple, emerald green. Elegant serif fonts with refined spacing. Add subtle metallic sheens, reflections, and premium finishing touches. Sophisticated layout with perfect symmetry. High-end, exclusive, prestigious visual language.`,
            'Clean': `Create a clean, professional advertisement banner with crisp clarity. Use organized grid layouts, perfect alignment, and structured composition. Stick to 2-3 complementary colors with plenty of white space. Typography: modern, legible sans-serif fonts. No clutter - every element serves a purpose. Sharp edges, clear hierarchy, and professional business aesthetic. Corporate-friendly, trustworthy, and polished appearance.`,
            'Enerjik': `Create an energetic, dynamic advertisement banner bursting with movement. Use explosive color combinations, diagonal lines, speed effects, and motion blur. Add action-oriented elements: lightning bolts, stars, bursts, sparkles. Vibrant neon colors, electric blues, hot pinks, bright yellows. Dynamic typography with italics or slanted angles. Create sense of speed, excitement, and high energy. Youth-oriented, active, vibrant aesthetic.`,
            'Kustom': style // Use custom style as-is if provided
        };

        const stylePrompt = styleInstructions[style] || styleInstructions['Modern'];
        
        const fullPrompt = `Create a professional, high-quality advertisement banner.

DESIGN STYLE:
${stylePrompt}

TEXT CONTENT:
"${text}"

CRITICAL REQUIREMENTS:
- Text must be CRYSTAL CLEAR, perfectly readable, and prominently displayed
- Use the uploaded image as the main visual element or background
- Text should integrate naturally with the image composition
- Ensure proper contrast between text and background for maximum readability
- Professional typography with no spelling errors or text distortion
- Balanced composition with proper visual hierarchy
- High resolution, sharp details, and professional finish
- The banner should look polished and ready for immediate use in advertising campaigns`;

        try {
            // Check if boost mode is active
            const boostToggle = document.getElementById('boost-generate-toggle') || document.getElementById('boost-generate-toggle-home');
            const isBoostActive = boostToggle && boostToggle.checked;
            
            if (isBoostActive && count > 1) {
                // Parallel generation when boost mode is active
                // Show results container immediately
                resultsPlaceholder.classList.add('hidden');
                resultsContainer.classList.remove('hidden');
                resultsGrid.innerHTML = '';
                resultsGrid.className = `grid ${getResultGridCols(count)} gap-4`;
                
                let isParallelMode = true; // Flag to skip displayResults later
                
                // Track completed requests
                let completedCount = 0;
                const promises = [];
                
                for (let i = 0; i < count; i++) {
                    const formData = new FormData();
                    formData.append('feature', 'buat-banner');
                    
                    // Construct prompt with variation if needed
                    let variationPrompt = fullPrompt;
                    if (i > 0) variationPrompt += ` (Variasi unik ke-${i+1})`;

                    formData.append('instruction', variationPrompt);
                    formData.append('aspectRatio', ratio);
                    formData.append('images[]', imageBlob, 'input-image.jpg');
                    
                    const endpoint = getEndpointForModel();
                    
                    // Create placeholder card immediately
                    const placeholderCard = document.createElement('div');
                    placeholderCard.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full aspect-[9/16] flex items-center justify-center';
                    placeholderCard.innerHTML = `
                        <div class="flex flex-col items-center gap-2 text-slate-400">
                            <i data-lucide="loader-2" class="w-8 h-8 animate-spin"></i>
                            <span class="text-xs">Memproses...</span>
                        </div>
                    `;
                    resultsGrid.appendChild(placeholderCard);
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    
                    const promise = fetch(endpoint, {
                        method: 'POST',
                        cache: "no-store",
                        headers: {
                            'X-API-Key': getApiKey()
                        },
                        body: formData
                    })
                    .then(async response => {
                        if (!response.ok) throw new Error(await getApiErrorMessage(response));
                        return response.json();
                    })
                    .then(data => {
                        let imageUrl = null;
                        if (data.imageUrl) {
                            imageUrl = data.imageUrl;
                        } else if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                            imageUrl = data.images[0];
                        }
                        
                        if (imageUrl) {
                            // Replace placeholder with actual image immediately
                            placeholderCard.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full';
                            placeholderCard.innerHTML = `
                                <img src="${imageUrl}" alt="Hasil Banner ${completedCount + 1}" class="w-full h-full object-cover">
                                <div class="absolute bottom-2 right-2 flex gap-1">
                                    <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                    </button>
                                    <a href="${imageUrl}" download="banner_${completedCount + 1}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                        <i data-lucide="download" class="w-4 h-4"></i>
                                    </a>
                                </div>
                            `;
                            if (typeof lucide !== 'undefined') lucide.createIcons();
                            allImages.push(imageUrl);
                        }
                        
                        completedCount++;
                        return imageUrl;
                    })
                    .catch(err => {
                        console.error(`Generation ${i+1} failed:`, err);
                        errors.push(err.message);
                        
                        // Replace placeholder with error state
                        placeholderCard.innerHTML = `
                            <div class="flex flex-col items-center gap-2 text-red-400">
                                <i data-lucide="alert-circle" class="w-8 h-8"></i>
                                <span class="text-xs">Gagal</span>
                            </div>
                        `;
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                        completedCount++;
                        return null;
                    });
                    
                    promises.push(promise);
                }
                
                // Wait for all to complete (but results already displayed)
                await Promise.allSettled(promises);
                
                // Scroll to results on mobile
                if (window.innerWidth < 1024) {
                    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                // Skip displayResults call at the end since we already displayed progressively
                if (allImages.length === 0 && errors.length > 0) {
                    throw new Error(errors[0]);
                }
                
                // Play success sound and return early to skip displayResults
                doneSound.play();
                return; // Skip the displayResults call below
            } else {
                // Sequential generation (original behavior when boost is off)
                for (let i = 0; i < count; i++) {
                    // Update loading status if multiple
                    if (count > 1) {
                        const statusText = document.querySelector('#bnr-results-placeholder p.text-slate-600');
                        if (statusText) statusText.textContent = `Sedang meracik banner ${i + 1} dari ${count}...`;
                    }

                    const formData = new FormData();
                    formData.append('feature', 'buat-banner');
                    
                    // Construct prompt with variation if needed
                    let variationPrompt = fullPrompt;
                    if (i > 0) variationPrompt += ` (Variasi unik ke-${i+1})`;

                    formData.append('instruction', variationPrompt);
                    formData.append('aspectRatio', ratio);
                    formData.append('images[]', imageBlob, 'input-image.jpg');

                    try {
                        const endpoint = getEndpointForModel();
                        const response = await fetch(endpoint, {
                            method: 'POST',
                            cache: "no-store",
                            headers: {
                                'X-API-Key': getApiKey()
                            },
                            body: formData
                        });

                        if (!response.ok) throw new Error(await getApiErrorMessage(response));

                        const data = await response.json();

                        if (data.imageUrl) {
                            allImages.push(data.imageUrl);
                        } else if (data.images && Array.isArray(data.images)) {
                            allImages.push(...data.images);
                        }
                    } catch (err) {
                        console.error(`Generation ${i+1} failed:`, err);
                        errors.push(err.message);
                    }
                }
            }

            if (allImages.length === 0) {
                 throw new Error(errors.length > 0 ? errors[0] : 'Tidak ada gambar yang dihasilkan');
            }

            // Display Results (only for sequential mode, parallel mode already displayed)
            displayResults(allImages);
            doneSound.play();

        } catch (error) {
            errorSound.play();
            console.error('Generate error:', error);
            
            resultsPlaceholder.innerHTML = `
                <div class="flex flex-col items-center text-red-500">
                    <i data-lucide="alert-circle" class="w-12 h-12 mb-2"></i>
                    <p class="font-medium">Terjadi Kesalahan</p>
                    <p class="text-sm text-slate-400 mt-1 text-center max-w-xs">${error.message}</p>
                    <button id="bnr-retry-btn" class="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200 transition-colors">Coba Lagi</button>
                </div>
            `;
            
            document.getElementById('bnr-retry-btn').addEventListener('click', () => {
                generateBtn.click();
            });
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } finally {
            isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalBtnContent;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });

    function displayResults(images) {
        if (!images || images.length === 0) {
            resultsPlaceholder.innerHTML = '<p>Tidak ada gambar yang dihasilkan.</p>';
            return;
        }

        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        resultsGrid.innerHTML = '';
        resultsGrid.className = `grid ${getResultGridCols(images.length)} gap-4`;

        images.forEach((imgUrl, index) => {
            const card = document.createElement('div');
            card.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full';
            
            card.innerHTML = `
                <img src="${imgUrl}" alt="Hasil Banner ${index + 1}" class="w-full h-full object-cover">
                <div class="absolute bottom-2 right-2 flex gap-1">
                    <button data-img-src="${imgUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <a href="${imgUrl}" download="banner_${index + 1}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </a>
                </div>
            `;
            
            resultsGrid.appendChild(card);
        });
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Scroll to results on mobile
        if (window.innerWidth < 1024) {
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // --- Expose API ---
    return {
        setBannerImageData: (data) => {
            bannerImageData = data;
            imagePreview.src = data.dataUrl;
            imagePlaceholder.classList.add('hidden');
            imagePreview.classList.remove('hidden');
            removeImageBtn.classList.remove('hidden');
            updateGenerateButton();
        }
    };
};
