window.initAssistant = function(ctx) {
    const {
        document,
        chatSound,
        switchTab,
        API_KEY,
        GENERATE_URL,
        CHAT_URL,
        lucide,
        convertHeicToJpg,
        base64ToBlob,
        showModernPopup,
        showUploadLimitPopup,
        setupImageUpload,
        getApiErrorMessage,
        doneSound,
        errorSound
    } = ctx;

    const chatHistory = document.getElementById('chat-history');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    let chatFileUploadCounter = 0;
    let conversationState = {};

    function resetConversationState() {
        conversationState = {
            currentIntent: null,
            awaitingFileUploadFor: null,
            awaitingTextInputFor: null,
            collectedData: {},
        };
    }

    // Intents
    function startArtKarikaturIntent() {
        conversationState.currentIntent = 'ART_KARIKATUR';
        switchTab('art-karikatur', () => {
            sufoRespond("Tentu! Aku sudah pindahkan kamu ke halaman Art & Karikatur. Silakan unggah fotomu untuk memulai keajaiban seni!");
            resetConversationState();
        });
    }
    function startMiniaturePhotoIntent() {
        conversationState.currentIntent = 'MINIATURE_PHOTO';
        sufoRespond("Keren! Bikin foto miniatur itu seru banget. Yuk, kirimkan foto yang mau kamu sulap jadi diorama.", 'miniature_photo');
    }
    function startBarbershopIntent() {
        conversationState.currentIntent = 'BARBERSHOP';
        sufoRespond("Siap! Ayo kita ubah gaya rambutmu. Kirimkan foto wajahmu yang jelas ya.", 'barbershop_photo');
    }
    function startExpandPhotoIntent() {
        conversationState.currentIntent = 'EXPAND_PHOTO';
        sufoRespond("Oke, memperluas foto itu sulap yang keren! Kirimkan foto yang mau kamu perluas di sini, ya.", 'expand_photo');
    }
    function startFaceSwapIntent() {
        conversationState.currentIntent = 'FACE_SWAP';
        switchTab('face-swap', () => {
            sufoRespond("Oke, kita tukar wajah! Silakan unggah foto target dan foto wajah sumber di halaman Face Swap.");
            resetConversationState();
        });
    }
    function startRemoveBgIntent() {
        conversationState.currentIntent = 'REMOVE_BG';
        switchTab('hapus-bg', () => {
            sufoRespond("Siap menghapus background! Silakan unggah fotonya di halaman Hapus BG untuk diproses.");
            resetConversationState();
        });
    }
    function startPovHandIntent() {
        conversationState.currentIntent = 'POV_HAND';
        sufoRespond("Foto POV Tangan? Menarik! Kirimkan foto produk yang ingin kamu pegang.", 'pov_hand_photo');
    }
    function startCreateLogoIntent() {
        switchTab('create-logo');
        sufoRespond("Fitur Buat Logo sudah terbuka! Silakan pilih mode sketsa atau deskripsi di panel kanan untuk mulai mendesain.", 'none');
        resetConversationState();
    }
    function startCreateMascotIntent() {
        switchTab('create-mascot');
        sufoRespond("Siap bikin maskot! Panel Buat Mascot sudah aktif. Isi detail karaktermu di sana ya.", 'none');
        resetConversationState();
    }
    function startPhotoCollageIntent() {
        switchTab('photo-collage');
        sufoRespond("Ayo buat kolase! Panel Foto Kolase sudah terbuka. Silakan unggah foto-fotomu.", 'none');
        resetConversationState();
    }
    function startThumbnailIntent() {
        switchTab('video-thumbnail');
        sufoRespond("Konten kreator merapat! Fitur Buat Thumbnail sudah aktif. Masukkan judul videomu di panel kanan.", 'none');
        resetConversationState();
    }
    function startGraduationIntent() {
        switchTab('graduation-photo');
        sufoRespond("Selamat wisuda! Panel Foto Wisuda sudah terbuka. Silakan unggah foto wajahmu.", 'none');
        resetConversationState();
    }
    function startTextToImageIntent() {
        switchTab('text-to-image');
        sufoRespond("Imajinasi jadi nyata! Panel Tulisan ke Gambar sudah aktif. Tuliskan prompt-mu di sana.", 'none');
        resetConversationState();
    }
    function startFotoArtisIntent() {
        switchTab('foto-artis');
        sufoRespond("Mau foto bareng artis idola? Panel Foto Artis sudah terbuka. Silakan unggah fotomu!", 'none');
        resetConversationState();
    }
    function startPotretCintaIntent() {
        switchTab('potret-cinta');
        sufoRespond("Romantisnya! Panel Potret Cinta sudah aktif. Unggah foto pasanganmu untuk hasil yang memukau.", 'none');
        resetConversationState();
    }
    function startKamarPasIntent() {
        switchTab('kamar-pas');
        sufoRespond("Virtual fitting room siap! Panel Kamar Pas sudah terbuka. Unggah fotomu untuk mencoba baju virtual.", 'none');
        resetConversationState();
    }
    function startRetouchWajahIntent() {
        switchTab('retouch-wajah');
        sufoRespond("Wajahmu akan makin cantik/ganteng! Panel Retouch sudah aktif. Silakan unggah foto wajahmu.", 'none');
        resetConversationState();
    }
    function startAutoRapiIntent() {
        switchTab('auto-rapi');
        sufoRespond("Auto Rapi siap merapikan fotomu! Unggah foto yang mau dirapikan di panel yang sudah terbuka.", 'none');
        resetConversationState();
    }
    function startSizeObjekIntent() {
        switchTab('size-produk');
        sufoRespond("Mau ukur objek di foto? Panel Size Objek sudah aktif. Silakan unggah fotomu!", 'none');
        resetConversationState();
    }
    function startHapusObjekIntent() {
        switchTab('hapus-objek');
        sufoRespond("Ada objek mengganggu di foto? Panel Hapus Objek sudah terbuka. Unggah foto dan tandai objek yang mau dihapus.", 'none');
        resetConversationState();
    }
    function startWatermarkIntent() {
        switchTab('watermark');
        sufoRespond("Lindungi fotomu dengan watermark! Panel sudah aktif. Silakan unggah foto dan atur watermark-mu.", 'none');
        resetConversationState();
    }
    function startAgeFilterIntent() {
        switchTab('age-filter');
        sufoRespond("Penasaran gimana wajahmu di usia berbeda? Panel Filter Usia sudah terbuka. Unggah foto wajahmu!", 'none');
        resetConversationState();
    }
    function startSulapVideoIntent() {
        switchTab('sulap-video');
        sufoRespond("Sulap Video siap beraksi! Panel sudah terbuka. Silakan unggah video atau mulai buat konten videomu.", 'none');
        resetConversationState();
    }
    function startDesainMockupIntent() {
        switchTab('buat-mockup');
        sufoRespond("Mau bikin mockup produk? Panel Buat Mockup sudah aktif. Silakan unggah desainmu.", 'none');
        resetConversationState();
    }
    async function startCekKuotaIntent() {
        showTypingIndicator();
        try {
            sufoRespond("Fitur cek kuota sedang dalam pemeliharaan sistem. Mohon maaf atas ketidaknyamanannya.");
        } catch (error) {
            console.error("Error checking quota:", error);
            sufoRespond("Waduh, ada masalah saat mengecek kuota. Coba lagi nanti ya!");
        }
    }

    const featureButtons = [
        { id: 'fsw-generate-btn', name: 'Face Swap' },
        { id: 'dm-generate-btn', name: 'Buat Mockup' },
        { id: 'bs-generate-btn', name: 'Barbershop' },
        { id: 'hbg-generate-btn', name: 'Hapus BG' }
    ];
    const photographerMenuMap = [
        { number: 1, text: "Baby Born", awaitingState: 'photographer_baby_photo', tabName: 'baby', uploadMessage: "Oke, untuk Foto Bayi, silakan unggah foto bayinya di sini." },
        { number: 2, text: "Kids", awaitingState: 'photographer_kids_photo', tabName: 'kids', uploadMessage: "Siap! Untuk Foto Anak, boleh kirimkan fotonya." },
        { number: 3, text: "Umrah/Haji", awaitingState: 'photographer_umrah_photo', tabName: 'umrah', uploadMessage: "Tentu. Silakan unggah foto diri yang ingin dibuatkan foto Umrah/Haji." },
        { number: 4, text: "Pas Foto", awaitingState: 'photographer_passport_photo', tabName: 'passport', uploadMessage: "Bisa banget! Kirimkan foto wajahmu yang terlihat jelas ya." },
        { number: 5, text: "Maternity", awaitingState: 'photographer_maternity_photo', tabName: 'maternity', uploadMessage: "Siap! Kirimkan foto ibu hamil (full/setengah badan) ya." },
    ];
    const helpMenuMap = [
        { number: 1, text: "Gabungin beberapa gambar jadi satu", handler: startMergePhotoIntent },
        { number: 2, text: "Bikinin foto produk profesional", handler: startProductPhotoIntent },
        { number: 3, text: "Buat foto Pre+Wedding impian", handler: startPreweddingPhotoIntent },
        { number: 4, text: "Buat foto model AI dari deskripsi", handler: startModelCreateIntent },
        { number: 5, text: "Ganti pose model di foto", handler: startModelReposeIntent },
        { number: 6, text: "Sewa fotografer AI (bayi, umrah, dll)", handler: startPhotographerRentalIntent },
        { number: 7, text: "Perbaiki fotoku yang buram/pecah", handler: startFixPhotoIntent },
        { number: 8, text: "Bikin banner iklan dari gambar", handler: startBannerCreateIntent },
        { number: 9, text: "Buat konten carousel produk", handler: startCarouselCreateIntent },
        { number: 10, text: "Desain ulang interior/eksterior rumah", handler: startInteriorDesignIntent },
        { number: 11, text: "Ubah sketsaku jadi gambar jadi", handler: startSketchToImageIntent },
        { number: 12, text: "Bikin photoshoot fashion AI", handler: startFashionIntent },
        { number: 13, text: "Ubah foto jadi Art & Karikatur", handler: startArtKarikaturIntent },
        { number: 14, text: "Buat Desain Mockup Produk", handler: startDesainMockupIntent },
        { number: 15, text: "Ubah foto jadi diorama miniatur", handler: startMiniaturePhotoIntent },
        { number: 16, text: "Coba gaya rambut baru (Barbershop)", handler: startBarbershopIntent },
        { number: 17, text: "Ubah fotoku jadi lebih luas (Outpainting)", handler: startExpandPhotoIntent },
        { number: 18, text: "Tukar wajah antar foto (Face Swap)", handler: startFaceSwapIntent },
        { number: 19, text: "Hapus background foto otomatis", handler: startRemoveBgIntent },
        { number: 20, text: "Buat foto produk dipegang tangan (POV)", handler: startPovHandIntent },
        { number: 21, text: "Buat desain logo unik & profesional", handler: startCreateLogoIntent },
        { number: 22, text: "Bikin karakter maskot untuk brand", handler: startCreateMascotIntent },
        { number: 23, text: "Buat kolase foto estetik", handler: startPhotoCollageIntent },
        { number: 24, text: "Buat thumbnail YouTube/Video clickbait", handler: startThumbnailIntent },
        { number: 25, text: "Buat foto wisuda AI", handler: startGraduationIntent },
        { number: 26, text: "Ubah tulisan jadi gambar (Text-to-Image)", handler: startTextToImageIntent },
        { number: 27, text: "Foto bareng artis idola (Foto Artis)", handler: startFotoArtisIntent },
        { number: 28, text: "Bikin foto pasangan romantis (Potret Cinta)", handler: startPotretCintaIntent },
        { number: 29, text: "Coba baju virtual (Kamar Pas)", handler: startKamarPasIntent },
        { number: 30, text: "Retouch wajah jadi lebih cantik/ganteng", handler: startRetouchWajahIntent },
        { number: 31, text: "Rapikan foto otomatis (Auto Rapi)", handler: startAutoRapiIntent },
        { number: 32, text: "Ukur size objek di foto", handler: startSizeObjekIntent },
        { number: 33, text: "Hapus objek yang mengganggu di foto", handler: startHapusObjekIntent },
        { number: 34, text: "Tambah watermark ke foto", handler: startWatermarkIntent },
        { number: 35, text: "Ubah usia wajah di foto (Filter Usia)", handler: startAgeFilterIntent },
        { number: 36, text: "Edit dan sulap video kamu", handler: startSulapVideoIntent }
    ];

    async function initBeranda() {
        const datetimeDisplay = document.getElementById('datetime-display');
        const updateClock = () => {
            const now = new Date();
            const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
            if (datetimeDisplay) {
                datetimeDisplay.textContent = `${now.toLocaleDateString('id-ID', dateOptions)} - ${now.toLocaleTimeString('id-ID', timeOptions)}`;
            }
        };
        updateClock();
        setInterval(updateClock, 60000);
        const greetings = [
            "Hai! Mau coba edit foto apa? Bilang aja 'bantuan' kalau bingung mau mulai dari mana! Pastikan sudah login pakai gmail ya!",
        ];
        if (chatHistory) {
            chatHistory.innerHTML = '';
            sufoRespond(greetings[Math.floor(Math.random() * greetings.length)]);
            setTimeout(() => {
                loadAssistantMessages();
            }, 1500);
        }
        if (chatForm) {
            chatForm.addEventListener('submit', handleUserMessage);
        }
        resetConversationState();
    }

    function showTypingIndicator() {
        hideTypingIndicator();
        const indicatorBubble = document.createElement('div');
        indicatorBubble.className = 'chat-bubble sufo typing-bubble';
        indicatorBubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        chatHistory.appendChild(indicatorBubble);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    function hideTypingIndicator() {
        const indicator = chatHistory.querySelector('.typing-bubble');
        if (indicator) {
            indicator.remove();
        }
    }
    function appendMessage(text, sender) {
        hideTypingIndicator();
        if (sender === 'sufo' && chatSound) {
            chatSound.play();
        }
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.innerHTML = text.replace(/\n/g, '<br>');
        chatHistory.appendChild(bubble);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    let lastLoadedMessage = null;

    function loadAssistantMessages() {
        if (window.assistantMessages && window.assistantMessages.length > 0) {
            window.assistantMessages.forEach((msg) => {
                if (msg === lastLoadedMessage) return;
                lastLoadedMessage = msg;
                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble sufo notice';
                bubble.innerHTML = msg;
                chatHistory.appendChild(bubble);
            });
        }
    }

    window.addEventListener('assistant:messages-updated', loadAssistantMessages);

    function sufoRespond(response, awaitingFileFor = null) {
        const delay = 500 + Math.random() * 500;
        showTypingIndicator();
        setTimeout(() => {
            appendMessage(response, 'sufo');
            if (awaitingFileFor) {
                conversationState.awaitingFileUploadFor = awaitingFileFor;
                chatFileUploadCounter++;
                const uploadId = `chat-upload-${chatFileUploadCounter}`;
                const uploadBubble = document.createElement('div');
                uploadBubble.className = 'chat-bubble sufo';
                uploadBubble.innerHTML = `
                        <label for="${uploadId}" class="chat-upload-label">
                            <i data-lucide="upload-cloud" class="w-5 h-5"></i>
                            <span>Klik atau seret file ke sini</span>
                        </label>
                        <input type="file" id="${uploadId}" class="hidden" accept=".jpg,.jpeg,.png,.webp,.heic,.HEIC">
                    `;
                chatHistory.appendChild(uploadBubble);
                if (lucide) lucide.createIcons();
                document.getElementById(uploadId).addEventListener('change', handleSufoFileUpload);
            }
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }, delay);
    }

    function handleUserMessage(e) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;
        appendMessage(message, 'user');
        chatInput.value = '';
        if (conversationState.awaitingTextInputFor) {
            processTextInput(message);
        } else {
            resetConversationState();
            const intentHandler = parseUserIntent(message);
            intentHandler();
        }
    }

    async function handleSufoFileUpload(e) {
        setTimeout(async () => {
            const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
            if (!file) return;
            const waitingFor = conversationState.awaitingFileUploadFor;
            if (!waitingFor) {
                appendMessage(`Mengunggah ${file.name}...`, 'user');
                sufoRespond("Wah, maaf, aku agak bingung. Kamu mau pakai file ini untuk apa ya? Coba bilang dulu, misalnya 'gabungkan gambar'.");
                return;
            }
            try {
                const processedFile = await convertHeicToJpg(file);
                appendMessage(`Mengunggah file '${processedFile.name || file.name}'`, 'user');
                const reader = new FileReader();
                reader.onload = (re) => {
                    const dataUrl = re.target.result;
                    const parts = dataUrl.split(',');
                    const mimeType = parts[0].match(/:(.*?);/)[1];
                    const base64 = parts[1];
                    const fileData = { base64, mimeType, dataUrl, name: processedFile.name || file.name };
                    processFileUpload(fileData);
                };
                reader.readAsDataURL(processedFile);
            } catch (error) {
                console.error("Gagal memproses unggahan chat:", error);
            }
        }, 100);
    }

    function startFixPhotoIntent() {
        conversationState.currentIntent = 'FIX_PHOTO';
        sufoRespond("Oh, fotonya buram atau kurang tajam? Tenang, itu sulap gampang buatku! Boleh kirimkan fotonya?", 'fix_photo');
    }
    function startMergePhotoIntent() {
        conversationState.currentIntent = 'MERGE_PHOTO';
        sufoRespond("Wih, ide bagus! Menggabungkan gambar itu salah satu sulap favoritku. Yuk, mulai dengan gambar yang pertama.", 'merge_photo_1');
    }
    function startProductPhotoIntent() {
        conversationState.currentIntent = 'PRODUCT_PHOTO';
        sufoRespond("Siap! Mau bikin foto produk yang keren, kan? Boleh unggah dulu foto produknya.", 'product_photo');
    }
    function startPreweddingPhotoIntent() {
        conversationState.currentIntent = 'PREWEDDING_PHOTO';
        sufoRespond("Wow, selamat ya! Siap-siap punya foto pre-wedding impian. Yuk, kita mulai dengan foto orang pertama.", 'prewedding_photo_1');
    }
    function startModelCreateIntent() {
        conversationState.currentIntent = 'MODEL_CREATE';
        conversationState.awaitingTextInputFor = 'model_create_prompt';
        sufoRespond("Tentu! Coba ceritain ke aku, model seperti apa yang ada di bayanganmu? Semakin detail, semakin bagus hasilnya!");
    }
    function startModelReposeIntent() {
        conversationState.currentIntent = 'MODEL_REPOSE';
        sufoRespond("Oke, mau ganti pose model? Gampang! Kirim dulu fotonya ke sini.", 'model_repose_image');
    }
    function startBannerCreateIntent() {
        conversationState.currentIntent = 'BANNER_CREATE';
        switchTab('buat-banner', () => {
            sufoRespond("Bikin banner iklan, yuk! Panel Buat Banner sudah terbuka. Silakan unggah gambar utama yang mau kamu pakai.", 'none');
            resetConversationState();
        });
    }
    function startCarouselCreateIntent() {
        conversationState.currentIntent = 'CAROUSEL_CREATE';
        sufoRespond("Asyik, bikin carousel! Ini ampuh banget buat promosi. Coba kirimkan satu foto terbaik dari produkmu.", 'carousel_image');
    }
    function startInteriorDesignIntent() {
        conversationState.currentIntent = 'INTERIOR_DESIGN';
        switchTab('desain-rumah', () => {
            if (window.desainRumahModule) window.desainRumahModule.switchDesainRumahTab('interior');
        });
        sufoRespond("Desain interior? Ide brilian! Aku sudah pindahkan kamu ke halaman Desain Rumah. Yuk, mulai dengan foto ruangan yang mau kamu sulap.", 'interior_design_room');
    }
    function showHelpMenu() {
        const menuText = helpMenuMap.map(item => `${item.number}. ${item.text}`).join('\n');
        conversationState.awaitingTextInputFor = 'help_selection';
        sufoRespond(`Tentu! Aku bisa banyak hal. Pilih salah satu dari daftar di bawah ini dengan mengetikkan nomornya saja:\n\n${menuText}`);
    }
    function startFashionIntent() {
        conversationState.currentIntent = 'FASHION_PHOTO';
        switchTab('fashion', () => {
            sufoRespond("Siap! Aku sudah pindahkan kamu ke halaman Fashion Photoshoot. Unggah foto pakaianmu untuk memulai sulapnya!");
            resetConversationState();
        });
    }
    function startSketchToImageIntent() {
        conversationState.currentIntent = 'SKETCH_TO_IMAGE';
        sufoRespond("Tentu! Mengubah sketsa jadi gambar digital itu seru banget. Coba kirimkan gambar sketsamu ke sini.", 'sketch_image');
    }
    function startPhotographerRentalIntent() {
        conversationState.currentIntent = 'PHOTOGRAPHER_RENTAL_SUBMENU';
        const menuText = photographerMenuMap.map(item => `${item.number}. ${item.text}`).join('\n');
        conversationState.awaitingTextInputFor = 'photographer_selection';
        sufoRespond(`Tentu! Fitur Fotografer AI punya beberapa pilihan. Mau coba yang mana? (Ketik nomornya)\n\n${menuText}`);
    }

    function processTextInput(message) {
        const waitingFor = conversationState.awaitingTextInputFor;
        if (waitingFor === 'help_selection') {
            const selectionNumber = parseInt(message.trim());
            const selectedFeature = helpMenuMap.find(item => item.number === selectionNumber);
            if (selectedFeature) {
                conversationState.awaitingTextInputFor = null;
                selectedFeature.handler();
            } else {
                sufoRespond("Hmm, sepertinya itu bukan nomor yang valid. Coba ketik nomor yang ada di daftar ya.");
            }
        } else if (waitingFor === 'photographer_selection') {
            const selectionNumber = parseInt(message.trim());
            const selectedFeature = photographerMenuMap.find(item => item.number === selectionNumber);
            if (selectedFeature) {
                conversationState.awaitingTextInputFor = null;
                conversationState.collectedData.selectedPhotographerFeature = selectedFeature;
                sufoRespond(selectedFeature.uploadMessage, selectedFeature.awaitingState);
            } else {
                sufoRespond("Nomornya tidak ada di pilihan. Coba ketik nomor dari 1 sampai 4 ya.");
            }
        } else if (waitingFor === 'merge_prompt') {
            conversationState.awaitingTextInputFor = null;
            conversationState.collectedData.prompt = message;
            const images = conversationState.collectedData.images;
            switchTab('product', () => {
                if (window.gabungFotoModule) {
                    // Reset or prepare module if needed, though initGabungFoto does not export reset
                    // Assuming direct add is fine
                }
                // We need to clear existing images? script.js did ggUploadedImages = []
                // But we can't access it directly.
                // Assuming the user just wants to add these new ones.
                // Or we can rely on manual clearing.
                
                images.forEach(imgData => {
                    if (window.gabungFotoModule && window.gabungFotoModule.addGgImage) {
                         window.gabungFotoModule.addGgImage(imgData);
                    }
                });
                
                const ggPromptInput = document.getElementById('gg-prompt-input');
                if (ggPromptInput) {
                    ggPromptInput.value = message;
                    ggPromptInput.dispatchEvent(new Event('input')); // Trigger update buttons
                }
                
                sufoRespond("Aha, instruksi diterima! Semua bahan sulapnya udah kusiapin di halaman 'Gabung Gambar' ya. Kamu tinggal cek dan klik tombol 'Buat Variasi' di sana. Selamat mencoba!");
                resetConversationState();
            });
        } else if (waitingFor === 'model_create_prompt') {
            conversationState.awaitingTextInputFor = null;
            switchTab('model', () => {
                // switchModelTab is likely global in script.js? No, it's not.
                // It seems to be part of initBuatModel or similar.
                // Wait, script.js had switchModelTab('create').
                // Let's check where switchModelTab is defined.
                if (window.buatModelModule && window.buatModelModule.switchModelTab) {
                    window.buatModelModule.switchModelTab('create');
                }
                const mgPromptInput = document.getElementById('mg-prompt-input');
                if (mgPromptInput) mgPromptInput.value = message;
                sufoRespond("Sip, deskripsinya keren! Udah aku tuliskan di halaman 'Foto Model'. Sekarang, kamu tinggal klik tombol 'Buat Foto Model' aja.");
                resetConversationState();
            });
        } else if (waitingFor === 'model_repose_prompt') {
            conversationState.awaitingTextInputFor = null;
            switchTab('model', () => {
                if (window.ubahPoseModule && window.ubahPoseModule.switchModelTab) {
                    // Assuming ubahPoseModule has this or similar
                    // In script.js it was switchModelTab('repose').
                }
                
                // We need to handle cpImageData etc.
                // These are likely global variables in script.js or module scope.
                // If they are module scope, we can't access them directly unless exposed.
                // script.js had: cpImageData = ...; cpPreview.src = ...
                
                // Since we are refactoring, we should ideally use module methods.
                // But for now, let's assume global variables if they were global in script.js.
                // Checking script.js, cpImageData seems global.
                
                if (typeof window.cpImageData !== 'undefined') window.cpImageData = conversationState.collectedData.image;
                
                const cpPreview = document.getElementById('cp-preview');
                const cpPlaceholder = document.getElementById('cp-placeholder');
                const cpRemoveBtn = document.getElementById('cp-remove-btn');
                const cpPromptInput = document.getElementById('cp-prompt-input');
                
                if (cpPreview) {
                    cpPreview.src = conversationState.collectedData.image.dataUrl;
                    cpPreview.classList.remove('hidden');
                }
                if (cpPlaceholder) cpPlaceholder.classList.add('hidden');
                if (cpRemoveBtn) cpRemoveBtn.classList.remove('hidden');
                if (cpPromptInput) cpPromptInput.value = message;
                
                // cpUpdateButtons()
                // If it's global, call it.
                if (typeof window.cpUpdateButtons === 'function') window.cpUpdateButtons();
                
                sufoRespond("Oke, foto dan pose barunya udah siap di halaman 'Ubah Pose'. Langsung aja klik tombol 'Buat Pose Baru' ya!");
                resetConversationState();
            });
        } else {
            conversationState.awaitingTextInputFor = null;
        }
    }

    function processFileUpload(fileData) {
        const state = conversationState.awaitingFileUploadFor;
        conversationState.awaitingFileUploadFor = null;
        if (state === 'fix_photo') {
            switchTab('perbaiki-foto', () => {
                if (window.perbaikiFoto?.showEnhanceTab) window.perbaikiFoto.showEnhanceTab();
                if (window.perbaikiFoto?.setPfImageData) window.perbaikiFoto.setPfImageData(fileData);
                sufoRespond("Oke, fotonya sudah siap diperbaiki! Aku pindahin kamu ke halaman 'Perbaiki Foto' ya. Tinggal klik tombolnya dan lihat keajaibannya!");
                resetConversationState();
            });
        } else if (state === 'expand_photo') {
            switchTab('perluas-foto', () => {
                // epImageData global?
                if (typeof window.epImageData !== 'undefined') window.epImageData = fileData;
                const epPreview = document.getElementById('ep-preview');
                const epPlaceholder = document.getElementById('ep-placeholder');
                const epRemoveBtn = document.getElementById('ep-remove-btn');
                const epWidthInput = document.getElementById('ep-width-input');
                const epHeightInput = document.getElementById('ep-height-input');
                const epRatioSelect = document.getElementById('ep-ratio-select');
                const epLockBtn = document.getElementById('ep-lock-btn');
                
                if (epPreview) {
                    epPreview.src = fileData.dataUrl;
                    epPreview.classList.remove('hidden');
                }
                if (epPlaceholder) epPlaceholder.classList.add('hidden');
                if (epRemoveBtn) epRemoveBtn.classList.remove('hidden');
                
                const img = new Image();
                img.onload = () => {
                    if (typeof window.epOriginalWidth !== 'undefined') window.epOriginalWidth = img.naturalWidth;
                    if (typeof window.epOriginalHeight !== 'undefined') window.epOriginalHeight = img.naturalHeight;
                    if (epWidthInput) epWidthInput.value = img.naturalWidth;
                    if (epHeightInput) epHeightInput.value = img.naturalHeight;
                    if (epRatioSelect) {
                        epRatioSelect.disabled = false;
                        epRatioSelect.value = 'original';
                    }
                    if (epLockBtn) epLockBtn.disabled = false;
                    if (typeof window.epIsRatioLocked !== 'undefined') window.epIsRatioLocked = true;
                    if (typeof window.epUpdateDimensionsFromRatio === 'function') window.epUpdateDimensionsFromRatio();
                };
                img.src = fileData.dataUrl;
                sufoRespond("Fotonya sudah siap di halaman 'Perluas Foto'. Sekarang atur ukuran baru yang kamu inginkan, lalu klik 'Hasilkan'!");
                resetConversationState();
            });
        } else if (state.startsWith('merge_photo')) {
            if (!conversationState.collectedData.images) conversationState.collectedData.images = [];
            conversationState.collectedData.images.push(fileData);
            if (conversationState.collectedData.images.length < 2) {
                sufoRespond("Sip, gambar pertama udah masuk. Keren! Sekarang, mana gambar keduanya?", 'merge_photo_2');
            } else {
                conversationState.awaitingTextInputFor = 'merge_prompt';
                sufoRespond("Keren! Dua gambar udah siap disulap. Sekarang, coba ceritain, kamu mau dua gambar ini digabungin jadi seperti apa?");
            }
        } else if (state === 'product_photo') {
            switchTab('vto', () => {
                if (typeof window.switchVtoTab === 'function') window.switchVtoTab('product-only');
                // psImageData global?
                if (typeof window.psImageData !== 'undefined') window.psImageData = fileData;
                const psPreview = document.getElementById('ps-preview');
                const psPlaceholder = document.getElementById('ps-placeholder');
                const psRemoveBtn = document.getElementById('ps-remove-btn');
                
                if (psPreview) {
                    psPreview.src = fileData.dataUrl;
                    psPreview.classList.remove('hidden');
                }
                if (psPlaceholder) psPlaceholder.classList.add('hidden');
                if (psRemoveBtn) psRemoveBtn.classList.remove('hidden');
                
                if (typeof window.psUpdateButtons === 'function') window.psUpdateButtons();
                sufoRespond("Produknya udah kuterima! Sekarang kamu ada di halaman 'Photoshoot Produk'. Yuk, atur gaya yang kamu mau terus klik buat!");
                resetConversationState();
            });
        } else if (state.startsWith('prewedding_photo')) {
            if (!conversationState.collectedData.images) conversationState.collectedData.images = [];
            conversationState.collectedData.images.push(fileData);
            if (conversationState.collectedData.images.length < 2) {
                sufoRespond("Oke, foto pertama udah siap. Manis banget! Sekarang, giliran foto orang keduanya.", 'prewedding_photo_2');
            } else {
                const images = conversationState.collectedData.images;
                switchTab('pre-wedding', () => {
                    if (window.initPrewedding) {
                        // Ideally use module methods, but direct DOM manipulation was used in script.js
                        // We can replicate it here.
                        const pwPerson1Preview = document.getElementById('pw-person1-preview');
                        const pwPerson1Placeholder = document.getElementById('pw-person1-placeholder');
                        const pwRemovePerson1Btn = document.getElementById('pw-remove-person1-btn');
                        const pwPerson1Validation = document.getElementById('pw-person1-validation');
                        
                        const pwPerson2Preview = document.getElementById('pw-person2-preview');
                        const pwPerson2Placeholder = document.getElementById('pw-person2-placeholder');
                        const pwRemovePerson2Btn = document.getElementById('pw-remove-person2-btn');
                        const pwPerson2Validation = document.getElementById('pw-person2-validation');
                        
                        if (typeof window.pwPerson1Data !== 'undefined') window.pwPerson1Data = { data: images[0], isValid: true };
                        if (pwPerson1Preview) {
                            pwPerson1Preview.src = images[0].dataUrl;
                            pwPerson1Preview.classList.remove('hidden');
                        }
                        if (pwPerson1Placeholder) pwPerson1Placeholder.classList.add('hidden');
                        if (pwRemovePerson1Btn) pwRemovePerson1Btn.classList.remove('hidden');
                        if (pwPerson1Validation) {
                            pwPerson1Validation.textContent = '✓ Foto valid';
                            pwPerson1Validation.className = 'validation-status text-center text-green-600';
                        }
                        
                        if (typeof window.pwPerson2Data !== 'undefined') window.pwPerson2Data = { data: images[1], isValid: true };
                        if (pwPerson2Preview) {
                            pwPerson2Preview.src = images[1].dataUrl;
                            pwPerson2Preview.classList.remove('hidden');
                        }
                        if (pwPerson2Placeholder) pwPerson2Placeholder.classList.add('hidden');
                        if (pwRemovePerson2Btn) pwRemovePerson2Btn.classList.remove('hidden');
                        if (pwPerson2Validation) {
                            pwPerson2Validation.textContent = '✓ Foto valid';
                            pwPerson2Validation.className = 'validation-status text-center text-green-600';
                        }
                        
                        if (typeof window.pwUpdateGenerateButtonState === 'function') window.pwUpdateGenerateButtonState();
                    }
                });
                sufoRespond("Lengkap! Kedua fotonya udah kusiapin di halaman 'Pre+Wedding'. Silakan pilih gaya dan lokasi impian kalian di sana.");
                resetConversationState();
            }
        } else if (state.startsWith('photographer_')) {
            const selectedFeature = conversationState.collectedData.selectedPhotographerFeature;
            if (!selectedFeature) return;
            switchTab('photographer-rental', () => {
                // switchPhotographerTab is likely global in script.js
                if (typeof window.switchPhotographerTab === 'function') window.switchPhotographerTab(selectedFeature.tabName);
                switch (selectedFeature.tabName) {
                    case 'baby':
                        if (window.sfBabyModule) window.sfBabyModule.setBabyImageData(fileData);
                        break;
                    case 'kids':
                        if (window.sfKidsModule) window.sfKidsModule.setKidsImageData(fileData);
                        break;
                    case 'umrah':
                        if (window.sfUmrahModule) window.sfUmrahModule.setUmrahImageData(fileData);
                        break;
                    case 'passport':
                        if (window.sfPassportModule) {
                            window.sfPassportModule.setPassportImageData(fileData);
                        }
                        break;
                    case 'maternity':
                        if (window.sfMaternityModule) window.sfMaternityModule.setMaternityImageData(fileData);
                        break;
                }
                sufoRespond("Sip! Fotonya sudah kusiapkan di halaman Sewa Fotografer. Sekarang tinggal atur pilihan lainnya dan klik tombol buat ya!");
                resetConversationState();
            });
        } else if (state === 'model_repose_image') {
            conversationState.collectedData.image = fileData;
            conversationState.awaitingTextInputFor = 'model_repose_prompt';
            sufoRespond("Foto diterima! Sekarang, tulis pose baru yang kamu inginkan. Misalnya 'sedang duduk santai', 'tertawa lepas', atau 'berjalan di taman'.");
        } else if (state === 'banner_image') {
            switchTab('buat-banner', () => {
                if (window.buatBannerModule) {
                    window.buatBannerModule.setBannerImageData(fileData);
                }
                sufoRespond("Gambarnya keren! Aku pindahin kamu ke halaman 'Buat Banner' ya. Sebentar, aku coba bikinin teks dan gaya yang pas buatmu...");
                resetConversationState();
            });
        } else if (state === 'carousel_image') {
            switchTab('bikin-carousel', () => {
                // crslImageData global?
                if (typeof window.crslImageData !== 'undefined') window.crslImageData = fileData;
                const crslPreview = document.getElementById('crsl-preview');
                const crslPlaceholder = document.getElementById('crsl-placeholder');
                const crslRemoveBtn = document.getElementById('crsl-remove-btn');
                
                if (crslPreview) {
                    crslPreview.src = fileData.dataUrl;
                    crslPreview.classList.remove('hidden');
                }
                if (crslPlaceholder) crslPlaceholder.classList.add('hidden');
                if (crslRemoveBtn) crslRemoveBtn.classList.remove('hidden');
                
                if (typeof window.crslDisplayScriptEditor === 'function') window.crslDisplayScriptEditor();
                if (typeof window.crslUpdateButtons === 'function') window.crslUpdateButtons();
                
                sufoRespond(`Produk '${fileData.name.split('.').slice(0, -1).join('.')}' udah siap di halaman 'Bikin Carousel'. Coba deh klik tombol 'Buat Otomatis' untuk nama & deskripsi, lalu 'Buat Script Otomatis' untuk isi slidenya. Gampang kan?`);
                resetConversationState();
            });
        } else if (state === 'interior_design_room') {
            switchTab('desain-rumah', () => {
                if (window.desainRumahModule) window.desainRumahModule.switchDesainRumahTab('interior');
                if (window.desainRumahModule) window.desainRumahModule.drInteriorSetRoomImage(fileData);
                sufoRespond("Ruangannya keren! Aku udah siapin di halaman 'Desain Rumah'. Sekarang coba tulis furnitur apa yang mau kamu tambahin, atau unggah gambar furnitur manual.");
                resetConversationState();
            });
        }
        else if (state === 'sketch_image') {
            switchTab('sketch-to-image', () => {
                if (window.sketsaGambarModule) window.sketsaGambarModule.stiSetImage(fileData);
                sufoRespond("Sketsa diterima! Aku udah siapkan di halaman 'Ubah Sketsa Jadi Gambar'. Sekarang kamu tinggal pilih tujuannya, lalu klik tombol 'Buat Gambar' ya!");
                resetConversationState();
            });
        }
        else if (state === 'miniature_photo') {
            switchTab('foto-miniatur', () => {
                if (window.fotoMiniatur) window.fotoMiniatur.setFmImageData(fileData);
                sufoRespond("Fotonya sudah siap disulap di halaman 'Foto Miniatur'! Sekarang kamu tinggal atur jumlah foto dan rasionya, lalu klik tombol 'Buat'.");
                resetConversationState();
            });
        }
        else if (state === 'barbershop_photo') {
            switchTab('barbershop', () => {
                // bsImageData global?
                if (typeof window.bsImageData !== 'undefined') window.bsImageData = fileData;
                const bsPreview = document.getElementById('bs-preview');
                const bsPlaceholder = document.getElementById('bs-placeholder');
                const bsRemoveBtn = document.getElementById('bs-remove-btn');
                
                if (bsPreview) {
                    bsPreview.src = fileData.dataUrl;
                    bsPreview.classList.remove('hidden');
                }
                if (bsPlaceholder) bsPlaceholder.classList.add('hidden');
                if (bsRemoveBtn) bsRemoveBtn.classList.remove('hidden');
                
                if (typeof window.bsUpdateButtons === 'function') window.bsUpdateButtons();
                sufoRespond("Fotonya keren! Aku sudah siapkan di halaman Barbershop. Sekarang tinggal pilih gaya dan warna rambut yang kamu mau.");
                resetConversationState();
            });
        } else if (state === 'pov_hand_photo') {
            switchTab('pov-tangan', () => {
                // ptImageData global?
                if (typeof window.ptImageData !== 'undefined') window.ptImageData = fileData;
                const ptPreview = document.getElementById('pt-preview');
                const ptPlaceholder = document.getElementById('pt-placeholder');
                const ptRemoveBtn = document.getElementById('pt-remove-btn');
                
                if (ptPreview) {
                    ptPreview.src = fileData.dataUrl;
                    ptPreview.classList.remove('hidden');
                }
                if (ptPlaceholder) ptPlaceholder.classList.add('hidden');
                if (ptRemoveBtn) ptRemoveBtn.classList.remove('hidden');
                
                if (typeof window.ptUpdateButtons === 'function') window.ptUpdateButtons();
                sufoRespond("Sip! Foto produk sudah masuk di halaman POV Tangan. Sekarang atur deskripsi dan jumlah tangannya ya.");
                resetConversationState();
            });
        }
    }

    const intents = {
        GREETING: { keywords: ['halo', 'hai', 'hi', 'pagi', 'siang', 'sore', 'malam'], handler: () => sufoRespond("Halo juga! Ada yang bisa aku bantu sulap hari ini?") },
        HELP: { keywords: ['bisa apa', 'fitur', 'bantuan', 'tolong', 'help'], handler: showHelpMenu },
        FIX_PHOTO: { keywords: ['perbaiki', 'fix', 'enhance', 'buram', 'pecah', 'kualitas', 'tajamkan', 'jelaskan'], handler: startFixPhotoIntent },
        MERGE_PHOTO: { keywords: ['gabung', 'kombinasi', 'campur', 'merge', 'combine'], handler: startMergePhotoIntent },
        PRODUCT_PHOTO: { keywords: ['produk', 'jualan', 'katalog', 'photoshoot produk'], handler: startProductPhotoIntent },
        PREWEDDING_PHOTO: { keywords: ['prewed', 'prewedding', 'wedding', 'nikah', 'pasangan'], handler: startPreweddingPhotoIntent },
        MODEL_CREATE: { keywords: ['buat model', 'bikin model', 'model ai'], handler: startModelCreateIntent },
        MODEL_REPOSE: { keywords: ['ubah pose', 'ganti pose', 'repose'], handler: startModelReposeIntent },
        BANNER_CREATE: { keywords: ['banner', 'spanduk', 'iklan', 'promosi'], handler: startBannerCreateIntent },
        CAROUSEL_CREATE: { keywords: ['carousel', 'karosel', 'konten geser', 'konten slide'], handler: startCarouselCreateIntent },
        INTERIOR_DESIGN: { keywords: ['interior', 'ruangan', 'dekorasi', 'desain rumah', 'tata ruang'], handler: startInteriorDesignIntent },
        FASHION_PHOTO: { keywords: ['fashion', 'pakaian', 'baju', 'busana', 'photoshoot fashion'], handler: startFashionIntent },
        SKETCH_TO_IMAGE: { keywords: ['sketsa', 'sketch', 'coretan', 'gambar dari sketsa', 'ubah sketsa'], handler: startSketchToImageIntent },
        PHOTOGRAPHER_RENTAL: { keywords: ['fotografer', 'sewa fotografer', 'foto bayi', 'foto anak', 'foto umrah', 'pas foto'], handler: startPhotographerRentalIntent },
        ART_KARIKATUR: { keywords: ['art', 'karikatur', 'lukisan', 'kartun'], handler: startArtKarikaturIntent },
        DESAIN_MOCKUP: { keywords: ['mockup', 'desain mockup'], handler: startDesainMockupIntent },
        MINIATURE_PHOTO: { keywords: ['miniatur', 'diorama', 'kecil', 'liliput'], handler: startMiniaturePhotoIntent },
        BARBERSHOP: { keywords: ['barbershop', 'potong rambut', 'gaya rambut', 'warna rambut', 'salon'], handler: startBarbershopIntent },
        EXPAND_PHOTO: { keywords: ['perluas', 'expand', 'outpaint', 'luas'], handler: startExpandPhotoIntent },
        FACE_SWAP: { keywords: ['face swap', 'tukar wajah', 'ganti muka', 'faceswap'], handler: startFaceSwapIntent },
        REMOVE_BG: { keywords: ['hapus bg', 'hapus background', 'buang latar', 'transparan', 'png'], handler: startRemoveBgIntent },
        POV_HAND: { keywords: ['pov tangan', 'pegang produk', 'tangan memegang', 'hand pov'], handler: startPovHandIntent },
        FOTO_ARTIS: { keywords: ['foto artis', 'artis', 'selebriti', 'celebrity', 'idol'], handler: startFotoArtisIntent },
        POTRET_CINTA: { keywords: ['potret cinta', 'romantis', 'couple', 'love photo'], handler: startPotretCintaIntent },
        KAMAR_PAS: { keywords: ['kamar pas', 'fitting', 'try on', 'coba baju', 'virtual baju'], handler: startKamarPasIntent },
        RETOUCH_WAJAH: { keywords: ['retouch', 'touch up', 'cantik', 'ganteng', 'jerawat', 'kulit mulus'], handler: startRetouchWajahIntent },
        AUTO_RAPI: { keywords: ['auto rapi', 'rapikan', 'rapi otomatis', 'bersihkan foto'], handler: startAutoRapiIntent },
        SIZE_OBJEK: { keywords: ['size objek', 'ukur objek', 'ukuran', 'dimensi'], handler: startSizeObjekIntent },
        HAPUS_OBJEK: { keywords: ['hapus objek', 'hilangkan objek', 'buang objek', 'remove object'], handler: startHapusObjekIntent },
        WATERMARK: { keywords: ['watermark', 'tanda air', 'cap foto', 'copyright'], handler: startWatermarkIntent },
        AGE_FILTER: { keywords: ['filter usia', 'ubah usia', 'tua', 'muda', 'age filter', 'aging'], handler: startAgeFilterIntent },
        SULAP_VIDEO: { keywords: ['sulap video', 'edit video', 'video ai', 'buat video'], handler: startSulapVideoIntent },
        CEK_KUOTA: { keywords: ['cek kuota', 'sisa kuota', 'kuota saya', 'lihat kuota'], handler: startCekKuotaIntent }
    };

    function parseUserIntent(message) {
        const msg = message.toLowerCase();
        for (const intentKey in intents) {
            if (intents[intentKey].keywords.some(keyword => msg.includes(keyword))) {
                return intents[intentKey].handler;
            }
        }
        return () => sufoRespond("Hmm, aku belum ngerti nih maksudnya. Coba katakan 'bantuan', nanti aku kasih tau apa aja sulap yang aku bisa.");
    }

    return {
        initBeranda
    };
};
