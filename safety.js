/**
 * Lightweight guardrails applied BEFORE any prompt (including Owner Mode
 * config-change requests) reaches the model. Owner Mode grants control over
 * app configuration/preferences — it never grants bypass of safety, legal,
 * or privacy boundaries. Gemini's own safety settings remain the primary
 * defense; this is a fast first-pass filter for obviously disallowed asks.
 */

const BLOCKED_PATTERNS = [
  /\bmake\s+(a\s+)?(bomb|explosive|nerve agent|bioweapon)\b/i,
  /\bhow to (hack|breach|exploit)\b.*\b(account|network|server|device)\b/i,
  /\bcreate (malware|ransomware|a virus|spyware)\b/i,
  /\bexpose (api key|env variable|secret|password hash)\b/i,
  /\btrack (someone|a person|my ex|another device) without (consent|permission)\b/i,
  /\bbypass (biometric|fingerprint|authentication)\b/i,
  /\bdisable (all )?safety (checks|filters)\b/i,
  /\bexport (raw )?fingerprint data\b/i,
];

function evaluateRequest(text = '') {
  const lowered = text.toLowerCase();
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(lowered)) {
      return {
        allowed: false,
        reason:
          'This request falls outside what INFINITY AI can safely or legally do, even in Owner Mode. Owner Mode controls app configuration, not safety boundaries.',
      };
    }
  }
  return { allowed: true };
}

module.exports = { evaluateRequest };
