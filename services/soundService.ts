
import { AppSettings, AlertSound } from '../types';

class SoundService {
  private audioContext: AudioContext | null = null;

  private initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playAlert(sound: AlertSound, type: 'short' | 'long' = 'short') {
    this.initAudio();
    if (!this.audioContext) return;

    const duration = type === 'short' ? 0.2 : 0.5;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    switch (sound) {
      case 'beep':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'short' ? 880 : 440, this.audioContext.currentTime);
        break;
      case 'whistle':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1500, this.audioContext.currentTime + duration);
        break;
      case 'chime':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + duration);
        break;
      case 'pulse':
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
        break;
      case 'digital':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1500, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + duration);
        break;
    }
    
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  speak(text: string, gender: 'male' | 'female') {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a voice that matches the gender
    const targetVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      if (gender === 'female') {
        return name.includes('female') || name.includes('samantha') || name.includes('victoria') || name.includes('google uk english female');
      } else {
        return name.includes('male') || name.includes('alex') || name.includes('daniel') || name.includes('google uk english male');
      }
    });

    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = gender === 'female' ? 1.2 : 0.8;
    
    window.speechSynthesis.speak(utterance);
  }

  formatDuration(seconds: number): string {
    if (seconds <= 0) return "";
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts: string[] = [];
    if (hrs > 0) parts.push(`${hrs} hour${hrs !== 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} minute${mins !== 1 ? 's' : ''}`);
    if (secs > 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
    
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
    
    const lastPart = parts.pop();
    return `${parts.join(', ')} and ${lastPart}`;
  }

  announceUpNext(eventName: string, durationSeconds: number, gender: 'male' | 'female') {
    const timeStr = this.formatDuration(durationSeconds);
    const text = `Up Next: ${eventName}${timeStr ? `, ${timeStr}` : ''}.`;
    this.speak(text, gender);
  }
}

export const soundService = new SoundService();
