const jwt = require('jsonwebtoken');

/**
 * Verifies a normal user session token (anonymous device identity).
 * Non-blocking: if missing/invalid, request still proceeds as a guest,
 * since INFINITY AI does not require account creation to chat.
 */
function attachUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Fall back to a client-generated device ID so each device gets its own
  // memory/history without requiring a real account/login.
  const deviceId = (req.headers['x-device-id'] || '').toString().slice(0, 80);
  req.user = { id: deviceId || 'guest', isOwner: false };

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.sub || req.user.id, isOwner: false };
    } catch (err) {
      // invalid/expired token -> keep device-based identity, do not block
    }
  }
  next();
}

/**
 * Strictly requires a valid OWNER session token, issued only after
 * password + WebAuthn (biometric) verification succeeded on the backend.
 */
function requireOwner(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Owner session required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.OWNER_JWT_SECRET);
    if (!decoded.owner) {
      return res.status(403).json({ error: 'Not an owner session.' });
    }
    req.owner = { id: decoded.sub, verifiedAt: decoded.iat };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Owner session invalid or expired.' });
  }
}

module.exports = { attachUser, requireOwner };
