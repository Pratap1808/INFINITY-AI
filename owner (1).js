const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { requireOwner } = require('../middleware/auth');
const { getConfig, updateConfig } = require('../utils/configStore');

const router = express.Router();

// --- In-memory challenge + credential store -------------------------------
// A single-owner app: one credential record is enough. For multi-device
// owners, extend this to an array. Never store raw biometric data — only
// the WebAuthn public key + credential ID, which is standard and safe.
const state = {
  currentChallenge: null,
  ownerCredential: null, // { credentialID, credentialPublicKey, counter }
};

const RP_NAME = process.env.RP_NAME || 'INFINITY AI';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

// STEP 1 — verify the owner PASSWORD (first factor)
router.post('/login/password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || !process.env.OWNER_PASSWORD_HASH) {
      return res.status(401).json({ error: 'Owner password not set up correctly.' });
    }
    const valid = await bcrypt.compare(password, process.env.OWNER_PASSWORD_HASH);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    // short-lived "step 1 passed" token, must be paired with biometric step
    const stepToken = jwt.sign({ step: 'password-ok' }, process.env.OWNER_JWT_SECRET, {
      expiresIn: '5m',
    });
    res.json({ ok: true, stepToken });
  } catch (err) {
    console.error('Owner password login error:', err.message);
    res.status(500).json({ error: 'Server error during owner login.' });
  }
});

// STEP 2a — generate WebAuthn (biometric) registration options (setup, once)
router.post('/biometric/register/options', requireStepToken, async (req, res) => {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from('owner'),
    userName: 'owner@infinity-ai',
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // device fingerprint/face unlock
      userVerification: 'required',
      residentKey: 'preferred',
    },
  });
  state.currentChallenge = options.challenge;
  res.json(options);
});

router.post('/biometric/register/verify', requireStepToken, async (req, res) => {
  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: state.currentChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Biometric registration failed verification.' });
    }
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    state.ownerCredential = { credentialID, credentialPublicKey, counter };
    res.json({ verified: true });
  } catch (err) {
    console.error('Biometric register error:', err.message);
    res.status(400).json({ error: 'Could not verify biometric registration.' });
  }
});

// STEP 2b — generate WebAuthn authentication options (normal login)
router.post('/biometric/login/options', requireStepToken, async (req, res) => {
  if (!state.ownerCredential) {
    return res.status(400).json({ error: 'No biometric enrolled yet. Register first.' });
  }
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: [
      { id: state.ownerCredential.credentialID, type: 'public-key' },
    ],
  });
  state.currentChallenge = options.challenge;
  res.json(options);
});

router.post('/biometric/login/verify', requireStepToken, async (req, res) => {
  try {
    if (!state.ownerCredential) {
      return res.status(400).json({ error: 'No biometric enrolled.' });
    }
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: state.currentChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: state.ownerCredential.credentialID,
        credentialPublicKey: state.ownerCredential.credentialPublicKey,
        counter: state.ownerCredential.counter,
      },
    });
    if (!verification.verified) {
      return res.status(401).json({ error: 'Biometric verification failed.' });
    }
    state.ownerCredential.counter = verification.authenticationInfo.newCounter;

    // Both factors passed -> issue full owner session token
    const ownerToken = jwt.sign(
      { sub: 'owner', owner: true },
      process.env.OWNER_JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ verified: true, ownerToken });
  } catch (err) {
    console.error('Biometric login error:', err.message);
    res.status(401).json({ error: 'Could not verify biometric login.' });
  }
});

// Middleware: require the short-lived "password passed" token for step 2
function requireStepToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Password step required first.' });
  try {
    const decoded = jwt.verify(token, process.env.OWNER_JWT_SECRET);
    if (decoded.step !== 'password-ok') throw new Error('bad step');
    next();
  } catch {
    res.status(401).json({ error: 'Password step required first.' });
  }
}

// --- Owner-only configuration control --------------------------------------
router.get('/config', requireOwner, (req, res) => {
  res.json(getConfig());
});

router.put('/config', requireOwner, (req, res) => {
  const allowedKeys = [
    'appName',
    'theme',
    'logoUrl',
    'backgroundStyle',
    'defaultMode',
    'defaultVoice',
    'defaultLanguage',
    'systemPromptOverride',
    'memoryEnabled',
  ];
  const partial = {};
  for (const key of allowedKeys) {
    if (key in req.body) partial[key] = req.body[key];
  }
  const updated = updateConfig(partial);
  res.json(updated);
});

router.get('/whoami', requireOwner, (req, res) => {
  res.json({ owner: true, id: req.owner.id });
});

module.exports = router;
