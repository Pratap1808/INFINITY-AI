const express = require('express');
const { getMemory, addMemory, clearMemory } = require('../utils/memoryStore');

const router = express.Router();

router.get('/', (req, res) => {
  const userId = req.user?.id || 'guest';
  res.json(getMemory(userId));
});

router.post('/', (req, res) => {
  const userId = req.user?.id || 'guest';
  const { fact } = req.body;
  if (!fact || typeof fact !== 'string') {
    return res.status(400).json({ error: 'A text "fact" is required.' });
  }
  res.json(addMemory(userId, fact));
});

router.delete('/', (req, res) => {
  const userId = req.user?.id || 'guest';
  clearMemory(userId);
  res.json({ cleared: true });
});

module.exports = router;
