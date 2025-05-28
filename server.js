const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = 3000;
const cors = require('cors');

app.use(cors());
// Serve static HTML from /public
app.use(express.static('public'));
app.use(express.json({ limit: '2000mb' }));

app.use((req, res, next) => {
  // this shouldnt be for one-client
	res.set('Content-Security-Policy', "default-src 'self' https://one-client.onrender.com; script-src 'self' 'unsafe-inline';")
	res.set('Cross-Origin-Opener-Policy', "cross-origin")
	res.set('Access-Control-Allow-Origin', "*")
	res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
	res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	next()
})



// Set up multer to store files in /uploads
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  res.send('File uploaded successfully');
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
