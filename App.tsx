
import React, { useState, useEffect } from 'react';
import { AppStep, UserPreferences, SessionConfig, AnalysisResult, SessionMode, HistoryItem, SpeechLevel } from './types';
import { Onboarding } from './components/Onboarding';
import { SessionSetup } from './components/SessionSetup';
import { Stage } from './components/Stage';
import { Analysis } from './components/Analysis';
import { analyzeSpeech } from './services/geminiService';
import { saveHistoryItem } from './services/historyService';

// Speech tips library
const SPEECH_TIPS = [
  "Pause for 2-3 seconds before answering to show thoughtfulness.",
  "Use the PREP method: Point, Reason, Example, Point.",
  "Maintain eye contact with the camera to simulate audience connection.",
  "Vary your vocal tone to keep the audience engaged.",
  "Avoid filler words like 'um' and 'ah' by pausing instead.",
  "Start with a hook: a story, a statistic, or a question.",
  "End with a call to action or a memorable closing statement.",
  "Use hand gestures naturally to emphasize key points.",
  "Speak slightly slower than your normal conversation speed.",
  "Structure your speech with a clear beginning, middle, and end.",
  "Use 'Rule of Three' for lists (e.g., 'Life, Liberty, and Pursuit of Happiness').",
  "Smile when appropriate; it changes the tone of your voice.",
  "Anchor your body; avoid swaying or pacing aimlessly.",
  "Use analogies to explain complex concepts.",
  "Address the audience directly using 'you'.",
  "If you stumble, just pause, smile, and continue.",
  "Use silence as a tool to let important points sink in.",
  "Articulate your words clearly, especially consonants.",
  "Check your lighting; ensure your face is clearly visible.",
  "Breath from your diaphragm to project confidence.",
  "Don't memorize; internalize the key points instead.",
  "Visualize a successful speech before you start.",
  "Use a 'Past, Present, Future' structure for storytelling.",
  "Turn nervous energy into enthusiasm.",
  "Keep your sentences relatively short and punchy.",
  "Ask rhetorical questions to engage the audience's mind.",
  "Use contrast (e.g., 'Not only X, but also Y').",
  "Acknowledge the counter-argument to build credibility.",
  "Record yourself often to identify subconscious habits.",
  "Be yourself; authenticity resonates more than perfection."
];

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.ONBOARDING);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({ topics: [], preferredMode: SessionMode.SPEECH });
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({ topic: '', durationSeconds: 60, language: 'English', mode: SessionMode.SPEECH, level: SpeechLevel.BEGINNER, prepTimeSeconds: 0 });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTips, setActiveTips] = useState<string[]>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Transitions
  const handleOnboardingComplete = (prefs: UserPreferences) => {
    setUserPrefs(prefs);
    setSessionConfig(prev => ({ ...prev, mode: prefs.preferredMode }));
    setStep(AppStep.SETUP);
  };

  const handleBackToOnboarding = () => {
    setStep(AppStep.ONBOARDING);
  };

  const handleBackToSetup = () => {
    setStep(AppStep.SETUP);
  };

  const handleSessionStart = (config: SessionConfig) => {
    setSessionConfig(config);
    setStep(AppStep.STAGE);
  };

  // Load random tips when analysis starts
  useEffect(() => {
    if (isAnalyzing) {
      const shuffled = [...SPEECH_TIPS].sort(() => 0.5 - Math.random());
      setActiveTips(shuffled.slice(0, 5));
      setCurrentTipIndex(0);
    }
  }, [isAnalyzing]);

  // Rotate tips during analysis
  useEffect(() => {
    if (isAnalyzing && activeTips.length > 0) {
      const interval = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % activeTips.length);
      }, 5000); // Change tip every 5s
      return () => clearInterval(interval);
    }
  }, [isAnalyzing, activeTips]);

  // Simulated progress for analysis (approx 45 seconds)
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setProgress(0);
      const totalTime = 45000; // 45s estimate
      const tick = 100;
      
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 99) return 99; // Hold at 99 until finished
          return prev + (100 / (totalTime / tick));
        });
      }, tick);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleSessionFinish = async (audioBlob: Blob, duration: number) => {
    setIsAnalyzing(true);
    setCurrentAudioBlob(audioBlob);
    setRecordedDuration(duration);
    
    try {
      const result = await analyzeSpeech(audioBlob, sessionConfig.topic, duration, sessionConfig.mode, sessionConfig.language, sessionConfig.level);
      setAnalysisResult(result);
      
      // Save to History (including full result)
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        topic: sessionConfig.topic,
        mode: sessionConfig.mode,
        score: result.overallScore,
        wpm: result.wpm,
        sentiment: result.sentiment,
        fullResult: result 
      };
      saveHistoryItem(historyItem);

      setIsAnalyzing(false);
      setStep(AppStep.ANALYSIS);
    } catch (e) {
      console.error(e);
      alert("Failed to analyze speech. Please try again.");
      setIsAnalyzing(false);
      setStep(AppStep.SETUP);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    // Populate session config from history
    setSessionConfig({
      topic: item.topic,
      mode: item.mode,
      durationSeconds: 0, // Not relevant for review
      language: 'English', 
      level: SpeechLevel.BEGINNER,
      prepTimeSeconds: 0
    });
    setAnalysisResult(item.fullResult);
    setCurrentAudioBlob(null); // No audio for historical items
    setRecordedDuration(0);
    setStep(AppStep.ANALYSIS);
  };

  const handleRestart = () => {
    setAnalysisResult(null);
    setCurrentAudioBlob(null);
    setRecordedDuration(0);
    setStep(AppStep.SETUP);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${sessionConfig.mode === SessionMode.SPEECH ? 'bg-blue-900/20' : sessionConfig.mode === SessionMode.COMEDY ? 'bg-yellow-900/20' : 'bg-rose-900/20'}`}></div>
         <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${sessionConfig.mode === SessionMode.SPEECH ? 'bg-teal-900/20' : sessionConfig.mode === SessionMode.COMEDY ? 'bg-orange-900/20' : 'bg-purple-900/20'}`}></div>
      </div>

      <div className="relative z-10">
        {step === AppStep.ONBOARDING && (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}

        {step === AppStep.SETUP && (
          <SessionSetup 
            prefs={userPrefs} 
            onStart={handleSessionStart} 
            onBack={handleBackToOnboarding} 
            onLoadHistory={handleLoadHistory}
          />
        )}

        {step === AppStep.STAGE && (
          <>
            <Stage config={sessionConfig} onFinish={handleSessionFinish} onBack={handleBackToSetup} />
            {isAnalyzing && (
              <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-6">
                <div className={`w-20 h-20 border-4 border-t-transparent rounded-full animate-spin mb-8 ${sessionConfig.mode === SessionMode.SPEECH ? 'border-blue-500' : 'border-rose-500'}`}></div>
                
                <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Analyzing Speech...</h2>
                
                <div className="w-full max-w-md bg-slate-800 rounded-full h-4 mb-4 overflow-hidden border border-slate-700">
                  <div 
                    className={`h-full transition-all duration-300 ${sessionConfig.mode === SessionMode.SPEECH ? 'bg-blue-500' : 'bg-rose-500'}`} 
                    style={{ width: `${Math.floor(progress)}%` }}
                  ></div>
                </div>
                
                <p className="text-slate-300 font-mono text-xl mb-8">{Math.floor(progress)}%</p>
                
                {/* Tip Carousel */}
                <div className="h-24 w-full max-w-lg relative flex items-center justify-center">
                   {activeTips.map((tip, idx) => (
                     <div 
                       key={idx}
                       className={`absolute inset-0 flex items-center justify-center text-center transition-opacity duration-700 ${idx === currentTipIndex ? 'opacity-100' : 'opacity-0'}`}
                     >
                       <p className="text-slate-400 text-lg italic">"{tip}"</p>
                     </div>
                   ))}
                </div>

                <p className="text-slate-600 text-sm mt-4">Estimated time remaining: {Math.max(0, Math.ceil(45 - (progress / 100 * 45)))}s</p>
              </div>
            )}
          </>
        )}

        {step === AppStep.ANALYSIS && analysisResult && (
          <Analysis 
            result={analysisResult} 
            onRestart={handleRestart} 
            mode={sessionConfig.mode}
            audioBlob={currentAudioBlob}
            recordedDuration={recordedDuration}
            topic={sessionConfig.topic}
            language={sessionConfig.language}
          />
        )}
      </div>
    </div>
  );
}
