/**
 * INFINITY AI — Owner Mode client logic.
 * Flow: password -> short-lived step token -> WebAuthn biometric ->
 * full owner session token (stored in sessionStorage, never localStorage,
 * so it clears when the browser/app session ends).
 */
window.InfinityOwner = (function () {
  const API = window.INFINITY_API_BASE || '';
  let stepToken = null;
  let ownerToken = sessionStorage.getItem('infinity_owner_token') || null;

  function isOwner() {
    return !!ownerToken;
  }

  function getOwnerToken() {
    return ownerToken;
  }

  async function submitPassword(password) {
    const res = await fetch(`${API}/api/owner/login/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Incorrect password.');
    stepToken = data.stepToken;
    return true;
  }

  async function registerBiometric() {
    if (!stepToken) throw new Error('Complete the password step first.');
    if (!window.SimpleWebAuthnBrowser) throw new Error('Biometric library failed to load.');

    const optionsRes = await fetch(`${API}/api/owner/biometric/register/options`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${stepToken}` },
    });
    const options = await optionsRes.json();
    if (!optionsRes.ok) throw new Error(options.error || 'Could not start biometric registration.');

    const attResp = await window.SimpleWebAuthnBrowser.startRegistration(options);

    const verifyRes = await fetch(`${API}/api/owner/biometric/register/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stepToken}` },
      body: JSON.stringify(attResp),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.verified) {
      throw new Error(verifyData.error || 'Biometric registration failed.');
    }
    return true;
  }

  async function verifyBiometric() {
    if (!stepToken) throw new Error('Complete the password step first.');
    if (!window.SimpleWebAuthnBrowser) throw new Error('Biometric library failed to load.');

    const optionsRes = await fetch(`${API}/api/owner/biometric/login/options`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${stepToken}` },
    });
    const options = await optionsRes.json();
    if (!optionsRes.ok) throw new Error(options.error || 'No biometric enrolled yet — register first.');

    const authResp = await window.SimpleWebAuthnBrowser.startAuthentication(options);

    const verifyRes = await fetch(`${API}/api/owner/biometric/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stepToken}` },
      body: JSON.stringify(authResp),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.verified) {
      throw new Error(verifyData.error || 'Biometric verification failed.');
    }
    ownerToken = verifyData.ownerToken;
    sessionStorage.setItem('infinity_owner_token', ownerToken);
    return true;
  }

  function logout() {
    ownerToken = null;
    stepToken = null;
    sessionStorage.removeItem('infinity_owner_token');
  }

  async function getConfig() {
    const res = await fetch(`${API}/api/owner/config`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    if (!res.ok) throw new Error('Could not load owner config.');
    return res.json();
  }

  async function saveConfig(partial) {
    const res = await fetch(`${API}/api/owner/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not save configuration.');
    return data;
  }

  return {
    isOwner,
    getOwnerToken,
    submitPassword,
    registerBiometric,
    verifyBiometric,
    logout,
    getConfig,
    saveConfig,
  };
})();
