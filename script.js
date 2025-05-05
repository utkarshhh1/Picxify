// Configuration
const IMAGE_SIZE = 1024; // 1024x1024 pixels
const BYTES_PER_IMAGE = IMAGE_SIZE * IMAGE_SIZE; // Each image holds 1MB of data

// DOM Elements
const fileToImagesDropZone = document.getElementById('fileToImagesDropZone');
const fileToImagesInput = document.getElementById('fileToImagesInput');
const convertToImagesBtn = document.getElementById('convertToImagesBtn');
const imagesToFileDropZone = document.getElementById('imagesToFileDropZone');
const imagesToFileInput = document.getElementById('imagesToFileInput');
const reconstructFileBtn = document.getElementById('reconstructFileBtn');
const previewGrid = document.getElementById('previewGrid');

// Global variables
let fileToConvert = null;
let imagesToReconstruct = [];

// Helper Functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlightDropZone(element) {
    element.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
}

function unhighlightDropZone(element) {
    element.style.backgroundColor = 'transparent';
}

function updateDropZoneInfo(element, file) {
    element.innerHTML = `
        <i class="fas fa-file"></i>
        <h3>${file.name}</h3>
        <p>${(file.size / 1024).toFixed(2)} KB</p>
    `;
}

function showLoading(element) {
    element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    element.disabled = true;
}

function resetButton(element, icon, text) {
    element.innerHTML = `<i class="fas fa-${icon}"></i> ${text}`;
    element.disabled = false;
}

// File to Images Conversion Handlers
fileToImagesDropZone.addEventListener('click', () => fileToImagesInput.click());
fileToImagesInput.addEventListener('change', handleFileToImagesUpload);

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    fileToImagesDropZone.addEventListener(event, preventDefaults);
    fileToImagesDropZone.addEventListener(event, (e) => {
        if (event === 'dragenter' || event === 'dragover') {
            highlightDropZone(e.currentTarget);
        } else {
            unhighlightDropZone(e.currentTarget);
        }
    });
});

fileToImagesDropZone.addEventListener('drop', handleFileToImagesDrop);

function handleFileToImagesUpload(e) {
    const files = e.target.files;
    if (files.length > 0) {
        fileToConvert = files[0];
        convertToImagesBtn.disabled = false;
        updateDropZoneInfo(fileToImagesDropZone, files[0]);
    }
}

function handleFileToImagesDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        fileToImagesInput.files = files;
        fileToConvert = files[0];
        convertToImagesBtn.disabled = false;
        updateDropZoneInfo(fileToImagesDropZone, files[0]);
    }
}

// Images to File Reconstruction Handlers
imagesToFileDropZone.addEventListener('click', () => imagesToFileInput.click());
imagesToFileInput.addEventListener('change', handleImagesToFileUpload);

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    imagesToFileDropZone.addEventListener(event, preventDefaults);
    imagesToFileDropZone.addEventListener(event, (e) => {
        if (event === 'dragenter' || event === 'dragover') {
            highlightDropZone(e.currentTarget);
        } else {
            unhighlightDropZone(e.currentTarget);
        }
    });
});

imagesToFileDropZone.addEventListener('drop', handleImagesToFileDrop);

function handleImagesToFileUpload(e) {
    const files = Array.from(e.target.files);
    processUploadedFiles(files);
}

function handleImagesToFileDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    imagesToFileInput.files = dt.files;
    processUploadedFiles(files);
}

async function processUploadedFiles(files) {
    // Check if ZIP file was uploaded
    const zipFile = files.find(f => f.name.endsWith('.zip'));
    
    if (zipFile) {
        try {
            imagesToReconstruct = await extractImagesFromZip(zipFile);
        } catch (error) {
            alert('Error extracting ZIP: ' + error.message);
            return;
        }
    } else {
        // Filter only image files
        imagesToReconstruct = files.filter(f => 
            f.type.startsWith('image/') || 
            ['png', 'jpg', 'jpeg'].some(ext => f.name.toLowerCase().endsWith(ext))
        );
    }

    if (imagesToReconstruct.length > 0) {
        reconstructFileBtn.disabled = false;
        updateImagesToFileDropZone(imagesToReconstruct);
        showReconstructionPreview(imagesToReconstruct);
    } else {
        alert('No valid images found. Please upload PNG/JPG images or a ZIP containing the sequence.');
    }
}

