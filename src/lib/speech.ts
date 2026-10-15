let zhVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ??
    voices.find((v) => v.lang.toLowerCase().includes("cmn")) ??
    null
  );
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

if (speechSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    zhVoice = pickVoice();
  };
  zhVoice = pickVoice();
}

/** Speak Mandarin text using the browser's built-in zh-TW voice. */
export function speak(text: string, rate = 0.85) {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    utterance.rate = rate;
    const voice = zhVoice ?? pickVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // TTS unavailable — silently ignore
  }
}
