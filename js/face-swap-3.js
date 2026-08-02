function initFaceSwap3() {
    const fsw3TargetInput = document.getElementById('fsw3-target-input');
    const fsw3TargetUploadBox = document.getElementById('fsw3-target-upload-box');
    const fsw3TargetPreview = document.getElementById('fsw3-target-preview');
    const fsw3TargetPlaceholder = document.getElementById('fsw3-target-placeholder');
    const fsw3RemoveTargetBtn = document.getElementById('fsw3-remove-target-btn');

    const fsw3SourceInput = document.getElementById('fsw3-source-input');
    const fsw3SourceUploadBox = document.getElementById('fsw3-source-upload-box');
    const fsw3SourcePreview = document.getElementById('fsw3-source-preview');
    const fsw3SourcePlaceholder = document.getElementById('fsw3-source-placeholder');
    const fsw3RemoveSourceBtn = document.getElementById('fsw3-remove-source-btn');

    const fsw3GenerateBtn = document.getElementById('fsw3-generate-btn');
    const fsw3ResultsPlaceholder = document.getElementById('fsw3-results-placeholder');
    const fsw3ResultsContainer = document.getElementById('fsw3-results-container');
    const fsw3ResultsGrid = document.getElementById('fsw3-results-grid');
    const fsw3EnhancedToggle = document.getElementById('fsw3-enhanced-toggle');

    // Mode toggle elements
    const fsw3ModeSingleBtn = document.getElementById('fsw3-mode-single');
    const fsw3ModeMultiBtn = document.getElementById('fsw3-mode-multi');
    const fsw3SingleMode = document.getElementById('fsw3-single-mode');
    const fsw3MultiMode = document.getElementById('fsw3-multi-mode');

    // Multi mode elements
    const fsw3mTargetInput = document.getElementById('fsw3m-target-input');
    const fsw3mTargetUploadBox = document.getElementById('fsw3m-target-upload-box');
    const fsw3mTargetPreview = document.getElementById('fsw3m-target-preview');
    const fsw3mTargetPlaceholder = document.getElementById('fsw3m-target-placeholder');
    const fsw3mRemoveTargetBtn = document.getElementById('fsw3m-remove-target-btn');
    const fsw3mFacesSection = document.getElementById('fsw3m-faces-section');
    const fsw3mFacesList = document.getElementById('fsw3m-faces-list');

    let targetFile = null;
    let sourceFile = null;
    let isProcessing = false;
    let currentMode = 'single'; // 'single' or 'multi'

    // Multi mode state
    let multiTargetFile = null;
    let multiTargetImagePath = ''; // uploaded path on live3d
    let multiOriginFrom = '';
    let detectedFaces = []; // [{url, index}]
    let faceReplacements = {}; // {index: {file, uploadedPath}}

    // ============ MODE TOGGLE ============
    function switchMode(mode) {
        currentMode = mode;
        
        // Update header description and image
        const headerDesc = document.getElementById('fsw3-header-desc');
        const headerImg = document.getElementById('fsw3-header-img');
        
        if (mode === 'single') {
            fsw3SingleMode && (fsw3SingleMode.classList.remove('hidden'));
            fsw3MultiMode && (fsw3MultiMode.classList.add('hidden'));
            fsw3ModeSingleBtn && (fsw3ModeSingleBtn.className = 'flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm');
            fsw3ModeMultiBtn && (fsw3ModeMultiBtn.className = 'flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-700');
            
            // Single mode header
            if (headerDesc) {
                headerDesc.style.opacity = '0';
                setTimeout(() => {
                    headerDesc.textContent = 'Versi terbaru dengan teknologi Live3D! Unggah foto target dan foto wajah sumber untuk hasil face swap yang lebih natural.';
                    headerDesc.style.opacity = '1';
                }, 150);
            }
            if (headerImg) {
                headerImg.style.opacity = '0';
                setTimeout(() => {
                    headerImg.src = '/assets/faceswapv3.png';
                    headerImg.alt = 'Face Swap v3 Preview';
                    headerImg.style.opacity = '1';
                }, 150);
            }
        } else {
            fsw3SingleMode && (fsw3SingleMode.classList.add('hidden'));
            fsw3MultiMode && (fsw3MultiMode.classList.remove('hidden'));
            fsw3ModeMultiBtn && (fsw3ModeMultiBtn.className = 'flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all bg-white text-slate-800 shadow-sm');
            fsw3ModeSingleBtn && (fsw3ModeSingleBtn.className = 'flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-700');
            
            // Multi mode header
            if (headerDesc) {
                headerDesc.style.opacity = '0';
                setTimeout(() => {
                    headerDesc.textContent = 'Tukar banyak wajah dalam satu foto sekaligus! Upload foto grup, sistem akan deteksi semua wajah, lalu pilih wajah pengganti untuk masing-masing.';
                    headerDesc.style.opacity = '1';
                }, 150);
            }
            if (headerImg) {
                headerImg.style.opacity = '0';
                setTimeout(() => {
                    headerImg.src = '/assets/faceswapmulti.webp';
                    headerImg.alt = 'Multi Face Swap Preview';
                    headerImg.style.opacity = '1';
                }, 150);
            }
        }
        fsw3UpdateButtons();
    }

    fsw3ModeSingleBtn?.addEventListener('click', () => switchMode('single'));
    fsw3ModeMultiBtn?.addEventListener('click', () => switchMode('multi'));

    function fsw3UpdateButtons() {
        if (isProcessing) {
            fsw3GenerateBtn.disabled = true;
            return;
        }
        if (currentMode === 'single') {
            fsw3GenerateBtn.disabled = !(targetFile && sourceFile);
        } else {
            // Multi mode: need target + at least one face replacement
            const hasAnyReplacement = Object.values(faceReplacements).some(v => v && v.file);
            fsw3GenerateBtn.disabled = !(multiTargetFile && detectedFaces.length > 0 && hasAnyReplacement);
        }
    }

    function handleFileSelect(file, preview, placeholder, removeBtn) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
                removeBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    if (fsw3TargetUploadBox) {
        fsw3TargetUploadBox.addEventListener('click', (e) => {
            if (e.target !== fsw3RemoveTargetBtn && !fsw3RemoveTargetBtn.contains(e.target)) {
                fsw3TargetInput.click();
            }
        });
    }

    if (fsw3TargetInput) {
        fsw3TargetInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                targetFile = e.target.files[0];
                handleFileSelect(targetFile, fsw3TargetPreview, fsw3TargetPlaceholder, fsw3RemoveTargetBtn);
                fsw3UpdateButtons();
            }
        });
    }

    if (fsw3RemoveTargetBtn) {
        fsw3RemoveTargetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            targetFile = null;
            fsw3TargetInput.value = '';
            fsw3TargetPreview.src = '';
            fsw3TargetPreview.classList.add('hidden');
            fsw3TargetPlaceholder.classList.remove('hidden');
            fsw3RemoveTargetBtn.classList.add('hidden');
            fsw3UpdateButtons();
        });
    }

    if (fsw3SourceUploadBox) {
        fsw3SourceUploadBox.addEventListener('click', (e) => {
            if (e.target !== fsw3RemoveSourceBtn && !fsw3RemoveSourceBtn.contains(e.target)) {
                fsw3SourceInput.click();
            }
        });
    }

    if (fsw3SourceInput) {
        fsw3SourceInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                sourceFile = e.target.files[0];
                handleFileSelect(sourceFile, fsw3SourcePreview, fsw3SourcePlaceholder, fsw3RemoveSourceBtn);
                fsw3UpdateButtons();
            }
        });
    }

    if (fsw3RemoveSourceBtn) {
        fsw3RemoveSourceBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sourceFile = null;
            fsw3SourceInput.value = '';
            fsw3SourcePreview.src = '';
            fsw3SourcePreview.classList.add('hidden');
            fsw3SourcePlaceholder.classList.remove('hidden');
            fsw3RemoveSourceBtn.classList.add('hidden');
            fsw3UpdateButtons();
        });
    }

    async function compressImage(file, maxWidth = 1280, quality = 0.7) {
        const MAX_SIZE_MB = 1.5;
        
        let currentQuality = quality;
        let currentWidth = maxWidth;
        let compressedFile = file;
        let attempts = 0;

        while (attempts < 3) {
            compressedFile = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        let width = img.width;
                        let height = img.height;

                        if (width > currentWidth) {
                            height = Math.round(height * (currentWidth / width));
                            width = currentWidth;
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error("Canvas is empty"));
                                return;
                            }
                            resolve(new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now(),
                            }));
                        }, file.type, currentQuality);
                    };
                    img.onerror = (error) => reject(error);
                };
                reader.onerror = (error) => reject(error);
            });

            if (compressedFile.size / 1024 / 1024 <= MAX_SIZE_MB) {
                return compressedFile;
            }

            currentQuality -= 0.1;
            currentWidth = Math.round(currentWidth * 0.8);
            attempts++;
        }
        
        return compressedFile;
    }

    async function downloadImage(url, filename) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error("Download failed, falling back to new tab", e);
            window.open(url, '_blank');
        }
    }

    if (fsw3GenerateBtn) {
        fsw3GenerateBtn.addEventListener('click', async () => {
            if (currentMode === 'multi') {
                return handleMultiGenerate();
            }
            if (!targetFile || !sourceFile) return;

            // VIP Check
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;
            if (!isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                return;
            }

            const countSlider = document.getElementById('fs3-count-slider');
            const imageCount = countSlider ? parseInt(countSlider.value) : 1;

            isProcessing = true;
            fsw3GenerateBtn.disabled = true;
            fsw3GenerateBtn.innerHTML = '<div class="spinner"></div><span class="ml-2">Mengunggah & Memproses...</span>';

            if (fsw3ResultsPlaceholder) fsw3ResultsPlaceholder.classList.add('hidden');
            if (fsw3ResultsContainer) fsw3ResultsContainer.classList.remove('hidden');
            fsw3ResultsGrid.innerHTML = '';
            fsw3ResultsGrid.className = `grid ${getResultGridCols(imageCount)} gap-5`;
            
            const processPromises = [];
            let successCount = 0;

            for (let i = 0; i < imageCount; i++) {
                const promise = (async () => {
                    const cardId = 'fsw3-card-' + Date.now() + '-' + i;
                    const statusTextId = 'fsw3-status-text-' + Date.now() + '-' + i;
                    
                    // Create placeholder card
                    const card = document.createElement('div');
                    card.id = cardId;
                    card.className = 'relative group rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50 flex items-center justify-center min-h-[300px]';
                    
                    const tips = [
                        "AI sedang menukar wajah...",
                        "Mengunggah foto ke server...",
                        "Menyesuaikan warna kulit...",
                        "Mengatur pencahayaan...",
                        "Sedang meracik pixel ajaib...",
                        "Hampir selesai..."
                    ];
                    const randomTip = tips[Math.floor(Math.random() * tips.length)];
                    
                    card.innerHTML = `
                        <div class="flex flex-col items-center gap-3 text-center p-4">
                            <div class="spinner"></div>
                            <div>
                                <span id="${statusTextId}" class="text-sm font-semibold text-slate-600 block">Mengunggah foto... (Gambar ${i + 1})</span>
                                <span class="text-xs text-slate-400 mt-1 block">${randomTip}</span>
                            </div>
                        </div>
                    `;
                    fsw3ResultsGrid.appendChild(card);
                    if (window.lucide) window.lucide.createIcons();

                    try {
                        // Compress images
                        const compressedTarget = await compressImage(targetFile, 1280, 0.7);
                        const compressedSource = await compressImage(sourceFile, 1280, 0.7);

                        // Step 1 & 2: Upload both images and start generation via proxy
                        const formData = new FormData();
                        formData.append('source_image', compressedTarget);
                        formData.append('face_image', compressedSource);

                        const statusText = document.getElementById(statusTextId);
                        if (statusText) statusText.textContent = `Mengunggah dan memulai proses... (Gambar ${i + 1})`;

                        const response = await fetch('server/faceswap3_proxy.php?action=upload_and_generate', {
                            method: 'POST',
                            body: formData
                        });

                        const responseText = await response.text();
                        let data;
                        try {
                            data = JSON.parse(responseText);
                        } catch (e) {
                            throw new Error('Respon server tidak valid: ' + responseText.substring(0, 100));
                        }

                        if (data.code !== 200 || !data.task_id) {
                            throw new Error(data.message || 'Gagal memulai face swap');
                        }

                        if (statusText) statusText.textContent = `Face swap sedang diproses... (Gambar ${i + 1})`;

                        // Step 3: Poll for result
                        const shouldEnhance = fsw3EnhancedToggle && fsw3EnhancedToggle.checked;
                        await pollJobStatus(data.task_id, data.origin_from, shouldEnhance, cardId, statusTextId);
                        successCount++;
                    } catch (error) {
                        console.error('FaceSwap3 Error:', error);
                        const errCard = document.getElementById(cardId);
                        if (errCard) {
                            errCard.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words">${error.message}</div>`;
                        }
                    }
                })();
                processPromises.push(promise);
            }

            await Promise.all(processPromises);
            resetButton();
            if (successCount > 0 && typeof doneSound !== 'undefined' && doneSound) doneSound.play();
            else if (successCount === 0 && typeof errorSound !== 'undefined' && errorSound) errorSound.play();
        });
    }

    async function pollJobStatus(taskId, originFrom, shouldEnhance = false, cardId = 'fsw3-card-1', statusTextId = 'fsw3-status-text') {
        const maxAttempts = 40; // 40 * 3s = 120s timeout
        let attempts = 0;
        const card = document.getElementById(cardId);

        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                attempts++;
                if (attempts > maxAttempts) {
                    clearInterval(interval);
                    if (card) card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">Waktu habis. Silakan coba lagi.</div>`;
                    resolve();
                    return;
                }

                // Update status text with progress
                const statusText = document.getElementById(statusTextId);
                if (statusText) {
                    const progressTips = [
                        "Face swap sedang diproses...",
                        "AI sedang bekerja keras...",
                        "Menyesuaikan detail wajah...",
                        "Mengoptimalkan hasil...",
                    ];
                    statusText.textContent = progressTips[attempts % progressTips.length];
                }

                try {
                    const response = await fetch('server/faceswap3_proxy.php?action=check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_id: taskId, origin_from: originFrom })
                    });
                    const text = await response.text();
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        data = { code: -1, message: "Invalid JSON response" };
                    }

                    // Check if the result is ready
                    // live3d API returns status:2 with result_image when done
                    if (data.data && data.data.status === 2 && data.data.result_image) {
                        clearInterval(interval);
                        // Construct full CDN URL
                        const resultUrl = `https://art-global.faceai.art/${data.data.result_image}`;
                        
                        if (shouldEnhance) {
                            await enhanceImage(resultUrl, cardId);
                        } else {
                            displayResult(resultUrl, false, null, null, cardId);
                        }
                        resolve();
                    } else if (data.code === 500 || data.code === -1) {
                        // Error
                        clearInterval(interval);
                        if (card) card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words">${data.message || 'Face swap gagal.'}</div>`;
                        resolve();
                    } else if (data.data && data.data.error && data.data.error.length > 0) {
                        // Error in data.error field
                        clearInterval(interval);
                        if (card) card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words">Error: ${data.data.error}</div>`;
                        resolve();
                    } else {
                        // Still processing (status 0 or 1)
                        console.log('FSW3 Polling:', `Status: ${data.data?.status}, Queue: ${data.data?.queue_len}, Rank: ${data.data?.rank}`);
                    }
                } catch (error) {
                    console.error('FSW3 Polling error:', error);
                }
            }, 3000);
        });
    }

    function displayResult(outputUrls, isEnhanced = false, errorMsg = null, originalUrl = null, cardId = 'fsw3-card-1') {
        const card = document.getElementById(cardId);
        if (!card) return;

        // outputUrls can be an array of URLs
        let url = Array.isArray(outputUrls) ? outputUrls[0] : outputUrls;
        
        console.log('FSW3 Display Result URL:', url, 'Enhanced:', isEnhanced, 'Original:', originalUrl);

        const warningBadge = errorMsg ? `<div class="absolute bottom-12 left-0 w-full bg-yellow-500/80 text-white text-[10px] p-1 text-center">Enhance gagal: ${errorMsg}</div>` : '';

        card.className = 'relative group rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50';
        
        // If enhanced and has original URL, show before/after slider
        if (isEnhanced && originalUrl) {
            card.className = 'relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group w-full h-[500px]';
            card.innerHTML = `
                <div class="ba-slider-container w-full h-full relative overflow-hidden rounded-lg cursor-ew-resize select-none">
                    <img src="${url}" class="ba-image-img absolute top-0 left-0 w-full h-full object-contain pointer-events-none" style="z-index: 1;" alt="Enhanced">
                    <div class="ba-resize-div absolute top-0 left-0 h-full w-[50%] overflow-hidden border-r-2 border-white bg-white" style="z-index: 2;">
                        <img src="${originalUrl}" class="ba-image-img-before absolute top-0 left-0 w-full h-full object-contain max-w-none pointer-events-none" alt="Original">
                    </div>
                    <div class="ba-slider-handle absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-lg left-[50%]">
                        <div class="ba-slider-circle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                            <i data-lucide="move-horizontal" class="w-4 h-4 text-slate-600"></i>
                        </div>
                    </div>
                    <div class="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded z-20 font-medium">Before</div>
                    <div class="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded z-20 font-medium">After</div>
                </div>
                <div class="absolute bottom-2 right-2 flex gap-1 z-30">
                    <button type="button" data-img-src="${url}" class="view-btn result-action-btn" title="Lihat Gambar">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <button type="button" id="fsw3-download-btn" class="result-action-btn download-btn" title="Unduh Gambar">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </button>
                </div>
                ${warningBadge}
            `;
            
            if (window.lucide) window.lucide.createIcons();
            
            // Add slider interaction
            const slider = card.querySelector('.ba-slider-container');
            const resizeDiv = card.querySelector('.ba-resize-div');
            const handle = card.querySelector('.ba-slider-handle');
            const beforeImg = card.querySelector('.ba-image-img-before');
            
            if (slider && resizeDiv && handle && beforeImg) {
                // Set before image width to match slider container width
                const updateWidths = () => {
                    if (beforeImg && slider) {
                        const width = slider.clientWidth;
                        if (width > 0) {
                            beforeImg.style.width = `${width}px`;
                        } else {
                            requestAnimationFrame(updateWidths);
                        }
                    }
                };
                
                // Set initial width
                setTimeout(updateWidths, 100);
                beforeImg.onload = updateWidths;
                window.addEventListener('resize', updateWidths);
                
                const move = (e) => {
                    const rect = slider.getBoundingClientRect();
                    let clientX = e.clientX;
                    if (e.touches && e.touches.length > 0) {
                        clientX = e.touches[0].clientX;
                    }
                    
                    let x = clientX - rect.left;
                    x = Math.max(0, Math.min(x, rect.width));
                    const percent = (x / rect.width) * 100;
                    
                    resizeDiv.style.width = `${percent}%`;
                    handle.style.left = `${percent}%`;
                };
                
                slider.addEventListener('mousemove', move);
                slider.addEventListener('touchmove', move);
            }
        } else {
            // Simple image display (no badge)
            card.innerHTML = `
                <img src="${url}" class="w-full h-auto object-cover" alt="Hasil Face Swap v3" 
                     onerror="console.error('FSW3 Image load error:', this.src); this.parentElement.innerHTML='<div class=\\'text-xs text-red-500 p-4 text-center\\'>Gagal memuat gambar. URL: ${url}</div>';">
                <div class="absolute bottom-2 right-2 flex gap-1">
                    <button type="button" data-img-src="${url}" class="view-btn result-action-btn" title="Lihat Gambar">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <button type="button" id="fsw3-download-btn" class="result-action-btn download-btn" title="Unduh Gambar">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </button>
                </div>
                ${warningBadge}
            `;
        }

        const dlBtn = card.querySelector('#fsw3-download-btn');
        if (dlBtn) {
            dlBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadImage(url, `faceswap-v3-${isEnhanced ? 'enhanced' : 'result'}.png`);
            });
        }
        if (window.lucide) window.lucide.createIcons();
    }

    async function enhanceImage(imageUrl, cardId = 'fsw3-card-1') {
        const card = document.getElementById(cardId);
        if (!card) return;

        card.innerHTML = `
            <div class="flex flex-col items-center justify-center gap-3 h-[300px]">
                <div class="spinner"></div>
                <span class="text-xs font-medium text-teal-600 animate-pulse">Meningkatkan kualitas foto...</span>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        try {
            // Fetch image from URL to Blob
            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) throw new Error('Gagal mengunduh hasil untuk ditingkatkan');
            const blob = await imgRes.blob();

            // Calculate Aspect Ratio
            let aspectRatio = "1:1";
            try {
                const bitmap = await createImageBitmap(blob);
                const width = bitmap.width;
                const height = bitmap.height;
                const ratio = width / height;
                bitmap.close();

                const ratios = {
                    "1:1": 1.0,
                    "3:4": 3/4,
                    "4:3": 4/3,
                    "9:16": 9/16,
                    "16:9": 16/9
                };

                let closestRatio = "1:1";
                let minDiff = Infinity;

                for (const [key, val] of Object.entries(ratios)) {
                    const diff = Math.abs(ratio - val);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestRatio = key;
                    }
                }
                aspectRatio = closestRatio;
            } catch (e) {
                console.warn('Failed to calculate aspect ratio, defaulting to 1:1', e);
            }

            // Prepare FormData for /generate
            const formData = new FormData();
            formData.append('images', blob, 'faceswap-result.webp');
            formData.append('instruction', 'tingkatkan kualitas gambar, perbaiki ketajaman dan detail, hilangkan noise dan blur. Rapikan area rambut, jidat, dan transisi antara wajah dengan rambut agar lebih natural dan sempurna. PENTING: jangan ubah bentuk wajah, fitur wajah, atau struktur apapun, hanya tingkatkan resolusi, kejernihan, dan kerapian area rambut/jidat.');
            formData.append('aspectRatio', aspectRatio);

            // Get API configuration
            const apiKey = window.API_KEY || '';

            let baseUrl = '';
            let baseUrls = [];
            if (window.BASE_URL) {
                baseUrls = window.BASE_URL.split(',').map(u => u.trim()).filter(Boolean);
                if (baseUrls.length > 0) {
                    baseUrl = baseUrls[Math.floor(Math.random() * baseUrls.length)];
                    if (!/^https?:\/\//i.test(baseUrl)) {
                        baseUrl = `https://${baseUrl}`;
                    }
                    baseUrl = baseUrl.replace(/\/$/, '');
                }
            }

            const generateUrl = `${baseUrl}/generate`;

            // Prepare Headers
            const headers = {
                'X-API-Key': apiKey
            };

            // Get Token for Frontend Mode
            if (typeof window.getToken === 'function') {
                const token = await window.getToken(baseUrl, apiKey);
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            // Create AbortController for cancellation
            const controller = new AbortController();

            // Show toast notification with cancel button
            let toast = null;
            if (window.showServerToast) {
                const serverIndex = baseUrls.indexOf(baseUrl) + 1;
                const msg = serverIndex > 0 ? `Meningkatkan kualitas di server ${serverIndex}...` : 'Meningkatkan kualitas...';
                toast = window.showServerToast(msg, () => {
                    controller.abort();
                });
            }

            try {
                // Send to /generate
                const response = await fetch(generateUrl, {
                    method: 'POST',
                    headers: headers,
                    body: formData,
                    signal: controller.signal
                });

                if (!response.ok) {
                    let errorMsg = 'Gagal meningkatkan kualitas.';
                    try {
                        const errJson = await response.json();
                        errorMsg = errJson.error || errJson.message || errorMsg;
                    } catch (e) {}
                    throw new Error(errorMsg);
                }

                const result = await response.json();
                if (!result.success || !result.imageUrl) throw new Error('Respon API Enhance tidak valid.');

                // Display Final Enhanced Result with before/after slider
                const finalUrl = result.imageUrl;
                displayResult(finalUrl, true, null, imageUrl, cardId);

            } finally {
                // Hide toast
                if (toast && window.hideServerToast) {
                    window.hideServerToast(toast);
                }
            }

        } catch (error) {
            console.error('Enhance error:', error);
            // If enhance fails, show original image with warning (no slider)
            displayResult(imageUrl, false, error.message, null, cardId);
        }
    }

    // ============ MULTI FACE SWAP ============

    // Multi target upload box click
    if (fsw3mTargetUploadBox) {
        fsw3mTargetUploadBox.addEventListener('click', (e) => {
            if (e.target !== fsw3mRemoveTargetBtn && !fsw3mRemoveTargetBtn?.contains(e.target)) {
                fsw3mTargetInput.click();
            }
        });
    }

    if (fsw3mTargetInput) {
        fsw3mTargetInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            multiTargetFile = file;
            handleFileSelect(file, fsw3mTargetPreview, fsw3mTargetPlaceholder, fsw3mRemoveTargetBtn);

            // Reset faces
            detectedFaces = [];
            faceReplacements = {};
            if (fsw3mFacesList) fsw3mFacesList.innerHTML = '';
            if (fsw3mFacesSection) fsw3mFacesSection.classList.add('hidden');
            fsw3UpdateButtons();

            // Upload target and detect faces
            try {
                if (fsw3mFacesSection) {
                    fsw3mFacesSection.classList.remove('hidden');
                    fsw3mFacesList.innerHTML = '<div class="flex items-center gap-2 p-3 bg-slate-50 rounded-xl"><div class="spinner w-5 h-5"></div><span class="text-xs text-slate-500">Mendeteksi wajah...</span></div>';
                }

                const compressed = await compressImage(file, 1280, 0.7);
                const formData = new FormData();
                formData.append('image', compressed);

                const uploadRes = await fetch('server/faceswap3_proxy.php?action=upload_image', {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadData.code !== 200 || !uploadData.image_path) {
                    throw new Error(uploadData.message || 'Gagal mengunggah foto');
                }

                multiTargetImagePath = uploadData.image_path;
                multiOriginFrom = '';

                // Extract faces
                const extractRes = await fetch('server/faceswap3_proxy.php?action=extract_faces', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ img_url: multiTargetImagePath })
                });
                const extractData = await extractRes.json();

                if (extractData.origin_from) {
                    multiOriginFrom = extractData.origin_from;
                }

                // Parse faces from response
                // API returns: {code: 200, data: {img_url: "...", pos: [[x1,y1,x2,y2], ...]}}
                let faces = [];
                if (extractData.code === 200 && extractData.data) {
                    const responseData = extractData.data;
                    const positions = responseData.pos || [];
                    let imgUrl = responseData.img_url || '';
                    
                    // Ensure full URL with CDN prefix
                    if (imgUrl && !imgUrl.startsWith('http')) {
                        // Remove leading slash if present
                        imgUrl = imgUrl.replace(/^\/+/, '');
                        imgUrl = 'https://temp.aifaceswap.io/' + imgUrl;
                    }
                    
                    // Each position represents a detected face
                    // We'll use the main image URL as thumbnail for now
                    faces = positions.map((pos, idx) => ({
                        url: imgUrl, // Use the full image URL (we don't have individual face crops)
                        index: String(idx),
                        position: pos // Store position for reference
                    }));
                }

                if (faces.length === 0) {
                    fsw3mFacesList.innerHTML = '<div class="text-xs text-amber-600 p-3 bg-amber-50 rounded-xl border border-amber-200">Tidak ada wajah terdeteksi dalam foto. Coba upload foto lain dengan wajah yang lebih jelas.</div>';
                    return;
                }

                detectedFaces = faces;
                renderFaceRows();

            } catch (err) {
                console.error('Multi face detect error:', err);
                if (fsw3mFacesList) {
                    fsw3mFacesList.innerHTML = `<div class="text-xs text-red-500 p-3 bg-red-50 rounded-xl border border-red-200">${err.message}</div>`;
                }
            }
        });
    }

    // Remove multi target
    if (fsw3mRemoveTargetBtn) {
        fsw3mRemoveTargetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            multiTargetFile = null;
            multiTargetImagePath = '';
            multiOriginFrom = '';
            detectedFaces = [];
            faceReplacements = {};
            fsw3mTargetPreview.classList.add('hidden');
            fsw3mTargetPlaceholder.classList.remove('hidden');
            fsw3mRemoveTargetBtn.classList.add('hidden');
            fsw3mTargetInput.value = '';
            if (fsw3mFacesSection) fsw3mFacesSection.classList.add('hidden');
            if (fsw3mFacesList) fsw3mFacesList.innerHTML = '';
            fsw3UpdateButtons();
        });
    }

    async function cropFaceFromImage(imageUrl, position) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const [x1, y1, x2, y2] = position;
                    const width = x2 - x1;
                    const height = y2 - y1;
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw cropped face
                    ctx.drawImage(img, x1, y1, width, height, 0, 0, width, height);
                    
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    async function renderFaceRows() {
        if (!fsw3mFacesList) return;
        fsw3mFacesList.innerHTML = '';

        for (let i = 0; i < detectedFaces.length; i++) {
            const face = detectedFaces[i];
            const row = document.createElement('div');
            row.className = 'flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors';
            row.id = `fsw3m-face-row-${face.index}`;

            const replacement = faceReplacements[face.index];
            const replacementHtml = replacement && replacement.dataUrl
                ? `<img src="${replacement.dataUrl}" class="w-12 h-12 rounded-full object-cover border-2 border-teal-400">`
                : `<div class="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors" data-face-index="${face.index}">
                       <i data-lucide="plus" class="w-5 h-5 text-slate-400"></i>
                   </div>`;

            const faceNumber = parseInt(face.index) + 1;
            
            // Create placeholder first
            row.innerHTML = `
                <div class="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center flex-shrink-0" id="face-thumb-${face.index}">
                    <div class="spinner w-4 h-4"></div>
                </div>
                <i data-lucide="arrow-right" class="w-4 h-4 text-slate-400 flex-shrink-0"></i>
                ${replacementHtml}
                <div class="flex-1 text-left">
                    <p class="text-xs font-medium text-slate-600">Wajah ke-${faceNumber}</p>
                    <p class="text-[10px] text-slate-400">${replacement ? 'Sudah dipilih' : 'Klik + untuk pilih'}</p>
                </div>
                <input type="file" class="hidden" id="fsw3m-face-input-${face.index}" accept="image/png, image/jpeg, image/webp, .heic, .HEIC">
            `;

            fsw3mFacesList.appendChild(row);

            // Crop and display face thumbnail
            try {
                const croppedFace = await cropFaceFromImage(face.url, face.position);
                const thumbContainer = document.getElementById(`face-thumb-${face.index}`);
                if (thumbContainer) {
                    thumbContainer.innerHTML = `<img src="${croppedFace}" class="w-full h-full rounded-full object-cover">`;
                }
            } catch (err) {
                console.error('Failed to crop face:', err);
                const thumbContainer = document.getElementById(`face-thumb-${face.index}`);
                if (thumbContainer) {
                    thumbContainer.innerHTML = `<span class="text-sm font-bold text-purple-700">${faceNumber}</span>`;
                    thumbContainer.className = 'w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-teal-100 border-2 border-purple-300 flex items-center justify-center flex-shrink-0';
                }
            }

            // Click handler for + button or replacement image
            const clickTarget = row.querySelector(`[data-face-index="${face.index}"]`) || (replacement ? row.querySelector('img.border-teal-400') : null);
            const fileInput = row.querySelector(`#fsw3m-face-input-${face.index}`);

            if (clickTarget && fileInput) {
                clickTarget.addEventListener('click', () => fileInput.click());
            }
            if (replacement && row.querySelector('img.border-teal-400')) {
                row.querySelector('img.border-teal-400').style.cursor = 'pointer';
                row.querySelector('img.border-teal-400').addEventListener('click', () => fileInput.click());
            }

            fileInput?.addEventListener('change', (e) => {
                const f = e.target.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    faceReplacements[face.index] = { file: f, dataUrl: ev.target.result, uploadedPath: '' };
                    renderFaceRows();
                    fsw3UpdateButtons();
                };
                reader.readAsDataURL(f);
            });
        }

        if (window.lucide) window.lucide.createIcons();
    }

    async function handleMultiGenerate() {
        const hasAnyReplacement = Object.values(faceReplacements).some(v => v && v.file);
        if (!multiTargetFile || !multiTargetImagePath || detectedFaces.length === 0 || !hasAnyReplacement) return;

        // VIP Check
        const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;
        if (!isVip) {
            if (window.showUpgradeVipPopup) {
                window.showUpgradeVipPopup();
            } else {
                const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                if (upgradeVipModal) upgradeVipModal.classList.add('active');
            }
            return;
        }

        isProcessing = true;
        fsw3GenerateBtn.disabled = true;
        fsw3GenerateBtn.innerHTML = '<div class="spinner"></div><span class="ml-2">Mengunggah wajah...</span>';

        if (fsw3ResultsPlaceholder) fsw3ResultsPlaceholder.classList.add('hidden');
        if (fsw3ResultsContainer) fsw3ResultsContainer.classList.remove('hidden');
        fsw3ResultsGrid.innerHTML = '';
        fsw3ResultsGrid.className = 'grid grid-cols-1 gap-5';

        const card = document.createElement('div');
        card.id = 'fsw3-card-1';
        card.className = 'relative group rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50 flex items-center justify-center min-h-[300px]';
        card.innerHTML = `
            <div class="flex flex-col items-center gap-3 text-center p-4">
                <div class="spinner"></div>
                <div>
                    <span id="fsw3-status-text" class="text-sm font-semibold text-slate-600 block">Mengunggah wajah pengganti...</span>
                    <span class="text-xs text-slate-400 mt-1 block">Multi face swap sedang diproses</span>
                </div>
            </div>
        `;
        fsw3ResultsGrid.appendChild(card);

        try {
            const statusText = document.getElementById('fsw3-status-text');

            // Upload each replacement face
            const faceImageArray = [];
            const indicesToProcess = Object.keys(faceReplacements).filter(idx => faceReplacements[idx] && faceReplacements[idx].file);

            for (let i = 0; i < indicesToProcess.length; i++) {
                const idx = indicesToProcess[i];
                const rep = faceReplacements[idx];
                if (statusText) statusText.textContent = `Mengunggah wajah ${i + 1}/${indicesToProcess.length}...`;

                const compressed = await compressImage(rep.file, 1280, 0.7);
                const formData = new FormData();
                formData.append('image', compressed);

                const uploadRes = await fetch('server/faceswap3_proxy.php?action=upload_image', {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (uploadData.code !== 200 || !uploadData.image_path) {
                    throw new Error(`Gagal upload wajah ${i + 1}: ${uploadData.message || 'Unknown error'}`);
                }

                // Use relative path for face_image array
                let facePath = uploadData.image_path;
                // Remove any CDN prefix if present
                facePath = facePath.replace('https://temp.aifaceswap.io/', '');
                facePath = facePath.replace(/^\/+/, ''); // Remove leading slashes
                
                faceImageArray.push({
                    url: facePath,
                    index: idx
                });
            }

            if (statusText) statusText.textContent = 'Memulai multi face swap...';

            // Use relative path for source_image (not full URL)
            let sourceImagePath = multiTargetImagePath;
            // Remove any CDN prefix if present
            sourceImagePath = sourceImagePath.replace('https://temp.aifaceswap.io/', '');
            sourceImagePath = sourceImagePath.replace(/^\/+/, ''); // Remove leading slashes

            // Call multi_generate
            const genRes = await fetch('server/faceswap3_proxy.php?action=multi_generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_image: sourceImagePath,
                    face_image: faceImageArray,
                    origin_from: multiOriginFrom
                })
            });
            const genData = await genRes.json();

            if (genData.code !== 200 || !genData.task_id) {
                throw new Error(genData.message || 'Gagal memulai multi face swap');
            }

            if (statusText) statusText.textContent = 'Multi face swap sedang diproses...';

            // Poll for result
            const shouldEnhance = fsw3EnhancedToggle && fsw3EnhancedToggle.checked;
            await pollJobStatus(genData.task_id, genData.origin_from || multiOriginFrom, shouldEnhance);

            resetButton();
        } catch (error) {
            console.error('Multi FaceSwap Error:', error);
            const c = document.getElementById('fsw3-card-1');
            if (c) {
                c.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words">${error.message}</div>`;
            }
            resetButton();
        }
    }

    function resetButton() {
        isProcessing = false;
        fsw3UpdateButtons();
        fsw3GenerateBtn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5 mr-2 text-teal-400"></i> <span>Tukar Wajah</span>';
        if (window.lucide) window.lucide.createIcons();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFaceSwap3);
} else {
    initFaceSwap3();
}
