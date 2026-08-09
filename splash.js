/**
 * INFINITY AI — Splash sequence
 * 1) Space background renders immediately (starfield.js handles the canvas).
 * 2) "INFINITY AI" types in one letter at a time.
 * 3) The dot above the final "I" becomes the anchor point.
 * 4) The logo liquid-reveals outward from that anchor point.
 * 5) Splash fades into the main app.
 */
(function () {
  const TEXT = 'INFINITY AI';
  const CHAR_DELAY = 70; // ms between letters
  const CHAR_ANIM = 450; // matches CSS charIn duration

  const titleEl = document.getElementById('splash-title');
  const logoReveal = document.getElementById('logo-reveal');
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');

  function buildTitle() {
    titleEl.innerHTML = '';
    const chars = [];
    [...TEXT].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.animationDelay = `${i * CHAR_DELAY}ms`;
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      if (i === TEXT.length - 1) span.classList.add('final-dot');
      titleEl.appendChild(span);
      chars.push(span);
    });
    return chars;
  }

  function anchorLogoToFinalChar(chars) {
    const finalChar = chars[chars.length - 1];
    if (!finalChar) return;
    const charRect = finalChar.getBoundingClientRect();
    const parentRect = titleEl.parentElement.getBoundingClientRect();
    // Horizontal anchor as a % across the logo-reveal box, so the liquid
    // reveal visually originates from the dot above the final "I".
    const anchorXPercent = ((charRect.left + charRect.width / 2 - parentRect.left) / parentRect.width) * 100;
    logoReveal.style.transformOrigin = `${Math.max(10, Math.min(90, anchorXPercent))}% -10%`;
  }

  function runSplash() {
    const chars = buildTitle();
    const totalTypingTime = TEXT.length * CHAR_DELAY + CHAR_ANIM;

    setTimeout(() => {
      anchorLogoToFinalChar(chars);
      logoReveal.classList.add('revealing');
    }, totalTypingTime + 150);

    const logoRevealDuration = 1300;
    const holdTime = 550;
    const totalDelay = totalTypingTime + 150 + logoRevealDuration + holdTime;

    setTimeout(finishSplash, totalDelay);
  }

  function finishSplash() {
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      app.hidden = false;
      document.body.style.overflow = 'auto';
      window.dispatchEvent(new CustomEvent('infinity:app-ready'));
    }, 720);
  }

  // Allow skipping the splash by tapping (nice for repeat visits / testing)
  splash.addEventListener('click', () => {
    if (!splash.classList.contains('fade-out')) finishSplash();
  });

  document.addEventListener('DOMContentLoaded', runSplash);
})();
