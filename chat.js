const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getModePrompt } = require('../utils/modes');
const { getMemory, addMemory } = require('../utils/memoryStore');
const { getConfig } = require('../utils/configStore');
const { evaluateRequest } = require('../utils/safety');

const router = express.Router();

let genAI = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

/**
 * POST /api/chat
 * body: {
 *   message: string,
 *   mode: 'assistant' | 'study' | 'coding' | 'writer' | 'translator' | ...,
 *   history: [{ role: 'user'|'model', text: string }],
 *   imageBase64?: string,   // optional, data-URL stripped base64
 *   imageMimeType?: string,
 *   rememberThis?: boolean, // if true, save `message` into long-term memory
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      message,
      mode = 'assistant',
      history = [],
      imageBase64,
      imageMimeType,
      rememberThis = false,
    } = req.body;

    if (!message && !imageBase64) {
      return res.status(400).json({ error: 'A message or image is required.' });
    }

    const safety = evaluateRequest(message || '');
    if (!safety.allowed) {
      return res.json({
        reply: safety.reason,
        refused: true,
      });
    }

    const config = getConfig();
    const userId = req.user?.id || 'guest';
    const memory = config.memoryEnabled ? getMemory(userId) : { facts: [] };

    const basePrompt = config.systemPromptOverride?.trim()
      ? config.systemPromptOverride
      : getModePrompt(mode);

    const memoryBlock = memory.facts.length
      ? `\n\nKnown long-term facts about this user (use naturally, don't recite them):\n- ${memory.facts
          .slice(-20)
          .map((f) => f.text)
          .join('\n- ')}`
      : '';

    const systemInstruction = `${basePrompt}\n\nYour name is INFINITY AI. Stay in character as INFINITY AI at all times.${memoryBlock}`;

    const client = getClient();
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      systemInstruction,
    });

    // Build conversation contents
    const contents = history.slice(-20).map((turn) => ({
      role: turn.role === 'model' ? 'model' : 'user',
      parts: [{ text: turn.text }],
    }));

    const userParts = [];
    if (message) userParts.push({ text: message });
    if (imageBase64 && imageMimeType) {
      userParts.push({
        inlineData: { data: imageBase64, mimeType: imageMimeType },
      });
    }
    contents.push({ role: 'user', parts: userParts });

    const result = await model.generateContent({ contents });
    const reply = result.response.text();

    if (rememberThis && message && config.memoryEnabled) {
      addMemory(userId, message);
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({
      error:
        'INFINITY AI ran into a problem reaching its language model. Please check the server GEMINI_API_KEY and try again.',
      detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
  }
});

module.exports = router;
