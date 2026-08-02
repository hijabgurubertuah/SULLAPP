window.initGifMaker = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    getApiKey,
    GENERATE_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    const imagesInput = document.getElementById('gif-images-input');
    const uploadBox = document.getElementById('gif-upload-box');
    const placeholder = document.getElementById('gif-placeholder');
    const previewGrid = document.getElementById('gif-preview-grid');
    const removeAllBtn = document.getElementById('gif-remove-all-btn');
    const imageCount = document.getElementById('gif-image-count');
    
    const durationSlider = document.getElementById('gif-duration-slider');
    const durationValue = document.getElementById('gif-duration-value');
    const loopToggle = document.getElementById('gif-loop-toggle');
    const loopLabel = document.getElementById('gif-loop-label');
    
    const generateBtn = document.getElementById('gif-generate-btn');
    const generateBtnText = document.getElementById('gif-generate-btn-text');
    
    const resultsContainer = document.getElementById('gif-results-container');
    const resultsGrid = document.getElementById('gif-results-grid');
    const resultsPlaceholder = document.getElementById('gif-results-placeholder');
    const clearResultsBtn = document.getElementById('gif-clear-results');

    if (!generateBtn) return;

    let gifImagesData = [];
    let isGenerating = false;

    if (durationSlider && durationValue) {
        durationSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value).toFixed(1);
            durationValue.textContent = `${val}s`;
        });
    }

    if (loopToggle && loopLabel) {
        loopToggle.addEventListener('change', (e) => {
            loopLabel.textContent = e.target.checked ? 'Loop ON' : 'Loop OFF';
        });
    }

    if (imagesInput && uploadBox) {
        const handleFiles = async (files) => {
            const fileArray = Array.from(files);
            
            for (const file of fileArray) {
                try {
                    let processedFile = file;
                    
                    if (file.name.toLowerCase().endsWith('.heic')) {
                        if (typeof heic2any !== 'undefined') {
                            processedFile = await heic2any({
                                blob: file,
                                toType: 'image/jpeg',
                                quality: 0.9
                            });
                            if (Array.isArray(processedFile)) {
                                processedFile = processedFile[0];
                            }
                        }
                    }

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            const maxDim = 2048;
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > maxDim || height > maxDim) {
                                if (width > height) {
                                    height = (height / width) * maxDim;
                                    width = maxDim;
                                } else {
                                    width = (width / height) * maxDim;
                                    height = maxDim;
                                }
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            canvas.toBlob((blob) => {
                                gifImagesData.push({
                                    blob: blob,
                                    dataUrl: e.target.result,
                                    filename: file.name,
                                    mimeType: blob.type
                                });
                                
                                updatePreviewGrid();
                                updateGenerateButton();
                            }, 'image/jpeg', 0.9);
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(processedFile);
                } catch (error) {
                    console.error('Error processing file:', error);
                }
            }
        };

        uploadBox.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imagesInput.click();
        });

        imagesInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
                e.target.value = '';
            }
        });

        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadBox.classList.add('drag-over');
        });

        uploadBox.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadBox.classList.remove('drag-over');
        });

        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadBox.classList.remove('drag-over');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });
    }

    function updatePreviewGrid() {
        if (gifImagesData.length === 0) {
            previewGrid.classList.add('hidden');
            placeholder.classList.remove('hidden');
            removeAllBtn.classList.add('hidden');
            imageCount.classList.add('hidden');
            return;
        }

        previewGrid.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeAllBtn.classList.remove('hidden');
        imageCount.classList.remove('hidden');
        imageCount.textContent = `${gifImagesData.length} foto dipilih`;

        previewGrid.innerHTML = '';
        
        gifImagesData.forEach((imgData, index) => {
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200';
            
            const img = document.createElement('img');
            img.src = imgData.dataUrl;
            img.className = 'w-full h-full object-cover';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700';
            removeBtn.innerHTML = '<i data-lucide="x" class="w-3 h-3"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                gifImagesData.splice(index, 1);
                updatePreviewGrid();
                updateGenerateButton();
                if (lucide) lucide.createIcons();
            });
            
            const indexBadge = document.createElement('div');
            indexBadge.className = 'absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded';
            indexBadge.textContent = index + 1;
            
            imgWrapper.appendChild(img);
            imgWrapper.appendChild(removeBtn);
            imgWrapper.appendChild(indexBadge);
            previewGrid.appendChild(imgWrapper);
        });
        
        if (lucide) lucide.createIcons();
    }

    if (removeAllBtn) {
        removeAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            gifImagesData = [];
            imagesInput.value = '';
            updatePreviewGrid();
            updateGenerateButton();
            if (resultsContainer) resultsContainer.classList.add('hidden');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            if (resultsGrid) resultsGrid.innerHTML = '';
        });
    }

    if (clearResultsBtn && resultsGrid && resultsContainer && resultsPlaceholder) {
        clearResultsBtn.addEventListener('click', () => {
            resultsGrid.innerHTML = '';
            resultsContainer.classList.add('hidden');
            resultsPlaceholder.classList.remove('hidden');
            if (lucide) lucide.createIcons();
        });
    }

    function updateGenerateButton() {
        if (gifImagesData.length >= 2 && !isGenerating) {
            generateBtn.disabled = false;
        } else {
            generateBtn.disabled = true;
        }
    }

    generateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isGenerating) return;
        
        const isVip = window.IS_VIP_APP === true;
        
        if (!isVip) {
            const upgradeVipModal = document.getElementById('upgrade-vip-modal');
            if (upgradeVipModal) {
                upgradeVipModal.classList.add('active');
                upgradeVipModal.style.display = 'flex';
                setTimeout(() => {
                    if (typeof lucide !== 'undefined' && lucide.createIcons) {
                        lucide.createIcons();
                    }
                }, 100);
            }
            if (typeof window.showUpgradeVipPopup === 'function') {
                window.showUpgradeVipPopup();
            }
            return;
        }
        
        if (gifImagesData.length < 2) {
            alert('Minimal 2 foto diperlukan untuk membuat GIF');
            return;
        }

        const secondsPerImage = parseFloat(durationSlider.value) || 0.5;
        const gifTimeMs = Math.round(secondsPerImage * 100);
        const isLoopEnabled = loopToggle ? loopToggle.checked : true;

        const transitionDescriptions = {
            'none': 'direct frame transition',
            'fade': 'smooth fade transition between frames',
            'slide': 'sliding transition effect',
            'zoom': 'zoom in/out transition'
        };

        const loopDescriptions = {
            'infinite': 'loop infinitely',
            'once': 'play once',
            'bounce': 'play forward then backward continuously'
        };

        const qualityDescriptions = {
            'low': 'optimized for size',
            'medium': 'balanced quality',
            'high': 'maximum quality'
        };

        isGenerating = true;
        generateBtn.disabled = true;
        generateBtnText.textContent = 'Membuat GIF...';
        
        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        resultsGrid.className = 'grid grid-cols-1 gap-4';
        resultsGrid.innerHTML = '';
        
        const loadingCard = document.createElement('div');
        loadingCard.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full aspect-square flex flex-col items-center justify-center';
        loadingCard.id = 'gif-loading-card';
        loadingCard.innerHTML = `
            <div class="spinner"></div>
            <p class="text-sm text-slate-600 mt-4 text-center">Membuat file GIF...</p>
            <p class="text-xs text-slate-400 mt-2">${gifImagesData.length} frame • ${secondsPerImage}s per image</p>
        `;
        resultsGrid.appendChild(loadingCard);
        
        if (lucide) lucide.createIcons();

        try {
            const ILOVEIMG_API = 'https://api18.iloveimg.com/v1';
            const BEARER_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIiLCJhdWQiOiIiLCJpYXQiOjE1MjMzNjQ4MjQsIm5iZiI6MTUyMzM2NDgyNCwianRpIjoicHJvamVjdF9wdWJsaWNfYzkwNWRkMWMwMWU5ZmQ3NzY5ODNjYTQwZDBhOWQyZjNfT1Vzd2EwODA0MGI4ZDJjN2NhM2NjZGE2MGQ2MTBhMmRkY2U3NyJ9.qvHSXgCJgqpC4gd6-paUlDLFmg0o2DsOvb1EUYPYx_E';
            
            // Generate random task ID
            function generateTaskId() {
                const chars = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                let id = '';
                for (let i = 0; i < 200; i++) {
                    id += chars[Math.floor(Math.random() * chars.length)];
                }
                return id;
            }
            
            const taskId = generateTaskId();
            
            // Update loading message
            const loadingCard = document.getElementById('gif-loading-card');
            if (loadingCard) {
                loadingCard.querySelector('.text-sm').textContent = 'Mengunggah gambar...';
            }
            
            // Step 1: Upload all images
            const uploadedFiles = [];
            for (let i = 0; i < gifImagesData.length; i++) {
                const imgData = gifImagesData[i];
                const formData = new FormData();
                formData.append('name', imgData.filename || `frame_${i + 1}.jpg`);
                formData.append('chunk', '0');
                formData.append('chunks', '1');
                formData.append('task', taskId);
                formData.append('preview', '1');
                formData.append('pdfinfo', '0');
                formData.append('pdfforms', '0');
                formData.append('pdfresetforms', '0');
                formData.append('v', 'web.0');
                formData.append('file', imgData.blob, imgData.filename || `frame_${i + 1}.jpg`);
                
                const uploadResponse = await fetch(`${ILOVEIMG_API}/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Accept': 'application/json'
                    },
                    body: formData
                });
                
                if (!uploadResponse.ok) {
                    throw new Error(`Upload failed for image ${i + 1}`);
                }
                
                const uploadData = await uploadResponse.json();
                uploadedFiles.push({
                    server_filename: uploadData.server_filename,
                    filename: imgData.filename || `frame_${i + 1}.jpg`
                });
                
                if (loadingCard) {
                    loadingCard.querySelector('.text-sm').textContent = `Mengunggah ${i + 1}/${gifImagesData.length}...`;
                }
            }
            
            // Step 2: Process GIF
            if (loadingCard) {
                loadingCard.querySelector('.text-sm').textContent = 'Membuat GIF animation...';
            }
            
            // Get image dimensions
            const firstImg = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = gifImagesData[0].dataUrl;
            });
            
            const processFormData = new FormData();
            processFormData.append('width', firstImg.width.toString());
            processFormData.append('height', firstImg.height.toString());
            processFormData.append('convert_to', 'gif_animation');
            processFormData.append('gif_time', gifTimeMs.toString());
            processFormData.append('gif_loop', isLoopEnabled ? 'true' : 'false');
            processFormData.append('task', taskId);
            processFormData.append('tool', 'convertimage');
            processFormData.append('packaged_filename', 'iloveimg-converted');
            processFormData.append('custom_int', Math.floor(Math.random() * 999999999).toString());
            processFormData.append('custom_string', Math.random().toString(36).substring(2, 15));
            
            uploadedFiles.forEach((file, index) => {
                processFormData.append(`files[${index}][server_filename]`, file.server_filename);
                processFormData.append(`files[${index}][filename]`, file.filename);
            });
            
            const processResponse = await fetch(`${ILOVEIMG_API}/process`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'Accept': 'application/json'
                },
                body: processFormData
            });
            
            if (!processResponse.ok) {
                throw new Error('GIF processing failed');
            }
            
            const processData = await processResponse.json();
            
            if (processData.status !== 'TaskSuccess') {
                throw new Error('GIF generation failed');
            }
            
            // Step 3: Download GIF
            if (loadingCard) {
                loadingCard.querySelector('.text-sm').textContent = 'Mengunduh GIF...';
            }
            
            const downloadUrl = `${ILOVEIMG_API}/download/${taskId}`;
            const downloadResponse = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`
                }
            });
            
            if (!downloadResponse.ok) {
                throw new Error('Download failed');
            }
            
            const gifBlob = await downloadResponse.blob();
            const gifUrl = URL.createObjectURL(gifBlob);
            
            // Display result
            const finalLoadingCard = document.getElementById('gif-loading-card');
            if (!finalLoadingCard) return;
            
            finalLoadingCard.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full';
            finalLoadingCard.innerHTML = `
                <img src="${gifUrl}" alt="GIF Animation" class="w-full h-full object-contain shadow-sm">
                <div class="absolute bottom-2 right-2 flex gap-2">
                    <button data-img-src="${gifUrl}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <a href="${gifUrl}" download="${processData.download_filename || 'animation.gif'}" class="result-action-btn download-btn shadow-md" title="Unduh GIF">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </a>
                </div>
                <div class="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <i data-lucide="film" class="w-3 h-3"></i>
                    <span>GIF ${Math.round(gifBlob.size / 1024)}KB</span>
                </div>
            `;
            
            if (lucide) lucide.createIcons();

            if (doneSound && doneSound.play) {
                try {
                    const playPromise = doneSound.play();
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(() => {});
                    }
                } catch (e) {}
            }

        } catch (error) {
            const loadingCard = document.getElementById('gif-loading-card');
            if (loadingCard) {
                loadingCard.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">Error: ${error.message}</div>`;
            }
            
            if (errorSound && errorSound.play) {
                try {
                    const playPromise = errorSound.play();
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(() => {});
                    }
                } catch (e) {}
            }
        } finally {
            isGenerating = false;
            generateBtn.disabled = false;
            generateBtnText.textContent = 'Buat GIF';
        }
    });

    updateGenerateButton();
};
