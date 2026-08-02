window.initKartuNama = function (ctx = {}) {
    const {
        document,
        setupOptionButtons,
        getAspectRatioClass,
        lucide,
        getApiKey,
        GENERATE_URL,
        CHAT_URL,
        getApiErrorMessage,
        doneSound,
        errorSound,
        switchTab
    } = ctx;

    const bcNameInput = document.getElementById('bc-name-input');
    const bcRoleInput = document.getElementById('bc-role-input');
    const bcEmailInput = document.getElementById('bc-email-input');
    const bcWebsiteInput = document.getElementById('bc-website-input');
    const bcAddressInput = document.getElementById('bc-address-input');
    const bcDesignOptions = document.getElementById('bc-design-options');
    const bcCustomDesignContainer = document.getElementById('bc-custom-design-container');
    const bcCustomDesignInput = document.getElementById('bc-custom-design-input');
    const bcColorOptions = document.getElementById('bc-color-options');
    const bcCustomColorContainer = document.getElementById('bc-custom-color-container');
    const bcCustomColorInput = document.getElementById('bc-custom-color-input');
    const bcSizeOptions = document.getElementById('bc-size-options');
    const bcCountSlider = document.getElementById('bc-count-slider');
    const bcCountValue = document.getElementById('bc-count-value');
    const bcGenerateBtn = document.getElementById('bc-generate-btn');
    const bcResultsPlaceholder = document.getElementById('bc-results-placeholder');
    const bcResultsGrid = document.getElementById('bc-results-grid');

    if (!bcGenerateBtn || !bcSizeOptions || !bcResultsGrid) {
        return null;
    }

    let bcLogoData = null;
    const setupLogoUpload = (inputId, previewId, removeBtnId, callback) => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        const removeBtn = document.getElementById(removeBtnId);
        if (!input) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const base64 = evt.target.result.split(',')[1];
                const mimeType = file.type;
                const dataUrl = evt.target.result;
                if (preview) {
                    preview.src = dataUrl;
                    preview.classList.remove('hidden');
                }
                if (removeBtn) removeBtn.classList.remove('hidden');
                callback({ base64, mimeType, dataUrl });
            };
            reader.readAsDataURL(file);
        });

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                input.value = '';
                if (preview) {
                    preview.src = '';
                    preview.classList.add('hidden');
                }
                removeBtn.classList.add('hidden');
                callback(null);
            });
        }
    };

    const base64ToBlob = (base64, mimeType) => {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    };

    setupLogoUpload('bc-logo-input', 'bc-logo-preview', 'bc-logo-remove', (data) => {
        bcLogoData = data;
    });

    const apiHeaders = typeof getApiKey === 'function' ? { 'X-API-Key': getApiKey() } : undefined;

    const updateCustomVisibility = (optionsEl, containerEl, inputEl) => {
        if (!optionsEl || !containerEl) return;
        const selectedValue = optionsEl.querySelector('.selected')?.dataset.value || '';
        const isCustom = selectedValue.toLowerCase() === 'kustom';
        containerEl.classList.toggle('hidden', !isCustom);
        if (!isCustom && inputEl) inputEl.value = '';
    };

    const getSelectedOptionValue = (optionsEl, customInput) => {
        const selectedValue = optionsEl?.querySelector('.selected')?.dataset.value || '';
        if (!selectedValue) return '';
        if (selectedValue.toLowerCase() === 'kustom') {
            const customValue = customInput?.value.trim() || '';
            return customValue;
        }
        return selectedValue;
    };

    setupOptionButtons(bcDesignOptions);
    setupOptionButtons(bcColorOptions);
    setupOptionButtons(bcSizeOptions);
    if (switchTab) {
        document.getElementById('tab-business-card')?.addEventListener('click', () => switchTab('business-card'));
    }
    if (bcDesignOptions) {
        bcDesignOptions.addEventListener('click', () => updateCustomVisibility(bcDesignOptions, bcCustomDesignContainer, bcCustomDesignInput));
        updateCustomVisibility(bcDesignOptions, bcCustomDesignContainer, bcCustomDesignInput);
    }
    if (bcColorOptions) {
        bcColorOptions.addEventListener('click', () => updateCustomVisibility(bcColorOptions, bcCustomColorContainer, bcCustomColorInput));
        updateCustomVisibility(bcColorOptions, bcCustomColorContainer, bcCustomColorInput);
    }
    if (bcCountSlider && bcCountValue) {
        bcCountSlider.addEventListener('input', (e) => {
            bcCountValue.textContent = e.target.value;
        });
    }

    bcGenerateBtn.addEventListener('click', async () => {
        const name = bcNameInput?.value.trim() || '';
        if (!name) {
            alert('Nama lengkap wajib diisi.');
            return;
        }
        const data = {
            name,
            role: bcRoleInput?.value.trim() || '',
            email: bcEmailInput?.value.trim() || '',
            website: bcWebsiteInput?.value.trim() || '',
            address: bcAddressInput?.value.trim() || ''
        };
        const designValue = getSelectedOptionValue(bcDesignOptions, bcCustomDesignInput);
        if (bcDesignOptions?.querySelector('.selected')?.dataset.value?.toLowerCase() === 'kustom' && !designValue) {
            alert('Desain kustom wajib diisi.');
            return;
        }
        const colorValue = getSelectedOptionValue(bcColorOptions, bcCustomColorInput);
        if (bcColorOptions?.querySelector('.selected')?.dataset.value?.toLowerCase() === 'kustom' && !colorValue) {
            alert('Konsep warna kustom wajib diisi.');
            return;
        }
        const count = parseInt(bcCountSlider?.value || '1', 10) || 1;
        const ratio = bcSizeOptions.querySelector('.selected')?.dataset.value || '16:9';
        const originalBtnHTML = bcGenerateBtn.innerHTML;
        bcGenerateBtn.disabled = true;
        bcGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Mendesain...</span>`;
        bcGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');
        bcResultsPlaceholder?.classList.add('hidden');
        bcResultsGrid.classList.remove('hidden');
        bcResultsGrid.className = `grid gap-4 ${getResultGridCols(count)}`;
        bcResultsGrid.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const placeholder = document.createElement('div');
            placeholder.id = `bc-result-${i}`;
            placeholder.className = `card ${getAspectRatioClass(ratio)} w-full flex items-center justify-center bg-slate-50 border border-slate-200`;
            placeholder.innerHTML = `
                <div class="flex flex-col items-center gap-3 text-center p-4">
                    <div class="spinner"></div>
                    <div>
                        <span class="text-sm font-semibold text-slate-600 block">Kartu ${i + 1}</span>
                        <span class="text-xs text-slate-400 mt-1 block">Menyiapkan desain...</span>
                    </div>
                </div>`;
            bcResultsGrid.appendChild(placeholder);
        }

        try {
            const generateCard = async (index) => {
                const card = document.getElementById(`bc-result-${index}`);
                try {
                    const infoLines = [];
                    if (data.name && data.role) infoLines.push(`${data.name} ${data.role}`);
                    else if (data.name) infoLines.push(data.name);
                    else if (data.role) infoLines.push(data.role);
                    if (data.email) infoLines.push(data.email);
                    if (data.website) infoLines.push(data.website);
                    if (data.address) infoLines.push(data.address);
                    const textBlock = infoLines.join(' | ');
                    const logoInstruction = bcLogoData
                        ? `Gunakan logo dari gambar yang diunggah pada kartu nama.`
                        : `Tidak perlu logo.`;
                    const designInstruction = designValue ? `Gaya desain: ${designValue}.` : '';
                    const colorInstruction = colorValue ? `Konsep warna: ${colorValue}.` : '';
                    const instruction = `Buat desain kartu nama profesional yang memenuhi kanvas hingga tepi (full bleed), tanpa margin atau padding kosong, tanpa bingkai, tanpa ruang kosong di sekeliling.
Komposisi harus full screen sesuai rasio, elemen visual dan background mengisi seluruh area.
Tuliskan teks persis berikut dengan tipografi elegan dan kontras tinggi: ${textBlock || data.name}.
Gaya modern, bersih, elegan, corporate. Warna harmonis dan minimalis. ${designInstruction} ${colorInstruction} ${logoInstruction}
Pastikan semua teks terbaca jelas dan tidak terpotong. Variasi ${index + 1}.`;
                    const formData = new FormData();
                    formData.append('instruction', instruction);
                    formData.append('aspectRatio', ratio);
                    if (bcLogoData?.base64 && bcLogoData?.mimeType) {
                        formData.append('images[]', base64ToBlob(bcLogoData.base64, bcLogoData.mimeType), 'logo.png');
                    }
                    const response = await fetch(`${GENERATE_URL}`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': typeof getApiKey === 'function' ? getApiKey() : ''
                        },
                        body: formData
                    });
                    if (!response.ok) throw new Error(await getApiErrorMessage(response));
                    const result = await response.json();
                    if (!result.success || !result.imageUrl) throw new Error('Gagal membuat kartu nama.');
                    const imageUrl = result.imageUrl;
                    card.className = `card overflow-hidden relative bg-white ${getAspectRatioClass(ratio)}`;
                    card.innerHTML = `
                        <img src="${imageUrl}" class="w-full h-full object-contain shadow-sm">
                        <div class="absolute bottom-2 right-2 flex gap-2">
                            <button data-img-src="${imageUrl}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                            <a href="${imageUrl}" download="kartu_nama_${Date.now()}_${index + 1}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        </div>
                    `;
                } catch (error) {
                    card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words w-full">${error.message}</div>`;
                }
            };
            const promises = [];
            for (let i = 0; i < count; i++) promises.push(generateCard(i));
            await Promise.allSettled(promises);
            doneSound?.play?.();
        } catch (error) {
            errorSound?.play?.();
            alert('Terjadi kesalahan: ' + error.message);
        } finally {
            bcGenerateBtn.disabled = false;
            bcGenerateBtn.innerHTML = originalBtnHTML;
            bcGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
            lucide?.createIcons?.();
        }
    });

    return true;
};
