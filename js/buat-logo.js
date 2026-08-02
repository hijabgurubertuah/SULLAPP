window.initBuatLogo = function (ctx = {}) {
    const {
        document,
        setupOptionButtons,
        getAspectRatioClass,
        lucide,
        getApiKey,
        GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound
    } = ctx;

    const clModeDrawBtn = document.getElementById('cl-mode-draw');
    const clModeTextBtn = document.getElementById('cl-mode-text');
    const clInputSection = document.getElementById('cl-input-section');
    const clInputDraw = document.getElementById('cl-input-draw');
    const clInputText = document.getElementById('cl-input-text');
    const clCanvas = document.getElementById('cl-canvas');
    const clClearCanvasBtn = document.getElementById('cl-clear-canvas');
    const clBrandDesc = document.getElementById('cl-brand-desc');
    const clStyleSelect = document.getElementById('cl-style-select');
    const clExtraPrompt = document.getElementById('cl-extra-prompt');
    const clRatioOptions = document.getElementById('cl-ratio-options');
    const clCountSlider = document.getElementById('cl-count-slider');
    const clCountValue = document.getElementById('cl-count-value');
    const clGenerateBtn = document.getElementById('cl-generate-btn');
    const clResultsPlaceholder = document.getElementById('cl-results-placeholder');
    const clResultsGrid = document.getElementById('cl-results-grid');

    if (!clGenerateBtn) return null;

    if (clModeDrawBtn && clModeTextBtn) {
        let clMode = 'draw';

        function setClMode(mode) {
            clMode = mode;
            if (mode === 'draw') {
                clModeDrawBtn.classList.replace('text-slate-500', 'text-teal-700');
                clModeDrawBtn.classList.add('bg-white', 'shadow-sm');
                clModeTextBtn.classList.replace('text-teal-700', 'text-slate-500');
                clModeTextBtn.classList.remove('bg-white', 'shadow-sm');
                clInputDraw.classList.remove('hidden');
                clInputText.classList.add('hidden');
            } else {
                clModeTextBtn.classList.replace('text-slate-500', 'text-teal-700');
                clModeTextBtn.classList.add('bg-white', 'shadow-sm');
                clModeDrawBtn.classList.replace('text-teal-700', 'text-slate-500');
                clModeDrawBtn.classList.remove('bg-white', 'shadow-sm');
                clInputText.classList.remove('hidden');
                clInputDraw.classList.add('hidden');
            }
        }

        clModeDrawBtn.addEventListener('click', () => setClMode('draw'));
        clModeTextBtn.addEventListener('click', () => setClMode('text'));

        const ctx = clCanvas.getContext('2d');
        let painting = false;

        function resizeCanvas() {
            const rect = clCanvas.getBoundingClientRect();
            if (clCanvas.width !== rect.width || clCanvas.height !== rect.height) {
                clCanvas.width = rect.width;
                clCanvas.height = rect.height;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, clCanvas.width, clCanvas.height);
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#000000';
            }
        }

        setTimeout(resizeCanvas, 100);
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0) {
                    resizeCanvas();
                }
            }
        });
        observer.observe(clCanvas.parentElement);

        function startPosition(e) {
            painting = true;
            draw(e);
        }

        function endPosition() {
            painting = false;
            ctx.beginPath();
        }

        function draw(e) {
            if (!painting) return;
            e.preventDefault();
            const rect = clCanvas.getBoundingClientRect();
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000000';

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        }

        clCanvas.addEventListener('mousedown', startPosition);
        clCanvas.addEventListener('mouseup', endPosition);
        clCanvas.addEventListener('mousemove', draw);
        clCanvas.addEventListener('mouseleave', endPosition);

        clCanvas.addEventListener('touchstart', startPosition, { passive: false });
        clCanvas.addEventListener('touchend', endPosition);
        clCanvas.addEventListener('touchmove', draw, { passive: false });

        clClearCanvasBtn.addEventListener('click', () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, clCanvas.width, clCanvas.height);
        });

        setupOptionButtons(clRatioOptions);

        if (clCountSlider && clCountValue) {
            clCountSlider.addEventListener('input', (e) => {
                clCountValue.textContent = e.target.value;
            });
        }

        clGenerateBtn.addEventListener('click', async () => {
            const style = clStyleSelect.value;
            const extra = clExtraPrompt.value.trim();
            const count = parseInt(clCountSlider.value) || 1;
            const ratio = clRatioOptions.querySelector('.selected').dataset.value;

            let promptText = "";
            let imageParts = [];

            if (clMode === 'draw') {
                const dataUrl = clCanvas.toDataURL('image/png');
                const base64 = dataUrl.split(',')[1];
                imageParts.push({ inlineData: { mimeType: 'image/png', data: base64 } });
                promptText = `Turn this sketch into a polished professional logo. Style: ${style}. CRITICAL INSTRUCTION: You MUST strictly follow the lines, shape, and composition of the provided sketch. Do not change the subject. Just clean it up and make it look professional.`;
            } else {
                const brandDesc = clBrandDesc.value.trim();
                if (!brandDesc) {
                    alert("Mohon isi deskripsi brand terlebih dahulu.");
                    return;
                }
                promptText = `Create a professional logo design for a brand described as: "${brandDesc}". Style: ${style}.`;
            }

            if (extra) {
                promptText += ` additional instructions: ${extra}`;
            }

            promptText += ` Aspect Ratio: ${ratio}. IMPORTANT: Generate exactly ONE single logo design. Do not create a grid, sheet, or multiple variations. The image must contain only one isolated logo. High quality, vector-like.`;

            const originalBtnHTML = clGenerateBtn.innerHTML;
            const originalBtnStyle = clGenerateBtn.style.background;

            clGenerateBtn.disabled = true;
            clGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Sedang Mendesain...</span>`;
            clGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');

            try {
                clResultsPlaceholder.classList.add('hidden');
                clResultsGrid.classList.remove('hidden');
                clResultsGrid.className = `grid gap-4 ${getResultGridCols(count)}`;
                clResultsGrid.innerHTML = '';

                for (let i = 0; i < count; i++) {
                    const placeholder = document.createElement('div');
                    placeholder.id = `cl-result-${i}`;
                    let aspectClass = 'aspect-square';
                    if (ratio === '16:9') aspectClass = 'aspect-video';
                    else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                    placeholder.className = `card ${aspectClass} w-full flex items-center justify-center bg-slate-50 border border-slate-200`;
                    const tips = ["AI sedang merancang konsep...", "Memilih warna yang tepat...", "Menggambar bentuk geometris...", "Finishing touches..."];
                    const randomTip = tips[Math.floor(Math.random() * tips.length)];
                    placeholder.innerHTML = `
                                <div class="flex flex-col items-center gap-3 text-center p-4">
                                    <div class="spinner"></div>
                                    <div>
                                        <span class="text-sm font-semibold text-slate-600 block">Logo ${i + 1}</span>
                                        <span class="text-xs text-slate-400 mt-1 block">${randomTip}</span>
                                    </div>
                                </div>`;
                    clResultsGrid.appendChild(placeholder);
                }

                const generateSingle = async (index) => {
                    const card = document.getElementById(`cl-result-${index}`);
                    try {
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

                        if (clMode === 'draw') {
                            const dataUrl = clCanvas.toDataURL('image/png');
                            const base64 = dataUrl.split(',')[1];
                            formData.append('images[]', base64ToBlob(base64, 'image/png'));
                            formData.append('instruction', promptText);
                            endpoint = '/generate';
                        } else {
                            formData.append('instruction', promptText);
                            endpoint = '/generate';
                        }

                        if (ratio !== 'Auto') formData.append('aspectRatio', ratio);
                        else formData.append('aspectRatio', '1:1');

                        const response = await fetch(`${GENERATE_URL}`, {
                            method: 'POST',
                            headers: {
                                'X-API-Key': getApiKey()
                            },
                            body: formData
                        });

                        if (!response.ok) throw new Error(await getApiErrorMessage(response));
                        const result = await response.json();

                        if (!result.success || !result.imageUrl) throw new Error("Gagal membuat gambar (No data).");

                        const imageUrl = result.imageUrl;

                        const previewFn = (typeof window.openTiImagePreview === 'function') ? `window.openTiImagePreview('${imageUrl}')` : `window.open('${imageUrl}', '_blank')`;

                        card.className = `card overflow-hidden relative bg-white ${getAspectRatioClass(ratio)}`;
                        card.style.height = 'auto';
                        card.innerHTML = `
                                    <img src="${imageUrl}" class="w-full h-full object-contain shadow-sm cursor-pointer" onclick="${previewFn}">
                                    <div class="absolute bottom-2 right-2 flex gap-2">
                                        <button onclick="${previewFn}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                            <i data-lucide="eye" class="w-4 h-4"></i>
                                        </button>
                                        <a href="${imageUrl}" download="logo_create_${Date.now()}_${index}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                            <i data-lucide="download" class="w-4 h-4"></i>
                                        </a>
                                    </div>
                                `;
                    } catch (e) {
                        console.error(`Error generating logo ${index}:`, e);
                        card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words w-full">${e.message}</div>`;
                    }
                };

                const promises = [];
                for (let i = 0; i < count; i++) {
                    promises.push(generateSingle(i));
                }
                await Promise.allSettled(promises);
                if (typeof doneSound !== 'undefined') doneSound.play();
            } catch (e) {
                if (typeof errorSound !== 'undefined') errorSound.play();
                console.error(e);
                alert("Terjadi kesalahan: " + e.message);
            } finally {
                clGenerateBtn.disabled = false;
                clGenerateBtn.innerHTML = originalBtnHTML;
                clGenerateBtn.style.background = originalBtnStyle;
                clGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }
};