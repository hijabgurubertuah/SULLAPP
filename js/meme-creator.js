(function() {
    const imageInput = document.getElementById('memecr-image-input');
    const uploadBox = document.getElementById('memecr-upload-box');
    const placeholder = document.getElementById('memecr-placeholder');
    const preview = document.getElementById('memecr-preview');
    const removeBtn = document.getElementById('memecr-remove-btn');
    const generateBtn = document.getElementById('memecr-generate-btn');
    const generateBtnText = document.getElementById('memecr-generate-btn-text');
    const captionInput = document.getElementById('memecr-caption-input');
    
    const countSlider = document.getElementById('memecr-count-slider');
    const countValue = document.getElementById('memecr-count-value');
    
    const resultsPlaceholder = document.getElementById('memecr-results-placeholder');
    const resultsContainer = document.getElementById('memecr-results-container');
    const resultsGrid = document.getElementById('memecr-results-grid');
    const clearResultsBtn = document.getElementById('memecr-clear-results');

    let selectedTemplate = 'drake';
    let selectedStyle = 'funny';
    let selectedTheme = 'life';
    let selectedRatio = '1:1';
    let uploadedImage = null;

    function setupOptionButtons(containerId, callback) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const buttons = container.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                if (callback) callback(btn.dataset.value);
            });
        });
    }

    setupOptionButtons('memecr-template-options', (value) => selectedTemplate = value);
    setupOptionButtons('memecr-style-options', (value) => selectedStyle = value);
    setupOptionButtons('memecr-theme-options', (value) => selectedTheme = value);
    setupOptionButtons('memecr-ratio-options', (value) => selectedRatio = value);

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('border-pink-400');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('border-pink-400');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('border-pink-400');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });

    async function handleImageUpload(file) {
        let processedFile = file;
        
        if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heic')) {
            if (typeof convertHeicToJpg === 'function') {
                try {
                    processedFile = await convertHeicToJpg(file);
                } catch (err) {
                    console.error('HEIC conversion failed:', err);
                    alert('Gagal mengkonversi file HEIC. Silakan gunakan format JPG/PNG.');
                    return;
                }
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImage = e.target.result;
            preview.src = uploadedImage;
            placeholder.classList.add('hidden');
            preview.classList.remove('hidden');
            removeBtn.classList.remove('hidden');
            
            const ratioContainer = document.getElementById('memecr-ratio-options');
            if (typeof window.autoSelectClosestRatio === 'function' && ratioContainer) {
                window.autoSelectClosestRatio(uploadedImage, ratioContainer);
            }
        };
        reader.readAsDataURL(processedFile);
    }

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadedImage = null;
        preview.src = '';
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
        removeBtn.classList.add('hidden');
        imageInput.value = '';
    });

    if (countSlider && countValue) {
        countSlider.addEventListener('input', () => {
            const val = parseInt(countSlider.value);
            countValue.textContent = `${val} Meme`;
            
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;
            
            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                countSlider.value = 1;
                countValue.textContent = "1 Meme";
            }
        });
    }

    function updateSliderProgress(slider) {
        if (!slider) return;
        const min = parseInt(slider.min) || 1;
        const max = parseInt(slider.max) || 10;
        const val = parseInt(slider.value) || 1;
        const percent = ((val - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(to right, rgb(236, 72, 153) 0%, rgb(236, 72, 153) ${percent}%, rgb(226, 232, 240) ${percent}%, rgb(226, 232, 240) 100%)`;
    }

    if (typeof window.isBoostModeActive === 'function') {
        const checkBoost = () => {
            const isBoostActive = window.isBoostModeActive();
            if (countSlider) {
                countSlider.disabled = !isBoostActive;
                countSlider.classList.toggle('cursor-not-allowed', !isBoostActive);
                countSlider.classList.toggle('opacity-50', !isBoostActive);
                countSlider.classList.toggle('cursor-pointer', isBoostActive);
                countSlider.classList.toggle('opacity-100', isBoostActive);
                if (isBoostActive) {
                    updateSliderProgress(countSlider);
                }
            }
        };
        checkBoost();
        setInterval(checkBoost, 1000);
    }

    generateBtn.addEventListener('click', async () => {
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

        if (!uploadedImage) {
            alert('Silakan unggah gambar terlebih dahulu!');
            return;
        }

        const caption = captionInput.value.trim();
        const resultCount = parseInt(countSlider.value) || 1;

        generateBtn.disabled = true;
        generateBtnText.textContent = 'Generating...';

        const prompt = buildMemePrompt(caption);

        resultsPlaceholder.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
        resultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
        resultsGrid.innerHTML = '';
        
        const aspectRatioClass = {
            '1:1': 'aspect-square',
            '3:4': 'aspect-[3/4]',
            '4:3': 'aspect-[4/3]',
            '9:16': 'aspect-[9/16]',
            '16:9': 'aspect-[16/9]'
        }[selectedRatio] || 'aspect-square';
        
        for (let i = 0; i < resultCount; i++) {
            const loadingCard = document.createElement('div');
            loadingCard.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${aspectRatioClass} flex flex-col items-center justify-center`;
            loadingCard.id = `memecr-loading-card-${i}`;
            loadingCard.innerHTML = `
                <div class="spinner"></div>
                <p class="text-sm text-slate-600 mt-4">Membuat meme ${i + 1}...</p>
            `;
            resultsGrid.appendChild(loadingCard);
        }
        
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }

        const formData = new FormData();
        const blob = await fetch(uploadedImage).then(r => r.blob());
        formData.append('images[]', blob, 'meme-base.jpg');
        formData.append('instruction', prompt);
        formData.append('aspectRatio', selectedRatio);

        try {
            const apiKey = typeof API_KEY !== 'undefined' ? API_KEY : '';
            const generateUrl = typeof GENERATE_URL !== 'undefined' ? GENERATE_URL : '/generate';
            const headers = {};
            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }

            const generateSingle = async (index) => {
                try {
                    const response = await fetch(generateUrl, {
                        method: 'POST',
                        headers,
                        body: formData
                    });
                    
                    if (!response.ok) throw new Error('Generate failed');
                    const data = await response.json();
                    
                    const loadingCard = document.getElementById(`memecr-loading-card-${index}`);
                    if (!loadingCard) return;
                    
                    if (data.success && data.imageUrl) {
                        loadingCard.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full';
                        loadingCard.innerHTML = `
                            <img src="${data.imageUrl}" alt="Meme ${index + 1}" class="w-full h-full object-contain shadow-sm">
                            <div class="absolute bottom-2 right-2 flex gap-2">
                                <button data-img-src="${data.imageUrl}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <a href="${data.imageUrl}" download="meme_${index + 1}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                    <i data-lucide="download" class="w-4 h-4"></i>
                                </a>
                            </div>
                        `;
                    } else {
                        loadingCard.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">Error: ${data.error || 'Unknown error'}</div>`;
                    }
                    
                    if (typeof lucide !== 'undefined' && lucide.createIcons) {
                        lucide.createIcons();
                    }
                } catch (error) {
                    const loadingCard = document.getElementById(`memecr-loading-card-${index}`);
                    if (loadingCard) {
                        loadingCard.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">Error: ${error.message}</div>`;
                    }
                }
            };
            
            const promises = [];
            for (let i = 0; i < resultCount; i++) {
                promises.push(generateSingle(i));
            }
            
            await Promise.allSettled(promises);
            
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }

            if (typeof doneSound !== 'undefined' && doneSound && typeof doneSound.play === 'function') {
                doneSound.play().catch(() => {});
            }

        } catch (error) {
            console.error('Generation error:', error);
            if (typeof errorSound !== 'undefined' && errorSound && typeof errorSound.play === 'function') {
                errorSound.play().catch(() => {});
            }
        } finally {
            generateBtn.disabled = false;
            generateBtnText.textContent = resultCount > 1 ? `Generate ${resultCount} Meme` : 'Generate Meme';
        }
    });

    function buildMemePrompt(userCaption) {
        const styleDescriptions = {
            'funny': 'lucu dan menghibur',
            'sarcastic': 'sarkastik dan satir',
            'savage': 'savage dan blak-blakan'
        };

        const themeDescriptions = {
            'life': 'tentang kehidupan sehari-hari',
            'work': 'tentang dunia kerja dan kantoran',
            'relationship': 'tentang hubungan dan percintaan',
            'tech': 'tentang teknologi dan gadget'
        };

        const templateDescriptions = {
            'drake': 'dengan format Drake meme (menolak vs menerima)',
            'distracted': 'dengan format Distracted Boyfriend meme',
            'success-kid': 'dengan format Success Kid meme (anak kecil mengepalkan tangan)',
            'thinking': 'dengan format Thinking meme (orang berpikir keras)',
            'doge': 'dengan format Doge meme (anjing lucu dengan teks Comic Sans)',
            'custom': 'dengan style kreatif dan unik'
        };

        let prompt = `Buat meme ${styleDescriptions[selectedStyle] || 'lucu'} ${themeDescriptions[selectedTheme] || 'kehidupan'} ${templateDescriptions[selectedTemplate] || ''}. `;

        if (userCaption) {
            prompt += `Caption: "${userCaption}". `;
        } else {
            prompt += `Buat caption yang relatable dan viral untuk Indonesia. `;
        }

        prompt += `Meme harus berkualitas tinggi, teks jelas terbaca dengan font Impact/Comic Sans warna putih dengan outline hitam. Layout profesional dan estetik.`;

        return prompt;
    }


    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', () => {
            resultsGrid.innerHTML = '';
            resultsPlaceholder.classList.remove('hidden');
            resultsContainer.classList.add('hidden');
        });
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
})();
