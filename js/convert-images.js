window.initConvertImages = function(deps) {
    const { document, lucide, convertHeicToJpg } = deps;

    // Tab switching
    const singleTab = document.getElementById('convert-tab-single');
    const batchTab = document.getElementById('convert-tab-batch');
    const singleContent = document.getElementById('convert-single-content');
    const batchContent = document.getElementById('convert-batch-content');

    const switchTab = (tab) => {
        if (tab === 'single') {
            singleTab.classList.add('border-slate-700', 'bg-white', 'text-slate-700');
            singleTab.classList.remove('border-transparent', 'text-slate-500');
            batchTab.classList.remove('border-slate-700', 'bg-white', 'text-slate-700');
            batchTab.classList.add('border-transparent', 'text-slate-500');
            singleContent.classList.remove('hidden');
            batchContent.classList.add('hidden');
        } else {
            batchTab.classList.add('border-slate-700', 'bg-white', 'text-slate-700');
            batchTab.classList.remove('border-transparent', 'text-slate-500');
            singleTab.classList.remove('border-slate-700', 'bg-white', 'text-slate-700');
            singleTab.classList.add('border-transparent', 'text-slate-500');
            batchContent.classList.remove('hidden');
            singleContent.classList.add('hidden');
        }
    };

    if (singleTab) singleTab.addEventListener('click', () => switchTab('single'));
    if (batchTab) batchTab.addEventListener('click', () => switchTab('batch'));

    // Single Convert Mode
    const fileInput = document.getElementById('convert-file-input');
    const dropZone = document.getElementById('convert-drop-zone');
    const formatSelect = document.getElementById('convert-format-select');
    const uploadSection = document.getElementById('convert-upload-section');
    const previewSection = document.getElementById('convert-preview-section');
    const resultSection = document.getElementById('convert-result-section');
    const imagesList = document.getElementById('convert-images-list');
    const processBtn = document.getElementById('convert-process-btn');
    const downloadSection = document.getElementById('convert-download-section');
    const resetBtn = document.getElementById('convert-reset-btn');
    const alertBox = document.getElementById('convert-alert');

    let selectedFiles = [];

    // File upload
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-emerald-500', 'bg-emerald-50');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-emerald-500', 'bg-emerald-50');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-emerald-500', 'bg-emerald-50');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                handleFiles(files);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                handleFiles(files);
            }
        });
    }

    const handleFiles = async (files) => {
        if (files.length > 1) {
            showAlert('Single Convert hanya untuk 1 gambar. Gunakan Batch Convert untuk multiple gambar.', 'warning');
            return;
        }

        selectedFiles = [];
        imagesList.innerHTML = '';

        const file = files[0];
        let processedFile = file;
        
        // Convert HEIC to JPG if needed
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
            try {
                processedFile = await convertHeicToJpg(file);
            } catch (e) {
                console.error('HEIC conversion failed:', e);
            }
        }

        selectedFiles.push(processedFile);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-emerald-200 shadow-sm';
            item.innerHTML = `
                <img src="${e.target.result}" class="w-24 h-24 object-cover rounded-xl shadow-md">
                <div class="flex-1">
                    <p class="text-base font-bold text-slate-800 mb-1">${processedFile.name}</p>
                    <p class="text-xs text-slate-500">Ukuran: ${(processedFile.size / 1024).toFixed(1)} KB</p>
                    <div class="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                        <i data-lucide="check-circle" class="w-3 h-3"></i>
                        <span>Siap dikonversi</span>
                    </div>
                </div>
            `;
            imagesList.appendChild(item);
            if (lucide) lucide.createIcons();
        };
        reader.readAsDataURL(processedFile);

        previewSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
    };

    // Process conversion
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            const format = formatSelect.value;
            const quality = 0.95; // High quality automatic

            processBtn.disabled = true;
            processBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Memproses...';
            if (lucide) lucide.createIcons();

            const convertedFiles = [];

            for (const file of selectedFiles) {
                try {
                    const converted = await convertImage(file, format, quality);
                    convertedFiles.push(converted);
                } catch (e) {
                    console.error('Conversion error:', e);
                }
            }

            displayResults(convertedFiles, format);
            processBtn.disabled = false;
            processBtn.innerHTML = '<i data-lucide="refresh-cw" class="w-5 h-5 relative z-10"></i><span class="relative z-10">Konversi Gambar</span>';
            if (lucide) lucide.createIcons();
        });
    }

    // Helper functions for vector format conversion
    const createSVGFromCanvas = (canvas, width, height) => {
        const dataUrl = canvas.toDataURL('image/png');
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <image width="${width}" height="${height}" xlink:href="${dataUrl}"/>
</svg>`;
    };

    const createEPSWrapper = (canvas, width, height) => {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = jpegDataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        let hexData = '';
        for (let i = 0; i < binaryStr.length; i += 40) {
            const chunk = binaryStr.slice(i, Math.min(i + 40, binaryStr.length));
            hexData += Array.from(chunk, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('') + '\n';
        }
        return `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${width} ${height}
%%LanguageLevel: 3
%%Creator: SulapFoto Convert
%%EndComments
%%Page: 1 1
gsave
0 0 translate
${width} ${height} scale
<<
  /ImageType 1
  /Width ${width}
  /Height ${height}
  /BitsPerComponent 8
  /ColorSpace /DeviceRGB
  /Decode [0 1 0 1 0 1]
  /ImageMatrix [${width} 0 0 -${height} 0 ${height}]
  /DataSource currentfile /ASCIIHexDecode filter /DCTDecode filter
>>
image
${hexData}>
grestore
showpage
%%Trailer
%%EOF`;
    };

    const createCDRWrapper = (canvas, width, height) => {
        const dataUrl = canvas.toDataURL('image/png');
        return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Import file ini ke CorelDRAW via File > Import -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="${dataUrl}"/>
</svg>`;
    };

    const convertImage = (file, format, quality) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    let mimeType = 'image/png';
                    let extension = 'png';

                    switch(format) {
                        case 'jpg':
                            mimeType = 'image/jpeg';
                            extension = 'jpg';
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            extension = 'webp';
                            break;
                        case 'svg':
                            mimeType = 'image/svg+xml';
                            extension = 'svg';
                            break;
                        case 'eps':
                            mimeType = 'application/postscript';
                            extension = 'eps';
                            break;
                        case 'cdr':
                            mimeType = 'application/x-coreldraw';
                            extension = 'cdr';
                            break;
                        case 'bmp':
                            mimeType = 'image/bmp';
                            extension = 'bmp';
                            break;
                        case 'gif':
                            mimeType = 'image/gif';
                            extension = 'gif';
                            break;
                        case 'tiff':
                            mimeType = 'image/tiff';
                            extension = 'tiff';
                            break;
                        case 'ico':
                            mimeType = 'image/x-icon';
                            extension = 'ico';
                            break;
                        default:
                            mimeType = 'image/png';
                            extension = 'png';
                    }

                    // Special handling for vector formats
                    if (format === 'svg') {
                        const svgContent = createSVGFromCanvas(canvas, img.width, img.height);
                        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                        const fileName = file.name.replace(/\.[^/.]+$/, '') + '.svg';
                        const convertedFile = new File([blob], fileName, { type: 'image/svg+xml' });
                        resolve(convertedFile);
                    } else if (format === 'eps' || format === 'cdr') {
                        const content = format === 'eps' 
                            ? createEPSWrapper(canvas, img.width, img.height)
                            : createCDRWrapper(canvas, img.width, img.height);
                        const blob = new Blob([content], { type: mimeType });
                        const fileName = file.name.replace(/\.[^/.]+$/, '') + '.' + extension;
                        const convertedFile = new File([blob], fileName, { type: mimeType });
                        resolve(convertedFile);
                    } else {
                        // Standard raster formats
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const fileName = file.name.replace(/\.[^/.]+$/, '') + '.' + extension;
                                const convertedFile = new File([blob], fileName, { type: mimeType });
                                resolve(convertedFile);
                            } else {
                                reject(new Error('Conversion failed'));
                            }
                        }, mimeType, quality);
                    }
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    };

    const displayResults = (files, format) => {
        if (!files || files.length === 0) {
            showAlert('Konversi gagal. Coba lagi.', 'error');
            return;
        }

        const resultInfo = document.getElementById('convert-result-info');
        if (resultInfo) {
            resultInfo.textContent = `Gambar berhasil dikonversi ke ${format.toUpperCase()}`;
        }

        const vectorFormats = ['svg', 'eps', 'cdr'];
        const isVector = vectorFormats.includes(format);
        const iconName = isVector ? 'file-code-2' : 'file-image';
        const iconColor = isVector ? 'from-purple-400 to-violet-500' : 'from-emerald-400 to-teal-500';

        downloadSection.innerHTML = '';
        const file = files[0];
        const url = URL.createObjectURL(file);
        const btn = document.createElement('a');
        btn.href = url;
        btn.download = file.name;
        btn.className = 'flex items-center justify-between p-5 bg-white border-2 border-emerald-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-sm hover:shadow-md group';
        btn.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-md">
                    <i data-lucide="${iconName}" class="w-6 h-6 text-white"></i>
                </div>
                <div>
                    <p class="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">${file.name}</p>
                    <p class="text-xs text-slate-500">Ukuran: ${(file.size / 1024).toFixed(1)} KB • Format: ${format.toUpperCase()}</p>
                    ${isVector ? `<p class="text-xs text-purple-600 font-semibold mt-1">Format Vector</p>` : ''}
                </div>
            </div>
            <div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 group-hover:bg-emerald-600 transition-colors">
                <i data-lucide="download" class="w-5 h-5 text-white"></i>
                <span class="text-sm font-bold text-white">Download</span>
            </div>
        `;
        downloadSection.appendChild(btn);

        if (lucide) lucide.createIcons();

        previewSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
    };

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            selectedFiles = [];
            fileInput.value = '';
            previewSection.classList.add('hidden');
            resultSection.classList.add('hidden');
            imagesList.innerHTML = '';
            downloadSection.innerHTML = '';
            if (lucide) lucide.createIcons();
        });
    }

    // Batch Convert Mode
    const batchFileInput = document.getElementById('batch-convert-file-input');
    const batchDropZone = document.getElementById('batch-convert-drop-zone');
    const batchFormatSelect = document.getElementById('batch-convert-format-select');
    const batchUploadSection = document.getElementById('batch-convert-upload-section');
    const batchPreviewSection = document.getElementById('batch-convert-preview-section');
    const batchProgressSection = document.getElementById('batch-convert-progress-section');
    const batchResultSection = document.getElementById('batch-convert-result-section');
    const batchCount = document.getElementById('batch-convert-count');
    const batchProcessBtn = document.getElementById('batch-convert-process-btn');
    const batchProgressBar = document.getElementById('batch-convert-progress-bar');
    const batchProgressText = document.getElementById('batch-convert-progress-text');
    const batchStatusText = document.getElementById('batch-convert-status-text');
    const batchResultInfo = document.getElementById('batch-convert-result-info');
    const batchDownloadAllBtn = document.getElementById('batch-convert-download-all-btn');
    const batchResetBtn = document.getElementById('batch-convert-reset-btn');

    let batchFiles = [];
    let batchConvertedFiles = [];

    if (batchDropZone && batchFileInput) {
        batchDropZone.addEventListener('click', () => batchFileInput.click());
        
        batchDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            batchDropZone.classList.add('border-emerald-500', 'bg-emerald-50');
        });

        batchDropZone.addEventListener('dragleave', () => {
            batchDropZone.classList.remove('border-emerald-500', 'bg-emerald-50');
        });

        batchDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            batchDropZone.classList.remove('border-emerald-500', 'bg-emerald-50');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                handleBatchFiles(files);
            }
        });

        batchFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                handleBatchFiles(files);
            }
        });
    }

    const handleBatchFiles = async (files) => {
        if (files.length > 50) {
            showAlert('Maksimal 50 gambar untuk batch convert.', 'warning');
            return;
        }

        batchFiles = [];
        for (const file of files) {
            let processedFile = file;
            if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
                try {
                    processedFile = await convertHeicToJpg(file);
                } catch (e) {
                    console.error('HEIC conversion failed:', e);
                }
            }
            batchFiles.push(processedFile);
        }

        if (batchCount) batchCount.textContent = batchFiles.length;
        batchUploadSection.classList.add('hidden');
        batchPreviewSection.classList.remove('hidden');
        batchProgressSection.classList.add('hidden');
        batchResultSection.classList.add('hidden');
    };

    if (batchProcessBtn) {
        batchProcessBtn.addEventListener('click', async () => {
            const format = batchFormatSelect.value;
            const quality = 0.95; // High quality automatic

            batchPreviewSection.classList.add('hidden');
            batchProgressSection.classList.remove('hidden');
            batchConvertedFiles = [];

            for (let i = 0; i < batchFiles.length; i++) {
                try {
                    const converted = await convertImage(batchFiles[i], format, quality);
                    batchConvertedFiles.push(converted);
                    
                    const progress = Math.round(((i + 1) / batchFiles.length) * 100);
                    if (batchProgressBar) batchProgressBar.style.width = progress + '%';
                    if (batchProgressText) batchProgressText.textContent = progress + '%';
                    if (batchStatusText) batchStatusText.textContent = `Memproses ${i + 1} dari ${batchFiles.length}...`;
                } catch (e) {
                    console.error('Batch conversion error:', e);
                }
            }

            if (batchResultInfo) {
                batchResultInfo.textContent = `${batchConvertedFiles.length} gambar berhasil dikonversi ke ${format.toUpperCase()}`;
            }

            batchProgressSection.classList.add('hidden');
            batchResultSection.classList.remove('hidden');
        });
    }

    if (batchDownloadAllBtn) {
        batchDownloadAllBtn.addEventListener('click', async () => {
            if (typeof JSZip === 'undefined') {
                showAlert('JSZip library tidak tersedia', 'error');
                return;
            }

            const zip = new JSZip();
            batchConvertedFiles.forEach((file) => {
                zip.file(file.name, file);
            });

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted-images.zip';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (batchResetBtn) {
        batchResetBtn.addEventListener('click', () => {
            batchFiles = [];
            batchConvertedFiles = [];
            batchFileInput.value = '';
            batchUploadSection.classList.remove('hidden');
            batchPreviewSection.classList.add('hidden');
            batchProgressSection.classList.add('hidden');
            batchResultSection.classList.add('hidden');
        });
    }

    const showAlert = (message, type = 'info') => {
        if (!alertBox) return;
        const colors = {
            info: 'bg-blue-50 border-blue-200 text-blue-700',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
            error: 'bg-red-50 border-red-200 text-red-700'
        };
        alertBox.className = `p-4 rounded-lg border ${colors[type] || colors.info}`;
        alertBox.textContent = message;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 5000);
    };
};
