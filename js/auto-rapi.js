window.initAutoRapi = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    lucide,
    API_KEY,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound,
    initBeforeAfterSlider,
    switchTab
}) {
    
    const arImageInput = document.getElementById('ar-image-input');
    const arUploadBox = document.getElementById('ar-upload-box');
    const arPreview = document.getElementById('ar-preview');
    const arPlaceholder = document.getElementById('ar-placeholder');
    const arRemoveBtn = document.getElementById('ar-remove-btn');

    const arRatioOptions = document.getElementById('ar-ratio-options');
    const arResultCountSlider = document.getElementById('sf-rapi-result-count-slider');
    const arResultCountDisplay = document.getElementById('sf-rapi-result-count-display');
    const arGenerateBtn = document.getElementById('ar-generate-btn');
    const arResultsContainer = document.getElementById('ar-results-container');
    const arDownloadLink = document.getElementById('ar-download-link');
    const arDownloadSection = document.getElementById('ar-download-section');
    const arAnalysisOptions = document.getElementById('ar-analysis-options');
    const arAnalysisStatus = document.getElementById('ar-analysis-status');
    const arAnalysisRefresh = document.getElementById('ar-analysis-refresh');
    const arExtraInput = document.getElementById('ar-extra-input');
    
    let arImageData = null;
    let arAnalysisList = [];
    let arSelectedAnalysis = [];
    let arAnalysisSummary = '';
    let arAnalysisBusy = false;
    
    function arUpdateButtons() {
        if (arGenerateBtn) arGenerateBtn.disabled = !arImageData;
    }
    
    function setArAnalysisStatus(text) {
        if (arAnalysisStatus) arAnalysisStatus.textContent = text;
    }
    
    function setArAnalysisStatusHtml(html) {
        if (arAnalysisStatus) arAnalysisStatus.innerHTML = html;
    }
    
    function limitAnalysisWords(text, maxWords) {
        const words = String(text || '').trim().split(/\s+/).filter(Boolean);
        return words.slice(0, maxWords).join(' ');
    }
    
    function renderArAnalysisOptions(list) {
        if (!arAnalysisOptions) return;
        arAnalysisOptions.innerHTML = '';
        arAnalysisList = list || [];
        arSelectedAnalysis = arAnalysisList.length ? [arAnalysisList[0]] : [];
        if (!arAnalysisList.length) {
            setArAnalysisStatus('Tidak ada hasil analisa.');
            return;
        }
        setArAnalysisStatus('Pilih fokus perapihan.');
        arAnalysisList.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'option-btn text-xs py-2.5';
            btn.textContent = item;
            if (index === 0) btn.classList.add('selected');
            btn.addEventListener('click', () => {
                if (btn.classList.contains('selected')) {
                    btn.classList.remove('selected');
                    arSelectedAnalysis = arSelectedAnalysis.filter(value => value !== item);
                } else {
                    btn.classList.add('selected');
                    arSelectedAnalysis = [...new Set([...arSelectedAnalysis, item])];
                }
            });
            arAnalysisOptions.appendChild(btn);
        });
    }
    
    function parseArAnalysisText(text) {
        if (!text) return [];
        const trimmed = text.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch (e) { }
        }
        const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch (e) { }
        }
        const lines = trimmed
            .split('\n')
            .map(line => line.replace(/^[\-\*\d\.\)\s]+/, '').trim())
            .filter(Boolean);
        return lines;
    }
    
    async function analyzeAutoRapi(imageData) {
        if (!imageData || arAnalysisBusy) return;
        arAnalysisBusy = true;
        if (arAnalysisRefresh) arAnalysisRefresh.disabled = true;
        setArAnalysisStatusHtml('<div class="flex items-center gap-2"><div class="spinner"></div><span>Menganalisa kekacauan...</span></div>');
        if (arAnalysisOptions) arAnalysisOptions.innerHTML = '';
        arAnalysisSummary = '';
        try {
            const prompt = `Analisa kekacauan pada gambar ruangan ini. Berikan 4-6 opsi tindakan perapihan singkat dalam bahasa Indonesia.
Return JSON array of strings only, contoh: ["Rapikan ...","Singkirkan ..."].`;
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
            formData.append('prompt', prompt);
            formData.append('images[]', base64ToBlob(imageData.base64, imageData.mimeType), 'ruangan.jpg');
            const response = await fetch(`${CHAT_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });
            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();
            
            let suggestions = [];
            if (result.success && Array.isArray(result.response)) {
                suggestions = result.response.filter(Boolean);
            } else {
                const text = (result.success && result.response ? result.response : (result.response || result.candidates?.[0]?.content?.parts?.[0]?.text || '')).trim();
                suggestions = parseArAnalysisText(text);
            }
            
            suggestions = suggestions
                .map(item => limitAnalysisWords(item, 5))
                .slice(0, 6);
            arAnalysisSummary = suggestions.join(' | ');
            renderArAnalysisOptions(suggestions);
        } catch (error) {
            setArAnalysisStatus('Gagal menganalisa kekacauan.');
        } finally {
            arAnalysisBusy = false;
            if (arAnalysisRefresh) arAnalysisRefresh.disabled = false;
        }
    }

    function arSetImage(data) {
        arImageData = data;

        arPreview.onload = () => {
            const width = arPreview.naturalWidth;
            const height = arPreview.naturalHeight;
            const ratio = width / height;

            const ratios = [
                { name: '1:1', value: 1.0 },
                { name: '3:4', value: 0.75 },
                { name: '4:3', value: 1.3333 },
                { name: '9:16', value: 0.5625 },
                { name: '16:9', value: 1.7778 }
            ];

            let closest = ratios[0];
            let minDiff = Math.abs(ratio - closest.value);

            for (let i = 1; i < ratios.length; i++) {
                const diff = Math.abs(ratio - ratios[i].value);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = ratios[i];
                }
            }

            const buttons = arRatioOptions.querySelectorAll('.option-btn');
            buttons.forEach(btn => {
                if (btn.dataset.value === closest.name) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
        };

        arPreview.src = data.dataUrl;
        arPlaceholder.classList.add('hidden');
        arPreview.classList.remove('hidden');
        arRemoveBtn.classList.remove('hidden');
        arUpdateButtons();
        analyzeAutoRapi(data);
    }
    
    if (arImageInput) {
        setupImageUpload(arImageInput, arUploadBox, arSetImage);
    }
    
    if (arRemoveBtn) {
        arRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            arImageData = null;
            arImageInput.value = '';
            arPreview.src = '#';
            arPreview.classList.add('hidden');
            arPlaceholder.classList.remove('hidden');
            arRemoveBtn.classList.add('hidden');
            arUpdateButtons();
            renderArAnalysisOptions([]);
            arAnalysisSummary = '';
            setArAnalysisStatus('Belum dianalisa.');
        });
    }
    
    setupOptionButtons(arRatioOptions);

    if (arResultCountSlider && arResultCountDisplay) {
        arResultCountSlider.addEventListener('input', function() {
            arResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    if (arAnalysisRefresh) {
        arAnalysisRefresh.addEventListener('click', () => analyzeAutoRapi(arImageData));
    }

    const arRefineBtn = document.getElementById('ar-refine-btn');

    async function generateSingleAutoRapi(imageData, prompt, aspectRatio) {
        let mimeType = imageData.mimeType;
        let base64 = imageData.base64;

        if (!mimeType && imageData.dataUrl) {
            const matches = imageData.dataUrl.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64 = matches[2];
            }
        }

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
        formData.append('images[]', base64ToBlob(base64, mimeType));
        formData.append('instruction', prompt);

        if (aspectRatio !== 'Auto') {
            formData.append('aspectRatio', aspectRatio);
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

        if (!result.success || !result.imageUrl) throw new Error("Gagal membuat gambar.");
        return result.imageUrl;
    }

    async function generateTidyImage(imageData, isRefinement = false) {
        const originalText = isRefinement ? arRefineBtn.innerHTML : arGenerateBtn.innerHTML;
        const btnToDisable = isRefinement ? arRefineBtn : arGenerateBtn;

        btnToDisable.disabled = true;
        btnToDisable.innerHTML = `<div class="spinner"></div><span class="ml-2">${isRefinement ? 'Merapikan Lagi...' : 'Merapikan...'}</span>`;

        try {
            const aspectRatio = arRatioOptions.querySelector('.selected').dataset.value;
            const extraRequest = arExtraInput ? arExtraInput.value.trim() : '';
            const analysisParts = [];
            if (arAnalysisSummary) analysisParts.push(`Analysis insights: ${arAnalysisSummary}.`);
            if (arSelectedAnalysis.length) analysisParts.push(`Focus: ${arSelectedAnalysis.join('; ')}.`);
            if (extraRequest) analysisParts.push(`Additional request: ${extraRequest}.`);
            const analysisText = analysisParts.length ? `\nANALYSIS CONTEXT:\n${analysisParts.join(' ')}` : '';
            const prompt = `Transform this room image into a perfectly clean, tidy, and organized version.${analysisText}
            Task: Perform a deep cleaning and organization.
            ${isRefinement ? 'Focus on FIXING any remaining clutter or weird artifacts from the previous edit. Make it even cleaner and more natural.' : ''}

            CRITICAL EXECUTION STEPS:
            1. AGGRESSIVELY REMOVE loose clutter, trash, clothes, and scattered items.
            2. STRAIGHTEN furniture and bedding.
            3. KEEP key room structure and major furniture identical. 
            4. Output a highly photorealistic "After" photo.`;

            document.getElementById('ar-results-placeholder').classList.add('hidden');
            arResultsContainer.classList.remove('hidden');
            
            // Switch to grid layout
            const numOutputs = parseInt(arResultCountSlider.value) || 1;
            arResultsContainer.className = `grid ${getResultGridCols(numOutputs)} gap-4 mt-4 w-full`;
            arResultsContainer.style.height = 'auto';
            arResultsContainer.innerHTML = '';
            arDownloadSection.classList.add('hidden'); // Hide single download section
            const promises = [];

            for (let i = 1; i <= numOutputs; i++) {
                const card = document.createElement('div');
                card.id = `ar-card-${i}`;
                card.className = `relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 w-full`;
                if (aspectRatio !== 'Auto') {
                     card.style.aspectRatio = aspectRatio.replace(':', '/');
                } else {
                     card.style.minHeight = '200px';
                }
                card.innerHTML = `<div class="absolute inset-0 flex items-center justify-center"><div class="spinner"></div></div>`;
                arResultsContainer.appendChild(card);

                promises.push(generateSingleAutoRapi(imageData, prompt, aspectRatio)
                    .then(resultUrl => {
                        card.innerHTML = ''; // Clear spinner
                        initBeforeAfterSlider(card, imageData.dataUrl, resultUrl);
                        
                        // Add download button to card
                        const actionWrap = document.createElement('div');
                        actionWrap.className = 'absolute bottom-2 right-2 flex gap-2 z-10';

                        const dlBtn = document.createElement('a');
                        dlBtn.href = resultUrl;
                        dlBtn.download = `auto_rapi_${Date.now()}_${i}.png`;
                        dlBtn.className = 'bg-white/80 p-2 rounded-full shadow-sm hover:bg-white transition-all';
                        dlBtn.innerHTML = `<i data-lucide="download" class="w-4 h-4 text-slate-700"></i>`;
                        actionWrap.appendChild(dlBtn);
                        card.appendChild(actionWrap);
                        lucide.createIcons();
                    })
                    .catch(err => {
                        console.error(err);
                        card.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-xs text-red-500 p-2 text-center">${err.message}</div>`;
                    })
                );
            }

            await Promise.allSettled(promises);
            doneSound.play();
        } catch (error) {
            errorSound.play();
            alert(`${error.message}`);
        } finally {
            btnToDisable.disabled = false;
            btnToDisable.innerHTML = originalText;
            lucide.createIcons();
        }
    }

    if (arGenerateBtn) {
        arGenerateBtn.addEventListener('click', () => {
            if (!arImageData) return;
            generateTidyImage(arImageData, false);
        });
    }

    if (arRefineBtn) {
        arRefineBtn.addEventListener('click', () => {
            if (!arImageData) return;
            generateTidyImage(arImageData, true);
        });
    }

    return {
        arSetImage
    };
}
