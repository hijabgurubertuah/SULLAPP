window.initSizeObjek = function(ctx = {}) {
    const {
        setupImageUpload,
        autoSelectClosestRatio,
        lucide = window.lucide,
        doneSound,
        switchTab
    } = ctx;

    const getApiErrorMessage = async (response) => {
        try {
            const data = await response.json();
            return data.error || data.message || response.statusText;
        } catch {
            return response.statusText;
        }
    };

    const tabSizeProduk = document.getElementById('tab-size-produk');
    if (!tabSizeProduk) return;

    if (switchTab) {
        tabSizeProduk.addEventListener('click', () => switchTab('size-produk'));
    }

    const spProductName = document.getElementById('sp-product-name');
    const spProductSize = document.getElementById('sp-product-size');
    const spCompareOptions = document.getElementById('sp-compare-options');
    const spRatioOptions = document.getElementById('sp-ratio-options');
    const spCountSlider = document.getElementById('sp-count-slider');
    const spCountValue = document.getElementById('sp-count-value');
    const spGenerateBtn = document.getElementById('sp-generate-btn');
    const spResultsGrid = document.getElementById('sp-results-grid');
    const spResultsPlaceholder = document.getElementById('sp-results-placeholder');

    const spSourceUpload = document.getElementById('sp-source-upload');
    const spSourceManual = document.getElementById('sp-source-manual');
    const spUploadSection = document.getElementById('sp-upload-section');
    const spManualSection = document.getElementById('sp-manual-section');
    const spAnalysisResult = document.getElementById('sp-analysis-result');
    const spResultSizeInput = document.getElementById('sp-result-size-input');

    const spImageInput = document.getElementById('sp-image-input');
    const spUploadBox = document.getElementById('sp-upload-box');
    const spUploadPlaceholder = document.getElementById('sp-upload-placeholder');
    const spUploadPreview = document.getElementById('sp-upload-preview');
    const spRemoveUpload = document.getElementById('sp-remove-upload');
    const spAnalyzeBtn = document.getElementById('sp-analyze-btn');
    const spAnalyzeTextBtn = document.getElementById('sp-analyze-text-btn');

    let spImageData = null;
    let spActiveSource = 'upload';
    let spAnalyzedData = { size: '' };

    function spSetSource(source) {
        spActiveSource = source;
        if (source === 'upload') {
            spSourceUpload.classList.add('bg-white', 'text-teal-600', 'shadow-sm');
            spSourceUpload.classList.remove('text-slate-500');
            spSourceManual.classList.remove('bg-white', 'text-teal-600', 'shadow-sm');
            spSourceManual.classList.add('text-slate-500');

            spUploadSection.classList.remove('hidden');
            spManualSection.classList.add('hidden');

            spAnalysisResult.classList.remove('hidden');
        } else {
            spSourceManual.classList.add('bg-white', 'text-teal-600', 'shadow-sm');
            spSourceManual.classList.remove('text-slate-500');
            spSourceUpload.classList.remove('bg-white', 'text-teal-600', 'shadow-sm');
            spSourceUpload.classList.add('text-slate-500');

            spUploadSection.classList.add('hidden');
            spManualSection.classList.remove('hidden');
            spAnalysisResult.classList.add('hidden');
        }
    }

    if (spSourceUpload && spSourceManual) {
        spSourceUpload.addEventListener('click', () => spSetSource('upload'));
        spSourceManual.addEventListener('click', () => spSetSource('manual'));
        spSetSource('upload');
    }

    if (setupImageUpload) {
        setupImageUpload(spImageInput, spUploadBox, (data) => {
            spImageData = data;
            spUploadPreview.src = data.dataUrl;
            spUploadPreview.classList.remove('hidden');
            if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, spRatioOptions);
            spUploadPlaceholder.classList.add('hidden');
            spRemoveUpload.classList.remove('hidden');
            spAnalyzeBtn.disabled = false;

            spAnalyzedData = { size: '' };
            spResultSizeInput.value = '';
            spAnalysisResult.classList.remove('hidden');
        });
    }

    if (spRemoveUpload) {
        spRemoveUpload.addEventListener('click', (e) => {
            e.stopPropagation();
            spImageData = null;
            spImageInput.value = '';
            spUploadPreview.src = '';
            spUploadPreview.classList.add('hidden');
            spUploadPlaceholder.classList.remove('hidden');
            spRemoveUpload.classList.add('hidden');
            spAnalyzeBtn.disabled = true;

            spAnalyzedData = { size: '' };
            spResultSizeInput.value = '';
            spAnalysisResult.classList.remove('hidden');
        });
    }

    function handleAnalysisResult(data) {
        spAnalyzedData.size = data.size || '';

        if (spActiveSource === 'upload') {
            spResultSizeInput.value = spAnalyzedData.size;
            spAnalysisResult.classList.remove('hidden');
        } else {
            spProductName.value = data.name || spProductName.value;
            spProductSize.value = spAnalyzedData.size;
            spProductName.classList.add('ring-2', 'ring-teal-500');
            spProductSize.classList.add('ring-2', 'ring-teal-500');
            setTimeout(() => {
                spProductName.classList.remove('ring-2', 'ring-teal-500');
                spProductSize.classList.remove('ring-2', 'ring-teal-500');
            }, 2000);
        }

        if (data.comparisons && Array.isArray(data.comparisons) && data.comparisons.length > 0) {
            spCompareOptions.innerHTML = '';
            data.comparisons.forEach((comp, index) => {
                const btn = document.createElement('button');
                btn.dataset.value = comp;
                btn.className = `option-btn ${index === 0 ? 'selected' : ''} py-2.5`;
                btn.textContent = comp;
                spCompareOptions.appendChild(btn);
            });
        }
    }

    if (spAnalyzeBtn) {
        spAnalyzeBtn.addEventListener('click', async () => {
            if (!spImageData) return;

            const originalBtnHTML = spAnalyzeBtn.innerHTML;
            spAnalyzeBtn.disabled = true;
            spAnalyzeBtn.innerHTML = `<div class="spinner"></div> Menganalisa...`;

            try {
                const prompt = `Analyze this image and identify the main object. Estimate its real-world dimensions (length, width, or height) in metric (cm) or imperial (inch). 
                        Also suggest 6 suitable comparison objects to visualize scale.
                        CRITICAL: The comparison objects MUST be in Bahasa Indonesia (e.g., Koin, Tangan, Manusia, Mobil).
                        Return JSON: {"size": "Dimensions", "comparisons": ["Benda1", "Benda2", ...]}. Only JSON. No Object Name needed.`;
                const formData = new FormData();
                formData.append('prompt', prompt);
                const base64ToBlob = (base64, mimeType) => {
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    return new Blob([byteArray], { type: mimeType });
                };
                formData.append('images[]', base64ToBlob(spImageData.base64, spImageData.mimeType), 'object.jpg');
                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': API_KEY
                    },
                    body: formData
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));

                const result = await response.json();
                const rawText = result.success && result.response ? result.response : (result.response || result.candidates?.[0]?.content?.parts?.[0]?.text || '');
                const text = String(rawText).trim();
                const jsonMatch = text.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    handleAnalysisResult(JSON.parse(jsonMatch[0]));
                } else {
                    alert("Gagal membaca hasil analisa.");
                }

            } catch (error) {
                console.error("Image Analysis failed:", error);
                alert("Gagal menganalisa gambar: " + error.message);
            } finally {
                spAnalyzeBtn.innerHTML = originalBtnHTML;
                spAnalyzeBtn.disabled = false;
            }
        });
    }

    if (spAnalyzeTextBtn) {
        spAnalyzeTextBtn.addEventListener('click', async () => {
            const nameInput = spProductName.value.trim();
            if (!nameInput) {
                alert("Masukkan nama objek terlebih dahulu.");
                return;
            }

            const originalBtnHTML = spAnalyzeTextBtn.innerHTML;
            const originalBg = spAnalyzeTextBtn.style.background;
            spAnalyzeTextBtn.disabled = true;
            spAnalyzeTextBtn.innerHTML = `<div class="spinner"></div>`;

            try {
                const prompt = `Object Name: "${nameInput}". 
                        Estimate its standard real-world dimensions. Suggest 6 suitable comparison objects.
                        CRITICAL: The comparison objects MUST be in Bahasa Indonesia.
                        Return JSON: {"name": "${nameInput}", "size": "Estimated Dimensions", "comparisons": ["Benda1", "Benda2", ...]}. Only JSON.`;
                const formData = new FormData();
                formData.append('prompt', prompt);
                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': API_KEY
                    },
                    body: formData
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));

                const result = await response.json();
                const rawText = result.success && result.response ? result.response : (result.response || result.candidates?.[0]?.content?.parts?.[0]?.text || '');
                const text = String(rawText).trim();
                const jsonMatch = text.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    handleAnalysisResult(JSON.parse(jsonMatch[0]));
                } else {
                    alert("Gagal mendapatkan data objek.");
                }
            } catch (error) {
                console.error("Text Analysis failed:", error);
                alert("Gagal menganalisa teks: " + error.message);
            } finally {
                spAnalyzeTextBtn.innerHTML = originalBtnHTML;
                spAnalyzeTextBtn.disabled = false;
            }
        });
    }


    if (spCountSlider && spCountValue) {
        spCountSlider.addEventListener('input', (e) => {
            spCountValue.textContent = e.target.value;
        });
    }

    [spCompareOptions, spRatioOptions].forEach(parent => {
        if (parent) {
            parent.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn) {
                    parent.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                    btn.classList.add('selected');
                }
            });
        }
    });

    if (spGenerateBtn) {
        spGenerateBtn.addEventListener('click', async () => {
            let name, size;

            if (spActiveSource === 'upload') {
                name = "Uploaded Object";
                size = spResultSizeInput.value.trim();
                if (!size) {
                    alert("Silakan upload gambar dan klik 'Analisa Ukuran Objek' terlebih dahulu.");
                    return;
                }
            } else {
                name = spProductName.value.trim();
                size = spProductSize.value.trim();
                if (!name || !size) {
                    alert("Mohon isi Nama Objek dan Ukuran Asli Objek.");
                    return;
                }
            }

            const compareObj = spCompareOptions.querySelector('.selected')?.dataset.value || "Hand";
            const ratio = spRatioOptions.querySelector('.selected')?.dataset.value || "1:1";
            const count = parseInt(spCountSlider.value) || 1;

            const originalBtnHTML = spGenerateBtn.innerHTML;
            const originalBtnStyle = spGenerateBtn.style.background;
            spGenerateBtn.disabled = true;
            spGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Sedang Visualisasi...</span>`;
            spGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');

            spResultsPlaceholder.classList.add('hidden');
            spResultsGrid.classList.remove('hidden');
            spResultsGrid.innerHTML = '';
            spResultsGrid.className = `grid ${getResultGridCols(count)} gap-4`;

            const getAspectRatioClass = (ratio) => {
                if (ratio === '1:1') return 'aspect-[1/1]';
                if (ratio === '9:16') return 'aspect-[9/16]';
                if (ratio === '16:9') return 'aspect-[16/9]';
                if (ratio === '4:3') return 'aspect-[4/3]';
                if (ratio === '3:4') return 'aspect-[3/4]';
                return 'aspect-[1/1]';
            };

            const aspectClass = getAspectRatioClass(ratio);

            for (let i = 0; i < count; i++) {
                const card = document.createElement('div');
                card.className = `card bg-gray-50 border border-gray-200 flex flex-col items-center justify-center rounded-2xl animate-pulse ${aspectClass} w-full`;
                card.innerHTML = `<div class="spinner"></div>`;
                spResultsGrid.appendChild(card);
            }
            if (lucide) lucide.createIcons();

            const generateSizeViz = async (index) => {
                const card = spResultsGrid.children[index];
                try {

                    let prompt = `Create a professional product visualization.
                            Size: ${size}.
                            Comparison Object: ${compareObj}.
                            Aspect Ratio: ${ratio}.
                            Task: Generate a high-quality photography image showing the object placed next to (or held by) a '${compareObj}' to clearly demonstrate its true scale/size. 
                            CRITICAL REQUIREMENT: You MUST overlay clear, professional technical dimension lines and measurement labels directly on the image to show the scale explicitly. 
                            Follow this LABELLING RULE based on physical dimensions:
                            - If 1D object (e.g. cable, pencil): Show length only.
                            - If 2D object (e.g. paper, screen): Show length × width.
                            - If 3D object (e.g. box, bottle): Show length × width × height.
                            Use the provided size '${size}' as the reference for these numbers.
                            STRICT RULE: Do NOT include any other text labels, descriptions, or object names (like '${name}') on the image. ONLY the measurement lines and numbers are allowed.
                            The setting should be clean, professional, and well-lit.
                            Variation ${index + 1}.`;

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
                    let endpoint = '/generate';

                    if (spActiveSource === 'upload' && spImageData) {
                        endpoint = '/generate';
                        prompt += `\nReference Image: Use the uploaded image to understand the visual appearance of the '${name}'. Maintain its colors and key features.`;
                        formData.append('images[]', base64ToBlob(spImageData.base64, spImageData.mimeType));
                    }

                    formData.append('instruction', prompt);
                    if (ratio) {
                        formData.append('aspectRatio', ratio);
                    }

                    const response = await fetch(`${GENERATE_URL}`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': API_KEY
                        },
                        body: formData
                    });

                    if (!response.ok) throw new Error(await getApiErrorMessage(response));

                    const result = await response.json();

                    if (result.success && result.imageUrl) {
                        const imageUrl = result.imageUrl;
                        const previewFn = `window.openTiImagePreview('${imageUrl}')`;

                        card.className = `card overflow-hidden relative bg-white flex items-center justify-center group rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 ${aspectClass} w-full`;
                        card.innerHTML = `
                                    <img src="${imageUrl}" class="w-full h-full object-cover">
                                    <div class="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                        <button onclick="${previewFn}" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Lihat Fullscreen">
                                            <i data-lucide="eye" class="w-4 h-4"></i>
                                        </button>
                                        <a href="${imageUrl}" download="size_objek_${Date.now()}.png" class="bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95" title="Unduh Gambar">
                                            <i data-lucide="download" class="w-4 h-4"></i>
                                        </a>
                                    </div>
                                `;
                    } else {
                        throw new Error("Gagal membuat visualisasi (No URL returned).");
                    }

                } catch (e) {
                    console.error(e);
                    card.innerHTML = `<div class="flex flex-col items-center justify-center p-4 text-center h-full"><i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mb-2"></i><p class="text-xs text-red-500 break-words w-full">${e.message}</p></div>`;
                    card.classList.remove('animate-pulse');
                } finally {
                    if (lucide) lucide.createIcons();
                }
            };

            const promises = [];
            for (let i = 0; i < count; i++) {
                promises.push(generateSizeViz(i));
            }

            await Promise.allSettled(promises);

            spGenerateBtn.disabled = false;
            spGenerateBtn.innerHTML = originalBtnHTML;
            spGenerateBtn.style.background = originalBtnStyle;
            spGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
            if (typeof doneSound !== 'undefined') doneSound.play();
        });
    }
};
