const express = require('express');
const { getConfig } = require('../utils/configStore');

const router = express.Router();

// Public read-only view of app config (theme, logo, default mode, etc.)
// so every visitor's app reflects the Owner's chosen defaults.
router.get('/', (req, res) => {
  const config = getConfig();
  // never leak systemPromptOverride content structure concerns, but it's
  // fine to expose since it's just a persona prompt, not a secret.
  res.json(config);
});

module.exports = router;
