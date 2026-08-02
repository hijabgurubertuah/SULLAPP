window.initHapusObjek = function() {
    const hoImageInput = document.getElementById('ho-upload-input');
    const hoUploadArea = document.getElementById('ho-upload-area');
    const hoPlaceholder = document.getElementById('ho-placeholder');
    const hoCanvasContainer = document.getElementById('ho-canvas-container');
    const hoImageCanvas = document.getElementById('ho-image-canvas');
    const hoMaskCanvas = document.getElementById('ho-mask-canvas');
    const hoToolbar = document.getElementById('ho-toolbar');
    const hoBrushSizeInput = document.getElementById('ho-brush-size');
    const hoUndoBtn = document.getElementById('ho-undo-btn');
    const hoRedoBtn = document.getElementById('ho-redo-btn');
    const hoResetBtn = document.getElementById('ho-reset-btn');
    const hoRatioOptions = document.getElementById('ho-ratio-options');
    const hoGenerateBtn = document.getElementById('ho-generate-btn');
    const hoResultContainer = document.getElementById('ho-result-container');
    const hoResultActions = document.getElementById('ho-result-actions');
    const hoDownloadBtn = document.getElementById('ho-download-btn');
    const hoRemoveBtn = document.getElementById('ho-remove-btn');

    if (!hoUploadArea) return;

    let hoCtxImage = hoImageCanvas.getContext('2d');
    let hoCtxMask = hoMaskCanvas.getContext('2d');
    let hoOriginalImage = null;
    let hoIsDrawing = false;
    let hoBrushSize = 30;
    let hoHistory = [];
    let hoHistoryStep = -1;
    const HO_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
    const HO_TARGET_BYTES = 14.5 * 1024 * 1024;

    if (hoRatioOptions && typeof setupOptionButtons === 'function') {
        setupOptionButtons(hoRatioOptions);
    }

    if (hoBrushSizeInput) {
        hoBrushSizeInput.addEventListener('input', (e) => {
            hoBrushSize = e.target.value;
        });
    }

    function hoGetSelectedRatio() {
        if (!hoRatioOptions) return '1:1';
        const selected = hoRatioOptions.querySelector('.option-btn.selected');
        if (selected && selected.dataset.value) return selected.dataset.value;
        const first = hoRatioOptions.querySelector('.option-btn');
        return first?.dataset?.value || '1:1';
    }

    function hoSetSelectedRatio(value) {
        if (!hoRatioOptions) return;
        const buttons = Array.from(hoRatioOptions.querySelectorAll('.option-btn'));
        if (!buttons.length) return;
        buttons.forEach((btn) => btn.classList.remove('selected'));
        const match = buttons.find((btn) => btn.dataset.value === value);
        (match || buttons[0]).classList.add('selected');
    }

    function hoSelectNearestRatio(width, height) {
        if (!hoRatioOptions || !width || !height) return;
        const target = width / height;
        let bestValue = '1:1';
        let bestDiff = Number.POSITIVE_INFINITY;
        hoRatioOptions.querySelectorAll('.option-btn').forEach((btn) => {
            const value = btn.dataset.value || '1:1';
            const parts = value.split(':').map(Number);
            if (parts.length !== 2 || !parts[0] || !parts[1]) return;
            const ratio = parts[0] / parts[1];
            const diff = Math.abs(ratio - target);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestValue = value;
            }
        });
        hoSetSelectedRatio(bestValue);
    }

    function loadHoImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                hoOriginalImage = img;

                const containerWidth = hoUploadArea.offsetWidth;
                const containerHeight = hoUploadArea.offsetHeight;
                const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
                const newWidth = img.width * scale;
                const newHeight = img.height * scale;

                hoImageCanvas.width = newWidth;
                hoImageCanvas.height = newHeight;
                hoMaskCanvas.width = newWidth;
                hoMaskCanvas.height = newHeight;

                hoCtxImage.drawImage(img, 0, 0, newWidth, newHeight);

                hoPlaceholder.classList.add('hidden');
                hoCanvasContainer.classList.remove('hidden');
                hoToolbar.classList.remove('hidden');
                if (hoRemoveBtn) hoRemoveBtn.classList.remove('hidden');
                hoSelectNearestRatio(img.naturalWidth || img.width, img.naturalHeight || img.height);

                hoHistory = [];
                hoHistoryStep = -1;
                saveHistory();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    hoUploadArea.addEventListener('click', () => {
        if (!hoOriginalImage && hoImageInput) hoImageInput.click();
    });

    if (hoImageInput) {
        hoImageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) loadHoImage(e.target.files[0]);
        });
    }

    function hoResetAll() {
        hoOriginalImage = null;
        if (hoImageInput) hoImageInput.value = '';
        hoCanvasContainer.classList.add('hidden');
        hoToolbar.classList.add('hidden');
        hoPlaceholder.classList.remove('hidden');
        if (hoRemoveBtn) hoRemoveBtn.classList.add('hidden');
        hoCtxImage.clearRect(0, 0, hoImageCanvas.width, hoImageCanvas.height);
        hoCtxMask.clearRect(0, 0, hoMaskCanvas.width, hoMaskCanvas.height);
        hoResultContainer.innerHTML = `<p class="text-xs text-slate-400 text-center px-8">Hasil penghapusan objek akan muncul di sini.</p>`;
        hoResultActions.classList.add('hidden');
        hoDownloadBtn.setAttribute('href', '#');
    }

    if (hoRemoveBtn) {
        hoRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hoResetAll();
        });
    }

    hoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        hoUploadArea.classList.add('border-teal-500', 'bg-teal-50');
    });

    hoUploadArea.addEventListener('dragleave', () => {
        hoUploadArea.classList.remove('border-teal-500', 'bg-teal-50');
    });

    hoUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        hoUploadArea.classList.remove('border-teal-500', 'bg-teal-50');
        const file = e.dataTransfer.files[0];
        if (file) loadHoImage(file);
    });

    function hoCanvasToBlob(canvas, type, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Gagal membuat gambar kompresi.'));
                    return;
                }
                resolve(blob);
            }, type, quality);
        });
    }

    function hoDrawComposite(canvas, width, height) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        if (hoOriginalImage) {
            ctx.drawImage(hoOriginalImage, 0, 0, width, height);
        } else {
            ctx.drawImage(hoImageCanvas, 0, 0, width, height);
        }
        ctx.drawImage(hoMaskCanvas, 0, 0, hoMaskCanvas.width, hoMaskCanvas.height, 0, 0, width, height);
    }

    async function hoCreateCompositeBlob() {
        if (!hoOriginalImage && !hoImageCanvas) return null;
        const baseWidth = hoOriginalImage?.naturalWidth || hoOriginalImage?.width || hoImageCanvas.width;
        const baseHeight = hoOriginalImage?.naturalHeight || hoOriginalImage?.height || hoImageCanvas.height;
        let scale = 1;
        let quality = 0.92;
        let attempts = 0;
        let blob = null;
        while (attempts < 8) {
            const width = Math.max(1, Math.round(baseWidth * scale));
            const height = Math.max(1, Math.round(baseHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            hoDrawComposite(canvas, width, height);
            blob = await hoCanvasToBlob(canvas, 'image/jpeg', quality);
            if (blob.size <= HO_MAX_UPLOAD_BYTES) return blob;
            const shrinkBy = Math.sqrt(HO_TARGET_BYTES / blob.size);
            if (shrinkBy < 1) {
                scale = Math.max(0.2, scale * shrinkBy * 0.98);
            } else {
                quality = Math.max(0.7, quality - 0.08);
            }
            attempts += 1;
        }
        if (blob && blob.size <= HO_MAX_UPLOAD_BYTES) return blob;
        throw new Error('Ukuran gambar terlalu besar, coba gunakan gambar lebih kecil.');
    }

    function getPos(e) {
        const rect = hoMaskCanvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        return { x, y };
    }

    function startDrawing(e) {
        if (e.type === 'touchstart') e.preventDefault();
        hoIsDrawing = true;
        const { x, y } = getPos(e);

        hoCtxMask.globalCompositeOperation = 'source-over';
        hoCtxMask.lineCap = 'round';
        hoCtxMask.lineJoin = 'round';
        hoCtxMask.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        hoCtxMask.lineWidth = hoBrushSize;

        hoCtxMask.beginPath();
        hoCtxMask.moveTo(x, y);
    }

    function draw(e) {
        if (!hoIsDrawing) return;
        if (e.type === 'touchmove') e.preventDefault();
        const { x, y } = getPos(e);
        hoCtxMask.lineTo(x, y);
        hoCtxMask.stroke();
    }

    function stopDrawing() {
        if (!hoIsDrawing) return;
        hoIsDrawing = false;
        hoCtxMask.closePath();
        saveHistory();
    }

    hoMaskCanvas.addEventListener('mousedown', startDrawing);
    hoMaskCanvas.addEventListener('mousemove', draw);
    hoMaskCanvas.addEventListener('mouseup', stopDrawing);
    hoMaskCanvas.addEventListener('mouseout', stopDrawing);

    hoMaskCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    hoMaskCanvas.addEventListener('touchmove', draw, { passive: false });
    hoMaskCanvas.addEventListener('touchend', stopDrawing);

    function saveHistory() {
        hoHistoryStep++;
        if (hoHistoryStep < hoHistory.length) { hoHistory.length = hoHistoryStep; }
        hoHistory.push(hoMaskCanvas.toDataURL());
    }

    function undo() {
        if (hoHistoryStep > 0) {
            hoHistoryStep--;
            const img = new Image();
            img.onload = () => {
                hoCtxMask.clearRect(0, 0, hoMaskCanvas.width, hoMaskCanvas.height);
                hoCtxMask.drawImage(img, 0, 0);
            };
            img.src = hoHistory[hoHistoryStep];
        } else if (hoHistoryStep === 0) {
            hoHistoryStep = -1;
            hoCtxMask.clearRect(0, 0, hoMaskCanvas.width, hoMaskCanvas.height);
        }
    }

    function redo() {
        if (hoHistoryStep < hoHistory.length - 1) {
            hoHistoryStep++;
            const img = new Image();
            img.onload = () => {
                hoCtxMask.clearRect(0, 0, hoMaskCanvas.width, hoMaskCanvas.height);
                hoCtxMask.drawImage(img, 0, 0);
            };
            img.src = hoHistory[hoHistoryStep];
        }
    }

    if (hoUndoBtn) hoUndoBtn.addEventListener('click', undo);
    if (hoRedoBtn) hoRedoBtn.addEventListener('click', redo);

    if (hoResetBtn) {
        hoResetBtn.addEventListener('click', () => {
            hoCtxMask.clearRect(0, 0, hoMaskCanvas.width, hoMaskCanvas.height);
            hoHistory = [];
            hoHistoryStep = -1;
            saveHistory();
        });
    }

    if (hoGenerateBtn) {
        hoGenerateBtn.addEventListener('click', async () => {
            if (!hoOriginalImage) return;

            const countSlider = document.getElementById('ho-count-slider');
            const imageCount = countSlider ? parseInt(countSlider.value) : 1;

            const originalBtnHTML = hoGenerateBtn.innerHTML;
            hoGenerateBtn.disabled = true;
            hoGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');
            hoGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg> Menghapus...`;

            let aspectStyle = '';
            if (hoImageCanvas && hoImageCanvas.width && hoImageCanvas.height) {
                aspectStyle = `aspect-ratio: ${hoImageCanvas.width} / ${hoImageCanvas.height};`;
            }

            // Prepare container for grid if multiple
            if (imageCount > 1) {
                hoResultContainer.className = `grid ${getResultGridCols(imageCount)} gap-4 w-full`;
            } else {
                hoResultContainer.className = "relative w-full aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center";
            }
            hoResultContainer.innerHTML = '';

            const processPromises = [];
            let successCount = 0;

            for (let i = 0; i < imageCount; i++) {
                const cardId = 'ho-result-' + i;
                const card = document.createElement('div');
                card.id = cardId;
                card.style.cssText = aspectStyle;
                card.className = "relative w-full flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-xl border border-slate-200";
                card.innerHTML = `<div class="spinner"></div><p class="text-xs text-slate-400 mt-2">Sedang memproses ${i + 1}...</p>`;
                hoResultContainer.appendChild(card);

                const promise = (async () => {
                    try {
                        if (typeof GENERATE_URL === 'undefined' || typeof API_KEY === 'undefined') {
                            throw new Error("Konfigurasi API tidak ditemukan.");
                        }

                        const imageBlob = await hoCreateCompositeBlob();
                        const formData = new FormData();
                        formData.append('images', imageBlob, 'hapus-objek.jpg');
                        formData.append('instruction', "Remove the area highlighted in RED semi-transparent overlay from this image. Replace it seamlessly with the background context (inpainting). Return the clean image without the red mask.");
                        formData.append('aspectRatio', hoGetSelectedRatio());

                        const response = await fetch(`${GENERATE_URL}`, {
                            method: 'POST',
                            headers: {
                                'X-API-Key': API_KEY
                            },
                            body: formData
                        });

                        if (!response.ok) {
                            const errorMsg = typeof getApiErrorMessage === 'function' 
                                ? await getApiErrorMessage(response) 
                                : `Error: ${response.status} ${response.statusText}`;
                            throw new Error(errorMsg);
                        }

                        const result = await response.json();

                        if (result.success && result.imageUrl) {
                            const outputUrl = result.imageUrl;
                            card.innerHTML = `
                                    <div class="relative w-full h-full group">
                                        <img src="${outputUrl}" class="w-full h-full object-contain rounded-lg shadow-sm">
                                        <button onclick="window.openTiImagePreview('${outputUrl}')" class="absolute bottom-2 right-2 p-2 bg-white/80 rounded-full shadow hover:bg-white z-10"><i data-lucide="eye" class="w-4 h-4"></i></button>
                                        <a href="${outputUrl}" download="hapus_objek_${Date.now()}_${i}.png" class="absolute bottom-2 right-12 p-2 bg-teal-500 text-white rounded-full shadow hover:bg-teal-600 z-10"><i data-lucide="download" class="w-4 h-4"></i></a>
                                    </div>`;
                            if (window.lucide) window.lucide.createIcons();
                            successCount++;
                            
                            // Keep the main download button hidden if grid, or just update it to first image
                            if (i === 0) {
                                hoResultActions.classList.remove('hidden');
                                hoDownloadBtn.href = outputUrl;
                                hoDownloadBtn.download = `hapus_objek_${Date.now()}.png`;
                            }
                        } else {
                            throw new Error("Gagal generate image (No URL returned).");
                        }
                    } catch (error) {
                        console.error(error);
                        card.innerHTML = `<div class="text-center p-4 text-red-500 text-xs">${error.message}</div>`;
                    }
                })();
                processPromises.push(promise);
            }

            await Promise.all(processPromises);

            hoGenerateBtn.disabled = false;
            hoGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
            hoGenerateBtn.innerHTML = originalBtnHTML;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }
}
