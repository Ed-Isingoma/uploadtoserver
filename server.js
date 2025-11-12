const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bonjour = require('bonjour')();
const app = express();
const PORT = 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Route for file upload
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ success: true });
});

// Route to list uploaded files
app.get('/files', (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading uploads directory:', err);
      return res.status(500).json({ error: 'Unable to read files' });
    }
    
    // Return all files with parsed info
    const fileList = files
      .filter(filename => {
        // Filter out any system files or non-uploaded files
        return !filename.startsWith('.') && filename.includes('-');
      })
      .map(filename => {
        try {
          const dashIndex = filename.indexOf('-');
          const timestamp = filename.substring(0, dashIndex);
          const originalName = filename.substring(dashIndex + 1);
          
          // Validate timestamp is a number
          const timestampNum = parseInt(timestamp);
          const uploadDate = !isNaN(timestampNum) && timestampNum > 0 
            ? new Date(timestampNum).toISOString() 
            : 'Unknown';
          
          return {
            filename: filename,
            originalName: originalName,
            uploadDate: uploadDate
          };
        } catch (err) {
          console.error('Error parsing filename:', filename, err);
          // Return as-is if parsing fails
          return {
            filename: filename,
            originalName: filename,
            uploadDate: 'Unknown'
          };
        }
      });
    
    res.json(fileList);
  });
});

// Route for file download with streaming
app.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // Extract original name from filename
  const originalName = filename.split('-').slice(1).join('-');
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${originalName}"`
  });

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  // Advertise the service on the LAN
  bonjour.publish({ name: 'isingoma', type: 'http', port: PORT });
});

