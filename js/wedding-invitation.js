/**
 * Wedding Invitation Generator
 * Professional wedding invitation design with AI
 */

(function() {
    let initialized = false;
    
    // Function to initialize wedding invitation
    function initWeddingInvitation() {
        const imageInput = document.getElementById('wi-image-input');
        const uploadBox = document.getElementById('wi-upload-box');
        const preview = document.getElementById('wi-preview');
        const removeBtn = document.getElementById('wi-remove-btn');
        const placeholder = document.getElementById('wi-placeholder');
        const groomNameInput = document.getElementById('wi-groom-name');
        const brideNameInput = document.getElementById('wi-bride-name');
        const parentsNamesInput = document.getElementById('wi-parents-names');
        const dateInput = document.getElementById('wi-date');
        const timeInput = document.getElementById('wi-time');
        const venueInput = document.getElementById('wi-venue');
        const addressInput = document.getElementById('wi-address');
        const quoteInput = document.getElementById('wi-quote');
        const themeDropdown = document.getElementById('wi-theme-dropdown');
        const customThemeContainer = document.getElementById('wi-custom-theme-container');
        const customThemeInput = document.getElementById('wi-custom-theme-input');
        const customColorContainer = document.getElementById('wi-custom-color-container');
        const customColorInput = document.getElementById('wi-custom-color-input');
        const countSlider = document.getElementById('wi-count-slider');
        const countValue = document.getElementById('wi-count-value');
        const generateBtn = document.getElementById('wi-generate-btn');
        const generateBtnText = document.getElementById('wi-generate-btn-text');
        const resultsPlaceholder = document.getElementById('wi-results-placeholder');
        const resultsContainer = document.getElementById('wi-results-container');
        const resultsGrid = document.getElementById('wi-results-grid');
        const exampleBtn = document.getElementById('wi-show-example-btn');
        const autoQuoteBtn = document.getElementById('wi-auto-quote-btn');

        // Check if elements exist
        if (!groomNameInput || !brideNameInput || !venueInput) {
            return; // Tab not yet loaded
        }
        
        // Prevent double initialization
        if (initialized) {
            return;
        }
        initialized = true;

        let selectedImage = null;
        let selectedEventType = 'akad';
        let selectedModel = localStorage.getItem('private_server_model') || 'nanobanana2';
        let selectedColor = 'rose-gold';
        let selectedOrientation = 'portrait';
        let selectedLang = 'id';
        let privateServerActive = false;
        let currentCategory = 'wedding'; // Default category
        
        // Model colors
        const modelColors = {
            'nanobanana': 'green',
            'nanobanana_pro': 'blue',
            'nanobanana2': 'purple',
            'flux_pro_2': 'teal',
            'seedream': 'orange',
            'gpt_image_15': 'indigo',
            'grok': 'pink'
        };
        
        const colorClasses = {
            'green': 'bg-green-500',
            'blue': 'bg-blue-500',
            'purple': 'bg-purple-500',
            'teal': 'bg-teal-500',
            'orange': 'bg-orange-500',
            'indigo': 'bg-indigo-500',
            'pink': 'bg-pink-500'
        };

        // Option buttons handlers
        const setupOptionButtons = (containerId, callback) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const buttons = container.querySelectorAll('.option-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    if (callback) callback(btn.dataset.value);
                    updateGenerateButton();
                });
            });
        };

        // Category configuration
        const categoryConfig = {
            'wedding': {
                desc: 'Desain undangan pernikahan profesional layaknya jasa desain premium. Atur semua detail acara, pilih tema elegan, dan dapatkan hasil yang memukau dengan AI.',
                photoLabel: 'Foto Pengantin',
                dataLabel: 'Data Pengantin',
                person1Label: 'Nama Mempelai Pria',
                person2Label: 'Nama Mempelai Wanita',
                person1Placeholder: 'Ahmad Rizki, S.Kom',
                person2Placeholder: 'Siti Aisyah, S.Pd',
                generateBtnText: 'Buat Undangan',
                showEventType: true,
                showPerson2: true
            },
            'birthday': {
                desc: 'Desain undangan ulang tahun yang meriah dan penuh warna. Buat undangan unik untuk merayakan momen spesial bersama keluarga dan teman.',
                photoLabel: 'Foto Yang Berulang Tahun',
                dataLabel: 'Data',
                person1Label: 'Nama Yang Berulang Tahun',
                person2Label: 'Umur Sekarang',
                person1Placeholder: 'Aisyah Putri',
                person2Placeholder: '17 tahun',
                generateBtnText: 'Buat Undangan Ulang Tahun',
                showEventType: false,
                showPerson2: true
            },
            'mourning': {
                desc: 'Desain kartu duka cita yang sopan dan penuh rasa hormat. Sampaikan belasungkawa dengan desain yang elegan dan bermartabat.',
                photoLabel: 'Foto Almarhum/Almarhumah',
                dataLabel: 'Data Almarhum/Almarhumah',
                person1Label: 'Nama Almarhum/Almarhumah',
                person2Label: 'Tanggal Wafat',
                person1Placeholder: 'H. Abdullah bin Ahmad',
                person2Placeholder: '12 Januari 2025',
                generateBtnText: 'Buat Kartu Duka Cita',
                showEventType: false,
                showPerson2: true
            },
            'circumcision': {
                desc: 'Desain undangan khitanan yang ceria dan penuh makna. Rayakan momen penting putra Anda dengan undangan yang berkesan.',
                photoLabel: 'Foto Anak',
                dataLabel: 'Data Anak',
                person1Label: 'Nama Anak',
                person2Label: 'Umur Anak',
                person1Placeholder: 'Muhammad Rafif',
                person2Placeholder: '7 tahun',
                generateBtnText: 'Buat Undangan Khitanan',
                showEventType: false,
                showPerson2: true
            },
            'aqiqah': {
                desc: 'Desain undangan aqiqah yang indah dan penuh berkah. Umumkan kelahiran buah hati dengan undangan yang berkesan.',
                photoLabel: 'Foto Bayi',
                dataLabel: 'Data Bayi',
                person1Label: 'Nama Bayi',
                person2Label: 'Tanggal Lahir',
                person1Placeholder: 'Fatimah Az-Zahra',
                person2Placeholder: '1 Januari 2025',
                generateBtnText: 'Buat Undangan Aqiqah',
                showEventType: false,
                showPerson2: true
            },
            'halal-bihalal': {
                desc: 'Desain undangan halal bihalal yang hangat dan penuh keakraban. Saling bermaaf-maafan dengan undangan yang indah.',
                photoLabel: 'Foto Tuan Rumah',
                dataLabel: 'Data Tuan Rumah',
                person1Label: 'Nama Tuan Rumah',
                person2Label: 'Nama Keluarga',
                person1Placeholder: 'Bpk. Ahmad & Keluarga',
                person2Placeholder: '',
                generateBtnText: 'Buat Undangan Halal Bihalal',
                showEventType: false,
                showPerson2: false
            },
            'syukuran': {
                desc: 'Desain undangan syukuran yang penuh rasa syukur. Rayakan kebahagiaan bersama keluarga dan sahabat.',
                photoLabel: 'Foto',
                dataLabel: 'Data Acara',
                person1Label: 'Nama Penyelenggara',
                person2Label: 'Keperluan Syukuran',
                person1Placeholder: 'Keluarga Besar Ahmad',
                person2Placeholder: 'Kelahiran anak pertama',
                generateBtnText: 'Buat Undangan Syukuran',
                showEventType: false,
                showPerson2: true
            }
        };

        // Update labels based on category
        function updateCategoryLabels(category) {
            currentCategory = category;
            const config = categoryConfig[category] || categoryConfig.wedding;
            
            // Update description
            document.getElementById('wi-category-desc').textContent = config.desc;
            
            // Update photo label
            document.getElementById('wi-photo-label').textContent = config.photoLabel;
            
            // Update data label
            document.getElementById('wi-data-label').textContent = config.dataLabel;
            
            // Update person labels
            document.getElementById('wi-person1-label').textContent = config.person1Label;
            document.getElementById('wi-person2-label').textContent = config.person2Label;
            
            // Update placeholders
            if (groomNameInput) {
                groomNameInput.placeholder = config.person1Placeholder;
            }
            if (brideNameInput) {
                brideNameInput.placeholder = config.person2Placeholder;
            }
            
            // Update generate button text
            if (generateBtnText) {
                generateBtnText.textContent = config.generateBtnText;
            }
            
            // Show/hide event type section
            const eventTypeContainer = document.getElementById('wi-event-type-container');
            if (eventTypeContainer) {
                if (config.showEventType) {
                    eventTypeContainer.classList.remove('hidden');
                } else {
                    eventTypeContainer.classList.add('hidden');
                }
            }
            
            // Show/hide person2 container
            const person2Container = document.getElementById('wi-person2-container');
            if (person2Container) {
                if (config.showPerson2) {
                    person2Container.classList.remove('hidden');
                } else {
                    person2Container.classList.add('hidden');
                }
            }
            
            // Store current category
            document.getElementById('wi-current-category').value = category;
        }

        // Setup category buttons
        const categoryButtons = document.querySelectorAll('.wi-category-btn');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                
                // Update button styles (gradient active, white border inactive) - NO SHADOW
                categoryButtons.forEach(b => {
                    // Remove active state
                    b.classList.remove('bg-gradient-to-r', 'from-teal-500', 'to-teal-600', 'text-white');
                    // Add inactive state
                    b.classList.add('bg-white', 'text-slate-700', 'border-2', 'border-slate-200');
                });
                
                // Add active state to clicked button
                btn.classList.remove('bg-white', 'text-slate-700', 'border-2', 'border-slate-200');
                btn.classList.add('bg-gradient-to-r', 'from-teal-500', 'to-teal-600', 'text-white');
                
                // Update labels
                updateCategoryLabels(category);
            });
        });

        // Render model options dynamically from PRIVATE_SERVER_MODELS
        function renderModelOptions() {
            const modelOptionsContainer = document.getElementById('wi-model-options');
            if (!modelOptionsContainer) return;
            
            const models = window.PRIVATE_SERVER_MODELS || {};
            const currentModel = localStorage.getItem('private_server_model') || 'nanobanana2';
            
            modelOptionsContainer.innerHTML = '';
            
            for (const [key, info] of Object.entries(models)) {
                const color = modelColors[key] || 'green';
                const colorClass = colorClasses[color] || 'bg-green-500';
                const isNanobanana = key === 'nanobanana';
                const requiresPS = !isNanobanana;
                const isDisabled = info.disabled === true;
                const isSelected = key === currentModel && !isDisabled;
                
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.dataset.value = key;
                if (requiresPS) btn.dataset.requiresPs = 'true';
                if (isDisabled) btn.dataset.disabled = 'true';
                
                btn.className = `option-btn justify-center flex items-center gap-2 relative ${isSelected ? 'selected' : ''}`;
                
                // Lock non-nanobanana models by default OR disabled models
                if ((requiresPS && !privateServerActive) || isDisabled) {
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                }
                
                // Add maintenance badge for gpt_image_15
                const maintenanceBadge = key === 'gpt_image_15' ? '<span class="text-[7px] bg-slate-200 text-slate-500 px-1.5 py-px rounded-full font-bold">Maintenance</span>' : '';
                
                btn.innerHTML = `
                    <span class="w-2 h-2 rounded-full ${colorClass}"></span> ${info.label} ${maintenanceBadge}
                    ${requiresPS && !privateServerActive ? '<i data-lucide="lock" class="w-3 h-3 text-slate-400"></i>' : ''}
                `;
                
                modelOptionsContainer.appendChild(btn);
            }
            
            // Recreate icons
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons({ root: modelOptionsContainer });
            }
            
            // Setup event listeners for model buttons with lock check
            const modelButtons = modelOptionsContainer.querySelectorAll('.option-btn');
            modelButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Check if button is disabled
                    const isDisabled = btn.dataset.disabled === 'true';
                    if (isDisabled) {
                        return; // Don't allow selection of disabled models
                    }
                    
                    // Check if button is locked
                    const requiresPS = btn.dataset.requiresPs === 'true';
                    if (requiresPS && !privateServerActive) {
                        return; // Don't allow selection of locked models
                    }
                    
                    // Remove selected from all and add to clicked
                    modelButtons.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    
                    const value = btn.dataset.value;
                    selectedModel = value;
                    localStorage.setItem('private_server_model', value);
                    window.dispatchEvent(new CustomEvent('privateServerModelChanged', { detail: { model: value } }));
                    updateGenerateButton();
                });
            });
        }
        
        // Check Private Server status
        async function checkWIPrivateServer() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) return;
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                if (r.success && r.is_active) {
                    privateServerActive = true;
                    renderModelOptions(); // Re-render with unlocked models
                }
            } catch(e) { /* ignore */ }
        }
        
        // Initial render
        renderModelOptions();
        checkWIPrivateServer();
        
        setupOptionButtons('wi-event-type-options', (value) => selectedEventType = value);
        setupOptionButtons('wi-lang-options', (value) => selectedLang = value);
        setupOptionButtons('wi-color-options', (value) => {
            selectedColor = value;
            if (value === 'custom') {
                customColorContainer.classList.remove('hidden');
            } else {
                customColorContainer.classList.add('hidden');
            }
        });
        setupOptionButtons('wi-orientation-options', (value) => selectedOrientation = value);

        // Theme dropdown handler
        if (themeDropdown) {
            themeDropdown.addEventListener('change', () => {
                if (themeDropdown.value === 'Kustom') {
                    customThemeContainer.classList.remove('hidden');
                } else {
                    customThemeContainer.classList.add('hidden');
                }
                updateGenerateButton();
            });
        }

        // Image upload handlers
        if (imageInput) {
            imageInput.addEventListener('change', handleImageSelect);
        }
        
        if (uploadBox) {
            uploadBox.addEventListener('dragover', handleDragOver);
            uploadBox.addEventListener('drop', handleDrop);
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                resetImage();
            });
        }

        function handleImageSelect(e) {
            const file = e.target.files[0];
            if (file) {
                processImage(file);
            }
        }

        function handleDragOver(e) {
            e.preventDefault();
            uploadBox.classList.add('border-rose-400');
        }

        function handleDrop(e) {
            e.preventDefault();
            uploadBox.classList.remove('border-rose-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                processImage(file);
            }
        }

        function processImage(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImage = e.target.result;
                if (preview) {
                    preview.src = selectedImage;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                if (removeBtn) removeBtn.classList.remove('hidden');
                updateGenerateButton();
            };
            reader.readAsDataURL(file);
        }

        function resetImage() {
            selectedImage = null;
            if (imageInput) imageInput.value = '';
            if (preview) {
                preview.src = '';
                preview.classList.add('hidden');
            }
            if (placeholder) placeholder.classList.remove('hidden');
            if (removeBtn) removeBtn.classList.add('hidden');
            updateGenerateButton();
        }

        // Count slider
        if (countSlider && countValue) {
            countSlider.addEventListener('input', () => {
                const count = countSlider.value;
                countValue.textContent = `${count} Variasi`;
            });
        }

        // Input change listeners
        [groomNameInput, brideNameInput, venueInput, dateInput].forEach(input => {
            if (input) {
                input.addEventListener('input', updateGenerateButton);
            }
        });

        // Update generate button state
        function updateGenerateButton() {
            const hasGroomName = groomNameInput && groomNameInput.value.trim();
            const hasBrideName = brideNameInput && brideNameInput.value.trim();
            const hasVenue = venueInput && venueInput.value.trim();
            
            if (generateBtn) {
                if (hasGroomName && hasBrideName && hasVenue) {
                    generateBtn.disabled = false;
                } else {
                    generateBtn.disabled = true;
                }
            }
        }

        // Show example
        if (exampleBtn) {
            exampleBtn.addEventListener('click', () => {
                const videoSrc = 'assets/undangan.mp4';
                
                if (typeof window.showContentModal === 'function') {
                    window.showContentModal(videoSrc, 'video');
                } else if (typeof window.showVideoModal === 'function') {
                    window.showVideoModal(videoSrc);
                } else {
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
                    modal.innerHTML = `
                        <div class="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
                            <button class="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors" onclick="this.closest('.fixed').remove()">
                                <i data-lucide="x" class="w-5 h-5"></i>
                            </button>
                            <video controls autoplay class="w-full h-auto max-h-[80vh]">
                                <source src="${videoSrc}" type="video/mp4">
                                Browser Anda tidak mendukung video.
                            </video>
                        </div>
                    `;
                    document.body.appendChild(modal);
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) modal.remove();
                    });
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            });
        }

        // Auto-generate quote
        if (autoQuoteBtn && quoteInput) {
            autoQuoteBtn.addEventListener('click', async () => {
                const eventTypeMap = {
                    'akad': 'Akad Nikah',
                    'resepsi': 'Resepsi Pernikahan',
                    'both': 'Akad Nikah & Resepsi'
                };
                const eventText = eventTypeMap[selectedEventType] || 'Pernikahan';
                
                autoQuoteBtn.disabled = true;
                const originalContent = autoQuoteBtn.innerHTML;
                autoQuoteBtn.innerHTML = '<div class="spinner w-3 h-3 border-2 border-teal-200 border-t-teal-600"></div><span>Membuat...</span>';
                
                try {
                    // Adjust quote prompt based on category
                    let quotePrompt = '';
                    switch(currentCategory) {
                        case 'wedding':
                            quotePrompt = `Berikan 1 quote atau ayat islami yang cocok untuk undangan ${eventText}. Berikan dalam bahasa Indonesia, maksimal 2 kalimat, tanpa penjelasan tambahan. Langsung berikan quote-nya saja.`;
                            break;
                        case 'birthday':
                            quotePrompt = `Berikan 1 quote atau ucapan yang cocok untuk undangan ulang tahun. Berikan dalam bahasa Indonesia, maksimal 2 kalimat, penuh semangat dan kebahagiaan. Langsung berikan quote-nya saja.`;
                            break;
                        case 'mourning':
                            quotePrompt = `Berikan 1 quote atau ayat Al-Quran yang cocok untuk kartu duka cita. Berikan dalam bahasa Indonesia, maksimal 2 kalimat, penuh rasa hormat dan doa. Langsung berikan quote-nya saja.`;
                            break;
                        case 'circumcision':
                            quotePrompt = `Berikan 1 quote atau doa yang cocok untuk undangan khitanan. Berikan dalam bahasa Indonesia, maksimal 2 kalimat, penuh doa dan harapan. Langsung berikan quote-nya saja.`;
                            break;
                        case 'aqiqah':
                            quotePrompt = `Berikan 1 quote atau ayat islami yang cocok untuk undangan aqiqah. Berikan dalam bahasa Indonesia, maksimal 2 kalimat, penuh rasa syukur. Langsung berikan quote-nya saja.`;
                            break;
                        case 'halal-bihalal':
                            quotePrompt = `Berikan 1 quote atau ayat yang cocok untuk undangan halal bihalal. Berikan dalam bahasa Indonesia, maksimal 2 kalimat, penuh keakraban dan maaf-memaafkan. Langsung berikan quote-nya saja.`;
                            break;
                        case 'syukuran':
                            quotePrompt = `Berikan 1 quote atau doa yang cocok untuk undangan syukuran. Berikan dalam bahasa Indonesia, maksimal 2 kalimat, penuh rasa syukur dan kebahagiaan. Langsung berikan quote-nya saja.`;
                            break;
                        default:
                            quotePrompt = `Berikan 1 quote atau ayat yang cocok untuk undangan. Berikan dalam bahasa Indonesia, maksimal 2 kalimat, tanpa penjelasan tambahan. Langsung berikan quote-nya saja.`;
                    }
                    
                    const prompt = quotePrompt;
                    
                    const formData = new FormData();
                    formData.append('prompt', prompt);
                    
                    const chatEndpoint = typeof BASE_URL !== 'undefined' && BASE_URL ? `${BASE_URL}/chat` : '/chat';
                    
                    const response = await fetch(chatEndpoint, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': typeof API_KEY !== 'undefined' ? API_KEY : ''
                        },
                        body: formData
                    });
                    
                    if (!response.ok) throw new Error('Gagal membuat quote');
                    
                    const result = await response.json();
                    const quoteText = (result.success && result.response) 
                        ? result.response 
                        : (result.response || result.candidates?.[0]?.content?.parts?.[0]?.text || '');
                    
                    if (quoteText) {
                        quoteInput.value = quoteText.trim().replace(/^["']|["']$/g, '');
                    }
                } catch (error) {
                    console.error('Auto quote error:', error);
                    if (typeof window.showModernPopup === 'function') {
                        window.showModernPopup({
                            title: 'Gagal',
                            message: 'Tidak dapat membuat quote otomatis. Silakan coba lagi.',
                            actionText: 'OK'
                        });
                    }
                } finally {
                    autoQuoteBtn.disabled = false;
                    autoQuoteBtn.innerHTML = originalContent;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            });
        }

        // Generate button
        if (generateBtn) {
            generateBtn.addEventListener('click', handleGenerate);
        }

        // Helper function to generate single invitation
        async function generateSingle(prompt, aspectRatio, imageBlob, index) {
            try {
                const endpoint = typeof BASE_URL !== 'undefined' && BASE_URL ? `${BASE_URL}/generate` : '/generate';
                
                const formData = new FormData();
                formData.append('prompt', prompt);
                formData.append('aspectRatio', aspectRatio);
                if (imageBlob) {
                    formData.append('image', imageBlob, 'reference.jpg');
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': typeof API_KEY !== 'undefined' ? API_KEY : ''
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                
                // Handle different response structures
                let images = [];
                if (data.images && Array.isArray(data.images)) {
                    images = data.images;
                } else if (data.baseurl) {
                    images = [data.baseurl];
                } else if (data.imageUrl) {
                    images = [data.imageUrl];
                } else if (data.image) {
                    images = [data.image];
                } else if (typeof data === 'string') {
                    images = [data];
                } else if (Array.isArray(data)) {
                    images = data;
                }
                
                return { success: true, images, index };
            } catch (error) {
                return { success: false, error: error.message, index };
            }
        }

        async function handleGenerate() {
            if (generateBtn.disabled) return;

            const groomName = groomNameInput?.value.trim() || '';
            const brideName = brideNameInput?.value.trim() || '';
            const parentsNames = parentsNamesInput?.value.trim() || '';
            const date = dateInput?.value || '';
            const time = timeInput?.value || '';
            const venue = venueInput?.value.trim() || '';
            const address = addressInput?.value.trim() || '';
            const quote = quoteInput?.value.trim() || '';
            const theme = themeDropdown?.value === 'Kustom' 
                ? customThemeInput?.value.trim() || 'Modern Elegant'
                : themeDropdown?.value || 'Modern Elegant';
            const color = selectedColor === 'custom'
                ? customColorInput?.value.trim() || 'rose gold'
                : selectedColor.replace('-', ' ');

            // Format date
            let formattedDate = '';
            if (date) {
                const d = new Date(date);
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                formattedDate = d.toLocaleDateString(selectedLang === 'en' ? 'en-US' : 'id-ID', options);
            }

            // Event type text
            const eventTypeMap = {
                'akad': 'Akad Nikah',
                'resepsi': 'Resepsi Pernikahan',
                'both': 'Akad Nikah & Resepsi'
            };
            const eventText = eventTypeMap[selectedEventType] || 'Pernikahan';

            // Build prompt based on category
            let prompt = '';
            const config = categoryConfig[currentCategory] || categoryConfig.wedding;
            
            switch(currentCategory) {
                case 'wedding':
                    prompt = `Professional wedding invitation design, ${theme} theme, ${color} color scheme, ${selectedOrientation} orientation. `;
                    prompt += `Event: ${eventText}. `;
                    prompt += `Groom: ${groomName}, Bride: ${brideName}. `;
                    if (parentsNames) prompt += `${parentsNames}. `;
                    break;
                case 'birthday':
                    prompt = `Professional birthday invitation design, ${theme} theme, ${color} color scheme, ${selectedOrientation} orientation. `;
                    prompt += `Celebrating ${groomName}'s birthday, turning ${brideName} years old. `;
                    break;
                case 'mourning':
                    prompt = `Respectful mourning card design, ${theme} theme, ${color} color scheme, ${selectedOrientation} orientation. `;
                    prompt += `In memory of ${groomName}, passed away on ${brideName}. `;
                    break;
                case 'circumcision':
                    prompt = `Cheerful circumcision invitation design, ${theme} theme, ${color} color scheme, ${selectedOrientation} orientation. `;
                    prompt += `Celebrating ${groomName}'s circumcision, age ${brideName}. `;
                    break;
                case 'aqiqah':
                    prompt = `Beautiful aqiqah invitation design, ${theme} theme, ${color} color scheme, ${selectedOrientation} orientation. `;
                    prompt += `Aqiqah ceremony for ${groomName}, born on ${brideName}. `;
                    break;
                case 'halal-bihalal':
                    prompt = `Warm halal bihalal invitation design, ${theme} theme, ${color} color scheme, ${selectedOrientation} orientation. `;
                    prompt += `Hosted by ${groomName}. `;
                    break;
                case 'syukuran':
                    prompt = `Grateful syukuran invitation design, ${theme} theme, ${color} color scheme, ${selectedOrientation} orientation. `;
                    prompt += `Hosted by ${groomName}, celebrating ${brideName}. `;
                    break;
            }
            
            // Add common details
            if (formattedDate) prompt += `Date: ${formattedDate}`;
            if (time) prompt += ` at ${time}`;
            prompt += `. `;
            if (venue) prompt += `Venue: ${venue}. `;
            if (address) prompt += `Address: ${address}. `;
            if (quote) prompt += `Quote: "${quote}". `;
            const langInstruction = selectedLang === 'en'
                ? 'IMPORTANT: All text, names, titles, dates, and labels in the invitation MUST be written in English.'
                : 'PENTING: Semua teks, nama, judul, tanggal, dan label dalam undangan HARUS ditulis dalam Bahasa Indonesia.';
            prompt += `Elegant typography, decorative elements, professional layout, high quality design, detailed ornaments. ${langInstruction}`;

            // Determine aspect ratio based on orientation
            const aspectRatio = selectedOrientation === 'landscape' ? '16:9' : '9:16';
            
            // Get count from slider
            const count = parseInt(countSlider?.value) || 1;
            const useParallel = (typeof window.isBoostActive === 'function' && window.isBoostActive()) && count > 1;

            // Show loading
            generateBtn.disabled = true;
            generateBtnText.textContent = 'Sedang Membuat...';
            showLoadingCards(aspectRatio, count);

            // Prepare image blob once if needed
            let imageBlob = null;
            if (selectedImage) {
                imageBlob = await fetch(selectedImage).then(r => r.blob());
            }

            let hasAnySuccess = false;
            let firstError = null;

            // Build prompts with variations
            const prompts = [];
            for (let i = 0; i < count; i++) {
                let variationPrompt = prompt;
                if (i > 0) {
                    variationPrompt += ` (Variation #${i + 1}: Create a unique design with different layout arrangement and visual approach)`;
                }
                prompts.push(variationPrompt);
            }

            try {
                if (useParallel) {
                    // --- PARALLEL MODE (Boost Active) ---
                    const promises = prompts.map((p, i) =>
                        generateSingle(p, aspectRatio, imageBlob, i + 1).then(result => {
                            removeLoadingCard(result.index);
                            if (result.success && result.images.length > 0) {
                                hasAnySuccess = true;
                                result.images.forEach(img => appendResultCard(img, aspectRatio));
                                if (typeof window.doneSound !== 'undefined') window.doneSound.play();
                            } else if (!result.success) {
                                if (!firstError) firstError = result.error;
                                markLoadingCardError(result.index, result.error);
                            }
                        })
                    );
                    await Promise.allSettled(promises);
                } else {
                    // --- SEQUENTIAL MODE ---
                    for (let i = 0; i < count; i++) {
                        const result = await generateSingle(prompts[i], aspectRatio, imageBlob, i + 1);
                        removeLoadingCard(result.index);
                        if (result.success && result.images.length > 0) {
                            hasAnySuccess = true;
                            result.images.forEach(img => appendResultCard(img, aspectRatio));
                            if (typeof window.doneSound !== 'undefined') window.doneSound.play();
                        } else if (!result.success) {
                            if (!firstError) firstError = result.error;
                            markLoadingCardError(result.index, result.error);
                        }
                    }
                }

                // Show error if all failed
                if (!hasAnySuccess) {
                    if (typeof window.errorSound !== 'undefined') window.errorSound.play();
                    resultsContainer?.classList.add('hidden');
                    resultsPlaceholder?.classList.remove('hidden');
                    if (resultsPlaceholder) {
                        resultsPlaceholder.innerHTML = `
                            <div class="flex flex-col items-center text-red-500">
                                <i data-lucide="alert-circle" class="w-12 h-12 mb-2"></i>
                                <p class="font-medium">Terjadi Kesalahan</p>
                                <p class="text-sm text-slate-400 mt-1 text-center max-w-xs">${firstError || 'Tidak ada undangan yang dihasilkan'}</p>
                            </div>
                        `;
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }
                }

            } catch (error) {
                console.error('Generate error:', error);
            } finally {
                generateBtn.disabled = false;
                generateBtnText.textContent = 'Buat Undangan';
            }
        }

        function showLoadingCards(aspectRatio, count = 1) {
            if (!resultsGrid) return;
            
            resultsPlaceholder?.classList.add('hidden');
            resultsContainer?.classList.remove('hidden');
            resultsGrid.innerHTML = '';
            
            // Update grid columns based on count (max 2 columns like infografis)
            const gridCols = count > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';
            resultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            
            // Determine aspect class and max width based on orientation
            let aspectClass = 'aspect-[9/16]'; // default portrait
            let maxWidthClass = count === 1 ? 'max-w-sm' : ''; // only center single card
            
            if (aspectRatio === '16:9') {
                aspectClass = 'aspect-[16/9]';
                maxWidthClass = count === 1 ? 'max-w-2xl' : '';
            }
            
            // Create loading cards for each variation
            for (let i = 1; i <= count; i++) {
                const loadingCard = document.createElement('div');
                loadingCard.id = `wi-loading-card-${i}`;
                loadingCard.className = `relative rounded-2xl overflow-hidden bg-white/80 border border-slate-200 w-full flex flex-col items-center justify-center animate-pulse ${count === 1 ? 'mx-auto' : ''} ${maxWidthClass} shadow-lg`;
                
                loadingCard.innerHTML = `
                    <div class="w-full ${aspectClass} flex flex-col items-center justify-center bg-slate-50">
                        <div class="flex flex-col items-center justify-center gap-3 p-6 w-full text-center">
                            <div class="spinner border-4 border-teal-200 border-t-teal-600 w-10 h-10"></div>
                            <p class="text-slate-500 text-sm font-medium text-center w-full animate-pulse">Membuat undangan ${i}...</p>
                        </div>
                    </div>
                `;
                resultsGrid.appendChild(loadingCard);
            }
        }
        
        function removeLoadingCard(index) {
            const card = document.getElementById(`wi-loading-card-${index}`);
            if (card) card.remove();
        }
        
        function markLoadingCardError(index, error) {
            const card = document.getElementById(`wi-loading-card-${index}`);
            if (card) {
                card.classList.remove('animate-pulse');
                card.innerHTML = `
                    <div class="w-full aspect-[9/16] flex flex-col items-center justify-center bg-red-50">
                        <div class="flex flex-col items-center justify-center gap-3 p-6 w-full text-center">
                            <i data-lucide="alert-circle" class="w-10 h-10 text-red-500"></i>
                            <p class="text-red-600 text-sm font-medium">Error</p>
                            <p class="text-red-500 text-xs">${error || 'Gagal'}</p>
                        </div>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
        
        function appendResultCard(img, aspectRatio) {
            if (!resultsGrid) return;
            
            // Handle base64 with or without data URI prefix
            let imgSrc = img;
            if (img && !img.startsWith('data:') && !img.startsWith('http')) {
                imgSrc = `data:image/jpeg;base64,${img}`;
            }
            
            const aspectClass = aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-[9/16]';
            const currentCount = resultsGrid.querySelectorAll('.card, [id^="wi-loading-card-"]').length;
            const maxWidthClass = currentCount === 0 ? (aspectRatio === '16:9' ? 'max-w-2xl' : 'max-w-sm') : '';
            
            const card = document.createElement('div');
            card.className = `card relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full group ${currentCount === 0 ? 'mx-auto' : ''} ${maxWidthClass} shadow-lg`;
            
            // Create image element
            const imgContainer = document.createElement('div');
            imgContainer.className = `relative w-full ${aspectClass}`;
            
            const imgElement = document.createElement('img');
            imgElement.src = imgSrc;
            imgElement.alt = 'Undangan';
            imgElement.className = 'absolute inset-0 w-full h-full object-cover';
            imgContainer.appendChild(imgElement);
            
            // Create buttons container
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'absolute bottom-2 right-2 flex gap-1';
            
            // View button
            const viewBtn = document.createElement('button');
            viewBtn.className = 'view-btn result-action-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors';
            viewBtn.title = 'Lihat Gambar';
            viewBtn.dataset.imgSrc = imgSrc;
            viewBtn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
            
            // Upscale button
            const upscaleBtn = document.createElement('button');
            upscaleBtn.className = 'upscale-btn result-action-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors';
            upscaleBtn.title = 'Upscale 4K';
            upscaleBtn.dataset.imgSrc = imgSrc;
            upscaleBtn.innerHTML = '<i data-lucide="scan-line" class="w-4 h-4"></i>';
            
            // Download link
            const downloadLink = document.createElement('a');
            downloadLink.href = imgSrc;
            downloadLink.download = `wedding-invitation-${Date.now()}.jpg`;
            downloadLink.className = 'result-action-btn download-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors';
            downloadLink.title = 'Unduh Gambar';
            downloadLink.innerHTML = '<i data-lucide="download" class="w-4 h-4"></i>';
            
            // Animate icon auto-injected by global observer
            buttonsContainer.appendChild(viewBtn);
            buttonsContainer.appendChild(upscaleBtn);
            buttonsContainer.appendChild(downloadLink);
            
            card.appendChild(imgContainer);
            card.appendChild(buttonsContainer);
            
            resultsGrid.appendChild(card);
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        
        // Global event listener for view buttons
        if (resultsGrid) {
            resultsGrid.addEventListener('click', (e) => {
                const viewBtn = e.target.closest('.view-btn');
                if (viewBtn) {
                    const imgSrc = viewBtn.dataset.imgSrc;
                    if (imgSrc && typeof window.showImageViewer === 'function') {
                        window.showImageViewer(imgSrc);
                    }
                }
            });
        }

        function displayResults(images, aspectRatio) {
            if (!resultsGrid) {
                console.error('resultsGrid not found!');
                return;
            }
            console.log('=== DISPLAYING RESULTS ===');
            console.log('Images array:', images);
            console.log('Images count:', images.length);
            console.log('Aspect ratio:', aspectRatio);

            resultsPlaceholder?.classList.add('hidden');
            resultsContainer?.classList.remove('hidden');

            // Remove loading card
            const loadingCard = document.getElementById('wi-loading-card-1');
            if (loadingCard) {
                console.log('Removing loading card...');
                loadingCard.remove();
            } else {
                console.log('Loading card not found');
            }

            resultsGrid.innerHTML = '';
            
            // Update grid columns based on image count (max 2 columns like infografis)
            const gridCols = images.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';
            resultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;

            if (!images || images.length === 0) {
                console.error('No images to display!');
                return;
            }

            // Determine aspect class and max width based on orientation
            let aspectClass = 'aspect-[9/16]'; // default portrait
            let maxWidthClass = images.length === 1 ? 'max-w-sm' : ''; // only center single card
            
            if (aspectRatio === '16:9') {
                aspectClass = 'aspect-[16/9]';
                maxWidthClass = images.length === 1 ? 'max-w-2xl' : '';
            }

            images.forEach((img, index) => {
                // Handle base64 with or without data URI prefix
                let imgSrc = img;
                if (img && !img.startsWith('data:') && !img.startsWith('http')) {
                    // Assume it's raw base64, add prefix
                    imgSrc = `data:image/jpeg;base64,${img}`;
                }
                
                console.log(`Image ${index + 1} src length:`, imgSrc.length, 'starts with:', imgSrc.substring(0, 50));
                
                const card = document.createElement('div');
                card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full animate-fade-in ${images.length === 1 ? 'mx-auto' : ''} ${maxWidthClass} shadow-lg`;
                
                // Create image element
                const imgContainer = document.createElement('div');
                imgContainer.className = `relative w-full ${aspectClass}`;
                
                const imgElement = document.createElement('img');
                imgElement.src = imgSrc;
                imgElement.alt = `Undangan ${index + 1}`;
                imgElement.className = 'absolute inset-0 w-full h-full object-cover';
                imgElement.onerror = () => console.error(`Failed to load image ${index + 1}`);
                imgElement.onload = () => console.log(`Image ${index + 1} loaded successfully`);
                
                imgContainer.appendChild(imgElement);
                
                // Create buttons container
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'absolute bottom-2 right-2 flex gap-1';
                
                // View button
                const viewBtn = document.createElement('button');
                viewBtn.className = 'view-btn result-action-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors';
                viewBtn.title = 'Lihat Gambar';
                viewBtn.dataset.imgSrc = imgSrc;
                viewBtn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
                
                // Upscale button
                const upscaleBtn = document.createElement('button');
                upscaleBtn.className = 'upscale-btn result-action-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors';
                upscaleBtn.title = 'Upscale 4K';
                upscaleBtn.dataset.imgSrc = imgSrc;
                upscaleBtn.innerHTML = '<i data-lucide="scan-line" class="w-4 h-4"></i>';
                
                // Download link
                const downloadLink = document.createElement('a');
                downloadLink.href = imgSrc;
                downloadLink.download = `wedding-invitation-${index + 1}.jpg`;
                downloadLink.className = 'result-action-btn download-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors';
                downloadLink.title = 'Unduh Gambar';
                downloadLink.innerHTML = '<i data-lucide="download" class="w-4 h-4"></i>';
                
                // Animate icon auto-injected by global observer
                buttonsContainer.appendChild(viewBtn);
                buttonsContainer.appendChild(upscaleBtn);
                buttonsContainer.appendChild(downloadLink);
                
                card.appendChild(imgContainer);
                card.appendChild(buttonsContainer);
                
                resultsGrid.appendChild(card);
                
                // Scroll to view on mobile
                if (window.innerWidth < 1024) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        // Listen for model changes from other features
        window.addEventListener('privateServerModelChanged', (e) => {
            if (e.detail && e.detail.model) {
                selectedModel = e.detail.model;
                renderModelOptions();
            }
        });
        
        window.addEventListener('privateServerStatusChanged', () => {
            checkWIPrivateServer();
        });

        // Initialize
        updateGenerateButton();
    }

    // Single initialization function
    function tryInit() {
        if (!initialized) {
            initWeddingInvitation();
        }
    }
    
    // Initialize when tab is shown
    const tabBtn = document.getElementById('tab-wedding-invitation');
    if (tabBtn) {
        tabBtn.addEventListener('click', () => {
            setTimeout(tryInit, 100);
        });
    }
    
    // Try initial load only if tab is already active
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(tryInit, 100);
        });
    } else {
        setTimeout(tryInit, 100);
    }
})();
