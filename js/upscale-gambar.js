window.initUpscaleGambar = function(config) {
    const {
        document,
        setupImageUpload,
        lucide,
        doneSound,
        errorSound
    } = config;

    const ugImageInput = document.getElementById('ug-image-input');
    const ugUploadBox = document.getElementById('ug-upload-box');
    const ugImagePreview = document.getElementById('ug-image-preview');
    const ugUploadPlaceholder = document.getElementById('ug-upload-placeholder');
    const ugRemoveBtn = document.getElementById('ug-remove-btn');
    const ugGenerateBtn = document.getElementById('ug-generate-btn');
    const ugResultsGrid = document.getElementById('ug-results-grid');
    const ugResultsPlaceholder = document.getElementById('ug-results-placeholder');
    
    // Bulk Elements
    const ugBulkToggle = document.getElementById('ug-bulk-toggle');
    const ugBulkPreviewContainer = document.getElementById('ug-bulk-preview-container');
    const ugBulkGrid = document.getElementById('ug-bulk-grid');
    const ugFileCount = document.getElementById('ug-file-count');
    
    let ugImageData = null;
    let ugBulkFiles = [];

    if (!ugImageInput || !ugGenerateBtn) return;

    function updateGenerateButton() {
        if (ugBulkToggle && ugBulkToggle.checked) {
            ugGenerateBtn.disabled = ugBulkFiles.length === 0;
        } else {
            ugGenerateBtn.disabled = !ugImageData;
        }
    }

    function renderBulkPreviews() {
        if (!ugBulkGrid) return;
        ugBulkGrid.innerHTML = '';
        
        ugBulkFiles.forEach((file, index) => {
            const reader = new FileReader();
            const div = document.createElement('div');
            div.className = 'relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white group';
            
            // Delete button for individual file
            const delBtn = document.createElement('button');
            delBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10';
            delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
            delBtn.onclick = (e) => {
                e.stopPropagation();
                ugBulkFiles.splice(index, 1);
                ugFileCount.textContent = ugBulkFiles.length;
                renderBulkPreviews();
                updateGenerateButton();
                if (ugBulkFiles.length === 0) {
                    ugBulkPreviewContainer.classList.add('hidden');
                    ugUploadPlaceholder.classList.remove('hidden');
                    ugRemoveBtn.classList.add('hidden');
                    ugUploadBox.classList.remove('border-teal-400', 'bg-teal-50');
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
            ugBulkGrid.appendChild(div);
        });
    }

    // Boost Logic (Duplicated helper to ensure availability)
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
                body: `action=decrease_quota&email=${encodeURIComponent(email)}&amount=${amount}&feature_key=upscale-gambar&feature_name=Upscale%20Gambar`
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
            const event = new Event('change', { bubbles: true });
            boostToggle.dispatchEvent(event);
        }
        const boostToggleHome = document.getElementById('boost-generate-toggle-home');
        if (boostToggleHome && !boostToggleHome.checked) {
            boostToggleHome.checked = true;
            const event = new Event('change', { bubbles: true });
            boostToggleHome.dispatchEvent(event);
        }
    }

    // Bulk Toggle Listener
    if (ugBulkToggle) {
        const countSliderSection = document.getElementById('ug-count-slider')?.closest('div').parentElement;
        
        ugBulkToggle.addEventListener('change', () => {
            const isBulk = ugBulkToggle.checked;
            
            ugImageData = null;
            ugBulkFiles = [];
            ugImageInput.value = '';
            
            if (isBulk) {
                ugImageInput.multiple = true;
                ugImageInput.setAttribute('multiple', 'multiple');
                activateBoostMode();
                ugImagePreview.classList.add('hidden');
                ugUploadPlaceholder.classList.remove('hidden');
                if (ugBulkPreviewContainer) ugBulkPreviewContainer.classList.add('hidden');
                // Hide count slider section when bulk is ON
                if (countSliderSection) countSliderSection.style.display = 'none';
            } else {
                ugImageInput.removeAttribute('multiple');
                ugImageInput.multiple = false;
                if (ugBulkPreviewContainer) ugBulkPreviewContainer.classList.add('hidden');
                ugImagePreview.classList.add('hidden');
                ugUploadPlaceholder.classList.remove('hidden');
                // Show count slider section when bulk is OFF
                if (countSliderSection) countSliderSection.style.display = '';
            }
            
            ugRemoveBtn.classList.add('hidden');
            ugUploadBox.classList.remove('border-teal-400', 'bg-teal-50');
            updateGenerateButton();
        });
    }

    // Manual Input Change Listener for Bulk
    ugImageInput.addEventListener('change', async (e) => {
        if (ugBulkToggle && ugBulkToggle.checked) {
            const newFiles = Array.from(e.target.files);
            if (newFiles.length > 0) {
                // Validate file size (Max 15MB)
                const MAX_SIZE = 15 * 1024 * 1024;
                const oversized = newFiles.filter(f => f.size > MAX_SIZE);
                if (oversized.length > 0) {
                    alert(`Beberapa file terlalu besar (Max 15MB):\n${oversized.map(f => f.name).join('\n')}`);
                    ugImageInput.value = '';
                    return;
                }

                const totalFiles = ugBulkFiles.length + newFiles.length;
                if (totalFiles > 10) {
                    alert(`Maksimal 10 gambar sekaligus. Anda sudah memilih ${ugBulkFiles.length} gambar.`);
                    ugImageInput.value = '';
                    return;
                }
                
                ugBulkFiles = [...ugBulkFiles, ...newFiles];
                ugFileCount.textContent = ugBulkFiles.length;
                
                ugUploadPlaceholder.classList.add('hidden');
                ugImagePreview.classList.add('hidden');
                if (ugBulkPreviewContainer) ugBulkPreviewContainer.classList.remove('hidden');
                ugRemoveBtn.classList.remove('hidden');
                ugUploadBox.classList.add('border-teal-400', 'bg-teal-50');
                
                renderBulkPreviews();
                
                ugImageInput.value = ''; // Reset input to allow adding more
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
            // Apply scale to images
            // We need to apply transform scale to images but keep them centered or allow panning?
            // Simple zoom for now: scale both images
            // Note: Scaling inside the slider structure might be tricky with the clipping div.
            // Better approach: Scale the images but keep container fixed.
            
            // Actually, scaling object-contain images might just shrink them if container is fixed.
            // We need to change object-fit or scale via transform.
            
            // Let's try transform scale on the images.
            const scaleStyle = `scale(${zoomLevel})`;
            beforeImg.style.transform = scaleStyle;
            afterImg.style.transform = scaleStyle;
            
            // When zoomed in, we might want to allow panning, but that complicates the slider interaction.
            // For now, let's keep it simple: Zoom centered.
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
        
        // Only move slider if not interacting with zoom controls
        slider.addEventListener('mousemove', move);
        slider.addEventListener('touchmove', move);
        
        // Prevent slider move when clicking zoom buttons (propagation stop)
        const controls = container.querySelector('.absolute.bottom-4');
        if (controls) {
            controls.addEventListener('mousemove', (e) => e.stopPropagation());
            controls.addEventListener('touchmove', (e) => e.stopPropagation());
            controls.addEventListener('mousedown', (e) => e.stopPropagation());
            controls.addEventListener('touchstart', (e) => e.stopPropagation());
        }
    }

    if (ugImageInput) {
        setupImageUpload(ugImageInput, ugUploadBox, (data) => {
            ugImageData = data;
            ugImagePreview.src = data.dataUrl;
            ugImagePreview.classList.remove('hidden');
            ugUploadPlaceholder.classList.add('hidden');
            ugRemoveBtn.classList.remove('hidden');
            ugUploadBox.classList.add('border-teal-400', 'bg-teal-50');
            updateGenerateButton();
        });
    }

    if (ugRemoveBtn) {
        ugRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ugImageData = null;
            ugBulkFiles = []; // Clear bulk files
            ugImageInput.value = '';
            ugImagePreview.src = '';
            ugImagePreview.classList.add('hidden');
            if (ugBulkPreviewContainer) ugBulkPreviewContainer.classList.add('hidden'); // Hide bulk container
            ugUploadPlaceholder.classList.remove('hidden');
            ugRemoveBtn.classList.add('hidden');
            ugUploadBox.classList.remove('border-teal-400', 'bg-teal-50');
            updateGenerateButton();
        });
    }

    ugGenerateBtn.addEventListener('click', async () => {
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
        if (ugBulkToggle && ugBulkToggle.checked && ugBulkFiles.length > 0) {
            // Check Quota (Just Check, Don't Deduct Yet)
            const quota = await checkBoostQuota();
            if (quota < ugBulkFiles.length) {
                alert(`Kuota Boost tidak mencukupi. Anda butuh ${ugBulkFiles.length} kuota, tapi hanya punya ${quota}. Silakan top up boost.`);
                return;
            }

            const originalBtnHTML = ugGenerateBtn.innerHTML;
            ugGenerateBtn.disabled = true;
            ugGenerateBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i><span>Memproses ${ugBulkFiles.length} Gambar...</span>`;
            if (window.lucide) window.lucide.createIcons();

            ugResultsPlaceholder.classList.add('hidden');
            ugResultsGrid.classList.remove('hidden');
            ugResultsGrid.innerHTML = '';
            ugResultsGrid.className = `grid ${getResultGridCols(ugBulkFiles.length)} gap-4`;

            let successCount = 0;

            const processPromises = ugBulkFiles.map(async (file, i) => {
                const cardId = 'ug-result-' + Date.now() + '-' + i;
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
                ugResultsGrid.appendChild(card);

                try {
                    // Client-side size check (double check)
                    if (file.size > 15 * 1024 * 1024) throw new Error('File terlalu besar (>15MB)');

                    const uploadFormData = new FormData();
                    uploadFormData.append('image', file);

                    const uploadResponse = await fetch('/server/upscale_proxy.php?action=upload', {
                        method: 'POST',
                        body: uploadFormData
                    });

                    const uploadText = await uploadResponse.text();
                    let uploadResult;
                    try {
                        uploadResult = JSON.parse(uploadText);
                    } catch (e) {
                        console.error('Invalid JSON response:', uploadText);
                        throw new Error('Gagal respons server (Mungkin file terlalu besar/timeout)');
                    }

                    if (!uploadResult.success) throw new Error(uploadResult.message || 'Gagal upload');

                    const statusEl = document.getElementById(`${cardId}-status`);
                    if (statusEl) statusEl.textContent = 'Sedang memproses upscale (4x)...';

                    const upscaleResponse = await fetch('/server/upscale_proxy.php?action=upscale', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ server_filename: uploadResult.data.server_filename })
                    });

                    if (!upscaleResponse.ok) {
                         const errText = await upscaleResponse.text();
                         throw new Error(`Gagal upscale (${upscaleResponse.status}): ${errText.substring(0, 100)}`);
                    }

                    const imageBlob = await upscaleResponse.blob();
                    if (imageBlob.size === 0) throw new Error('Hasil upscale kosong');
                    
                    const imageUrl = URL.createObjectURL(imageBlob);

                    // Deduct Quota Here (Deduct on Success)
                    const deductSuccess = await deductBoostQuota(1);
                    if (!deductSuccess) {
                        // Rare case: Quota ran out during process
                         throw new Error('Gagal memotong kuota. Pastikan kuota Anda cukup.');
                    }
                    
                    successCount++;

                    card.className = 'relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group w-full h-[500px]';
                    card.innerHTML = '';
                    
                    // Bulk mode: Show before/after slider like regular mode
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        initBeforeAfterSlider(card, e.target.result, imageUrl);
                        
                        // Add download button after slider is initialized
                        const downloadBtnContainer = document.createElement('div');
                        downloadBtnContainer.className = 'absolute bottom-4 right-4 z-30';
                        downloadBtnContainer.innerHTML = `
                            <a href="${imageUrl}" download="upscaled_${file.name.replace(/\.[^/.]+$/, "")}.jpg" class="bg-teal-500 hover:bg-teal-600 text-white p-2.5 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110" title="Unduh Hasil">
                                <i data-lucide="download" class="w-5 h-5"></i>
                            </a>
                        `;
                        card.appendChild(downloadBtnContainer);
                        if (window.lucide) window.lucide.createIcons();
                    };
                    reader.readAsDataURL(file);

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
            ugGenerateBtn.disabled = false;
            ugGenerateBtn.innerHTML = originalBtnHTML;
            if (window.lucide) window.lucide.createIcons();
            
            return;
        }

        if (!ugImageData) return;

        const countSlider = document.getElementById('ug-count-slider');
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

        const originalBtnHTML = ugGenerateBtn.innerHTML;
        ugGenerateBtn.disabled = true;
        ugGenerateBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i><span>Mengupload...</span>`;
        if (window.lucide) window.lucide.createIcons();

        ugResultsPlaceholder.classList.add('hidden');
        ugResultsGrid.classList.remove('hidden');
        ugResultsGrid.innerHTML = '';

        const processPromises = [];
        let successCount = 0;

        for (let i = 0; i < imageCount; i++) {
            const cardId = 'ug-result-' + Date.now() + '-' + i;
            const card = document.createElement('div');
            card.id = cardId;
            card.className = 'relative bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[300px] animate-pulse';
            
            const tips = [
                "AI sedang meningkatkan resolusi...",
                "Memperjelas detail gambar...",
                "Mengurangi noise...",
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
            ugResultsGrid.appendChild(card);

            const promise = (async () => {
                try {
                    // Step 1: Upload
                    const uploadFormData = new FormData();
                    // Convert base64 to blob
                    const fetchRes = await fetch(ugImageData.dataUrl);
                    const blob = await fetchRes.blob();
                    uploadFormData.append('image', blob, 'image.png');

                    const uploadResponse = await fetch('/server/upscale_proxy.php?action=upload', {
                        method: 'POST',
                        body: uploadFormData
                    });

                    const uploadResult = await uploadResponse.json().catch(() => {
                        throw new Error('Gagal memproses respons server. Kemungkinan file terlalu besar atau terjadi kesalahan server.');
                    });
                    
                    if (!uploadResult.success) {
                        throw new Error(uploadResult.message || 'Gagal mengupload gambar.');
                    }

                    const serverFilename = uploadResult.data.server_filename; // Adjust based on actual API response structure
                    
                    // Update status
                    const statusEl = document.getElementById(`${cardId}-status`);
                    if (statusEl) statusEl.textContent = 'Sedang memproses upscale (4x)...';

                    // Step 2: Upscale
                    const upscaleResponse = await fetch('/server/upscale_proxy.php?action=upscale', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            server_filename: serverFilename
                        })
                    });

                    if (!upscaleResponse.ok) {
                        const errJson = await upscaleResponse.json().catch(() => ({}));
                        throw new Error(errJson.message || 'Gagal melakukan upscale.');
                    }

                    const imageBlob = await upscaleResponse.blob();
                    const imageUrl = URL.createObjectURL(imageBlob);
                    const originalUrl = ugImageData.dataUrl;
                    
                    // Deduct Quota for each successful result (if count > 1)
                    if (imageCount > 1) {
                        await deductBoostQuota(1);
                    }
                    
                    card.className = 'relative bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group w-full h-[500px]';
                    card.innerHTML = ''; // Clear loading
                    
                    // Initialize slider
                    initBeforeAfterSlider(card, originalUrl, imageUrl);
                    
                    // Add download button outside the slider
                    const downloadBtnContainer = document.createElement('div');
                    downloadBtnContainer.className = 'absolute bottom-4 right-4 z-30';
                    downloadBtnContainer.innerHTML = `
                        <a href="${imageUrl}" download="upscaled_${Date.now()}.jpg" class="bg-teal-500 hover:bg-teal-600 text-white p-2.5 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110" title="Unduh Hasil">
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

        ugGenerateBtn.disabled = false;
        ugGenerateBtn.innerHTML = originalBtnHTML;
        if (window.lucide) window.lucide.createIcons();
    });
};
