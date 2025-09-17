const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Deepgram } = require('@deepgram/sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Mongo schema
const TranscriptionSchema = new mongoose.Schema({
  filename: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const Transcription = mongoose.model('Transcription', TranscriptionSchema);

// File upload setup
const upload = multer({ storage: multer.memoryStorage() });

// Deepgram client
const dgClient = new Deepgram(process.env.DEEPGRAM_API_KEY);

// API: Upload audio -> Transcribe -> Save -> Return
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Save file temporarily
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    const filepath = path.join(uploadsDir, req.file.originalname);
    fs.writeFileSync(filepath, req.file.buffer);

    // Send to Deepgram
    const response = await dgClient.listen.prerecorded.transcribeFile(
      { file: fs.createReadStream(filepath) },
      { model: 'nova-3', punctuate: true }
    );

    const text = response.results.channels[0].alternatives[0].transcript;

    // Save in MongoDB
    const doc = new Transcription({ filename: req.file.originalname, text });
    await doc.save();

    // Delete temp file
    fs.unlinkSync(filepath);

    res.json({ success: true, text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// API: Get history
app.get('/api/transcriptions', async (req, res) => {
  const all = await Transcription.find().sort({ createdAt: -1 });
  res.json(all);
});

// Connect DB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(4000, () => console.log('Server running on http://localhost:4000'));
  })
  .catch(err => console.error('DB error:', err));
