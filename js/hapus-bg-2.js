window.initHapusBg2 = function(config) {
    const {
        document,
        setupImageUpload,
        lucide,
        doneSound,
        errorSound
    } = config;

    const hbg2ImageInput = document.getElementById('hbg2-image-input');
    const hbg2UploadBox = document.getElementById('hbg2-upload-box');
    const hbg2ImagePreview = document.getElementById('hbg2-image-preview');
    const hbg2UploadPlaceholder = document.getElementById('hbg2-upload-placeholder');
    const hbg2RemoveBtn = document.getElementById('hbg2-remove-btn');
    const hbg2GenerateBtn = document.getElementById('hbg2-generate-btn');
    const hbg2ResultsGrid = document.getElementById('hbg2-results-grid');
    const hbg2ResultsPlaceholder = document.getElementById('hbg2-results-placeholder');
    
    // Bulk Elements
    const hbg2BulkToggle = document.getElementById('hbg2-bulk-toggle');
    const hbg2BulkPreviewContainer = document.getElementById('hbg2-bulk-preview-container');
    const hbg2BulkGrid = document.getElementById('hbg2-bulk-grid');
    const hbg2FileCount = document.getElementById('hbg2-file-count');
    
    let hbg2ImageData = null;
    let hbg2BulkFiles = [];

    if (!hbg2ImageInput || !hbg2GenerateBtn) return;

    function updateGenerateButton() {
        if (hbg2BulkToggle && hbg2BulkToggle.checked) {
            hbg2GenerateBtn.disabled = hbg2BulkFiles.length === 0;
        } else {
            hbg2GenerateBtn.disabled = !hbg2ImageData;
        }
    }

    function renderBulkPreviews() {
        if (!hbg2BulkGrid) return;
        hbg2BulkGrid.innerHTML = '';
        
        hbg2BulkFiles.forEach((file, index) => {
            const reader = new FileReader();
            const div = document.createElement('div');
            div.className = 'relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white group';
            
            // Delete button for individual file
            const delBtn = document.createElement('button');
            delBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10';
            delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
            delBtn.onclick = (e) => {
                e.stopPropagation();
                hbg2BulkFiles.splice(index, 1);
                hbg2FileCount.textContent = hbg2BulkFiles.length;
                renderBulkPreviews();
                updateGenerateButton();
                if (hbg2BulkFiles.length === 0) {
                    hbg2BulkPreviewContainer.classList.add('hidden');
                    hbg2UploadPlaceholder.classList.remove('hidden');
                    hbg2RemoveBtn.classList.add('hidden');
                    hbg2UploadBox.classList.remove('border-teal-400', 'bg-teal-50');
                }
            };
            
            div.appendChild(delBtn);

            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-full object-cover';
                div.appendChild(img);
            };
            reader.readAsDataURL(file);
            hbg2BulkGrid.appendChild(div);
        });
    }
    
    // Boost Logic
    async function checkBoostQuota() {
        try {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) return 0;
            const res = await fetch(`/server/boost_quota.php?action=get_status&email=${encodeURIComponent(email)}`);
            const data = await res.json();
            return data.success ? data.quota : 0;
        } catch (e) {
            console.error('Failed to check quota', e);
            return 0;
        }
    }

    async function deductBoostQuota(amount = 1) {
        try {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) return false;
            const res = await fetch('/server/boost_quota.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=decrease_quota&email=${encodeURIComponent(email)}&amount=${amount}&feature_key=hapus-bg-2&feature_name=Hapus%20Background%20Pro`
            });
            const data = await res.json();
            return data.success;
        } catch (e) {
            console.error('Failed to deduct quota', e);
            return false;
        }
    }

    async function refundBoostQuota(amount = 1) {
        try {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) return false;
            const res = await fetch('/server/boost_quota.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=increase_quota&email=${encodeURIComponent(email)}&amount=${amount}`
            });
            const data = await res.json();
            return data.success;
        } catch (e) {
            console.error('Failed to refund quota', e);
            return false;
        }
    }

    function activateBoostMode() {
        const boostToggle = document.getElementById('boost-generate-toggle');
        if (boostToggle && !boostToggle.checked) {
            boostToggle.checked = true;
            // Dispatch change event to trigger any listeners
            const event = new Event('change', { bubbles: true });
            boostToggle.dispatchEvent(event);
        }
        
        // Also try home toggle if sidebar one is not found or visible
        const boostToggleHome = document.getElementById('boost-generate-toggle-home');
        if (boostToggleHome && !boostToggleHome.checked) {
            boostToggleHome.checked = true;
            const event = new Event('change', { bubbles: true });
            boostToggleHome.dispatchEvent(event);
        }
    }

    // Bulk Toggle Listener
    if (hbg2BulkToggle) {
        hbg2BulkToggle.addEventListener('change', () => {
            const isBulk = hbg2BulkToggle.checked;
            
            // Reset state
            hbg2ImageData = null;
            hbg2BulkFiles = [];
            hbg2ImageInput.value = '';
            
            // UI Updates
            if (isBulk) {
                hbg2ImageInput.multiple = true;
                hbg2ImageInput.setAttribute('multiple', 'multiple'); // Force attribute
                activateBoostMode();
                hbg2ImagePreview.classList.add('hidden');
                hbg2UploadPlaceholder.classList.remove('hidden');
                if (hbg2BulkPreviewContainer) hbg2BulkPreviewContainer.classList.add('hidden');
            } else {
                hbg2ImageInput.removeAttribute('multiple');
                hbg2ImageInput.multiple = false;
                if (hbg2BulkPreviewContainer) hbg2BulkPreviewContainer.classList.add('hidden');
                hbg2ImagePreview.classList.add('hidden');
                hbg2UploadPlaceholder.classList.remove('hidden');
            }
            
            hbg2RemoveBtn.classList.add('hidden');
            hbg2UploadBox.classList.remove('border-teal-400', 'bg-teal-50');
            updateGenerateButton();
        });
    }

    // Manual Input Change Listener for Bulk
    hbg2ImageInput.addEventListener('change', async (e) => {
        if (hbg2BulkToggle && hbg2BulkToggle.checked) {
            const newFiles = Array.from(e.target.files);
            if (newFiles.length > 0) {
                // Validate file size (Max 15MB)
                const MAX_SIZE = 15 * 1024 * 1024;
                const oversized = newFiles.filter(f => f.size > MAX_SIZE);
                if (oversized.length > 0) {
                    alert(`Beberapa file terlalu besar (Max 15MB):\n${oversized.map(f => f.name).join('\n')}`);
                    hbg2ImageInput.value = '';
                    return;
                }

                const totalFiles = hbg2BulkFiles.length + newFiles.length;
                if (totalFiles > 10) {
                    alert(`Maksimal 10 gambar sekaligus. Anda sudah memilih ${hbg2BulkFiles.length} gambar.`);
                    hbg2ImageInput.value = '';
                    return;
                }
                
                hbg2BulkFiles = [...hbg2BulkFiles, ...newFiles];
                hbg2FileCount.textContent = hbg2BulkFiles.length;
                
                hbg2UploadPlaceholder.classList.add('hidden');
                hbg2ImagePreview.classList.add('hidden');
                if (hbg2BulkPreviewContainer) hbg2BulkPreviewContainer.classList.remove('hidden');
                hbg2RemoveBtn.classList.remove('hidden');
                hbg2UploadBox.classList.add('border-teal-400', 'bg-teal-50');
                
                renderBulkPreviews();
                
                hbg2ImageInput.value = ''; // Reset input to allow adding more
                updateGenerateButton();
            }
        }
    });

    function initBeforeAfterSlider(container, beforeSrc, afterSrc) {
        container.innerHTML = `
            <div class="ba-slider-container w-full h-full relative overflow-hidden rounded-lg cursor-ew-resize select-none">
                <img src="${afterSrc}" class="ba-image-img absolute top-0 left-0 w-full h-full object-contain pointer-events-none" style="z-index: 1;">
                <div class="ba-resize-div absolute top-0 left-0 h-full w-[50%] overflow-hidden border-r-2 border-white bg-white" style="z-index: 2;">
                    <img src="${beforeSrc}" class="ba-image-img-before absolute top-0 left-0 w-full h-full object-contain max-w-none pointer-events-none">
                </div>
                <div class="ba-slider-handle absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-lg left-[50%]">
                    <div class="ba-slider-circle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                        <i data-lucide="move-horizontal" class="w-4 h-4 text-slate-600"></i>
                    </div>
                </div>
                <div class="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded z-20 font-medium">Before</div>
                <div class="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded z-20 font-medium">After</div>
            </div>
            
            <!-- Zoom Controls -->
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg z-30 border border-slate-200">
                <button class="ug-zoom-out p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Zoom Out">
                    <i data-lucide="minus" class="w-4 h-4"></i>
                </button>
                <span class="ug-zoom-level text-xs font-bold text-slate-700 w-12 text-center">100%</span>
                <button class="ug-zoom-in p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Zoom In">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
                <div class="w-px h-4 bg-slate-300 mx-1"></div>
                <button class="ug-reset-zoom p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Reset">
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        
        const slider = container.querySelector('.ba-slider-container');
        const resizeDiv = container.querySelector('.ba-resize-div');
        const handle = container.querySelector('.ba-slider-handle');
        const beforeImg = resizeDiv.querySelector('.ba-image-img-before');
        const afterImg = container.querySelector('.ba-image-img');
        
        // Zoom Logic
        let zoomLevel = 1;
        const zoomStep = 0.25;
        const maxZoom = 4;
        const minZoom = 1;
        
        const zoomInBtn = container.querySelector('.ug-zoom-in');
        const zoomOutBtn = container.querySelector('.ug-zoom-out');
        const resetBtn = container.querySelector('.ug-reset-zoom');
        const zoomDisplay = container.querySelector('.ug-zoom-level');
        
        const updateZoom = () => {
            zoomDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
            const scaleStyle = `scale(${zoomLevel})`;
            beforeImg.style.transform = scaleStyle;
            afterImg.style.transform = scaleStyle;
            beforeImg.style.transformOrigin = 'center center';
            afterImg.style.transformOrigin = 'center center';
        };
        
        zoomInBtn.addEventListener('click', () => {
            if (zoomLevel < maxZoom) {
                zoomLevel += zoomStep;
                updateZoom();
            }
        });
        
        zoomOutBtn.addEventListener('click', () => {
            if (zoomLevel > minZoom) {
                zoomLevel -= zoomStep;
                updateZoom();
            }
        });
        
        resetBtn.addEventListener('click', () => {
            zoomLevel = 1;
            updateZoom();
        });

        // Slider Logic
        const updateWidths = () => {
            if (beforeImg && slider) {
                const width = slider.clientWidth;
                if (width > 0) {
                    beforeImg.style.width = `${width}px`;
                } else {
                    // Retry if width is 0
                    requestAnimationFrame(updateWidths);
                }
            }
        };
        
        // Initial width set
        setTimeout(updateWidths, 100);
        beforeImg.onload = updateWidths; // Update when image loads
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
        
        const controls = container.querySelector('.absolute.bottom-4');
        if (controls) {
            controls.addEventListener('mousemove', (e) => e.stopPropagation());
            controls.addEventListener('touchmove', (e) => e.stopPropagation());
            controls.addEventListener('mousedown', (e) => e.stopPropagation());
            controls.addEventListener('touchstart', (e) => e.stopPropagation());
        }
    }

    if (hbg2ImageInput) {
        setupImageUpload(hbg2ImageInput, hbg2UploadBox, (data) => {
            hbg2ImageData = data;
            hbg2ImagePreview.src = data.dataUrl;
            hbg2ImagePreview.classList.remove('hidden');
            hbg2UploadPlaceholder.classList.add('hidden');
            hbg2RemoveBtn.classList.remove('hidden');
            hbg2UploadBox.classList.add('border-teal-400', 'bg-teal-50');
            updateGenerateButton();
        });
    }

    if (hbg2RemoveBtn) {
        hbg2RemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hbg2ImageData = null;
            hbg2BulkFiles = []; // Clear bulk files
            hbg2ImageInput.value = '';
            hbg2ImagePreview.src = '';
            hbg2ImagePreview.classList.add('hidden');
            if (hbg2BulkPreviewContainer) hbg2BulkPreviewContainer.classList.add('hidden'); // Hide bulk container
            hbg2UploadPlaceholder.classList.remove('hidden');
            hbg2RemoveBtn.classList.add('hidden');
            hbg2UploadBox.classList.remove('border-teal-400', 'bg-teal-50');
            updateGenerateButton();
        });
    }

    hbg2GenerateBtn.addEventListener('click', async () => {
        // Check VIP Access for Pro Users
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
        
        // Bulk Generation Logic
        if (hbg2BulkToggle && hbg2BulkToggle.checked && hbg2BulkFiles.length > 0) {
            // Check Quota (Just Check, Don't Deduct Yet)
            const quota = await checkBoostQuota();
            if (quota < hbg2BulkFiles.length) {
                alert(`Kuota Boost tidak mencukupi. Anda butuh ${hbg2BulkFiles.length} kuota, tapi hanya punya ${quota}. Silakan top up boost.`);
                return;
            }

            const originalBtnHTML = hbg2GenerateBtn.innerHTML;
            hbg2GenerateBtn.disabled = true;
            hbg2GenerateBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i><span>Memproses ${hbg2BulkFiles.length} Gambar...</span>`;
            if (window.lucide) window.lucide.createIcons();

            hbg2ResultsPlaceholder.classList.add('hidden');
            hbg2ResultsGrid.classList.remove('hidden');
            hbg2ResultsGrid.innerHTML = '';
            hbg2ResultsGrid.className = `grid ${getResultGridCols(hbg2BulkFiles.length)} gap-4`;

            let successCount = 0;

            const processPromises = hbg2BulkFiles.map(async (file, i) => {
                const cardId = 'hbg2-result-' + Date.now() + '-' + i;
                const card = document.createElement('div');
                card.id = cardId;
                card.className = 'relative bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[300px] animate-pulse';
                
                card.innerHTML = `
                    <div class="flex flex-col items-center gap-3 text-center p-4">
                        <div class="spinner"></div>
                        <div>
                            <span class="text-sm font-semibold text-slate-600 block">Gambar ${i + 1} (${file.name})</span>
                            <span class="text-xs text-slate-400 mt-1 block" id="${cardId}-status">Mengupload...</span>
                        </div>
                    </div>
                `;
                hbg2ResultsGrid.appendChild(card);

                try {
                    // Upload
                    const uploadFormData = new FormData();
                    uploadFormData.set('image', file, file.name);
                    console.log('[HBG2-BULK] Uploading file:', file.name, 'size:', file.size);
                    const uploadResponse = await fetch('/server/removebg_proxy.php?action=upload', {
                        method: 'POST',
                        body: uploadFormData
                    });
                    console.log('[HBG2-BULK] Upload HTTP status:', uploadResponse.status);

                    // Handle JSON response
                    const uploadText = await uploadResponse.text();
                    console.log('[HBG2-BULK] Upload raw response:', uploadText.substring(0, 500));
                    let uploadResult;
                    try {
                        uploadResult = JSON.parse(uploadText);
                    } catch (e) {
                        console.error('[HBG2-BULK] Upload JSON parse error:', e.message, '| Raw:', uploadText);
                        throw new Error('Gagal respons server (Mungkin file terlalu besar/timeout)');
                    }
                    console.log('[HBG2-BULK] Upload result:', uploadResult);

                    if (!uploadResult.success) throw new Error(uploadResult.message || 'Gagal upload');

                    const statusEl = document.getElementById(`${cardId}-status`);
                    if (statusEl) statusEl.textContent = 'Menghapus background...';

                    // Remove BG
                    const removeBgPayload = {
                        server_filename: uploadResult.data.server_filename,
                        task: uploadResult.data.task,
                        server: uploadResult.data.server,
                        filename: uploadResult.data.filename,
                        width: uploadResult.data.width,
                        height: uploadResult.data.height
                    };
                    console.log('[HBG2-BULK] RemoveBG payload:', removeBgPayload);
                    const removeBgResponse = await fetch('/server/removebg_proxy.php?action=removebg', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(removeBgPayload)
                    });
                    console.log('[HBG2-BULK] RemoveBG HTTP status:', removeBgResponse.status, 'Content-Type:', removeBgResponse.headers.get('content-type'));

                    if (!removeBgResponse.ok) {
                        const errText = await removeBgResponse.text();
                        console.error('[HBG2-BULK] RemoveBG error body:', errText);
                        let errMsg = 'Gagal hapus background (' + removeBgResponse.status + ')';
                        try { errMsg = JSON.parse(errText).message || errMsg; } catch (_) {}
                        throw new Error(errMsg);
                    }

                    const imageBlob = await removeBgResponse.blob();
                    console.log('[HBG2-BULK] Result blob size:', imageBlob.size, 'type:', imageBlob.type);
                    if (imageBlob.size === 0) throw new Error('Hasil hapus background kosong');
                    const imageUrl = URL.createObjectURL(imageBlob);
                    
                    // Deduct Quota Here (Deduct on Success)
                    const deductSuccess = await deductBoostQuota(1);
                    if (!deductSuccess) {
                        // Rare case: Quota ran out during process
                         throw new Error('Gagal memotong kuota. Pastikan kuota Anda cukup.');
                    }
                    
                    successCount++;

                    // Render Result
                    card.className = 'relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group w-full h-[500px]';
                    card.innerHTML = '';
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                         initBeforeAfterSlider(card, e.target.result, imageUrl);
                    };
                    reader.readAsDataURL(file);

                    const downloadBtnContainer = document.createElement('div');
                    downloadBtnContainer.className = 'absolute bottom-4 right-4 z-30';
                    downloadBtnContainer.innerHTML = `
                        <a href="${imageUrl}" download="removed_bg_${file.name.replace(/\.[^/.]+$/, "")}.png" class="bg-teal-500 hover:bg-teal-600 text-white p-2.5 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110" title="Unduh Hasil">
                            <i data-lucide="download" class="w-5 h-5"></i>
                        </a>
                    `;
                    card.appendChild(downloadBtnContainer);
                    if (window.lucide) window.lucide.createIcons();

                } catch (error) {
                    console.error(error);
                    // No refund needed because we haven't deducted yet

                    card.className = 'relative bg-red-50 rounded-2xl p-4 border border-red-100 flex items-center justify-center min-h-[200px]';
                    card.innerHTML = `
                        <div class="text-center">
                            <i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mx-auto mb-2"></i>
                            <p class="text-sm text-red-500 font-medium">Gagal: ${error.message}</p>
                        </div>
                    `;
                }
            });

            await Promise.all(processPromises);

            if (successCount > 0 && doneSound) doneSound.play();
            hbg2GenerateBtn.disabled = false;
            hbg2GenerateBtn.innerHTML = originalBtnHTML;
            if (window.lucide) window.lucide.createIcons();
            
            return; // Exit bulk logic
        }

        if (!hbg2ImageData) return;

        const countSlider = document.getElementById('hb2-count-slider');
        const rawCount = countSlider ? parseInt(countSlider.value) : 1;
        
        // Anti-manipulation: force count=1 if boost is not active
        const boostToggle = document.getElementById('boost-generate-toggle') || document.getElementById('boost-generate-toggle-home');
        const isBoostActive = boostToggle && boostToggle.checked;
        const imageCount = isBoostActive ? Math.min(Math.max(1, rawCount), 10) : 1;
        
        // Server-side quota check for multi-generation
        if (imageCount > 1) {
            const quota = await checkBoostQuota();
            if (quota < imageCount) {
                alert(`Kuota Boost tidak mencukupi. Anda butuh ${imageCount} kuota, tapi hanya punya ${quota}. Silakan top up boost.`);
                return;
            }
        }

        const originalBtnHTML = hbg2GenerateBtn.innerHTML;
        hbg2GenerateBtn.disabled = true;
        hbg2GenerateBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i><span>Mengupload...</span>`;
        if (window.lucide) window.lucide.createIcons();

        hbg2ResultsPlaceholder.classList.add('hidden');
        hbg2ResultsGrid.classList.remove('hidden');
        hbg2ResultsGrid.innerHTML = '';

        const processPromises = [];
        let successCount = 0;

        for (let i = 0; i < imageCount; i++) {
            const cardId = 'hbg2-result-' + Date.now() + '-' + i;
            const card = document.createElement('div');
            card.id = cardId;
            card.className = 'relative bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[300px] animate-pulse';
            
            const tips = [
                "AI sedang mendeteksi objek...",
                "Memisahkan latar belakang...",
                "Menghaluskan tepi objek...",
                "Sedang meracik pixel ajaib...",
                "Hampir selesai..."
            ];
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            
            card.innerHTML = `
                <div class="flex flex-col items-center gap-3 text-center p-4">
                    <div class="spinner"></div>
                    <div>
                        <span class="text-sm font-semibold text-slate-600 block">Gambar ${i + 1}</span>
                        <span class="text-xs text-slate-400 mt-1 block" id="${cardId}-status">${randomTip}</span>
                    </div>
                </div>
            `;
            hbg2ResultsGrid.appendChild(card);

            const promise = (async () => {
                try {
                    // Step 1: Upload
                    const uploadFormData = new FormData();
                    const fetchRes = await fetch(hbg2ImageData.dataUrl);
                    const blob = await fetchRes.blob();
                    uploadFormData.set('image', blob, 'image.jpeg');
                    console.log('[HBG2-SINGLE] Uploading blob size:', blob.size, 'type:', blob.type);
                    const uploadResponse = await fetch('/server/removebg_proxy.php?action=upload', {
                        method: 'POST',
                        body: uploadFormData
                    });
                    console.log('[HBG2-SINGLE] Upload HTTP status:', uploadResponse.status);

                    const uploadText = await uploadResponse.text();
                    console.log('[HBG2-SINGLE] Upload raw response:', uploadText.substring(0, 500));
                    let uploadResult;
                    try {
                        uploadResult = JSON.parse(uploadText);
                    } catch (e) {
                        console.error('[HBG2-SINGLE] Upload JSON parse error:', e.message, '| Raw:', uploadText);
                        throw new Error('Gagal memproses respons server. Kemungkinan file terlalu besar atau terjadi kesalahan server.');
                    }
                    console.log('[HBG2-SINGLE] Upload result:', uploadResult);
                    
                    if (!uploadResult.success) {
                        throw new Error(uploadResult.message || 'Gagal mengupload gambar.');
                    }

                    const serverFilename = uploadResult.data.server_filename;
                    
                    const statusEl = document.getElementById(`${cardId}-status`);
                    if (statusEl) statusEl.textContent = 'Sedang menghapus background...';

                    // Step 2: Remove Background
                    const removeBgPayload = {
                        server_filename: serverFilename,
                        task: uploadResult.data.task,
                        server: uploadResult.data.server,
                        filename: uploadResult.data.filename,
                        width: uploadResult.data.width,
                        height: uploadResult.data.height
                    };
                    console.log('[HBG2-SINGLE] RemoveBG payload:', removeBgPayload);
                    const removeBgResponse = await fetch('/server/removebg_proxy.php?action=removebg', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(removeBgPayload)
                    });
                    console.log('[HBG2-SINGLE] RemoveBG HTTP status:', removeBgResponse.status, 'Content-Type:', removeBgResponse.headers.get('content-type'));

                    if (!removeBgResponse.ok) {
                        const errText = await removeBgResponse.text();
                        console.error('[HBG2-SINGLE] RemoveBG error body:', errText);
                        let errMsg = 'Gagal menghapus background (' + removeBgResponse.status + ')';
                        try { errMsg = JSON.parse(errText).message || errMsg; } catch (_) {}
                        throw new Error(errMsg);
                    }

                    const imageBlob = await removeBgResponse.blob();
                    console.log('[HBG2-SINGLE] Result blob size:', imageBlob.size, 'type:', imageBlob.type);
                    const imageUrl = URL.createObjectURL(imageBlob);
                    const originalUrl = hbg2ImageData.dataUrl;
                    
                    // Deduct Quota for each successful result (if count > 1)
                    if (imageCount > 1) {
                        await deductBoostQuota(1);
                    }
                    
                    card.className = 'relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group w-full h-[500px]';
                    card.innerHTML = ''; 
                    
                    // Initialize slider
                    initBeforeAfterSlider(card, originalUrl, imageUrl);
                    
                    // Add download button
                    const downloadBtnContainer = document.createElement('div');
                    downloadBtnContainer.className = 'absolute bottom-4 right-4 z-30';
                    downloadBtnContainer.innerHTML = `
                        <a href="${imageUrl}" download="removed_bg_${Date.now()}.png" class="bg-teal-500 hover:bg-teal-600 text-white p-2.5 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110" title="Unduh Hasil">
                            <i data-lucide="download" class="w-5 h-5"></i>
                        </a>
                    `;
                    card.appendChild(downloadBtnContainer);
                    
                    if (window.lucide) window.lucide.createIcons();
                    successCount++;
                } catch (error) {
                    console.error(error);
                    card.className = 'relative bg-red-50 rounded-2xl p-4 border border-red-100 flex items-center justify-center min-h-[200px]';
                    card.innerHTML = `
                        <div class="text-center">
                            <i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mx-auto mb-2"></i>
                            <p class="text-sm font-bold text-red-700">Gagal Gambar ${i + 1}</p>
                            <p class="text-xs text-red-500 mt-1">${error.message}</p>
                        </div>
                    `;
                    if (window.lucide) window.lucide.createIcons();
                }
            })();
            processPromises.push(promise);
        }

        await Promise.all(processPromises);

        if (successCount > 0 && typeof doneSound !== 'undefined' && doneSound) doneSound.play();
        else if (successCount === 0 && typeof errorSound !== 'undefined' && errorSound) errorSound.play();

        hbg2GenerateBtn.disabled = false;
        hbg2GenerateBtn.innerHTML = originalBtnHTML;
        if (window.lucide) window.lucide.createIcons();
    });
};
