document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const fileList = document.getElementById('fileList');
    const successMessage = document.getElementById('successMessage');

    // Load files on page load
    loadFiles();

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
            console.log('Loaded files:', files); // Debug log

            if (files.length === 0) {
                fileList.innerHTML = '<p>No files uploaded yet.</p>';
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
                if (file.uploadDate !== 'Unknown') {
                    const d = new Date(file.uploadDate);
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    const hours = String(d.getHours()).padStart(2, '0');
                    const minutes = String(d.getMinutes()).padStart(2, '0');
                    date = `${day}/${month}/${year} ${hours}:${minutes}`;
                } else {
                    date = 'Unknown';
                }
                
                return `
                    <div class="file-item">
                        <div class="file-info">
                            <div class="file-name">${file.originalName}</div>
                            <div class="file-date">${date}</div>
                        </div>
                        <a href="/download/${file.filename}" download>Download</a>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading files:', error);
            fileList.innerHTML = `<p>Error loading files: ${error.message}</p>`;
        }
    }
});
