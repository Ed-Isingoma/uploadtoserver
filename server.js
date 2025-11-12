const cluster = require('cluster');
const os = require('os');
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  // console.log(`Master process ${process.pid} is running`);
  // console.log(`Starting ${numCPUs} worker processes for better performance...\n`);

  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Starting a new one...`);
    cluster.fork();
  });

} else {
  // Worker processes run the actual server
  const express = require('express');
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const compression = require('compression');
  const app = express();
  const PORT = 3000;

  // Enable gzip compression
  app.use(compression());

  // Serve static files from the 'public' directory with no caching
  app.use(express.static('public', {
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }));

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

  // Route for file download with streaming (optimized)
  app.get('/download/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Extract original name from filename
    const originalName = filename.split('-').slice(1).join('-');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    const stat = fs.statSync(filePath);
    
    // Support range requests for resumable downloads
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${originalName}"`
      });
      
      const readStream = fs.createReadStream(filePath, { start, end });
      readStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Accept-Ranges': 'bytes'
      });
      
      const readStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 }); // 64KB chunks
      readStream.pipe(res);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    // console.log(`Worker ${process.pid} started`);
    
    // Only show the full message from the first worker
    if (cluster.worker.id === 1) {
      console.log('\n' + '='.repeat(70));
      console.log('🚀 ColleagueLocal Server is Running!');
      console.log(`   Using ${numCPUs} CPU cores for maximum performance`);
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
      }
      
      console.log('💻 Access from this computer:\n');
      console.log(`   ➜  http://localhost:${PORT}`);
      console.log('\n' + '='.repeat(70));
      console.log('Press Ctrl+C to stop the server');
      console.log('='.repeat(70) + '\n');
    }
  });
}

