document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = uploadForm.querySelector('button');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const fileList = document.getElementById('fileList');
    const successMessage = document.getElementById('successMessage');

    let lastFiles = []; // Store the last fetched files for comparison

    // Initially disable the upload button
    uploadButton.disabled = true;

    // Enable/disable button based on file selection
    fileInput.addEventListener('change', () => {
        uploadButton.disabled = !fileInput.files[0];
    });

    // Load files on page load
    loadFiles();

    // Poll for updates every 2 seconds
    setInterval(loadFiles, 2000);

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        progressContainer.style.display = 'block';
        successMessage.style.display = 'none';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';

        try {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percentComplete + '%';
                    progressText.textContent = percentComplete + '%';
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    // Set to 100% on success
                    progressBar.style.width = '100%';
                    progressText.textContent = '100%';
                    
                    // Show success message
                    successMessage.style.display = 'block';
                    successMessage.textContent = '✓ File uploaded successfully!';
                    
                    fileInput.value = '';
                    uploadButton.disabled = true; // Reset button state
                    
                    // Refresh file list after upload
                    loadFiles();
                    
                    // Hide progress bar and success message after a delay
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        successMessage.style.display = 'none';
                    }, 2000);
                } else {
                    successMessage.style.display = 'block';
                    successMessage.style.color = 'red';
                    successMessage.textContent = '✗ Upload failed: ' + xhr.statusText;
                    progressContainer.style.display = 'none';
                }
            });

            xhr.addEventListener('error', () => {
                successMessage.style.display = 'block';
                successMessage.style.color = 'red';
                successMessage.textContent = '✗ Upload error occurred';
                progressContainer.style.display = 'none';
            });

            xhr.open('POST', '/upload');
            xhr.send(formData);

        } catch (error) {
            console.error('Error:', error);
            successMessage.style.display = 'block';
            successMessage.style.color = 'red';
            successMessage.textContent = '✗ Upload failed';
            progressContainer.style.display = 'none';
        }
    });

    async function loadFiles() {
        try {
            const response = await fetch('/files');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const files = await response.json();

            // Check if files have changed
            const filesChanged = JSON.stringify(files) !== JSON.stringify(lastFiles);
            if (!filesChanged) {
                return; // No update needed
            }
            lastFiles = files; // Update stored files

            if (files.length === 0) {
                fileList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px 0;">No files uploaded yet.</p>';
                return;
            }

            // Sort files: most recent first, "Unknown" dates at the bottom
            const sortedFiles = files.sort((a, b) => {
                if (a.uploadDate === 'Unknown' && b.uploadDate === 'Unknown') return 0;
                if (a.uploadDate === 'Unknown') return 1;
                if (b.uploadDate === 'Unknown') return -1;
                return new Date(b.uploadDate) - new Date(a.uploadDate);
            });

            fileList.innerHTML = sortedFiles.map(file => {
                let date;
                let displayName;
                
                if (file.uploadDate !== 'Unknown') {
                    const d = new Date(file.uploadDate);
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    const hours = String(d.getHours()).padStart(2, '0');
                    const minutes = String(d.getMinutes()).padStart(2, '0');
                    date = `${day}/${month}/${year} ${hours}:${minutes}`;
                    displayName = file.originalName;
                } else {
                    date = 'Unknown';
                    displayName = file.filename;
                }
                
                return `
                    <div class="file-item" data-filename="${file.filename}" data-originalname="${file.originalName}">
                        <div class="file-info">
                            <div class="file-name">${displayName}</div>
                            <div class="file-date">${date}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click event listeners to file items
            document.querySelectorAll('.file-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    // Prevent download link from triggering
                    if (e.target.tagName === 'A') return;
                    
                    const filename = item.dataset.filename;
                    const originalName = item.dataset.originalname;
                    showPreview(filename, originalName);
                });
            });
        } catch (error) {
            console.error('Error loading files:', error);
            fileList.innerHTML = `<p style="text-align: center; color: #d32f2f; padding: 20px 0;">Error loading files: ${error.message}</p>`;
        }
    }

    function showPreview(filename, originalName) {
        const isMobile = window.innerWidth <= 600;
        const previewContainer = document.getElementById('previewContainer');
        const previewContent = document.getElementById('previewContent');
        const downloadButton = document.getElementById('downloadButton');
        const backButton = document.getElementById('backButton');

        // Check if file is an image (added .svg)
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const extension = filename.split('.').pop().toLowerCase();
        const isImage = imageExtensions.includes(extension);

        if (isImage) {
            previewContent.innerHTML = `<img src="/download/${filename}" alt="${originalName}">`;
        } else {
            previewContent.innerHTML = `
                <div class="preview-placeholder">
                    <div class="file-icon">📄</div>
                    <p>${originalName}</p>
                    <p>Preview not available</p>
                </div>
            `;
        }

        downloadButton.onclick = () => {
            const link = document.createElement('a');
            link.href = `/download/${filename}`;
            link.download = originalName;
            link.click();
        };

        backButton.onclick = () => {
            if (isMobile) {
                previewContainer.classList.remove('preview-modal');
                document.body.style.overflow = '';
            }
            previewContainer.style.display = 'none';
        };

        if (isMobile) {
            previewContainer.classList.add('preview-modal');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
        previewContainer.style.display = 'flex';
    }
});
