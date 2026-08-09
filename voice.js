/**
 * INFINITY AI Voice module
 * - Speech-to-text via the Web Speech API (SpeechRecognition)
 * - Text-to-speech via SpeechSynthesis, with selectable voice + language
 * Both run entirely in-browser — no backend/API key required.
 */
window.InfinityVoice = (function () {
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let voices = [];

  function loadVoices() {
    voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    return voices;
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  function getVoices() {
    return voices.length ? voices : loadVoices();
  }

  function speak(text, { voiceName, lang = 'en-US', rate = 1, pitch = 1 } = {}) {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel(); // stop any ongoing speech first
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    const allVoices = getVoices();
    const chosen =
      allVoices.find((v) => v.name === voiceName) ||
      allVoices.find((v) => v.lang === lang) ||
      null;
    if (chosen) utter.voice = chosen;
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function isSupported() {
    return !!SpeechRecognitionImpl;
  }

  function startListening({ lang = 'en-US', onResult, onEnd, onError } = {}) {
    if (!SpeechRecognitionImpl) {
      onError && onError('Voice input is not supported in this browser.');
      return;
    }
    recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interim += transcript;
      }
      onResult && onResult({ interim, final: finalTranscript });
    };

    recognition.onerror = (event) => {
      listening = false;
      onError && onError(event.error);
    };

    recognition.onend = () => {
      listening = false;
      onEnd && onEnd(finalTranscript);
    };

    recognition.start();
    listening = true;
  }

  function stopListening() {
    if (recognition && listening) recognition.stop();
  }

  return {
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    getVoices,
    get listening() {
      return listening;
    },
  };
})();
