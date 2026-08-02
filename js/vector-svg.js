window.initVectorSvg = function (ctx = {}) {
    const {
        document,
        setupOptionButtons,
        getAspectRatioClass,
        lucide,
        getApiKey,
        GENERATE_URL,
        getApiErrorMessage,
        doneSound,
        errorSound,
        convertHeicToJpg
    } = ctx;

    const vsModeVector = document.getElementById('vs-mode-vector');
    const vsModeSvg = document.getElementById('vs-mode-svg');
    const vsVectorSection = document.getElementById('vs-vector-section');
    const vsSvgSection = document.getElementById('vs-svg-section');
    const vsVectorImageInput = document.getElementById('vs-vector-image-input');
    const vsVectorImagePreview = document.getElementById('vs-vector-image-preview');
    const vsVectorUploadPlaceholder = document.getElementById('vs-vector-upload-placeholder');
    const vsVectorRatio = document.getElementById('vs-vector-ratio');
    const vsVectorStyle = document.getElementById('vs-vector-style');
    const vsVectorInstruction = document.getElementById('vs-vector-instruction');
    const vsSvgDesc = document.getElementById('vs-svg-desc');
    const vsSvgRatio = document.getElementById('vs-svg-ratio');
    const vsSvgStyle = document.getElementById('vs-svg-style');
    const vsSvgInstruction = document.getElementById('vs-svg-instruction');
    const vsCountSlider = document.getElementById('vs-count-slider');
    const vsCountValue = document.getElementById('vs-count-value');
    const vsGenerateBtn = document.getElementById('vs-generate-btn');
    const vsGenerateText = document.getElementById('vs-generate-text');
    const vsStepNumber = document.getElementById('vs-step-number');
    const vsResultsPlaceholder = document.getElementById('vs-results-placeholder');
    const vsResultsGrid = document.getElementById('vs-results-grid');
    const vsVectorRemoveBg = document.getElementById('vs-vector-removebg');

    if (!vsGenerateBtn) return null;

    let currentMode = 'vector';
    let uploadedVectorImage = null;
    let detectedRatio = '1:1';

    function setMode(mode) {
        currentMode = mode;
        if (mode === 'vector') {
            vsModeVector.classList.add('bg-white', 'text-teal-700', 'shadow-sm');
            vsModeVector.classList.remove('text-slate-500');
            vsModeSvg.classList.add('text-slate-500');
            vsModeSvg.classList.remove('bg-white', 'text-teal-700', 'shadow-sm');
            vsVectorSection.classList.remove('hidden');
            vsSvgSection.classList.add('hidden');
            vsGenerateText.textContent = 'Buat Vector';
            vsStepNumber.textContent = '5';
        } else {
            vsModeSvg.classList.add('bg-white', 'text-teal-700', 'shadow-sm');
            vsModeSvg.classList.remove('text-slate-500');
            vsModeVector.classList.add('text-slate-500');
            vsModeVector.classList.remove('bg-white', 'text-teal-700', 'shadow-sm');
            vsSvgSection.classList.remove('hidden');
            vsVectorSection.classList.add('hidden');
            vsGenerateText.textContent = 'Buat SVG';
            vsStepNumber.textContent = '5';
        }
    }

    vsModeVector.addEventListener('click', () => setMode('vector'));
    vsModeSvg.addEventListener('click', () => setMode('svg'));

    setupOptionButtons(vsVectorRatio);
    setupOptionButtons(vsVectorStyle);
    setupOptionButtons(vsSvgRatio);
    setupOptionButtons(vsSvgStyle);

    if (vsCountSlider && vsCountValue) {
        vsCountSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            vsCountValue.textContent = `${val} Gambar`;
        });
    }

    function detectRatioFromImage(width, height) {
        const aspectRatio = width / height;
        const ratios = {
            '1:1': 1,
            '3:4': 0.75,
            '4:3': 1.333,
            '9:16': 0.5625,
            '16:9': 1.778
        };
        
        let closestRatio = '1:1';
        let minDiff = Math.abs(aspectRatio - ratios['1:1']);
        
        for (const [ratio, value] of Object.entries(ratios)) {
            const diff = Math.abs(aspectRatio - value);
            if (diff < minDiff) {
                minDiff = diff;
                closestRatio = ratio;
            }
        }
        
        return closestRatio;
    }

    vsVectorImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            let processedFile = file;
            if (file.type === 'image/heic' && typeof convertHeicToJpg === 'function') {
                processedFile = await convertHeicToJpg(file);
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                uploadedVectorImage = ev.target.result;
                const img = new Image();
                img.onload = () => {
                    detectedRatio = detectRatioFromImage(img.width, img.height);
                    
                    vsVectorRatio.querySelectorAll('.option-btn').forEach(btn => {
                        btn.classList.remove('selected');
                        if (btn.dataset.value === detectedRatio) {
                            btn.classList.add('selected');
                        }
                    });
                    
                    vsVectorImagePreview.src = uploadedVectorImage;
                    vsVectorImagePreview.classList.remove('hidden');
                    vsVectorUploadPlaceholder.classList.add('hidden');
                };
                img.src = uploadedVectorImage;
            };
            reader.readAsDataURL(processedFile);
        } catch (err) {
            console.error('Error loading image:', err);
            alert('Gagal memuat gambar.');
        }
    });

    function getResultGridCols(count) {
        return (parseInt(count) || 1) > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';
    }

    function getStylePrompt(style, isVector = true) {
        const stylePrompts = {
            'colorful': {
                vector: 'Vibrant colorful vector illustration bursting with energy and life. Use rich, saturated colors from across the spectrum - reds, blues, greens, purples, yellows in harmonious combinations. Bold color blocking with high contrast. Cheerful, eye-catching, dynamic aesthetic. Professional color theory with complementary and analogous color schemes. Modern, joyful, Instagram-worthy visual impact.',
                svg: 'Colorful vibrant SVG with rich saturated colors across the spectrum. Use multiple bold colors in harmonious balance - reds, oranges, yellows, greens, blues, purples. High contrast color blocking with energy and visual pop. Cheerful, modern, eye-catching design with professional color harmony. Perfect for logos, illustrations, and playful designs.'
            },
            'minimalist': {
                vector: 'Ultra-clean minimalist vector illustration with maximum simplicity. Use only essential shapes with plenty of negative space. Limited color palette (2-3 colors max). Extremely clean lines, no unnecessary details. Focus on clarity and modern elegance. Think Apple or Muji design aesthetic.',
                svg: 'Minimalist SVG design with ultra-simple geometric shapes. Use solid colors only, maximum 3 colors. Clean lines, no gradients, no textures. Emphasize white space and breathing room. Simple, elegant, modern, and timeless design suitable for icons and logos.'
            },
            'gradient': {
                vector: 'Vibrant gradient vector illustration with smooth color transitions. Use multiple gradient layers for depth and dimension. Rich color blends from 3-5 complementary colors. Soft edges with flowing transitions. Modern, eye-catching, Instagram-worthy aesthetic with professional color harmony.',
                svg: 'SVG with beautiful gradient fills and smooth color transitions. Use radial and linear gradients for depth. Blend 3-5 harmonious colors seamlessly. Create dimension through color transitions rather than shapes. Modern, trendy, visually striking with professional color grading.'
            },
            'line-art': {
                vector: 'Elegant line art vector with precise stroke work. Use only outlines, no fills. Varying line weights (thin to thick) for emphasis and hierarchy. Clean, continuous lines with professional pen-like quality. Sophisticated monochrome aesthetic with perfect line consistency and detail.',
                svg: 'Pure line art SVG with no fills, only outlines. Precise stroke paths with varying weights for visual interest. Clean, continuous lines with professional illustration quality. Sophisticated single-color (black/dark) line work. Perfect for engraving or stamp-like aesthetic.'
            },
            'geometric': {
                vector: 'Strict geometric vector using only perfect shapes: circles, triangles, squares, hexagons. Mathematical precision with symmetrical arrangements. Bold colors in each shape. Grid-based composition with clean alignment. Modern, structured, architectural feel with perfect geometric harmony.',
                svg: 'Geometric SVG composed entirely of basic shapes arranged in harmonious patterns. Use circles, triangles, polygons with mathematical precision. Symmetrical or grid-based layouts. Bold solid colors per shape. Modern, architectural, perfectly aligned geometric composition.'
            },
            'isometric': {
                vector: 'Isometric 3D vector illustration with perfect 30° angles. Create depth using isometric grid perspective. Layered elements with subtle shadows for dimension. Bright, cheerful colors with clear object separation. Technical illustration quality with precise geometric 3D representation.',
                svg: 'Isometric 3D SVG with perfect angular perspective (30° angles). Create dimensional objects using isometric projection. Layer shapes to build 3D forms. Use subtle shadows for depth. Clean, technical, architectural visualization style with precise measurements.'
            },
            'cartoon': {
                vector: 'Playful cartoon vector with exaggerated features and fun proportions. Bold outlines with bright, cheerful colors. Simplified shapes with expressive character. Friendly, approachable aesthetic. Think Pixar/Disney style with professional animation-ready quality and personality.',
                svg: 'Cartoon-style SVG with playful, exaggerated features. Bold outlines with vibrant happy colors. Simplified but expressive shapes. Fun, friendly, and approachable character design. Professional animation aesthetic with smooth curves and cheerful personality.'
            },
            'retro': {
                vector: 'Vintage retro vector with 1960s-80s design aesthetic. Use muted, nostalgic color palette (burnt orange, mustard yellow, avocado green, brown tones). Slightly imperfect shapes with analog feel. Groovy curves, sunburst patterns, retro typography influences. Authentic vintage poster quality.',
                svg: 'Retro vintage SVG with nostalgic 70s-80s vibes. Use period-appropriate colors: burnt orange, mustard, teal, brown. Groovy shapes with analog imperfections. Sunburst rays, geometric patterns, vintage poster aesthetic. Authentic retro design with period-correct styling.'
            },
            'abstract': {
                vector: 'Abstract artistic vector with non-representational flowing forms. Organic shapes with dynamic movement and rhythm. Bold color combinations with artistic freedom. Balance chaos with composition. Professional contemporary art aesthetic with intentional asymmetry and visual flow.',
                svg: 'Abstract art SVG with non-literal flowing shapes and forms. Dynamic composition with movement and energy. Bold artistic color choices. Organic curves mixed with angular shapes. Contemporary art gallery quality with intentional composition and visual rhythm.'
            },
            'monochrome': {
                vector: 'Monochromatic vector using single color in multiple shades and tints. Create depth through tone variation (5-7 shades of one hue). Sophisticated use of light/dark contrast. Elegant, professional, minimalist aesthetic. Perfect tonal harmony with subtle gradations.',
                svg: 'Monochrome SVG using single color family with tonal variations. Use 5-7 different shades/tints of one hue for depth. Create dimension through lightness/darkness rather than multiple colors. Sophisticated, elegant, professional aesthetic with perfect tonal balance.'
            }
        };
        
        return stylePrompts[style] ? (isVector ? stylePrompts[style].vector : stylePrompts[style].svg) : '';
    }

    vsGenerateBtn.addEventListener('click', async () => {
        const count = parseInt(vsCountSlider.value) || 1;
        let promptText = '';
        let imageParts = [];
        let ratio = '1:1';
        let size = 1024;

        if (currentMode === 'vector') {
            if (!uploadedVectorImage) {
                alert('Mohon upload gambar terlebih dahulu.');
                return;
            }
            const base64 = uploadedVectorImage.split(',')[1];
            const mimeType = uploadedVectorImage.split(';')[0].split(':')[1];
            imageParts.push({ inlineData: { mimeType, data: base64 } });
            
            const selectedStyle = vsVectorStyle.querySelector('.selected')?.dataset.value || 'colorful';
            const stylePrompt = getStylePrompt(selectedStyle, true);
            const additionalInstruction = vsVectorInstruction?.value.trim() || '';
            promptText = `Convert this image to a vector illustration. ${stylePrompt} Maintain the main subject and composition while applying this style consistently.`;
            if (additionalInstruction) {
                promptText += ` Additional instructions: ${additionalInstruction}`;
            }
            ratio = vsVectorRatio.querySelector('.selected')?.dataset.value || detectedRatio;
        } else {
            const desc = vsSvgDesc.value.trim();
            if (!desc) {
                alert('Mohon masukkan deskripsi SVG terlebih dahulu.');
                return;
            }
            
            const selectedStyle = vsSvgStyle.querySelector('.selected')?.dataset.value || 'colorful';
            const stylePrompt = getStylePrompt(selectedStyle, false);
            const additionalInstruction = vsSvgInstruction?.value.trim() || '';
            promptText = `Create an illustration based on: "${desc}". ${stylePrompt} Ensure the final result has a transparent background suitable for SVG export.`;
            if (additionalInstruction) {
                promptText += ` Additional instructions: ${additionalInstruction}`;
            }
            ratio = vsSvgRatio.querySelector('.selected')?.dataset.value || '1:1';
        }

        const originalBtnHTML = vsGenerateBtn.innerHTML;
        const originalBtnStyle = vsGenerateBtn.style.background;

        vsGenerateBtn.disabled = true;
        vsGenerateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crown w-5 h-5 vip-loading-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="ml-2">Sedang Membuat...</span>`;
        vsGenerateBtn.classList.add('cursor-not-allowed', '!opacity-100');

        try {
            vsResultsPlaceholder.classList.add('hidden');
            vsResultsGrid.classList.remove('hidden');
            vsResultsGrid.className = `grid gap-4 ${getResultGridCols(count)}`;
            vsResultsGrid.innerHTML = '';

            for (let i = 0; i < count; i++) {
                const placeholder = document.createElement('div');
                placeholder.id = `vs-result-${i}`;
                let aspectClass = 'aspect-square';
                if (ratio === '16:9') aspectClass = 'aspect-video';
                else if (ratio === '9:16') aspectClass = 'aspect-[9/16]';
                else if (ratio === '3:4') aspectClass = 'aspect-[3/4]';
                else if (ratio === '4:3') aspectClass = 'aspect-[4/3]';
                placeholder.className = `card ${aspectClass} w-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl`;
                const tips = ["AI sedang mendesain...", "Membuat shapes...", "Menambahkan warna...", "Finishing touches..."];
                const randomTip = tips[Math.floor(Math.random() * tips.length)];
                placeholder.innerHTML = `
                    <div class="flex flex-col items-center gap-3 text-center p-4">
                        <div class="spinner"></div>
                        <div>
                            <span class="text-sm font-semibold text-slate-600 block">${currentMode === 'vector' ? 'Vector' : 'SVG'} ${i + 1}</span>
                            <span class="text-xs text-slate-400 mt-1 block">${randomTip}</span>
                        </div>
                    </div>`;
                vsResultsGrid.appendChild(placeholder);
            }

            const generateSingle = async (index) => {
                const card = document.getElementById(`vs-result-${index}`);
                try {
                    const formData = new FormData();
                    
                    if (imageParts.length > 0) {
                        const base64 = imageParts[0].inlineData.data;
                        const mimeType = imageParts[0].inlineData.mimeType;
                        const blob = base64ToBlob(base64, mimeType);
                        formData.append('images[]', blob);
                    }
                    
                    formData.append('instruction', promptText);
                    formData.append('aspectRatio', ratio);

                    const response = await fetch(GENERATE_URL, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': getApiKey()
                        },
                        body: formData
                    });

                    if (!response.ok) throw new Error(await getApiErrorMessage(response));
                    const result = await response.json();

                    if (!result.success || !result.imageUrl) throw new Error('Gagal membuat gambar (No data).');

                    let finalImageUrl = result.imageUrl;

                    const shouldRemoveBg = true;

                    if (shouldRemoveBg) {
                        const modeLabel = currentMode === 'svg' ? 'SVG' : 'Vector';
                        card.innerHTML = `
                            <div class="flex flex-col items-center gap-3 text-center p-4">
                                <div class="spinner"></div>
                                <div>
                                    <span class="text-sm font-semibold text-slate-600 block">${modeLabel} ${index + 1}</span>
                                    <span class="text-xs text-slate-400 mt-1 block">Menghapus background...</span>
                                </div>
                            </div>`;

                        try {
                            const bgAbort = new AbortController();
                            const bgTimeout = setTimeout(() => bgAbort.abort(), 30000);
                            const removeBgResponse = await fetch('/server/removebg_proxy.php?action=removebg_from_url', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-API-Key': getApiKey()
                                },
                                body: JSON.stringify({
                                    imageUrl: result.imageUrl
                                }),
                                signal: bgAbort.signal
                            });
                            clearTimeout(bgTimeout);

                            if (removeBgResponse.ok) {
                                const removeBgResult = await removeBgResponse.json();
                                if (removeBgResult.success && removeBgResult.imageUrl) {
                                    finalImageUrl = removeBgResult.imageUrl;
                                }
                            }
                        } catch (bgErr) {
                            console.warn('Background removal failed, using original:', bgErr);
                        }
                    }

                    const bgWasRemoved = finalImageUrl !== result.imageUrl;
                    const previewFn = (typeof window.openTiImagePreview === 'function') ? `window.openTiImagePreview('${finalImageUrl}')` : `window.open('${finalImageUrl}', '_blank')`;

                    const checkerBg = 'bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%,transparent_75%,#f0f0f0_75%,#f0f0f0),linear-gradient(45deg,#f0f0f0_25%,transparent_25%,transparent_75%,#f0f0f0_75%,#f0f0f0)] bg-[length:20px_20px] bg-[0_0,10px_10px]';
                    const bgClass = bgWasRemoved ? checkerBg : 'bg-white';

                    card.className = `card overflow-hidden relative ${bgClass} ${getAspectRatioClass(ratio)} rounded-2xl shadow-sm`;
                    card.style.height = 'auto';

                    let downloadBtn;
                    if (currentMode === 'svg') {
                        const downloadId = `vs-svg-download-${index}-${Date.now()}`;
                        downloadBtn = `<button id="${downloadId}" class="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-1.5" title="Download SVG">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            <span>Unduh SVG</span>
                        </button>`;
                        setTimeout(() => {
                            const btn = document.getElementById(downloadId);
                            if (btn) {
                                btn.onclick = () => convertPngToSvg(finalImageUrl, `svg_${Date.now()}_${index}.svg`);
                            }
                        }, 100);
                    } else {
                        downloadBtn = `<a href="${finalImageUrl}" download="vector_nobg_${Date.now()}_${index}.png" class="result-action-btn download-btn shadow-md" title="Unduh">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>`;
                    }
                    
                    card.innerHTML = `
                        <img src="${finalImageUrl}" class="w-full h-full object-contain shadow-sm cursor-pointer" onclick="${previewFn}">
                        <div class="absolute bottom-2 right-2 flex gap-2">
                            <button onclick="${previewFn}" class="result-action-btn view-btn shadow-md bg-white text-slate-700 hover:bg-slate-100" title="Lihat">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                            ${downloadBtn}
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons({ el: card });
                } catch (e) {
                    console.error(`Error generating ${currentMode} ${index}:`, e);
                    card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center break-words w-full">${e.message}</div>`;
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

            const convertPngToSvg = (dataUrl, filename) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${img.width}" height="${img.height}" viewBox="0 0 ${img.width} ${img.height}">
  <image width="${img.width}" height="${img.height}" xlink:href="${dataUrl}"/>
</svg>`;
                    
                    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                };
                img.src = dataUrl;
            };

            const promises = [];
            for (let i = 0; i < count; i++) {
                promises.push(generateSingle(i));
            }
            await Promise.allSettled(promises);
            if (typeof doneSound !== 'undefined') doneSound.play();
        } catch (e) {
            if (typeof errorSound !== 'undefined') errorSound.play();
            console.error(e);
            alert('Terjadi kesalahan: ' + e.message);
        } finally {
            vsGenerateBtn.disabled = false;
            vsGenerateBtn.innerHTML = originalBtnHTML;
            vsGenerateBtn.style.background = originalBtnStyle;
            vsGenerateBtn.classList.remove('cursor-not-allowed', '!opacity-100');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });

    return {
        cleanup: () => {
            console.log('Vector SVG cleanup');
        }
    };
};
