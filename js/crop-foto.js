window.initCropFoto = function(ctx = {}) {
    const {
        document = window.document,
        setupImageUpload,
        lucide = window.lucide,
        doneSound,
        errorSound
    } = ctx;

    const cfImageInput = document.getElementById('cf-image-input');
    const cfUploadBox = document.getElementById('cf-upload-box');
    const cfWorkspace = document.getElementById('cf-workspace');
    const cfCanvasContainer = document.getElementById('cf-canvas-container');
    const cfPreview = document.getElementById('cf-preview');
    const cfCropFrame = document.getElementById('cf-crop-frame');
    const cfRatioOptions = document.getElementById('cf-ratio-options');
    const cfGenerateBtn = document.getElementById('cf-generate-btn');
    const cfResetBtn = document.getElementById('cf-reset-btn');
    const cfResultsCard = document.getElementById('cf-results-card');
    const cfResultsContainer = document.getElementById('cf-results-container');
    const cfResultsPlaceholder = document.getElementById('cf-results-placeholder');
    const cfWidthInput = document.getElementById('cf-width-input');
    const cfHeightInput = document.getElementById('cf-height-input');

    if (cfImageInput && cfUploadBox && cfWorkspace && cfCanvasContainer && cfPreview && cfCropFrame && cfRatioOptions && cfGenerateBtn && cfResetBtn && cfResultsCard && cfResultsContainer && cfResultsPlaceholder) {
        let cfImageData = null;
        let cfOriginalImg = null;
        let cfImageState = { width: 0, height: 0 };
        let cfFrameState = { x: 0, y: 0, width: 0, height: 0 };
        let cfDragState = { active: false, handle: null, startX: 0, startY: 0, startFrame: null };
        let cfLockedRatio = null; // Default to free
        const cfMinSize = 60;

        function cfUpdateInputs() {
            if (!cfOriginalImg || !cfImageState.width) return;
            const scale = cfOriginalImg.naturalWidth / cfImageState.width;
            if (cfWidthInput) cfWidthInput.value = Math.round(cfFrameState.width * scale);
            if (cfHeightInput) cfHeightInput.value = Math.round(cfFrameState.height * scale);
        }

        function cfApplyFrame() {
            cfCropFrame.style.left = `${cfFrameState.x}px`;
            cfCropFrame.style.top = `${cfFrameState.y}px`;
            cfCropFrame.style.width = `${cfFrameState.width}px`;
            cfCropFrame.style.height = `${cfFrameState.height}px`;
            cfUpdateInputs();
        }

        function cfClampFrame(frame) {
            let width = frame.width;
            let height = frame.height;
            const maxW = cfImageState.width;
            const maxH = cfImageState.height;

            if (cfLockedRatio) {
                if (width > maxW) {
                    width = maxW;
                    height = width / cfLockedRatio;
                }
                if (height > maxH) {
                    height = maxH;
                    width = height * cfLockedRatio;
                }
            } else {
                 if (width > maxW) width = maxW;
                 if (height > maxH) height = maxH;
            }

            let x = Math.min(Math.max(0, frame.x), maxW - width);
            let y = Math.min(Math.max(0, frame.y), maxH - height);

            return { x, y, width, height };
        }

        function cfSetFrameByRatio(value) {
            if (value === 'free') {
                cfLockedRatio = null;
                cfUpdateInputs();
                return;
            }

            const [wRatio, hRatio] = value.split(':').map(Number);
            if (!wRatio || !hRatio) return;

            cfLockedRatio = wRatio / hRatio;
            const maxW = cfImageState.width;
            const maxH = cfImageState.height;

            let frameW = Math.max(cfMinSize, maxW * 0.7);
            let frameH = frameW / cfLockedRatio;

            if (frameH > maxH * 0.7) {
                frameH = Math.max(cfMinSize, maxH * 0.7);
                frameW = frameH * cfLockedRatio;
            }

            if (frameW > maxW) {
                frameW = maxW;
                frameH = frameW / cfLockedRatio;
            }
            if (frameH > maxH) {
                frameH = maxH;
                frameW = frameH * cfLockedRatio;
            }

            const x = (maxW - frameW) / 2;
            const y = (maxH - frameH) / 2;

            cfFrameState = { x, y, width: frameW, height: frameH };
            cfApplyFrame();
        }

        function cfResetUI() {
            cfImageData = null;
            cfOriginalImg = null;
            cfUploadBox.style.display = 'flex';
            cfCanvasContainer.classList.add('hidden');
            cfResultsCard.classList.add('hidden');
            cfResultsPlaceholder.classList.remove('hidden');
            cfResultsContainer.innerHTML = '';
            cfGenerateBtn.disabled = true;
            cfResetBtn.disabled = true;

            const defaultRatioBtn = cfRatioOptions.querySelector('[data-value="1:1"]');
            if (defaultRatioBtn) {
                Array.from(cfRatioOptions.children).forEach(btn => btn.classList.remove('selected'));
                defaultRatioBtn.classList.add('selected');
            }
        }

        function cfInitializeCanvas(img) {
            cfOriginalImg = img;
            cfUploadBox.style.display = 'none';
            cfCanvasContainer.classList.remove('hidden');

            const workspaceRect = cfWorkspace.getBoundingClientRect();
            const maxW = workspaceRect.width - 40;
            const maxH = workspaceRect.height - 40;

            let scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
            if (!isFinite(scale) || scale <= 0) scale = 1;

            const displayW = img.naturalWidth * scale;
            const displayH = img.naturalHeight * scale;

            cfImageState = { width: displayW, height: displayH };
            cfCanvasContainer.style.width = `${displayW}px`;
            cfCanvasContainer.style.height = `${displayH}px`;

            cfPreview.style.left = `0px`;
            cfPreview.style.top = `0px`;
            cfPreview.style.width = `${displayW}px`;
            cfPreview.style.height = `${displayH}px`;

            const selected = cfRatioOptions.querySelector('.selected') || cfRatioOptions.querySelector('[data-value="1:1"]');
            if (selected) {
                if (selected.dataset.value === 'free') {
                     const maxW = cfImageState.width;
                     const maxH = cfImageState.height;
                     const frameW = maxW * 0.8;
                     const frameH = maxH * 0.8;
                     cfFrameState = { 
                        x: (maxW - frameW) / 2, 
                        y: (maxH - frameH) / 2, 
                        width: frameW, 
                        height: frameH 
                     };
                     cfLockedRatio = null;
                     cfApplyFrame();
                } else {
                    cfSetFrameByRatio(selected.dataset.value);
                }
            }

            cfGenerateBtn.disabled = false;
            cfResetBtn.disabled = false;
            cfResultsCard.classList.add('hidden');
            cfResultsPlaceholder.classList.remove('hidden');
            cfResultsContainer.innerHTML = '';
        }

        if (setupImageUpload) {
            setupImageUpload(cfImageInput, cfUploadBox, (data) => {
                cfImageData = data;
                cfPreview.src = data.dataUrl;
                const img = new Image();
                img.onload = () => cfInitializeCanvas(img);
                img.src = data.dataUrl;
            });
        }

        function cfHandleInputChange() {
            if (!cfOriginalImg || !cfImageState.width) return;
            const scale = cfOriginalImg.naturalWidth / cfImageState.width;
            
            let newW = parseInt(cfWidthInput.value);
            let newH = parseInt(cfHeightInput.value);

            if (isNaN(newW) || isNaN(newH)) return;

            // Convert to display pixels
            newW = newW / scale;
            newH = newH / scale;

            // Switch to free mode
            cfLockedRatio = null;
            Array.from(cfRatioOptions.children).forEach(child => child.classList.remove('selected'));
            const freeBtn = cfRatioOptions.querySelector('[data-value="free"]');
            if (freeBtn) freeBtn.classList.add('selected');

            // Clamp size
            if (newW > cfImageState.width) newW = cfImageState.width;
            if (newH > cfImageState.height) newH = cfImageState.height;
            if (newW < cfMinSize) newW = cfMinSize;
            if (newH < cfMinSize) newH = cfMinSize;

            // Center or keep position
            let newX = cfFrameState.x;
            let newY = cfFrameState.y;

            if (newX + newW > cfImageState.width) newX = cfImageState.width - newW;
            if (newY + newH > cfImageState.height) newY = cfImageState.height - newH;

            cfFrameState = { x: newX, y: newY, width: newW, height: newH };
            cfApplyFrame();
        }

        cfResetBtn.addEventListener('click', cfResetUI);
        if (cfWidthInput) cfWidthInput.addEventListener('change', cfHandleInputChange);
        if (cfHeightInput) cfHeightInput.addEventListener('change', cfHandleInputChange);

        Array.from(cfRatioOptions.querySelectorAll('button[data-value]')).forEach(btn => {
            btn.addEventListener('click', () => {
                Array.from(cfRatioOptions.children).forEach(child => child.classList.remove('selected'));
                btn.classList.add('selected');
                if (cfOriginalImg) cfSetFrameByRatio(btn.dataset.value);
            });
        });

        function cfStartDrag(e) {
            const handleEl = e.target.closest('.cf-handle');
            const isFrame = e.target === cfCropFrame;
            if (!handleEl && !isFrame) return;

            if (e.cancelable) e.preventDefault();

            const isTouchEvent = !!e.touches;
            const startX = isTouchEvent ? e.touches[0].clientX : e.clientX;
            const startY = isTouchEvent ? e.touches[0].clientY : e.clientY;

            cfDragState = {
                active: true,
                handle: handleEl ? handleEl.id : 'move',
                startX,
                startY,
                startFrame: { ...cfFrameState }
            };

            if (isTouchEvent) {
                window.addEventListener('touchmove', cfDragHandler, { passive: false });
                window.addEventListener('touchend', cfEndDragHandler);
            } else {
                window.addEventListener('mousemove', cfDragHandler);
                window.addEventListener('mouseup', cfEndDragHandler);
            }
        }

        function cfDragHandler(e) {
            if (!cfDragState.active) return;
            if (e.cancelable) e.preventDefault();

            const currentX = e.touches ? e.touches[0].clientX : e.clientX;
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = currentX - cfDragState.startX;
            const dy = currentY - cfDragState.startY;

            if (cfDragState.handle === 'move') {
                const nextFrame = {
                    ...cfDragState.startFrame,
                    x: cfDragState.startFrame.x + dx,
                    y: cfDragState.startFrame.y + dy
                };
                cfFrameState = cfClampFrame(nextFrame);
                cfApplyFrame();
                return;
            }

            const direction = cfDragState.handle.replace('cf-handle-', '');
            let newFrame = { ...cfDragState.startFrame };

            if (cfLockedRatio) {
                if (direction === 'n' || direction === 's') {
                    const delta = direction === 's' ? dy : -dy;
                    let newHeight = Math.max(cfMinSize, cfDragState.startFrame.height + delta);
                    let newWidth = newHeight * cfLockedRatio;

                    let newX = cfDragState.startFrame.x + (cfDragState.startFrame.width - newWidth) / 2;
                    let newY = direction === 's' ? cfDragState.startFrame.y : cfDragState.startFrame.y + (cfDragState.startFrame.height - newHeight);

                    newFrame = { x: newX, y: newY, width: newWidth, height: newHeight };
                } else if (direction === 'e' || direction === 'w') {
                    const delta = direction === 'e' ? dx : -dx;
                    let newWidth = Math.max(cfMinSize, cfDragState.startFrame.width + delta);
                    let newHeight = newWidth / cfLockedRatio;

                    let newX = direction === 'e' ? cfDragState.startFrame.x : cfDragState.startFrame.x + (cfDragState.startFrame.width - newWidth);
                    let newY = cfDragState.startFrame.y + (cfDragState.startFrame.height - newHeight) / 2;

                    newFrame = { x: newX, y: newY, width: newWidth, height: newHeight };
                } else {
                    const delta = direction.includes('e') ? dx : -dx;
                    let newWidth = Math.max(cfMinSize, cfDragState.startFrame.width + delta);
                    let newHeight = newWidth / cfLockedRatio;

                    let newX = direction.includes('e') ? cfDragState.startFrame.x : cfDragState.startFrame.x + (cfDragState.startFrame.width - newWidth);
                    let newY = direction.includes('s') ? cfDragState.startFrame.y : cfDragState.startFrame.y + (cfDragState.startFrame.height - newHeight);

                    newFrame = { x: newX, y: newY, width: newWidth, height: newHeight };
                }
            } else {
                // Free resizing
                let { x, y, width, height } = cfDragState.startFrame;

                if (direction.includes('n')) {
                    const delta = -dy;
                    const possibleHeight = height + delta;
                    if (possibleHeight >= cfMinSize) {
                        height = possibleHeight;
                        y = y - delta;
                    } else {
                        y = y + (height - cfMinSize);
                        height = cfMinSize;
                    }
                }
                if (direction.includes('s')) {
                    height = Math.max(cfMinSize, height + dy);
                }
                if (direction.includes('w')) {
                    const delta = -dx;
                    const possibleWidth = width + delta;
                    if (possibleWidth >= cfMinSize) {
                        width = possibleWidth;
                        x = x - delta;
                    } else {
                        x = x + (width - cfMinSize);
                        width = cfMinSize;
                    }
                }
                if (direction.includes('e')) {
                    width = Math.max(cfMinSize, width + dx);
                }

                newFrame = { x, y, width, height };
            }

            cfFrameState = cfClampFrame(newFrame);
            cfApplyFrame();
        }

        function cfEndDragHandler() {
            if (!cfDragState.active) return;
            cfDragState.active = false;
            window.removeEventListener('mousemove', cfDragHandler);
            window.removeEventListener('mouseup', cfEndDragHandler);
            window.removeEventListener('touchmove', cfDragHandler);
            window.removeEventListener('touchend', cfEndDragHandler);
        }

        cfCropFrame.addEventListener('mousedown', cfStartDrag);
        cfCropFrame.addEventListener('touchstart', cfStartDrag, { passive: false });

        cfGenerateBtn.addEventListener('click', () => {
            if (!cfOriginalImg) return;

            try {
                const scale = cfOriginalImg.naturalWidth / cfImageState.width;
                const cropX = Math.max(0, Math.round(cfFrameState.x * scale));
                const cropY = Math.max(0, Math.round(cfFrameState.y * scale));
                const cropW = Math.round(cfFrameState.width * scale);
                const cropH = Math.round(cfFrameState.height * scale);

                const canvas = document.createElement('canvas');
                canvas.width = cropW;
                canvas.height = cropH;
                const ctx = canvas.getContext('2d');

                ctx.drawImage(cfOriginalImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                const dataUrl = canvas.toDataURL('image/png');

                const countSlider = document.getElementById('cf-count-slider');
                const imageCount = countSlider ? parseInt(countSlider.value) : 1;

                if (imageCount > 1) {
                    cfResultsContainer.className = `grid ${getResultGridCols(imageCount)} gap-4 p-4`;
                } else {
                    cfResultsContainer.className = "relative w-full aspect-square p-2 sm:p-4";
                }

                let html = '';
                for (let i = 0; i < imageCount; i++) {
                    html += `
                        <div class="relative w-full h-full group bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                            <img src="${dataUrl}" class="w-full h-full object-contain" alt="Hasil Crop">
                            <div class="absolute bottom-2 right-2 flex gap-1 z-10">
                                <button data-img-src="${dataUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <a href="${dataUrl}" download="crop-foto_${Date.now()}_${i}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                                    <i data-lucide="download" class="w-4 h-4"></i>
                                </a>
                            </div>
                        </div>
                    `;
                }
                cfResultsContainer.innerHTML = html;

                cfResultsPlaceholder.classList.add('hidden');
                cfResultsCard.classList.remove('hidden');

                if (lucide && lucide.createIcons) lucide.createIcons();
                if (doneSound) doneSound.play();

            } catch (error) {
                if (errorSound) errorSound.play();
                cfResultsContainer.innerHTML = `<div class="text-xs text-red-500 p-3 text-center break-all">Gagal memproses crop: ${error.message}</div>`;
                cfResultsPlaceholder.classList.add('hidden');
                cfResultsCard.classList.remove('hidden');
            }
        });
        
        // Setup view button delegation in results container
        cfResultsContainer.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-btn');
            if (viewBtn) {
                const imgSrc = viewBtn.dataset.imgSrc;
                if (imgSrc) {
                    const previewModal = document.getElementById('image-preview-modal');
                    const previewImg = document.getElementById('preview-modal-img');
                    if (previewModal && previewImg) {
                        previewImg.src = imgSrc;
                        previewModal.classList.remove('opacity-0', 'pointer-events-none');
                    }
                }
            }
        });
    }
};
