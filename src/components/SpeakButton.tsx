import { useState } from 'react';
import { Volume2 } from 'lucide-react';

export function SpeakButton({ text, label = 'Nghe phát âm' }: { text: string; label?: string }) {
  const [message, setMessage] = useState('');
  function speak() {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setMessage('Trình duyệt này chưa hỗ trợ đọc. Bạn vẫn có thể luyện bằng phiên âm.');
      return;
    }
    const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase() === 'zh-tw')
      ?? window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith('zh'));
    if (!voice) {
      setMessage('Thiết bị chưa có giọng tiếng Hoa. Hãy cài giọng zh-TW trong cài đặt thiết bị để nghe phát âm.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.voice = voice;
    utterance.rate = 0.8;
    utterance.onerror = () => setMessage('Chưa thể phát âm thanh trên thiết bị này. Hãy thử lại.');
    setMessage('');
    window.speechSynthesis.speak(utterance);
  }
  return <span className="speech-control"><button type="button" className="icon-button" onClick={speak} aria-label={label} title={label}><Volume2 size={18} /></button>{message && <span className="speech-message" role="status">{message}</span>}</span>;
}
