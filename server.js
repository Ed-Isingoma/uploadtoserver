const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
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
        // Only filter out hidden files
        return !filename.startsWith('.');
      })
      .map(filename => {
        try {
          // Check if filename has timestamp format (number-filename)
          const dashIndex = filename.indexOf('-');
          
          if (dashIndex > 0) {
            const timestamp = filename.substring(0, dashIndex);
            const originalName = filename.substring(dashIndex + 1);
            
            // Validate timestamp is a number
            const timestampNum = parseInt(timestamp);
            
            if (!isNaN(timestampNum) && timestampNum > 0) {
              return {
                filename: filename,
                originalName: originalName,
                uploadDate: new Date(timestampNum).toISOString()
              };
            }
          }
          
          // If no valid timestamp format, return filename as-is
          return {
            filename: filename,
            originalName: filename,
            uploadDate: 'Unknown'
          };
          
        } catch (err) {
          console.error('Error parsing filename:', filename, err);
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
  console.log('\n' + '='.repeat(70));
  console.log('🚀 ColleagueLocal Server is Running!');
  console.log('='.repeat(70));
  
  // Get all network URLs
  const interfaces = os.networkInterfaces();
  const urls = [];
  
  Object.keys(interfaces).forEach(ifname => {
    interfaces[ifname].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        urls.push(`http://${iface.address}:${PORT}`);
      }
    });
  });
  
  if (urls.length > 0) {
    console.log('\n📱 SHARE THIS URL WITH OTHERS ON YOUR NETWORK:\n');
    urls.forEach(url => {
      console.log(`   ➜  ${url}`);
    });
    console.log('\n   👆 Copy one of these URLs and share it!\n');
  } else {
    console.log('\n⚠️  Warning: No network interfaces found!');
    console.log('   Make sure you are connected to a network.\n');
  }
  
  console.log('💻 Access from this computer:\n');
  console.log(`   ➜  http://localhost:${PORT}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('Press Ctrl+C to stop the server');
  console.log('='.repeat(70) + '\n');
});

