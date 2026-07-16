
import React, { useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

interface Props {
  isActive: boolean;
  handlers: {
    stage_event: (name: string) => string;
    take_live: () => string;
    start_timer: () => string;
    pause_timer: () => string;
    reset_timer: () => string;
    clear_timer: () => string;
  };
}

const SpeechAssistant: React.FC<Props> = ({ isActive, handlers }) => {
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Manual decode/encode helper functions for Gemini API requirements
  const decode = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.error("Failed to decode base64 string", e);
      return new Uint8Array(0);
    }
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const speakText = async (text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly and concisely: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (error) {
      console.error("TTS generation failed:", error);
    }
  };

  const processCommand = (transcript: string) => {
    const lower = transcript.toLowerCase();
    let feedback = "";

    if (lower.includes("check schedule for")) {
      const name = lower.split("check schedule for")[1].trim();
      feedback = handlers.stage_event(name);
    } else if (lower.includes("start")) {
      feedback = handlers.start_timer();
    } else if (lower.includes("pause")) {
      feedback = handlers.pause_timer();
    } else if (lower.includes("reset")) {
      feedback = handlers.reset_timer();
    } else if (lower.includes("clear")) {
      feedback = handlers.clear_timer();
    }

    if (feedback) {
      speakText(feedback);
    }
  };

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      const rec = recognitionRef.current;

      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        console.debug("Recognized speech:", transcript);
        processCommand(transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
      };

      rec.onend = () => {
        // Auto-restart if still active
        if (isActive) {
          try { rec.start(); } catch(e) {}
        }
      };

      if (isActive) {
        try { rec.start(); } catch(e) {}
      } else {
        try { rec.stop(); } catch(e) {}
      }

      return () => {
        try { rec.stop(); } catch(e) {}
      };
    } catch (e) {
      console.error("Failed to initialize Speech Recognition:", e);
      return;
    }
  }, [isActive]);

  return null;
};

export default SpeechAssistant;
