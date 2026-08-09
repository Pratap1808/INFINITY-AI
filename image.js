const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

let genAI = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

// POST /api/image/generate  { prompt: string }
// Uses Gemini's image-generation-capable model. If your API key/tier does
// not have access to image generation, this will return a clear error —
// swap GEMINI_IMAGE_MODEL in .env for whatever model your account supports.
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'A "prompt" is required.' });

    const client = getClient();
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    const parts = result.response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData);
    const textPart = parts.find((p) => p.text);

    if (!imagePart) {
      return res.status(502).json({
        error:
          'The model did not return an image. Your Gemini API key/tier may not support image generation yet.',
        note: textPart?.text,
      });
    }

    res.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
      caption: textPart?.text || '',
    });
  } catch (err) {
    console.error('Image generation error:', err.message);
    res.status(500).json({
      error: 'Image generation failed. Check GEMINI_API_KEY / GEMINI_IMAGE_MODEL configuration.',
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
  }
});

module.exports = router;
