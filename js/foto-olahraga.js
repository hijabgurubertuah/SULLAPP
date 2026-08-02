(function () {

    const SPORT_DATA = {
        'soccer football player': {
            actions: [
                ['🦵', 'Menendang', 'powerful kick action moment, striking the ball with force'],
                ['🏃', 'Dribble', 'fast dribbling at full speed, ball at feet, running'],
                ['⬆️', 'Heading', 'jumping header, mid-air heading the ball dynamically'],
                ['🎯', 'Tembak Gol', 'powerful goal shot, shooting stance toward goal'],
                ['🛡️', 'Sliding Tackle', 'dramatic sliding tackle on the ground, defensive'],
                ['🏆', 'Selebrasi', 'goal celebration, running arms spread wide, euphoric'],
            ],
            venues: [
                ['🏟️', 'Stadion Besar', 'large professional football stadium with massive cheering crowd'],
                ['🌿', 'Lapangan Rumput', 'natural green grass outdoor football pitch, open field'],
                ['🏛️', 'Futsal Indoor', 'indoor futsal court, hard floor, professional indoor hall'],
            ],
            lighting: [
                ['☀️', 'Siang Cerah', 'bright natural daylight, outdoor sunlight, clear blue sky'],
                ['🌙', 'Lampu Stadion', 'night game, stadium floodlights, bright arena lighting'],
                ['🌅', 'Golden Hour', 'golden hour warm sunset light, magic hour glow'],
            ],
        },
        'basketball player': {
            actions: [
                ['🏀', 'Slam Dunk', 'explosive slam dunk hanging on rim, incredible athleticism'],
                ['⬆️', 'Jump Shot', 'perfect three point jump shot mid-air, releasing the ball'],
                ['🏃', 'Crossover', 'fast crossover dribble, aggressive explosive ball handling'],
                ['🛡️', 'Block', 'spectacular defensive block, rejecting opponent shot at rim'],
                ['🎯', 'Lay Up', 'fast break lay up shot, driving to the basket, close range'],
                ['🏆', 'Selebrasi', 'championship celebration, arms raised, crowd going wild'],
            ],
            venues: [
                ['🏟️', 'NBA Arena', 'professional NBA basketball arena, packed cheering crowd, polished hardwood court'],
                ['🏛️', 'Gedung Basket', 'indoor basketball gymnasium, college or professional indoor court'],
                ['🌿', 'Street Court', 'urban outdoor street basketball court, city backdrop'],
            ],
            lighting: [
                ['💡', 'Arena Spotlight', 'dramatic professional arena spotlights, indoor stadium lighting'],
                ['☀️', 'Natural Outdoor', 'bright natural daylight, outdoor sunlight'],
                ['🎬', 'Cinematic', 'high contrast cinematic dramatic lighting, studio quality'],
            ],
        },
        'badminton player': {
            actions: [
                ['💥', 'Jump Smash', 'explosive jumping overhead smash, powerful attack shot mid-air'],
                ['🏸', 'Smash', 'powerful smash downward, full swing follow through'],
                ['↩️', 'Backhand', 'precise backhand cross court return shot'],
                ['🎾', 'Serve', 'controlled serve position, shuttle tossed in air'],
                ['⚡', 'Net Kill', 'lightning fast net kill, aggressive net play, quick reflex'],
                ['🏆', 'Selebrasi', 'victory celebration, pointing upward, pumping fist'],
            ],
            venues: [
                ['🏛️', 'Gedung Badminton', 'professional indoor badminton hall, wooden court, scoreboard visible'],
                ['🏟️', 'Arena Kompetisi', 'international badminton tournament arena, packed excited spectators'],
                ['🌿', 'Outdoor Court', 'outdoor badminton court, trees and natural environment'],
            ],
            lighting: [
                ['💡', 'Indoor Hall Light', 'professional indoor hall lighting, bright even illumination'],
                ['💡', 'Dramatis', 'dramatic high contrast spotlight, cinematic sports photography'],
                ['☀️', 'Natural Outdoor', 'bright natural daylight, outdoor setting'],
            ],
        },
        'competitive swimmer': {
            actions: [
                ['🏊', 'Freestyle Sprint', 'explosive freestyle sprint, arms pulling through water, huge splash'],
                ['🦋', 'Butterfly Stroke', 'powerful butterfly stroke, both arms simultaneously out of water'],
                ['🚀', 'Start Dive', 'race start dive off starting block, perfect streamline entry'],
                ['🏁', 'Finish Touch', 'touching wall at finish line, triumphant explosive finish'],
                ['💧', 'Underwater Kick', 'underwater dolphin kick, streamline glide, crystal blue water'],
                ['🏆', 'Selebrasi', 'victory at pool edge, arms raised, goggle pushed up, celebrating'],
            ],
            venues: [
                ['🏊', 'Olympic Pool', 'Olympic indoor swimming pool, lane dividers, professional starting blocks'],
                ['🌿', 'Outdoor Pool', 'outdoor competition swimming pool, sunlight shimmering on water'],
                ['🌊', 'Open Water', 'open water sea swimming, ocean waves, natural blue water'],
            ],
            lighting: [
                ['💡', 'Indoor Pool Light', 'indoor pool overhead lighting, reflecting beautifully on water surface'],
                ['☀️', 'Natural Outdoor', 'bright natural sunlight, outdoor setting, sparkling shimmering water'],
                ['🌅', 'Golden Hour', 'sunset golden hour light reflecting on water, warm tones'],
            ],
        },
        'sprinter marathon runner': {
            actions: [
                ['💨', 'Full Sprint', 'full explosive sprint at maximum speed, legs pumping powerfully'],
                ['🚀', 'Start Blocks', 'explosive burst from starting blocks, low acceleration phase'],
                ['🏁', 'Finish Line', 'breaking finish tape, chest forward, triumphant winning moment'],
                ['🏃', 'Marathon', 'endurance marathon running pace, steady stride, race crowd cheering'],
                ['🚧', 'Hurdles', 'clearing hurdles with perfect athletic form, mid-air over hurdle'],
                ['🏆', 'Selebrasi', 'finish line victory celebration, arms wide spread, pure joy'],
            ],
            venues: [
                ['🏟️', 'Stadium Track', 'professional athletic stadium running track, crowd cheering loudly'],
                ['🏙️', 'City Marathon', 'city road marathon race, urban cityscape backdrop, crowd lining streets'],
                ['⛰️', 'Trail Run', 'mountain trail running, scenic rugged nature path, forest or peaks'],
                ['🏖️', 'Beach Run', 'beach sand running, coastal ocean scenery, waves backdrop'],
            ],
            lighting: [
                ['🌅', 'Morning Mist', 'early morning soft golden light, misty atmosphere, fresh start'],
                ['☀️', 'Siang Cerah', 'bright midday sun, outdoor track, clear blue sky overhead'],
                ['🌅', 'Sunset Race', 'golden sunset light, warm orange glow, dramatic long shadow'],
                ['🌙', 'Night Race', 'night race artificial track lights, dramatic dark atmosphere'],
            ],
        },
        'boxer martial arts fighter': {
            actions: [
                ['🥊', 'Straight Punch', 'powerful straight punch jab cross, fist fully extending toward camera'],
                ['⬆️', 'Uppercut', 'devastating uppercut, upward explosive punch trajectory'],
                ['🛡️', 'Dodge', 'slipping a punch, defensive head movement, counter ready stance'],
                ['💪', 'Heavy Bag', 'intense heavy bag training, powerful combination punches'],
                ['⚡', 'KO Moment', 'knockout moment, explosive decisive punch, champion victorious'],
                ['🏆', 'Selebrasi', 'championship belt raised high, victory celebration in ring'],
            ],
            venues: [
                ['🥊', 'Boxing Ring', 'professional boxing ring with ropes, corner stools, crowd surrounding'],
                ['🏋️', 'Boxing Gym', 'boxing gym training environment, speed bags, heavy bags, mirrors'],
                ['🌿', 'Outdoor Training', 'outdoor boxing training session, natural setting, raw atmosphere'],
            ],
            lighting: [
                ['💡', 'Ring Spotlight', 'dramatic ring spotlight from directly above, dark background, cinematic'],
                ['🎬', 'High Contrast', 'extreme high contrast black dramatic lighting, gritty and intense'],
                ['☀️', 'Natural Outdoor', 'natural daylight outdoor training, bright raw honest light'],
            ],
        },
        'tennis player': {
            actions: [
                ['⚡', 'Power Serve', 'explosive serve motion, ball toss high in air, racket swinging up'],
                ['💪', 'Forehand Drive', 'powerful forehand topspin drive, full swing follow through'],
                ['↩️', 'Backhand', 'two-handed backhand strike, full power body rotation'],
                ['🎾', 'Net Volley', 'sharp volley at net, quick reflexes, close to net'],
                ['⬆️', 'Jump Smash', 'overhead jumping smash, leaping high for the ball'],
                ['🏆', 'Selebrasi', 'victory celebration, arms raised high, racket pointing to sky'],
            ],
            venues: [
                ['🟢', 'Wimbledon Grass', 'iconic Wimbledon grass court, green lawn, white surroundings'],
                ['🔵', 'Hard Court', 'professional hard court, Australian Open or US Open style'],
                ['🟠', 'Clay Court', 'Roland Garros clay court, red clay surface, classic tennis'],
                ['🌙', 'Night Court', 'floodlit night tennis court, dramatic stadium atmosphere'],
            ],
            lighting: [
                ['☀️', 'Natural Outdoor', 'bright natural outdoor daylight, sunny day, crisp colors'],
                ['🌙', 'Stadium Night', 'stadium floodlights at night, dramatic arena atmosphere'],
                ['🌅', 'Golden Hour', 'golden hour sunset light, warm romantic atmosphere'],
            ],
        },
        'road cyclist mountain biker': {
            actions: [
                ['💨', 'Sprint Finish', 'explosive sprint finish, leaning aggressively over handlebars'],
                ['⛰️', 'Climb', 'mountain climb, standing on pedals, steep incline effort, pain and power'],
                ['⬇️', 'Downhill', 'fast dangerous downhill descent, leaning into sharp corner, speed blur'],
                ['🔄', 'Velodrome', 'velodrome track sprint, aerodynamic tuck position, banked track'],
                ['🚴', 'Peloton', 'large racing pack peloton formation, professional road race'],
                ['🏆', 'Selebrasi', 'stage finish celebration, arms raised triumphantly over handlebars'],
            ],
            venues: [
                ['⛰️', 'Mountain Trail', 'alpine mountain cycling trail, scenic peaks, winding road'],
                ['🏙️', 'City Race', 'professional road race through city streets, urban backdrop'],
                ['🏟️', 'Velodrome', 'indoor velodrome track, banked curves, wooden track'],
                ['🌊', 'Coastal Road', 'scenic coastal road, ocean cliffs, ocean views alongside'],
            ],
            lighting: [
                ['🌅', 'Morning Mist', 'early morning cycling, mist in valley, fresh golden sunrise light'],
                ['☀️', 'Siang Cerah', 'bright midday sun, clear sky, vibrant saturated colors'],
                ['🌅', 'Sunset Glow', 'sunset golden hour, warm glow, dramatic sky behind cyclist'],
            ],
        },
        'volleyball player': {
            actions: [
                ['💥', 'Spike Attack', 'powerful spike attack jump, slamming ball down hard over net'],
                ['🛡️', 'Block', 'two-player block at net, hands reaching high over, rejection'],
                ['⚡', 'Jump Serve', 'explosive jump serve motion, ball toss, powerful serving'],
                ['🏃', 'Diving Dig', 'diving dig receive, low body save, arms fully extended'],
                ['⬆️', 'Jump Set', 'high jump set, precise elegant hands, setting ball for attack'],
                ['🏆', 'Selebrasi', 'team celebration after winning point, group embrace, pumping fist'],
            ],
            venues: [
                ['🏖️', 'Beach Voli', 'beach volleyball sand court, ocean backdrop, palm trees, sunny'],
                ['🏛️', 'Indoor Court', 'professional indoor volleyball court, hard floor, team benches visible'],
                ['🏟️', 'Stadium', 'large volleyball stadium, packed excited crowd, Olympic level arena'],
            ],
            lighting: [
                ['🏖️', 'Beach Sunlight', 'bright tropical beach sunlight, natural vibrant outdoor setting'],
                ['💡', 'Arena Light', 'indoor arena professional lighting, bright even illumination'],
                ['🌅', 'Sunset Beach', 'sunset beach volleyball, golden dramatic sky, warm romantic light'],
            ],
        },
    };

    function initFotoOlahraga() {
        const foImageInput = document.getElementById('fo-image-input');
        const foUploadBox = document.getElementById('fo-upload-box');
        const foPreview = document.getElementById('fo-preview');
        const foPlaceholder = document.getElementById('fo-placeholder');
        const foRemoveBtn = document.getElementById('fo-remove-btn');
        const foSportOptions = document.getElementById('fo-sport-options');
        const foActionOptions = document.getElementById('fo-action-options');
        const foVenueOptions = document.getElementById('fo-venue-options');
        const foLightingOptions = document.getElementById('fo-lighting-options');
        const foRatioOptions = document.getElementById('fo-ratio-options');
        const foExtraInput = document.getElementById('fo-extra-input');
        const foGenerateBtn = document.getElementById('fo-generate-btn');
        const foResultsContainer = document.getElementById('fo-results-container');
        const foResultsGrid = document.getElementById('fo-results-grid');
        const foResultsPlaceholder = document.getElementById('fo-results-placeholder');
        const foClearBtn = document.getElementById('fo-clear-btn');
        const foCountSlider = document.getElementById('fo-count-slider');
        const foAutoConceptToggle = document.getElementById('fo-auto-concept');
        const foOptionsWrapper = document.getElementById('fo-options-wrapper');

        if (!foGenerateBtn) return;

        let foImageData = null;
        let foAutoConceptOn = false;
        let foPrivateServerActive = false;

        async function checkFoPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { foPrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                foPrivateServerActive = r.success && r.is_active;
            } catch (e) { foPrivateServerActive = false; }
        }
        checkFoPrivateServerStatus();

        foRatioOptions?.querySelector('[data-value="4:3"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        foAutoConceptToggle?.addEventListener('change', () => {
            foAutoConceptOn = foAutoConceptToggle.checked;
            if (foOptionsWrapper) {
                foOptionsWrapper.classList.toggle('opacity-50', foAutoConceptOn);
                foOptionsWrapper.classList.toggle('pointer-events-none', foAutoConceptOn);
            }
            updateGenerateBtn();
        });

        async function foGetAutoConceptPrompt() {
            const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || (GENERATE_URL || '').replace('/generate', '/chat');
            const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
            const base64ToBlob = window.base64ToBlob || function (b, m) { const bytes = atob(b); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); return new Blob([arr], { type: m }); };
            const fd = new FormData();
            fd.append('images[]', base64ToBlob(foImageData.base64, foImageData.mimeType));
            fd.append('prompt', 'Analyze this photo carefully — identify the person, their build and appearance, the setting, and any sports equipment or context visible. Determine the most spectacular and realistic sports action photograph concept that would best suit this specific person and image context. Return ONLY a complete, detailed image generation instruction in English (no explanations, no preamble) describing: the sport, the exact action/pose, the venue, the lighting, camera settings, and any special effects that make it cinematic. Preserve the person\'s facial features and identity. Be very specific and vivid. Start directly with the instruction.');
            const resp = await fetch(_chatUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: fd });
            if (!resp.ok) throw new Error('Gagal menghubungi AI untuk analisa foto.');
            const data = await resp.json();
            return (data.response || data.text || '').trim();
        }

        function attachOptionListeners(container) {
            container?.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                    btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
                    updateGenerateBtn();
                });
            });
        }

        function renderSportOptions(sportKey) {
            const data = SPORT_DATA[sportKey];
            if (!data) return;

            function buildGrid(items, cols) {
                return items.map(([emoji, label, value]) =>
                    `<button class="option-btn text-xs py-2 px-1 rounded-xl border-2 border-slate-200 text-slate-600 hover:border-teal-400 hover:bg-teal-50 transition-all" data-value="${value}">${emoji} ${label}</button>`
                ).join('');
            }

            if (foActionOptions) {
                foActionOptions.innerHTML = buildGrid(data.actions);
                attachOptionListeners(foActionOptions);
            }
            if (foVenueOptions) {
                foVenueOptions.innerHTML = buildGrid(data.venues);
                attachOptionListeners(foVenueOptions);
            }
            if (foLightingOptions) {
                foLightingOptions.innerHTML = buildGrid(data.lighting);
                attachOptionListeners(foLightingOptions);
            }
        }

        attachOptionListeners(foRatioOptions);

        foSportOptions?.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                foSportOptions.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
                renderSportOptions(btn.dataset.value);
                updateGenerateBtn();
            });
        });

        function updateGenerateBtn() {
            if (foAutoConceptOn) {
                foGenerateBtn.disabled = !foImageData;
            } else {
                const hasSport = foSportOptions?.querySelector('.selected');
                const hasAction = foActionOptions?.querySelector('.selected');
                foGenerateBtn.disabled = !(hasSport && hasAction);
            }
        }

        // --- Image upload helpers ---
        async function readFileAsBase64(file) {
            if (window.convertHeicToJpg) file = await window.convertHeicToJpg(file);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    const [header, base64] = dataUrl.split(',');
                    const mimeType = header.match(/:(.*?);/)[1];
                    resolve({ dataUrl, base64, mimeType, file });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function autoDetectRatio() {
            if (!foImageData) return;
            const img = new Image();
            img.onload = function () {
                const r = img.width / img.height;
                const best = r > 1.6 ? '16:9' : r > 1.1 ? '4:3' : r > 0.85 ? '1:1' : r > 0.6 ? '3:4' : '9:16';
                foRatioOptions?.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                foRatioOptions?.querySelector(`[data-value="${best}"]`)?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            };
            img.src = foImageData.dataUrl;
        }

        function setImage(data) {
            foImageData = data;
            foPreview.src = data.dataUrl;
            foPlaceholder.classList.add('hidden');
            foPreview.classList.remove('hidden');
            foRemoveBtn.classList.remove('hidden');
            autoDetectRatio();
        }

        function clearImage() {
            foImageData = null;
            if (foImageInput) foImageInput.value = '';
            foPreview.src = '#';
            foPreview.classList.add('hidden');
            foPlaceholder.classList.remove('hidden');
            foRemoveBtn.classList.add('hidden');
        }

        foImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        foUploadBox?.addEventListener('dragover', e => { e.preventDefault(); foUploadBox.classList.add('border-teal-400'); });
        foUploadBox?.addEventListener('dragleave', () => foUploadBox.classList.remove('border-teal-400'));
        foUploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            foUploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        foRemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        // --- Clear results ---
        if (foClearBtn) {
            foClearBtn.addEventListener('click', () => {
                foResultsGrid.innerHTML = '';
                foResultsContainer.classList.add('hidden');
                foResultsPlaceholder.classList.remove('hidden');
            });
        }

        // --- Generate ---
        foGenerateBtn.addEventListener('click', async () => {
            if (!foPrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }
            if (foAutoConceptOn && !foImageData) return;

            const ratio = foRatioOptions?.querySelector('.selected')?.dataset.value || '4:3';
            const originalBtnHTML = foGenerateBtn.innerHTML;
            foGenerateBtn.disabled = true;

            let prompt;
            try {
                if (foAutoConceptOn) {
                    foGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa foto...</span>`;
                    prompt = await foGetAutoConceptPrompt();
                    if (!prompt) throw new Error('AI tidak menghasilkan konsep. Coba lagi.');
                } else {
                    const sport = foSportOptions?.querySelector('.selected')?.dataset.value || 'athlete';
                    const action = foActionOptions?.querySelector('.selected')?.dataset.value || 'dynamic action pose';
                    const venue = foVenueOptions?.querySelector('.selected')?.dataset.value || 'sports field';
                    const lighting = foLightingOptions?.querySelector('.selected')?.dataset.value || 'natural daylight';
                    const extra = foExtraInput?.value.trim();
                    if (foImageData) {
                        prompt = `Using this reference photo as the athlete's face and appearance, create an ultra-realistic professional sports action photograph. The person in this image is a ${sport}, performing a ${action}, at ${venue}, with ${lighting}.`;
                        prompt += ` Preserve the facial features and identity of the person in the reference photo exactly. Place them in a full sports action scene.`;
                    } else {
                        prompt = `Ultra-realistic professional sports action photograph of a ${sport}, ${action}, at ${venue}, ${lighting}.`;
                    }
                    prompt += ` Captured with a high-speed DSLR camera, sharp focus on the athlete, motion blur on surroundings, dramatic composition, magazine quality sports photography.`;
                    if (extra) prompt += ` ${extra}.`;
                    prompt += ` Cinematic depth of field, 8K resolution, award-winning sports photo, National Geographic style.`;
                }
            } catch (err) {
                foGenerateBtn.disabled = false;
                foGenerateBtn.innerHTML = originalBtnHTML;
                alert(err.message);
                return;
            }

            foGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Foto...</span>`;
            foResultsPlaceholder.classList.add('hidden');
            foResultsContainer.classList.remove('hidden');

            const resultCount = parseInt(foCountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            foResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            foResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                foResultsGrid.appendChild(c);
                cards.push(c);
            }

            if (window.lucide) window.lucide.createIcons();

            const generateSingle = async (card) => {
                try {
                    const _generateUrl = (typeof GENERATE_URL !== 'undefined' ? GENERATE_URL : '') || '';
                    const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
                    const base64ToBlob = window.base64ToBlob || function (base64, mimeType) {
                        const bytes = atob(base64);
                        const arr = new Uint8Array(bytes.length);
                        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                        return new Blob([arr], { type: mimeType });
                    };
                    const formData = new FormData();
                    if (foImageData) {
                        formData.append('images[]', base64ToBlob(foImageData.base64, foImageData.mimeType));
                    }
                    formData.append('instruction', prompt);
                    formData.append('aspectRatio', ratio);
                    const response = await fetch(_generateUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: formData });
                    if (!response.ok) {
                        const errText = await response.text();
                        throw new Error(errText || `HTTP Error ${response.status}`);
                    }
                    const result = await response.json();
                    if (!result.success || !result.imageUrl) throw new Error('Tidak ada gambar yang dihasilkan.');
                    const imageUrl = result.imageUrl;
                    card.innerHTML = `
                        <img src="${imageUrl}" class="w-full h-full object-cover">
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat"><i data-lucide="eye" class="w-4 h-4"></i></button>
                            <a href="${imageUrl}" download="foto_olahraga.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
                        </div>`;
                    card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${aspectClass}`;
                } catch (err) {
                    card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">${err.message}</div>`;
                    if (window.errorSound) window.errorSound.play();
                }
            };

            try {
                await Promise.all(cards.map(card => generateSingle(card)));
                if (window.doneSound) window.doneSound.play();
            } finally {
                foGenerateBtn.disabled = false;
                foGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFotoOlahraga);
    } else {
        initFotoOlahraga();
    }
})();
