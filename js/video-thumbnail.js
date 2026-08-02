window.initVideoThumbnail = function(config) {
    const {
        document,
        convertHeicToJpg,
        lucide,
        API_KEY,
        GENERATE_URL,
        CHAT_URL,
        getApiErrorMessage,
        doneSound,
        errorSound,
        getAspectRatioClass,
        switchTab
    } = config;

    const tabVideoThumbnail = document.getElementById('tab-video-thumbnail');
    if (tabVideoThumbnail) {
        tabVideoThumbnail.addEventListener('click', () => switchTab('video-thumbnail'));

        const vtRatioOptions = document.getElementById('vt-ratio-options');
        const vtImageInput = document.getElementById('vt-image-input');
        const vtImagePreviewGrid = document.getElementById('vt-image-preview-grid');
        const vtUploadPlaceholder = document.getElementById('vt-upload-placeholder');
        const vtUseDescToggle = document.getElementById('vt-use-desc-toggle');
        const vtVisualDescription = document.getElementById('vt-visual-description');

        const vtStyleSelect = document.getElementById('vt-style-select');
        const vtCustomStyle = document.getElementById('vt-custom-style');
        const vtGenerateBtn = document.getElementById('vt-generate-btn');
        const vtResultsContainer = document.getElementById('vt-results-container');
        const vtResultsGrid = document.getElementById('vt-results-grid');
        const vtResultsPlaceholder = document.getElementById('vt-results-placeholder');
        const vtTitleInput = document.getElementById('vt-title-input');
        const vtSubtitleInput = document.getElementById('vt-subtitle-input');
        const vtAdditionalPrompt = document.getElementById('vt-additional-prompt');
        const vtAutoTextBtn = document.getElementById('vt-auto-text-btn');
        const vtAutoTextLoading = document.getElementById('vt-auto-text-loading');

        let vtUploadedImages = [];

        if (vtRatioOptions) {
            const buttons = vtRatioOptions.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });
        }

        if (vtUseDescToggle) {
            vtUseDescToggle.addEventListener('change', () => {
                const vtUploadBox = document.getElementById('vt-upload-box');
                if (vtUseDescToggle.checked) {
                    vtVisualDescription.classList.remove('hidden');
                    if (vtUploadBox) vtUploadBox.classList.add('hidden');
                } else {
                    vtVisualDescription.classList.add('hidden');
                    if (vtUploadBox) vtUploadBox.classList.remove('hidden');
                }
            });
        }

        const updateVtPreviewGrid = () => {
            if (vtUploadedImages.length > 0) {
                vtImagePreviewGrid.classList.remove('hidden');
                vtUploadPlaceholder.classList.add('hidden');
                vtImagePreviewGrid.innerHTML = '';
                vtUploadedImages.forEach((imgData, index) => {
                    const div = document.createElement('div');
                    div.className = 'relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm group bg-white';
                    div.innerHTML = `
                                <img src="data:${imgData.mimeType};base64,${imgData.base64}" class="w-full h-full object-cover">
                                <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity" onclick="removeVtImage(${index})">
                                    <i data-lucide="x" class="w-3 h-3"></i>
                                </button>
                            `;
                    vtImagePreviewGrid.appendChild(div);
                });
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                vtImagePreviewGrid.classList.add('hidden');
                vtUploadPlaceholder.classList.remove('hidden');
                vtImagePreviewGrid.innerHTML = '';
            }
        };

        window.removeVtImage = (index) => {
            vtUploadedImages.splice(index, 1);
            updateVtPreviewGrid();
            vtImageInput.value = '';
        };

        // Add click event to upload box
        const vtUploadBox = document.getElementById('vt-upload-box');
        if (vtUploadBox && vtImageInput) {
            vtUploadBox.addEventListener('click', (e) => {
                if (!vtUseDescToggle || !vtUseDescToggle.checked) {
                    vtImageInput.click();
                }
            });

            // Add drag and drop support
            ['dragover', 'drop', 'dragleave'].forEach(eventName => {
                vtUploadBox.addEventListener(eventName, e => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                });
            });

            vtUploadBox.addEventListener('dragover', () => {
                vtUploadBox.classList.add('border-teal-500');
            });

            vtUploadBox.addEventListener('dragleave', () => {
                vtUploadBox.classList.remove('border-teal-500');
            });

            vtUploadBox.addEventListener('drop', async (e) => {
                vtUploadBox.classList.remove('border-teal-500');
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                    for (const file of files) {
                        const processed = await convertHeicToJpg(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const base64 = ev.target.result.split(',')[1];
                            const isFirstImage = vtUploadedImages.length === 0;
                            vtUploadedImages.push({ mimeType: processed.type, base64 });
                            updateVtPreviewGrid();
                            
                            if (isFirstImage && typeof window.autoSelectClosestRatio === 'function' && vtRatioOptions) {
                                window.autoSelectClosestRatio(ev.target.result, vtRatioOptions);
                            }
                        };
                        reader.readAsDataURL(processed);
                    }
                }
            });
        }

        if (vtImageInput) {
            vtImageInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    for (const file of files) {
                        const processed = await convertHeicToJpg(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const base64 = ev.target.result.split(',')[1];
                            const isFirstImage = vtUploadedImages.length === 0;
                            vtUploadedImages.push({ mimeType: processed.type, base64 });
                            updateVtPreviewGrid();
                            
                            if (isFirstImage && typeof window.autoSelectClosestRatio === 'function' && vtRatioOptions) {
                                window.autoSelectClosestRatio(ev.target.result, vtRatioOptions);
                            }
                        };
                        reader.readAsDataURL(processed);
                    }
                }
            });
        }

        if (vtStyleSelect) {
            vtStyleSelect.addEventListener('change', () => {
                if (vtStyleSelect.value === 'custom') {
                    vtCustomStyle.classList.remove('hidden');
                } else {
                    vtCustomStyle.classList.add('hidden');
                }
            });
        }

        if (vtAutoTextBtn) {
            vtAutoTextBtn.addEventListener('click', async () => {
                if (vtAutoTextBtn.disabled) return;
                if (vtAutoTextLoading && !vtAutoTextLoading.classList.contains('hidden')) return;

                const useDescToggle = document.getElementById('vt-use-desc-toggle');
                const useDesc = (useDescToggle && useDescToggle.checked);
                const visualDesc = vtVisualDescription ? vtVisualDescription.value.trim() : '';
                const titleVal = vtTitleInput ? vtTitleInput.value.trim() : '';
                const subtitleVal = vtSubtitleInput ? vtSubtitleInput.value.trim() : '';
                const additionalPrompt = vtAdditionalPrompt ? vtAdditionalPrompt.value.trim() : '';
                const ratioBtn = vtRatioOptions ? vtRatioOptions.querySelector('.selected') : null;
                const ratioVal = ratioBtn ? ratioBtn.dataset.value : '16:9';

                let stylePrompt = vtStyleSelect ? vtStyleSelect.value : '';
                if (stylePrompt === 'custom') {
                    const customStyleInput = document.getElementById('vt-custom-style-input');
                    if (customStyleInput && customStyleInput.value.trim()) {
                        stylePrompt = customStyleInput.value.trim();
                    }
                }

                const originalBtnHTML = vtAutoTextBtn.innerHTML;
                vtAutoTextBtn.disabled = true;
                vtAutoTextBtn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i><span>Memproses...</span>`;
                if (vtAutoTextLoading) vtAutoTextLoading.classList.add('hidden');
                if (typeof lucide !== 'undefined') lucide.createIcons();

                try {
                    let prompt = `Buat Judul dan Subjudul thumbnail YouTube yang menarik dan clickbait.
Format jawaban:
Judul: ...
Subjudul: ...
Aturan: Judul 3-6 kata, Subjudul maksimal 6 kata, Bahasa Indonesia. Balas hanya plain text tanpa markdown.
Gaya: ${stylePrompt || 'High CTR Extreme'}. Rasio: ${ratioVal}.`;
                    if (visualDesc) prompt += `\nDeskripsi visual: ${visualDesc}.`;
                    if (additionalPrompt) prompt += `\nInstruksi tambahan: ${additionalPrompt}.`;
                    if (titleVal || subtitleVal) {
                        prompt += `\nTeks awal pengguna: Judul="${titleVal}" Subjudul="${subtitleVal}". Perbaiki jika perlu.`;
                    }

                    const formData = new FormData();
                    formData.append('prompt', prompt);

                    if (vtUploadedImages.length > 0 && !useDesc) {
                        const base64ToBlob = (base64, mimeType) => {
                            const byteCharacters = atob(base64);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            return new Blob([byteArray], { type: mimeType });
                        };
                        vtUploadedImages.forEach((img, index) => {
                            formData.append('images[]', base64ToBlob(img.base64, img.mimeType), `thumbnail_${index + 1}.jpg`);
                        });
                    }

                    const response = await fetch(`${CHAT_URL}`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': API_KEY
                        },
                        body: formData
                    });

                    if (!response.ok) throw new Error(await getApiErrorMessage(response));
                    const data = await response.json();
                    let generatedText = data.response
                        || data.candidates?.[0]?.content?.parts?.[0]?.text
                        || data.choices?.[0]?.message?.content
                        || '';

                    generatedText = (generatedText || '').trim();
                    if (generatedText) {
                        const titleMatch = generatedText.match(/Judul\s*:\s*(.*)/i);
                        const subtitleMatch = generatedText.match(/Subjudul\s*:\s*(.*)/i);
                        let nextTitle = titleMatch ? titleMatch[1].trim() : '';
                        let nextSubtitle = subtitleMatch ? subtitleMatch[1].trim() : '';

                        if (!nextTitle) {
                            const lines = generatedText.split('\n').map((line) => line.trim()).filter(Boolean);
                            if (lines.length > 0) nextTitle = lines[0].replace(/^[-*]\s*/, '');
                            if (lines.length > 1) nextSubtitle = lines[1].replace(/^[-*]\s*/, '');
                        }

                        if (vtTitleInput && nextTitle) {
                            vtTitleInput.value = nextTitle.replace(/^["']|["']$/g, '');
                        }
                        if (vtSubtitleInput && nextSubtitle) {
                            vtSubtitleInput.value = nextSubtitle.replace(/^["']|["']$/g, '');
                        }
                    }
                } catch (error) {
                    console.error('Auto text thumbnail error:', error);
                    alert(`Gagal membuat teks thumbnail otomatis. ${error.message}`);
                } finally {
                    vtAutoTextBtn.disabled = false;
                    vtAutoTextBtn.innerHTML = originalBtnHTML;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            });
        }

        if (vtGenerateBtn) {
            vtGenerateBtn.addEventListener('click', async () => {
                const hasImages = vtUploadedImages.length > 0;
                const useDescToggle = document.getElementById('vt-use-desc-toggle');
                const visualDescEl = document.getElementById('vt-visual-description');
                const useDesc = (useDescToggle && useDescToggle.checked) && (visualDescEl && visualDescEl.value.trim().length > 0);

                if (!vtTitleInput.value && !hasImages && !useDesc) {
                    alert("Mohon masukkan minimal Judul, Gambar, atau Deskripsi Visual untuk membuat thumbnail.");
                    return;
                }

                const vtCountSlider = document.getElementById('vt-count-slider');
                const count = vtCountSlider ? (parseInt(vtCountSlider.value) || 1) : 1;

                const originalBtnHTML = vtGenerateBtn.innerHTML;
                vtGenerateBtn.disabled = true;
                vtGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');
                vtGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Sedang Membuat...</span>`;

                vtResultsPlaceholder.classList.add('hidden');
                vtResultsGrid.classList.remove('hidden');

                vtResultsGrid.innerHTML = '';
                vtResultsGrid.className = 'w-full h-full';

                const resultWrapper = document.createElement('div');
                resultWrapper.className = 'flex flex-col w-full gap-6 items-center';

                const loaderEl = document.createElement('div');
                loaderEl.className = 'hidden';
                resultWrapper.appendChild(loaderEl);

                const gridEl = document.createElement('div');
                gridEl.className = `grid ${getResultGridCols(count)} gap-4 w-full`;
                resultWrapper.appendChild(gridEl);

                vtResultsGrid.appendChild(resultWrapper);

                const ratioBtn = vtRatioOptions.querySelector('.selected');
                const ratioVal = ratioBtn ? ratioBtn.dataset.value : '16:9';
                const styleBtn = vtStyleSelect.value;
                const visualDesc = vtVisualDescription.value;
                const titleVal = vtTitleInput.value;
                const subtitleVal = vtSubtitleInput ? vtSubtitleInput.value : '';
                const additionalPrompt = vtAdditionalPrompt ? vtAdditionalPrompt.value : '';

                let stylePrompt = styleBtn;
                if (styleBtn === 'custom') {
                    const customStyleInput = document.getElementById('vt-custom-style-input');
                    if (customStyleInput) stylePrompt = customStyleInput.value;
                }


                for (let i = 0; i < count; i++) {
                    const card = document.createElement('div');

                    card.className = 'card bg-gray-100 flex flex-col items-center justify-center aspect-video w-full rounded-xl animate-pulse p-4';
                    card.innerHTML = `<div class="spinner"></div>`;
                    gridEl.appendChild(card);
                }

                const generateThumbnail = async (index) => {
                    const card = gridEl.children[index];
                    try {

                        let prompt = `Create a youtube thumbnail.
                                Title: "${titleVal}".
                                ${subtitleVal ? `Subtitle: "${subtitleVal}".` : ""}
                                ${visualDesc ? `Visual Description: ${visualDesc}.` : ""}
                                Style: ${stylePrompt}.
                                ${additionalPrompt ? `Additional Instructions: ${additionalPrompt}` : ""}
                                Aspect Ratio: ${ratioVal}.
                                Make it clickbait, high contrast, professional, and visually stunning.
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

                        if (vtUploadedImages.length > 0 && !useDesc) {
                            endpoint = '/generate';
                            vtUploadedImages.forEach(img => {
                                formData.append('images[]', base64ToBlob(img.base64, img.mimeType));
                            });
                        }

                        formData.append('instruction', prompt);
                        if (ratioVal && ratioVal !== '1:1' && ratioVal !== 'Auto') {
                            formData.append('aspectRatio', ratioVal);
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

                            card.className = `card overflow-hidden relative bg-white w-full flex items-center justify-center group ${getAspectRatioClass(ratioVal)}`;
                            card.innerHTML = `
                                        <img src="${imageUrl}" class="w-full h-full object-cover shadow-lg rounded-lg">
                                        <div class="absolute bottom-2 right-2 flex gap-2">
                                            <button onclick="${previewFn}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                                <i data-lucide="eye" class="w-4 h-4"></i>
                                            </button>
                                            <a href="${imageUrl}" download="thumbnail_${Date.now()}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                                <i data-lucide="download" class="w-4 h-4"></i>
                                            </a>
                                        </div>
                                    `;
                        } else {
                            throw new Error("No image data generated (No URL returned)");
                        }

                    } catch (e) {
                        console.error(e);
                        card.innerHTML = `<div class="text-red-500 p-4 w-full text-center text-xs">${e.message}</div>`;
                        card.classList.remove('animate-pulse');
                    } finally {
                        lucide.createIcons();
                    }
                };

                const promises = [];
                for (let i = 0; i < count; i++) {
                    promises.push(generateThumbnail(i));
                }

                await Promise.allSettled(promises);
                loaderEl.classList.add('hidden');

                vtGenerateBtn.disabled = false;
                vtGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
                vtGenerateBtn.innerHTML = originalBtnHTML;

                if (typeof doneSound !== 'undefined') doneSound.play();
            });
        }
    }
};
