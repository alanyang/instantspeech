
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, SessionMode } from '../types';
import { createCoachChat } from '../services/geminiService';
import { Send, User, Bot, Loader2, Sparkles, Mic, Volume2, VolumeX } from 'lucide-react';
import { GenerateContentResponse } from "@google/genai";

interface Props {
  result: AnalysisResult;
  topic: string;
  mode: SessionMode;
  language: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const VirtualCoach: React.FC<Props> = ({ result, topic, mode, language }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
  const chatSessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        let langTag = 'en-US';
        if (language.toLowerCase().includes('cantonese')) langTag = 'yue-Hant-HK';
        else if (language.toLowerCase().includes('mandarin') || language.toLowerCase().includes('chinese')) langTag = 'zh-CN';
        else if (language.toLowerCase().includes('spanish')) langTag = 'es-ES';
        else if (language.toLowerCase().includes('french')) langTag = 'fr-FR';
        else if (language.toLowerCase().includes('japanese')) langTag = 'ja-JP';
        
        recognitionRef.current.lang = langTag;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [language]);

  // Handle immediate mute
  useEffect(() => {
    if (!isVoiceEnabled && synthRef.current) {
        synthRef.current.cancel();
    }
  }, [isVoiceEnabled]);

  // Speak function for TTS
  const speak = (text: string) => {
    if (!isVoiceEnabled || !synthRef.current) return;
    
    // Always cancel before speaking new text to prevent queueing or overlapping
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Improved Natural Voice Selection
    const voices = synthRef.current.getVoices();
    let selectedVoice = null;

    if (language.toLowerCase().includes('english')) {
        // Priority for natural sounding English voices
        selectedVoice = voices.find(v => v.name.includes("Google US English")) || 
                        voices.find(v => v.name.includes("Microsoft Zira")) ||
                        voices.find(v => v.name.includes("Samantha")) ||
                        voices.find(v => v.lang.includes("en-US"));
    } else if (language.toLowerCase().includes('cantonese')) {
        selectedVoice = voices.find(v => v.lang.includes('HK'));
    } else if (language.toLowerCase().includes('mandarin')) {
        selectedVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Add a slight variance for naturalness
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;

    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    // Initialize chat
    chatSessionRef.current = createCoachChat(result, topic, mode, language);
    
    // Initial greeting from AI (Do not speak automatically)
    const startConversation = async () => {
      setIsLoading(true);
      try {
        const response: GenerateContentResponse = await chatSessionRef.current.sendMessage({ 
          message: `Hello. I've analyzed your speech on "${topic}". I noticed your strengths in ${result.strengths[0] || 'delivery'}. How would you like to improve?` 
        });
        const text = response.text || "Hello! Ready to review your speech?";
        setMessages([{ role: 'model', text: text }]);
        // speak(text); // DISABLED auto-speak
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    startConversation();
    
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [result, topic, mode, language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (manualText?: string) => {
    const textToSend = manualText || input;
    if (!textToSend.trim() || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsLoading(true);

    try {
      const response: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: textToSend });
      const reply = response.text || "I see.";
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      // speak(reply); // DISABLED auto-speak
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I lost my train of thought. Can you say that again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const suggestions = [
    "How can I improve my introduction?",
    "Give me an example of a better conclusion.",
    "Explain the framework you suggested.",
    "Was my tone appropriate?"
  ];

  return (
    <div className="flex flex-col h-[600px] w-full bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg relative">
            <Bot size={24} className="text-white" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full"></span>
            </div>
            <div>
            <h3 className="font-bold text-white">Virtual Expert</h3>
            <p className="text-xs text-slate-400">AI Speaking Coach • Online</p>
            </div>
        </div>
        <button 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`p-2 rounded-full transition-colors ${isVoiceEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}
            title={isVoiceEnabled ? "Mute Voice" : "Enable Voice"}
        >
            {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                <Sparkles size={14} className="text-indigo-400" />
              </div>
            )}
            <div 
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed relative group ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-700 text-slate-200 rounded-tl-none border border-slate-600 pr-10'
              }`}
            >
              {msg.text}
              
              {/* Play Button for AI Messages */}
              {msg.role === 'model' && isVoiceEnabled && (
                <button 
                  onClick={() => speak(msg.text)}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded-full transition-colors opacity-50 group-hover:opacity-100"
                  title="Read Aloud"
                >
                  <Volume2 size={14} />
                </button>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
             <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Loader2 size={14} className="text-indigo-400 animate-spin" />
             </div>
             <div className="bg-slate-700/50 px-4 py-2 rounded-full text-xs text-slate-400 animate-pulse">
               Thinking...
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        {messages.length < 3 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {suggestions.map((s, i) => (
              <button 
                key={i}
                onClick={() => handleSend(s)}
                className="whitespace-nowrap px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full text-xs text-slate-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 items-center">
          {recognitionRef.current && (
             <button
               onClick={toggleListening}
               className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
               title="Speak to Coach"
             >
               <Mic size={20} />
             </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Message your coach..."}
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
