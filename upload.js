const express = require('express');
const multer = require('multer');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// POST /api/upload  (multipart/form-data, field name "file")
// Images are best handled client-side (sent as base64 to /api/chat for
// Gemini vision, or through the browser OCR engine for text extraction).
// This endpoint mainly handles plain-text-like files server-side.
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { originalname, mimetype, size, buffer } = req.file;
    const textLikeTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];

    let extractedText = null;
    if (textLikeTypes.includes(mimetype)) {
      extractedText = buffer.toString('utf8').slice(0, 20000); // cap size
    }

    res.json({
      filename: originalname,
      mimetype,
      size,
      extractedText, // null for binary types (images/pdf/docx) — handle client-side
      message: extractedText
        ? 'Text extracted successfully.'
        : 'File received. Use Image AI / OCR mode for images, or ask INFINITY AI to work with the extracted content.',
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: 'File upload failed.' });
  }
});

module.exports = router;
