(function() {
    let uploadedFiles = [];
    let compressedResults = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    
    // Batch compress variables
    let batchFiles = [];
    let batchCompressedResults = [];
    let batchTotalOriginalSize = 0;
    let batchTotalCompressedSize = 0;

    const elements = {
        // Tab elements
        tabSingle: document.getElementById('compress-tab-single'),
        tabBatch: document.getElementById('compress-tab-batch'),
        singleContent: document.getElementById('compress-single-content'),
        batchContent: document.getElementById('compress-batch-content'),
        
        // Single compress elements
        dropZone: document.getElementById('compress-drop-zone'),
        fileInput: document.getElementById('compress-file-input'),
        uploadSection: document.getElementById('compress-upload-section'),
        previewSection: document.getElementById('compress-preview-section'),
        resultSection: document.getElementById('compress-result-section'),
        imagesList: document.getElementById('compress-images-list'),
        levelSelect: document.getElementById('compress-level-select'),
        processBtn: document.getElementById('compress-process-btn'),
        resetBtn: document.getElementById('compress-reset-btn'),
        alertBox: document.getElementById('compress-alert'),
        percentText: document.getElementById('compress-percent-text'),
        progressCircle: document.getElementById('compress-progress-circle'),
        resultTitle: document.getElementById('compress-result-title'),
        resultSize: document.getElementById('compress-result-size'),
        downloadSection: document.getElementById('compress-download-section'),
        
        // Batch compress elements
        batchDropZone: document.getElementById('batch-drop-zone'),
        batchFileInput: document.getElementById('batch-file-input'),
        batchUploadSection: document.getElementById('batch-upload-section'),
        batchPreviewSection: document.getElementById('batch-preview-section'),
        batchProcessingSection: document.getElementById('batch-processing-section'),
        batchResultSection: document.getElementById('batch-result-section'),
        batchImagesGrid: document.getElementById('batch-images-grid'),
        batchLevelSelect: document.getElementById('batch-level-select'),
        batchFormatSelect: document.getElementById('batch-format-select'),
        batchProcessBtn: document.getElementById('batch-process-btn'),
        batchResetBtn: document.getElementById('batch-reset-btn'),
        batchDownloadAllBtn: document.getElementById('batch-download-all-btn'),
        batchAddMoreBtn: document.getElementById('batch-add-more-btn'),
        batchAlertBox: document.getElementById('batch-alert'),
        batchFileCount: document.getElementById('batch-file-count'),
        batchTotalSize: document.getElementById('batch-total-size'),
        batchBtnCount: document.getElementById('batch-btn-count'),
        batchProgressCurrent: document.getElementById('batch-progress-current'),
        batchProgressTotal: document.getElementById('batch-progress-total'),
        batchProgressBar: document.getElementById('batch-progress-bar'),
        batchPercentText: document.getElementById('batch-percent-text'),
        batchProgressCircle: document.getElementById('batch-progress-circle'),
        batchResultTitle: document.getElementById('batch-result-title'),
        batchResultSize: document.getElementById('batch-result-size'),
        batchResultCount: document.getElementById('batch-result-count')
    };

    // Tab switching
    function switchTab(tab) {
        if (tab === 'single') {
            elements.tabSingle.classList.add('text-purple-600', 'border-purple-600', 'bg-white');
            elements.tabSingle.classList.remove('text-slate-500', 'border-transparent');
            elements.tabBatch.classList.remove('text-purple-600', 'border-purple-600', 'bg-white');
            elements.tabBatch.classList.add('text-slate-500', 'border-transparent');
            elements.singleContent.classList.remove('hidden');
            elements.batchContent.classList.add('hidden');
        } else {
            elements.tabBatch.classList.add('text-purple-600', 'border-purple-600', 'bg-white');
            elements.tabBatch.classList.remove('text-slate-500', 'border-transparent');
            elements.tabSingle.classList.remove('text-purple-600', 'border-purple-600', 'bg-white');
            elements.tabSingle.classList.add('text-slate-500', 'border-transparent');
            elements.batchContent.classList.remove('hidden');
            elements.singleContent.classList.add('hidden');
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function showAlert(message, type = 'error') {
        elements.alertBox.className = `p-3 rounded-lg text-sm font-medium ${
            type === 'success' 
                ? 'bg-green-500/10 border border-green-500 text-green-600' 
                : type === 'info'
                ? 'bg-blue-500/10 border border-blue-500 text-blue-600'
                : 'bg-red-500/10 border border-red-500 text-red-600'
        }`;
        elements.alertBox.textContent = message;
        elements.alertBox.classList.remove('hidden');
        setTimeout(() => elements.alertBox.classList.add('hidden'), 5000);
    }

    function showBatchAlert(message, type = 'error') {
        elements.batchAlertBox.className = `p-3 rounded-lg text-sm font-medium ${
            type === 'success' 
                ? 'bg-green-500/10 border border-green-500 text-green-600' 
                : type === 'info'
                ? 'bg-blue-500/10 border border-blue-500 text-blue-600'
                : 'bg-red-500/10 border border-red-500 text-red-600'
        }`;
        elements.batchAlertBox.textContent = message;
        elements.batchAlertBox.classList.remove('hidden');
        setTimeout(() => elements.batchAlertBox.classList.add('hidden'), 5000);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        
        if (files.length > 10) {
            showAlert('Maximum 10 gambar per sesi', 'error');
            return;
        }

        uploadedFiles = Array.from(files);
        totalOriginalSize = 0;

        elements.imagesList.innerHTML = '';
        
        uploadedFiles.forEach((file, index) => {
            totalOriginalSize += file.size;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200';
                itemDiv.innerHTML = `
                    <img src="${e.target.result}" class="w-16 h-16 object-cover rounded-lg border border-slate-300">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-slate-800 truncate">${file.name}</div>
                        <div class="text-xs text-slate-500">${formatFileSize(file.size)}</div>
                    </div>
                    <button class="remove-img-btn p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" data-index="${index}">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                `;
                elements.imagesList.appendChild(itemDiv);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            };
            reader.readAsDataURL(file);
        });

        elements.uploadSection.classList.add('hidden');
        elements.previewSection.classList.remove('hidden');
        elements.resultSection.classList.add('hidden');

        setTimeout(() => {
            document.querySelectorAll('.remove-img-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    removeImage(index);
                });
            });
        }, 100);
    }

    function removeImage(index) {
        uploadedFiles.splice(index, 1);
        
        if (uploadedFiles.length === 0) {
            resetToUpload();
        } else {
            handleFiles(uploadedFiles);
        }
    }

    async function processCompress() {
        if (uploadedFiles.length === 0) return;

        const compressionLevel = elements.levelSelect.value;
        elements.processBtn.disabled = true;
        elements.processBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Memproses...';

        compressedResults = [];
        totalCompressedSize = 0;

        try {
            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];
                
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);

                const uploadRes = await fetch('/server/compress_proxy.php?action=upload', {
                    method: 'POST',
                    body: uploadFormData
                });

                const uploadData = await uploadRes.json();
                
                if (!uploadData.success) {
                    throw new Error(uploadData.message || 'Upload gagal');
                }

                const compressFormData = new FormData();
                compressFormData.append('server_filename', uploadData.server_filename);
                compressFormData.append('filename', file.name);
                compressFormData.append('compression_level', compressionLevel);

                const compressRes = await fetch('/server/compress_proxy.php?action=compress', {
                    method: 'POST',
                    body: compressFormData
                });

                const compressData = await compressRes.json();
                
                if (!compressData.success) {
                    throw new Error(compressData.message || 'Kompresi gagal');
                }

                totalCompressedSize += compressData.compressed_size;

                compressedResults.push({
                    filename: file.name,
                    originalSize: compressData.original_size,
                    compressedSize: compressData.compressed_size,
                    savedPercent: Math.round(((compressData.original_size - compressData.compressed_size) / compressData.original_size) * 100)
                });
            }

            showResults();
        } catch (error) {
            showAlert(error.message, 'error');
            elements.processBtn.disabled = false;
            elements.processBtn.innerHTML = '<i data-lucide="minimize-2" class="w-4 h-4"></i> Kompres Semua Gambar';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    function showResults() {
        const totalSaved = totalOriginalSize - totalCompressedSize;
        const percentSaved = Math.round((totalSaved / totalOriginalSize) * 100);

        elements.percentText.textContent = percentSaved + '%';
        elements.resultTitle.textContent = `Your Images are now ${percentSaved}% smaller!`;
        elements.resultSize.textContent = `${formatFileSize(totalOriginalSize)} → ${formatFileSize(totalCompressedSize)}`;

        const circumference = 2 * Math.PI * 60;
        const offset = circumference - (percentSaved / 100) * circumference;
        elements.progressCircle.style.strokeDashoffset = offset;

        elements.downloadSection.innerHTML = '';
        compressedResults.forEach((result, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg';
            itemDiv.innerHTML = `
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-slate-800 truncate">${result.filename}</div>
                    <div class="text-xs text-slate-500">${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savedPercent}%)</div>
                </div>
                <button class="download-single-btn px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 transition-colors" data-index="${index}">
                    <i data-lucide="download" class="w-3 h-3 inline mr-1"></i>
                    Download
                </button>
            `;
            elements.downloadSection.appendChild(itemDiv);
        });

        if (compressedResults.length > 1) {
            const downloadAllDiv = document.createElement('div');
            downloadAllDiv.innerHTML = `
                <button id="download-all-btn" class="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="download-cloud" class="w-4 h-4"></i>
                    Download Semua (ZIP)
                </button>
            `;
            elements.downloadSection.appendChild(downloadAllDiv);
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        setTimeout(() => {
            document.querySelectorAll('.download-single-btn').forEach(btn => {
                btn.addEventListener('click', () => downloadSingleImage(parseInt(btn.dataset.index)));
            });

            const downloadAllBtn = document.getElementById('download-all-btn');
            if (downloadAllBtn) {
                downloadAllBtn.addEventListener('click', downloadAllImages);
            }
        }, 100);

        elements.previewSection.classList.add('hidden');
        elements.resultSection.classList.remove('hidden');
        
        showAlert('Kompresi berhasil!', 'success');
    }

    async function downloadSingleImage(index) {
        try {
            const response = await fetch('/server/compress_proxy.php?action=download');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = compressedResults[index].filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            showAlert('Download gagal', 'error');
        }
    }

    async function downloadAllImages() {
        showAlert('Sedang menyiapkan ZIP...', 'info');
        
        try {
            const zip = new JSZip();
            
            for (let i = 0; i < compressedResults.length; i++) {
                const response = await fetch('/server/compress_proxy.php?action=download');
                const blob = await response.blob();
                zip.file(compressedResults[i].filename, blob);
            }

            const zipBlob = await zip.generateAsync({type: 'blob'});
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compressed-images.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showAlert('Download berhasil!', 'success');
        } catch (error) {
            showAlert('Download ZIP gagal', 'error');
        }
    }

    function resetToUpload() {
        uploadedFiles = [];
        compressedResults = [];
        totalOriginalSize = 0;
        totalCompressedSize = 0;
        
        elements.fileInput.value = '';
        elements.uploadSection.classList.remove('hidden');
        elements.previewSection.classList.add('hidden');
        elements.resultSection.classList.add('hidden');
        elements.processBtn.disabled = false;
        elements.processBtn.innerHTML = '<i data-lucide="minimize-2" class="w-4 h-4"></i> Kompres Semua Gambar';
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Batch compress functions
    function handleBatchFiles(files, append = false) {
        if (files.length === 0) return;
        
        const newFiles = Array.from(files);
        const totalAfterAdd = append ? (batchFiles.length + newFiles.length) : newFiles.length;
        
        if (totalAfterAdd > 50) {
            showBatchAlert('Maximum 50 gambar untuk batch compress', 'error');
            return;
        }

        const startIndex = append ? batchFiles.length : 0;
        
        if (append) {
            batchFiles = [...batchFiles, ...newFiles];
        } else {
            batchFiles = newFiles;
            batchTotalOriginalSize = 0;
            elements.batchImagesGrid.innerHTML = '';
        }
        
        batchFiles.forEach((file, index) => {
            if (append && index < startIndex) {
                return;
            }
            
            if (!append || index >= startIndex) {
                batchTotalOriginalSize += file.size;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'relative group';
                itemDiv.innerHTML = `
                    <img src="${e.target.result}" class="w-full aspect-square object-cover rounded-lg border-2 border-slate-200">
                    <button class="batch-remove-img absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" data-index="${index}">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                `;
                elements.batchImagesGrid.appendChild(itemDiv);
                
                if (typeof lucide !== 'undefined') lucide.createIcons();
            };
            reader.readAsDataURL(file);
        });

        elements.batchFileCount.textContent = batchFiles.length;
        elements.batchTotalSize.textContent = formatFileSize(batchTotalOriginalSize);
        elements.batchBtnCount.textContent = batchFiles.length;

        elements.batchUploadSection.classList.add('hidden');
        elements.batchPreviewSection.classList.remove('hidden');
        elements.batchProcessingSection.classList.add('hidden');
        elements.batchResultSection.classList.add('hidden');

        setTimeout(() => {
            document.querySelectorAll('.batch-remove-img').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    removeBatchImage(index);
                });
            });
        }, 100);
    }

    function removeBatchImage(index) {
        batchFiles.splice(index, 1);
        if (batchFiles.length === 0) {
            resetBatchToUpload();
        } else {
            handleBatchFiles(batchFiles);
        }
    }

    async function processBatchCompress() {
        if (batchFiles.length === 0) return;

        const compressionLevel = elements.batchLevelSelect.value;
        
        elements.batchPreviewSection.classList.add('hidden');
        elements.batchProcessingSection.classList.remove('hidden');
        elements.batchResultSection.classList.add('hidden');

        batchCompressedResults = [];
        batchTotalCompressedSize = 0;

        elements.batchProgressTotal.textContent = batchFiles.length;

        try {
            for (let i = 0; i < batchFiles.length; i++) {
                const file = batchFiles[i];
                
                elements.batchProgressCurrent.textContent = i + 1;
                const progressPercent = ((i + 1) / batchFiles.length) * 100;
                elements.batchProgressBar.style.width = progressPercent + '%';

                const uploadFormData = new FormData();
                uploadFormData.append('file', file);

                const uploadRes = await fetch('/server/compress_proxy.php?action=upload', {
                    method: 'POST',
                    body: uploadFormData
                });

                const uploadData = await uploadRes.json();
                
                if (!uploadData.success) {
                    throw new Error(uploadData.message || 'Upload gagal');
                }

                const compressFormData = new FormData();
                compressFormData.append('server_filename', uploadData.server_filename);
                compressFormData.append('filename', file.name);
                compressFormData.append('compression_level', compressionLevel);

                const compressRes = await fetch('/server/compress_proxy.php?action=compress', {
                    method: 'POST',
                    body: compressFormData
                });

                const compressData = await compressRes.json();
                
                if (!compressData.success) {
                    throw new Error(compressData.message || 'Kompresi gagal');
                }

                batchTotalCompressedSize += compressData.compressed_size;

                batchCompressedResults.push({
                    filename: file.name,
                    originalSize: compressData.original_size,
                    compressedSize: compressData.compressed_size,
                    savedPercent: Math.round(((compressData.original_size - compressData.compressed_size) / compressData.original_size) * 100)
                });
            }

            showBatchResults();
        } catch (error) {
            showBatchAlert(error.message, 'error');
            elements.batchProcessingSection.classList.add('hidden');
            elements.batchPreviewSection.classList.remove('hidden');
        }
    }

    function showBatchResults() {
        const totalSaved = batchTotalOriginalSize - batchTotalCompressedSize;
        const percentSaved = Math.round((totalSaved / batchTotalOriginalSize) * 100);

        elements.batchPercentText.textContent = percentSaved + '%';
        elements.batchResultTitle.textContent = `Batch compression completed!`;
        elements.batchResultSize.textContent = `${formatFileSize(batchTotalOriginalSize)} → ${formatFileSize(batchTotalCompressedSize)}`;
        elements.batchResultCount.textContent = `${batchCompressedResults.length} gambar berhasil dikompres`;

        const circumference = 2 * Math.PI * 60;
        const offset = circumference - (percentSaved / 100) * circumference;
        elements.batchProgressCircle.style.strokeDashoffset = offset;

        elements.batchProcessingSection.classList.add('hidden');
        elements.batchResultSection.classList.remove('hidden');
        
        showBatchAlert('Batch compression berhasil!', 'success');
    }

    async function downloadBatchAll() {
        showBatchAlert('Sedang menyiapkan ZIP...', 'info');
        
        try {
            const zip = new JSZip();
            
            for (let i = 0; i < batchCompressedResults.length; i++) {
                const response = await fetch('/server/compress_proxy.php?action=download');
                const blob = await response.blob();
                zip.file(batchCompressedResults[i].filename, blob);
            }

            const zipBlob = await zip.generateAsync({type: 'blob'});
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compressed-images-batch.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showBatchAlert('Download berhasil!', 'success');
        } catch (error) {
            showBatchAlert('Download ZIP gagal', 'error');
        }
    }

    function resetBatchToUpload() {
        batchFiles = [];
        batchCompressedResults = [];
        batchTotalOriginalSize = 0;
        batchTotalCompressedSize = 0;
        
        elements.batchFileInput.value = '';
        elements.batchUploadSection.classList.remove('hidden');
        elements.batchPreviewSection.classList.add('hidden');
        elements.batchProcessingSection.classList.add('hidden');
        elements.batchResultSection.classList.add('hidden');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Tab event listeners
    elements.tabSingle.addEventListener('click', () => switchTab('single'));
    elements.tabBatch.addEventListener('click', () => switchTab('batch'));

    // Single compress event listeners
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    
    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('border-purple-500', 'bg-purple-50');
    });
    
    elements.dropZone.addEventListener('dragleave', () => {
        elements.dropZone.classList.remove('border-purple-500', 'bg-purple-50');
    });
    
    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('border-purple-500', 'bg-purple-50');
        handleFiles(e.dataTransfer.files);
    });
    
    elements.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    elements.processBtn.addEventListener('click', processCompress);
    elements.resetBtn.addEventListener('click', resetToUpload);

    // Batch compress event listeners
    elements.batchDropZone.addEventListener('click', () => elements.batchFileInput.click());
    
    elements.batchDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.batchDropZone.classList.add('border-purple-500', 'bg-purple-50');
    });
    
    elements.batchDropZone.addEventListener('dragleave', () => {
        elements.batchDropZone.classList.remove('border-purple-500', 'bg-purple-50');
    });
    
    elements.batchDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.batchDropZone.classList.remove('border-purple-500', 'bg-purple-50');
        handleBatchFiles(e.dataTransfer.files);
    });
    
    elements.batchFileInput.addEventListener('change', (e) => handleBatchFiles(e.target.files));
    if (elements.batchAddMoreBtn) {
        elements.batchAddMoreBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            input.onchange = (e) => handleBatchFiles(e.target.files, true);
            input.click();
        });
    }
    elements.batchProcessBtn.addEventListener('click', processBatchCompress);
    elements.batchResetBtn.addEventListener('click', resetBatchToUpload);
    elements.batchDownloadAllBtn.addEventListener('click', downloadBatchAll);
})();