async function extractImagesFromZip(zipFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const zip = await JSZip.loadAsync(event.target.result);
                const images = [];
                
                // Sort files numerically (f1.png, f2.png, etc.)
                const files = Object.keys(zip.files)
                    .filter(name => !zip.files[name].dir)
                    .sort((a, b) => {
                        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
                        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
                        return numA - numB;
                    });
                
                for (const fileName of files) {
                    const fileData = await zip.files[fileName].async('blob');
                    images.push(new File([fileData], fileName));
                }
                
                resolve(images);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read ZIP file'));
        reader.readAsArrayBuffer(zipFile);
    });
}

function updateImagesToFileDropZone(files) {
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
        imagesToFileDropZone.innerHTML = `
            <i class="fas fa-file-archive"></i>
            <h3>${files[0].name}</h3>
            <p>Contains ${files.length} images</p>
        `;
    } else {
        imagesToFileDropZone.innerHTML = `
            <i class="fas fa-images"></i>
            <h3>${files.length} Images Selected</h3>
            <p>First: ${files[0].name}</p>
        `;
    }
}

function showReconstructionPreview(files) {
    previewGrid.innerHTML = '';
    
    // Show preview of first few images
    const previewCount = Math.min(files.length, 4);
    for (let i = 0; i < previewCount; i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="${files[i].name}">
                <p>${files[i].name}</p>
            `;
            previewGrid.appendChild(previewItem);
        };
        reader.readAsDataURL(files[i]);
    }
    
    if (files.length > previewCount) {
        const moreText = document.createElement('p');
        moreText.className = 'more-files';
        moreText.textContent = `+ ${files.length - previewCount} more images...`;
        previewGrid.appendChild(moreText);
    }
}

// Core Conversion Functions
async function fileToImageSequence(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const fileData = new Uint8Array(e.target.result);
            const fileSize = fileData.length;
            const fileExtension = file.name.split('.').pop();
            
            // Create metadata (8 bytes for file size)
            const sizeBytes = new Uint8Array(8);
            for (let i = 0; i < 8; i++) {
                sizeBytes[i] = (fileSize >> (8 * (7 - i))) & 0xFF;
            }
            
            // Combine metadata with file data
            const fullData = new Uint8Array(sizeBytes.length + fileData.length);
            fullData.set(sizeBytes);
            fullData.set(fileData, sizeBytes.length);
            
            // Convert to bits
            const bits = [];
            for (let i = 0; i < fullData.length; i++) {
                for (let j = 7; j >= 0; j--) {
                    bits.push((fullData[i] >> j) & 1);
                }
            }
            
            // Split into image-sized chunks
            const bitsPerImage = BYTES_PER_IMAGE * 8;
            const totalImages = Math.ceil(bits.length / bitsPerImage);
            const images = [];
            
            for (let i = 0; i < totalImages; i++) {
                const start = i * bitsPerImage;
                const end = Math.min(start + bitsPerImage, bits.length);
                const chunk = bits.slice(start, end);
                
                // Create image from bits
                const canvas = document.createElement('canvas');
                canvas.width = IMAGE_SIZE;
                canvas.height = IMAGE_SIZE;
                const ctx = canvas.getContext('2d');
                const imageData = ctx.createImageData(IMAGE_SIZE, IMAGE_SIZE);
                
                let bitIndex = 0;
                for (let y = 0; y < IMAGE_SIZE; y++) {
                    for (let x = 0; x < IMAGE_SIZE; x++) {
                        if (bitIndex >= chunk.length) {
                            // Fill remaining pixels with 0
                            for (let k = 0; k < 4; k++) {
                                imageData.data[(y * IMAGE_SIZE + x) * 4 + k] = 0;
                            }
                            continue;
                        }
                        
                        // Convert 8 bits to a byte
                        let byteVal = 0;
                        for (let k = 0; k < 8 && bitIndex < chunk.length; k++) {
                            byteVal = (byteVal << 1) | chunk[bitIndex++];
                        }
                        
                        // Set grayscale pixel
                        const pixelIndex = (y * IMAGE_SIZE + x) * 4;
                        imageData.data[pixelIndex] = byteVal;     // R
                        imageData.data[pixelIndex + 1] = byteVal; // G
                        imageData.data[pixelIndex + 2] = byteVal; // B
                        imageData.data[pixelIndex + 3] = 255;     // A
                    }
                }
                
                ctx.putImageData(imageData, 0, 0);
                images.push({
                    name: `f${i+1}.png`,
                    data: canvas.toDataURL('image/png')
                });
            }
            
            // Create metadata object
            const metadata = {
                originalFilename: file.name,
                originalExtension: fileExtension,
                totalImages: images.length,
                fileSize: fileSize
            };
            
            resolve({ images, metadata });
        };
        reader.readAsArrayBuffer(file);
    });
}

async function imageSequenceToFile(images) {
    return new Promise(async (resolve) => {
        let allBits = [];
        let metadata = null;
        
        // Process each image to extract bits
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            
            // Check if this is the metadata file
            if (img.name === '_metadata.json') {
                metadata = JSON.parse(await fileToText(img));
                continue;
            }
            
            const imgData = await createImageBitmap(await blobFromDataURL(await fileToDataURL(img)));
            
            const canvas = document.createElement('canvas');
            canvas.width = imgData.width;
            canvas.height = imgData.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgData, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, imgData.width, imgData.height).data;
            
            // Extract bits from image (using red channel since it's grayscale)
            for (let j = 0; j < imageData.length; j += 4) {
                const pixelVal = imageData[j];
                for (let k = 7; k >= 0; k--) {
                    allBits.push((pixelVal >> k) & 1);
                }
            }
        }
        
        // Extract file size from first 64 bits (8 bytes)
        let fileSize = 0;
        for (let j = 0; j < 64; j++) {
            fileSize = (fileSize << 1) | (allBits[j] || 0);
        }
        
        // Convert remaining bits to bytes
        const fileBytes = new Uint8Array(fileSize);
        let byteIndex = 0;
        let bitIndex = 64; // Skip metadata
        
        for (let j = 0; j < fileSize; j++) {
            let byteVal = 0;
            for (let k = 0; k < 8; k++) {
                byteVal = (byteVal << 1) | (allBits[bitIndex++] || 0);
            }
            fileBytes[j] = byteVal;
        }
        
        resolve({ fileBytes, metadata });
    });
}

// Utility Functions
function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
}

async function fileToDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

async function fileToText(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
    });
}

async function blobFromDataURL(dataURL) {
    const res = await fetch(dataURL);
    return await res.blob();
}

// Event Handlers
convertToImagesBtn.addEventListener('click', async () => {
    if (!fileToConvert) return;
    
    showLoading(convertToImagesBtn);
    
    try {
        // Convert file to image sequence with metadata
        const { images, metadata } = await fileToImageSequence(fileToConvert);
        
        // Create ZIP file
        const zip = new JSZip();
        
        // Add images to ZIP
        images.forEach(img => {
            const blob = dataURLtoBlob(img.data);
            zip.file(img.name, blob);
        });
        
        // Add metadata to ZIP
        zip.file('_metadata.json', JSON.stringify(metadata));
        
        // Generate ZIP
        const zipContent = await zip.generateAsync({ type: 'blob' });
        
        // Download ZIP
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileToConvert.name.split('.')[0]}_images.zip`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
    } catch (error) {
        console.error('Conversion error:', error);
        alert(`Error during conversion: ${error.message}`);
    } finally {
        resetButton(convertToImagesBtn, 'magic', 'Generate Image Sequence (ZIP)');
    }
});

reconstructFileBtn.addEventListener('click', async () => {
    if (imagesToReconstruct.length === 0) return;
    
    showLoading(reconstructFileBtn);
    
    try {
        // Reconstruct file from image sequence
        const { fileBytes, metadata } = await imageSequenceToFile(imagesToReconstruct);
        
        // Determine file extension
        let fileExtension = 'bin';
        let fileName = 'reconstructed_file';
        
        if (metadata) {
            fileExtension = metadata.originalExtension || fileExtension;
            fileName = metadata.originalFilename.split('.')[0] || fileName;
        }
        
        // Download reconstructed file
        const blob = new Blob([fileBytes]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
    } catch (error) {
        console.error('Reconstruction error:', error);
        alert(`Error during reconstruction: ${error.message}`);
    } finally {
        resetButton(reconstructFileBtn, 'file-download', 'Reconstruct Original File');
    }
});

// Initialize JSZip if not already loaded
if (typeof JSZip === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(script);
}
