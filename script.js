const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const previewGrid = document.getElementById('previewGrid');
const imageFormat = document.getElementById('imageFormat');
const resolution = document.getElementById('resolution');

let currentFile = null;

// File Upload Handling
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropZone.addEventListener(event, preventDefaults);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(event => {
    dropZone.addEventListener(event, () => {
        dropZone.style.backgroundColor = 'rgba(255,107,107,0.1)';
    });
});

['dragleave', 'drop'].forEach(event => {
    dropZone.addEventListener(event, () => {
        dropZone.style.backgroundColor = 'transparent';
    });
});

dropZone.addEventListener('drop', handleDrop);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileUpload({ target: { files } });
    }
}

function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length > 0) {
        currentFile = files[0];
        convertBtn.disabled = false;
        showPreview(files[0]);
    }
}

function showPreview(file) {
    previewGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Generating preview...</div>';
    
    // For demo purposes, we'll show a mock preview
    setTimeout(() => {
        previewGrid.innerHTML = '';
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="https://via.placeholder.com/200x300?text=${encodeURIComponent(file.name)}" alt="File preview">
            <p>${file.name}</p>
            <div class="file-info">
                <span>${(file.size / 1024).toFixed(2)} KB</span>
                <span>${file.type || 'Unknown type'}</span>
            </div>
        `;
        previewGrid.appendChild(previewItem);
    }, 1000);
}

// Conversion Handler
convertBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    
    convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    convertBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('imageFormat', imageFormat.value);
        formData.append('resolution', resolution.value);
        
        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }
        
        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentFile.name.split('.')[0]}_images.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        convertBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Images';
        convertBtn.disabled = false;
    }
});