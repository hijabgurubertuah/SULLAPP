window.initFotoArtis = function (ctx) {
    const {
        document,
        setupImageUpload,
        setupOptionButtons,
        getAspectRatioClass,
        getImageAspectRatio,
        lucide,
        getApiKey,
        GENERATE_URL,
        CHAT_URL,
        getApiErrorMessage,
        doneSound,
        errorSound,
        autoSelectClosestRatio
    } = ctx;

    const faImageInput = document.getElementById('fa-image-input');
    const faUploadBox = document.getElementById('fa-upload-box');
    const faPreview = document.getElementById('fa-preview');
    const faPlaceholder = document.getElementById('fa-placeholder');
    const faRemoveBtn = document.getElementById('fa-remove-btn');
    const faModePerson = document.getElementById('fa-mode-person');
    const faModeProduct = document.getElementById('fa-mode-product');
    const faUploadLabel = document.getElementById('fa-upload-label');
    const faArtistSelect = document.getElementById('fa-artist-select');
    const faCustomArtist = document.getElementById('fa-custom-artist');
    const faRatioOptions = document.getElementById('fa-ratio-options');
    const faGenerateBtn = document.getElementById('fa-generate-btn');
    const faResultsContainer = document.getElementById('fa-results-container');
    const faResultsGrid = document.getElementById('fa-results-grid');
    const faResultsPlaceholder = document.getElementById('fa-results-placeholder');
    const faCatIndo = document.getElementById('fa-cat-indo');
    const faCatIntl = document.getElementById('fa-cat-intl');
    const faResultCountSlider = document.getElementById('fa-result-count-slider');
    const faResultCountDisplay = document.getElementById('fa-result-count-display');

    if (!faImageInput || !faRatioOptions || !faGenerateBtn || !faResultsGrid) {
        return;
    }

    let faImageData = null;
    let faCurrentMode = 'person';
    let faArtistCategory = 'indo';
    const indoArtists = ["Raffi Ahmad", "Nagita Slavina", "Luna Maya", "Atta Halilintar", "Raisa", "Iko Uwais", "Deddy Corbuzier", "Cinta Laura", "Inul Daratista", "Rossa", "Dian Sastro", "Iqbaal Ramadhan", "Prilly Latuconsina", "Reza Rahadian", "Bunga Citra Lestari"];
    const intlArtists = ["Taylor Swift", "Cristiano Ronaldo", "Lionel Messi", "Selena Gomez", "Kylie Jenner", "Dwayne Johnson", "Ariana Grande", "Justin Bieber", "Beyoncé", "Kim Kardashian", "Tom Cruise", "Leonardo DiCaprio", "Robert Downey Jr", "Billie Eilish", "Zendaya"];

    function populateArtists(category) {
        faArtistSelect.innerHTML = '';
        const list = category === 'indo' ? indoArtists : intlArtists;
        list.forEach((artist) => {
            const option = document.createElement('option');
            option.value = artist;
            option.textContent = artist;
            faArtistSelect.appendChild(option);
        });
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = '--- Kustom (Tulis Sendiri) ---';
        faArtistSelect.appendChild(customOption);
        toggleCustomArtistInput();
    }

    function toggleCustomArtistInput() {
        if (faArtistSelect.value === 'custom') {
            faCustomArtist.classList.remove('hidden');
            faCustomArtist.focus();
        } else {
            faCustomArtist.classList.add('hidden');
        }
        faUpdateButtons();
    }

    function switchArtistCategory(cat) {
        faArtistCategory = cat;
        faCatIndo.className = cat === 'indo' ? "text-xs px-3 py-1.5 rounded-full bg-teal-600 text-white font-medium transition" : "text-xs px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 transition";
        faCatIntl.className = cat === 'intl' ? "text-xs px-3 py-1.5 rounded-full bg-teal-600 text-white font-medium transition" : "text-xs px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 transition";
        populateArtists(cat);
        faUpdateButtons();
    }

    function switchFaMode(mode) {
        faCurrentMode = mode;
        if (mode === 'person') {
            faModePerson.classList.add('selected', 'bg-teal-50', 'border-teal-500', 'text-teal-700');
            faModeProduct.classList.remove('selected', 'bg-teal-50', 'border-teal-500', 'text-teal-700');
            faUploadLabel.textContent = "Diri";
        } else {
            faModeProduct.classList.add('selected', 'bg-teal-50', 'border-teal-500', 'text-teal-700');
            faModePerson.classList.remove('selected', 'bg-teal-50', 'border-teal-500', 'text-teal-700');
            faUploadLabel.textContent = "Produk";
        }
    }

    function faUpdateButtons() {
        let artistOk = true;
        if (faArtistSelect.value === 'custom') artistOk = faCustomArtist.value.trim().length > 0;
        faGenerateBtn.disabled = !faImageData || !artistOk;
    }

    faArtistSelect.addEventListener('change', toggleCustomArtistInput);
    faCatIndo.addEventListener('click', () => switchArtistCategory('indo'));
    faCatIntl.addEventListener('click', () => switchArtistCategory('intl'));
    faModePerson.addEventListener('click', () => switchFaMode('person'));
    faModeProduct.addEventListener('click', () => switchFaMode('product'));
    faCustomArtist.addEventListener('input', faUpdateButtons);

    populateArtists('indo');

    setupImageUpload(faImageInput, faUploadBox, (data) => {
        faImageData = data;
        faPreview.src = data.dataUrl;
        faPlaceholder.classList.add('hidden');
        if (autoSelectClosestRatio) autoSelectClosestRatio(data.dataUrl, document.getElementById('fa-ratio-options'));
        faPreview.classList.remove('hidden');
        faRemoveBtn.classList.remove('hidden');
        faUpdateButtons();
    });

    faRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        faImageData = null;
        faImageInput.value = '';
        faPreview.src = '#';
        faPreview.classList.add('hidden');
        faPlaceholder.classList.remove('hidden');
        faRemoveBtn.classList.add('hidden');
        if (faResultsPlaceholder) faResultsPlaceholder.classList.remove('hidden');
        if (faResultsContainer) faResultsContainer.classList.add('hidden');
        faResultsGrid.innerHTML = '';
        faUpdateButtons();
    });

    setupOptionButtons(faRatioOptions);

    if (faResultCountSlider && faResultCountDisplay) {
        faResultCountSlider.addEventListener('input', () => {
            let val = parseInt(faResultCountSlider.value);
            const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;

            if (val > 1 && !isVip) {
                if (window.showUpgradeVipPopup) {
                    window.showUpgradeVipPopup();
                } else {
                    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
                    if (upgradeVipModal) upgradeVipModal.classList.add('active');
                }
                faResultCountSlider.value = 1;
                val = 1;
            }
            faResultCountDisplay.textContent = `${val} Gambar`;
        });
    }

    async function fetchArtistReferenceImage(artistName) {
        try {
            const searchUrl = `https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(artistName)}&limit=1&namespace=0&format=json&origin=*`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            let correctTitle = (searchData[1] && searchData[1].length > 0) ? searchData[1][0] : artistName;
            let lang = 'id';
            if (!searchData[1] || searchData[1].length === 0) {
                const enSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(artistName)}&limit=1&namespace=0&format=json&origin=*`;
                const enSearchRes = await fetch(enSearchUrl);
                const enSearchData = await enSearchRes.json();
                if (enSearchData[1] && enSearchData[1].length > 0) {
                    correctTitle = enSearchData[1][0];
                    lang = 'en';
                } else {
                    return null;
                }
            }
            const imgUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(correctTitle)}&prop=pageimages&format=json&pithumbsize=1000&origin=*`;
            const imgRes = await fetch(imgUrl);
            const imgData = await imgRes.json();
            const pages = imgData.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pageId !== "-1" && pages[pageId].thumbnail) {
                return pages[pageId].thumbnail.source;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async function urlToBase64(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({
                base64: reader.result.split(',')[1],
                mimeType: blob.type
            });
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function generateSingleArtistImage(id, aspectRatio) {
        const card = document.getElementById(`fa-card-${id}`);
        if (!card) return;
        try {
            let artistName = faArtistSelect.value === 'custom' ? faCustomArtist.value.trim() : faArtistSelect.value;
            card.innerHTML = `
            <div class="text-center p-2 flex flex-col items-center gap-2">
                <div class="spinner"></div>
                <p class="text-xs text-teal-600 font-semibold animate-pulse">Menghubungi ${artistName}...</p>
            </div>`;
            lucide.createIcons();

            let artistRefData = null;
            if (faArtistCategory === 'indo') {
                const artistImageUrl = await fetchArtistReferenceImage(artistName);
                if (artistImageUrl) {
                    try {
                        artistRefData = await urlToBase64(artistImageUrl);
                    } catch (e) {}
                }
            }

            card.innerHTML = `
            <div class="text-center p-2 flex flex-col items-center gap-2">
                <div class="spinner"></div>
                <p class="text-xs text-teal-600 font-semibold animate-pulse">Sedang berfoto bareng...</p>
            </div>`;
            lucide.createIcons();
            let prompt = "";
            let locationPrompt = "Best Location";
            if (faCurrentMode === 'person') {
                prompt = `Create a photorealistic composite image. 
            1. Use the person from the FIRST image and don't change facial expressions.
            2. ${artistRefData ? 'Use the exact face structure and likeness of the person in the SECOND image (Celebrity Reference).' : 'Generate the celebrity ' + artistName + '.'}
            3. Scene: The User and the Celebrity are standing side-by-side or posing together like close friends at ${locationPrompt}.
            4. Ensure consistent lighting and high resolution. The celebrity must look realistic.`;
            } else {
                prompt = `Create a high-quality advertisement photo.
            1. Use the product from the FIRST image.
            2. ${artistRefData ? 'Use the celebrity from the SECOND image as the model.' : 'Model: Celebrity ' + artistName + '.'}
            3. Scene: The celebrity is holding or posing with the product at ${locationPrompt}.
            4. CRITICAL: The product must look identical. The celebrity must look realistic.`;
            }
            prompt += ` This is variation ${id}.`;

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
            let endpoint = `${GENERATE_URL}`;

            if (artistRefData) {
                endpoint = `${GENERATE_URL}`;
                formData.append('images[]', base64ToBlob(faImageData.base64, faImageData.mimeType));
                formData.append('images[]', base64ToBlob(artistRefData.base64, artistRefData.mimeType));
            } else {
                endpoint = `${GENERATE_URL}`;
                formData.append('images[]', base64ToBlob(faImageData.base64, faImageData.mimeType));
            }

            formData.append('instruction', prompt);
            formData.append('aspectRatio', aspectRatio);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'X-API-Key': getApiKey()
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (result.success && result.imageUrl) {
                const imageUrl = result.imageUrl;
                card.innerHTML = `
                <div class="relative w-full h-full group">
                    <img src="${imageUrl}" class="w-full h-full object-cover" alt="Foto Bersama Artis">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${imageUrl}" download="foto_artis_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>`;
                card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio)}`;
                if (doneSound) doneSound.play();
            } else {
                throw new Error("Respon tidak valid.");
            }
        } catch (error) {
            if (errorSound) errorSound.play();
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }

    faGenerateBtn.addEventListener('click', async () => {
        if (faArtistSelect.value === 'custom') {
            const artistName = faCustomArtist.value.trim();
            if (artistName) {
                const preCheckBtnHTML = faGenerateBtn.innerHTML;
                faGenerateBtn.disabled = true;
                faGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa Artis...</span>`;
                try {
                    const apiUrl = `${CHAT_URL}`;
                    const payload = { contents: [{ parts: [{ text: `Is the celebrity "${artistName}" primarily considered an Indonesian celebrity or an International celebrity? Respond ONLY with "INDO" or "INTL".` }] }] };
                    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (response.ok) {
                        const result = await response.json();
                        const answer = result.candidates[0].content.parts[0].text.trim().toUpperCase();
                        if (answer.includes('INDO') && faArtistCategory !== 'indo') {
                            faCatIndo.click();
                            faArtistSelect.value = 'custom';
                            toggleCustomArtistInput();
                        } else if (answer.includes('INTL') && faArtistCategory !== 'intl') {
                            faCatIntl.click();
                            faArtistSelect.value = 'custom';
                            toggleCustomArtistInput();
                        }
                    }
                } catch (e) {}
                faGenerateBtn.innerHTML = preCheckBtnHTML;
            }
        }
        const originalBtnHTML = faGenerateBtn.innerHTML;
        faGenerateBtn.disabled = true;
        faGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Sedang Foto Bareng...</span>`;
        if (faResultsPlaceholder) faResultsPlaceholder.classList.add('hidden');
        let selectedRatioValue = faRatioOptions.querySelector('.selected').dataset.value;
        let apiAspectRatio = selectedRatioValue;
        if (selectedRatioValue === 'Auto') {
            try {
                const ratio = await getImageAspectRatio(faImageData);
                apiAspectRatio = `${ratio}:${1}`;
            } catch {
                apiAspectRatio = '1:1';
            }
        } else if (selectedRatioValue === '9:16') {
            apiAspectRatio = '9:16';
        } else if (selectedRatioValue === '16:9') {
            apiAspectRatio = '16:9';
        }
        if (faResultsContainer) faResultsContainer.classList.remove('hidden');
        faResultsGrid.innerHTML = '';
        const resultCount = faResultCountSlider ? parseInt(faResultCountSlider.value) : 1;
        faResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-5`;
        for (let i = 1; i <= resultCount; i++) {
            const card = document.createElement('div');
            card.id = `fa-card-${i}`;
            card.className = `relative bg-white border border-slate-200 shadow-none flex flex-col items-center justify-center rounded-2xl overflow-hidden`;
            if (selectedRatioValue !== 'Auto') {
                card.classList.add(getAspectRatioClass(selectedRatioValue));
            } else {
                const [w, h] = apiAspectRatio.split(':');
                card.style.aspectRatio = `${w} / ${h}`;
            }
            card.innerHTML = `
                <div class="flex flex-col items-center justify-center gap-3">
                    <div class="spinner"></div>
                    <p class="text-[10px] font-bold text-slate-400 animate-pulse uppercase tracking-widest">Sedang Memproses...</p>
                </div>`;
            faResultsGrid.appendChild(card);
        }
        lucide.createIcons();
        const generationPromises = Array.from({length: resultCount}, (_, i) => i + 1).map((i) => generateSingleArtistImage(i, apiAspectRatio));
        await Promise.allSettled(generationPromises);
        faGenerateBtn.disabled = false;
        faGenerateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    });

    lucide.createIcons();
};
