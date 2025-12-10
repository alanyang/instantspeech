
import React, { useState, useEffect, useCallback } from 'react';
import { UserPreferences, SessionConfig, SessionMode, HistoryItem, SpeechLevel, TopicOutline } from '../types';
import { generateTopic, generateTopicOutline } from '../services/geminiService';
import { getHistory } from '../services/historyService';
import { RefreshCw, Clock, Globe, Mic2, HeartHandshake, History, X, ChevronRight, Calendar, ArrowLeft, Eye, Laugh, Trophy, Scale, Menu, Lightbulb, ChevronLeft, Sparkles } from 'lucide-react';

interface Props {
  prefs: UserPreferences;
  onStart: (config: SessionConfig) => void;
  onBack: () => void;
  onLoadHistory: (item: HistoryItem) => void;
}

const COMEDY_THEMES = [
  "Parenting", "Workplace", "Dating/Marriage", "Technology", 
  "Traffic/Travel", "Aging", "Social Media", "Friendship", "Food/Diet"
];

const MODES_INFO = {
    [SessionMode.SPEECH]: { label: "Speech Practice", icon: Mic2, color: 'blue' },
    [SessionMode.EXPRESS]: { label: "Express Feelings", icon: HeartHandshake, color: 'rose' },
    [SessionMode.DEBATE]: { label: "Debate", icon: Scale, color: 'green' },
    [SessionMode.COMEDY]: { label: "Comedy Training", icon: Laugh, color: 'yellow' }
};

export const SessionSetup: React.FC<Props> = ({ prefs, onStart, onBack, onLoadHistory }) => {
  const [setupStep, setSetupStep] = useState(1); // 1: Config, 2: Topic & Time

  // State
  const [topic, setTopic] = useState<string>("Loading topic...");
  const [customTopic, setCustomTopic] = useState("");
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(120);
  const [prepTime, setPrepTime] = useState(0);
  const [language, setLanguage] = useState("English");
  const [level, setLevel] = useState<SpeechLevel>(SpeechLevel.BEGINNER);
  const [comedyTheme, setComedyTheme] = useState<string>(COMEDY_THEMES[0]);
  
  // AI Tips (Mindmap) State
  const [outline, setOutline] = useState<TopicOutline | null>(null);
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [showMindmap, setShowMindmap] = useState(false);

  // Read-only mode from onboarding
  const mode = prefs.preferredMode || SessionMode.SPEECH;

  // History & Menu
  const [showHistory, setShowHistory] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const fetchTopic = useCallback(async () => {
    if (isCustomTopic) return;
    setLoading(true);
    setOutline(null); // Reset outline on new topic
    
    // For comedy mode, we pass the selected theme as the first "interest"
    const relevantInterests = mode === SessionMode.COMEDY ? [comedyTheme] : prefs.topics;

    const newTopic = await generateTopic(relevantInterests, "", language, mode, level);
    setTopic(newTopic);
    setLoading(false);
  }, [prefs.topics, language, mode, level, isCustomTopic, comedyTheme]);

  // Initial fetch only when entering Step 2
  useEffect(() => {
    if (setupStep === 2) {
        fetchTopic();
    }
  }, [setupStep, fetchTopic]);

  const handleStart = () => {
    onStart({
      topic: isCustomTopic ? customTopic : topic,
      durationSeconds: duration,
      language,
      mode,
      level,
      prepTimeSeconds: prepTime
    });
  };

  const handleGenerateMindmap = async () => {
      const currentTopic = isCustomTopic ? customTopic : topic;
      if (!currentTopic) return;
      
      setShowMindmap(true);
      
      // Use cached if available
      if (outline) return;

      setLoadingOutline(true);
      try {
          const result = await generateTopicOutline(currentTopic, language);
          setOutline(result);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingOutline(false);
      }
  };

  const handleRegenerateTips = async () => {
      const currentTopic = isCustomTopic ? customTopic : topic;
      if (!currentTopic) return;
      
      setLoadingOutline(true);
      try {
          const result = await generateTopicOutline(currentTopic, language);
          setOutline(result);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingOutline(false);
      }
  };

  const toggleHistory = () => {
    if (!showHistory) {
      setHistoryItems(getHistory());
    }
    setShowHistory(!showHistory);
    setIsMenuOpen(false);
  };

  // Render History View
  if (showHistory) {
    return (
      <div className="min-h-screen w-full max-w-4xl mx-auto p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <History size={32} /> Session History
          </h2>
          <button 
            onClick={() => setShowHistory(false)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>
        {historyItems.length === 0 ? (
          <div className="text-center py-20 text-slate-500"><p>No recorded sessions yet.</p></div>
        ) : (
          <div className="grid gap-4">
            {historyItems.map((item) => (
              <div key={item.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <Calendar size={12} />
                    {new Date(item.date).toLocaleDateString()}
                    <span className="bg-slate-700 px-2 py-0.5 rounded text-white">{item.mode}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{item.topic}</h3>
                  <div className="text-xs text-slate-500">Score: {item.score}</div>
                </div>
                <button 
                    onClick={() => onLoadHistory(item)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Eye size={16} /> Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Common Header for both Steps ---
  const renderHeader = (title: string) => (
      <div className="w-full flex justify-between items-center mb-6 relative z-30">
        <div className="flex items-center gap-4">
           <div className="relative">
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors">
                <Menu size={28} />
             </button>
             {isMenuOpen && (
                 <div className="absolute top-12 left-0 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in flex flex-col z-50">
                     <button onClick={onBack} className="px-5 py-3 text-left text-sm hover:bg-slate-700 text-slate-200 flex items-center gap-2">
                        <ArrowLeft size={16} /> Return to Onboarding
                     </button>
                     <button onClick={toggleHistory} className="px-5 py-3 text-left text-sm hover:bg-slate-700 text-slate-200 flex items-center gap-2">
                        <History size={16} /> Session History
                     </button>
                 </div>
             )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
        </div>
      </div>
  );

  // --- Step 1: Configuration ---
  if (setupStep === 1) {
      const modeInfo = MODES_INFO[mode];
      const ModeIcon = modeInfo.icon;
      
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-2xl mx-auto p-6 animate-fade-in">
            {renderHeader("Configuration")}
            
            <div className="w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl space-y-8">
                
                {/* Active Mode Badge (Read Only) */}
                <div className={`flex items-center gap-4 p-4 rounded-xl bg-${modeInfo.color}-900/20 border border-${modeInfo.color}-500/50`}>
                    <div className={`p-3 rounded-full bg-${modeInfo.color}-500 text-white`}>
                        <ModeIcon size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Current Mode</div>
                        <div className="text-lg font-bold text-white">{modeInfo.label}</div>
                    </div>
                </div>

                {/* Level Selection */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-3">
                        <Trophy size={18} className="text-yellow-500" /> Difficulty Level
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { val: SpeechLevel.BEGINNER, label: "Beginner", desc: "Professional, Concrete, Clear Context" },
                            { val: SpeechLevel.ADVANCED, label: "Advanced", desc: "Societal Issues, Balanced Arguments" },
                            { val: SpeechLevel.EXPERT, label: "Expert", desc: "Abstract, Philosophical, Complex" }
                        ].map((opt) => (
                            <button
                                key={opt.val}
                                onClick={() => setLevel(opt.val)}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                    level === opt.val 
                                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg' 
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-xs opacity-70">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Language Selection */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-3">
                        <Globe size={18} className="text-teal-500" /> Language
                    </label>
                    <select 
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                    >
                        <option value="English">English</option>
                        <option value="Cantonese">Cantonese (粵語)</option>
                        <option value="Mandarin">Mandarin (普通話)</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="Japanese">Japanese</option>
                    </select>
                </div>

                <button
                    onClick={() => setSetupStep(2)}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold rounded-xl shadow-lg transition-transform transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    Next Step <ChevronRight size={20} />
                </button>
            </div>
        </div>
      );
  }

  // --- Step 2: Topic & Timing ---
  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] w-full max-w-5xl mx-auto p-4 md:p-6 animate-fade-in relative">
      {/* Mindmap / AI Tips Overlay */}
      {showMindmap && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-8 w-full max-w-3xl relative overflow-hidden">
                   <div className="absolute top-4 right-4 flex gap-2">
                      <button 
                        onClick={handleRegenerateTips} 
                        disabled={loadingOutline}
                        className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors text-blue-300"
                        title="Regenerate"
                      >
                         <RefreshCw size={20} className={loadingOutline ? "animate-spin" : ""} />
                      </button>
                      <button onClick={() => setShowMindmap(false)} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors">
                          <X size={20} className="text-white" />
                      </button>
                   </div>
                   
                   <h3 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-3">
                       <Sparkles className="text-purple-400" /> AI Tips & Structure
                   </h3>

                   {loadingOutline ? (
                       <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                           <RefreshCw size={32} className="animate-spin mb-4 text-blue-500" />
                           <p>Generating smart ideas...</p>
                       </div>
                   ) : outline ? (
                       <div className="relative h-[400px] w-full flex items-center justify-center">
                           {/* Central Node */}
                           <div className="absolute z-20 w-40 h-40 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center p-4 text-center shadow-[0_0_30px_rgba(59,130,246,0.5)] border-4 border-slate-800">
                               <p className="text-white font-bold text-sm md:text-base leading-tight">{outline.centralIdea}</p>
                           </div>

                           {/* Branches (CSS Lines) */}
                           <div className="absolute w-[80%] h-1 bg-slate-600 top-1/2 left-[10%] -z-10"></div>
                           <div className="absolute h-[60%] w-1 bg-slate-600 left-1/2 top-[20%] -z-10"></div>

                           {/* Child Nodes */}
                           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-32 h-32 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center p-4 text-center shadow-xl">
                               <p className="text-slate-200 text-xs font-semibold">{outline.points[0]}</p>
                           </div>
                           <div className="absolute bottom-[20%] left-0 w-32 h-32 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center p-4 text-center shadow-xl">
                               <p className="text-slate-200 text-xs font-semibold">{outline.points[1]}</p>
                           </div>
                           <div className="absolute bottom-[20%] right-0 w-32 h-32 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center p-4 text-center shadow-xl">
                               <p className="text-slate-200 text-xs font-semibold">{outline.points[2]}</p>
                           </div>
                       </div>
                   ) : (
                       <div className="text-center text-red-400">Failed to load tips.</div>
                   )}
              </div>
          </div>
      )}

      {renderHeader("Topic & Timing")}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Left: Timing */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
                 <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-3">
                        <Clock size={16} /> Speaking Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {[60, 120, 180, 300].map(sec => (
                            <button 
                                key={sec} 
                                onClick={() => setDuration(sec)}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${duration === sec ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-700'}`}
                            >
                                {sec / 60} Min
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-3">
                        <Clock size={16} /> Preparation Time
                    </label>
                    <select 
                        value={prepTime} 
                        onChange={(e) => setPrepTime(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value={0}>Start Immediately</option>
                        <option value={60}>1 Minute</option>
                        <option value={180}>3 Minutes</option>
                        <option value={300}>5 Minutes</option>
                        <option value={600}>10 Minutes</option>
                    </select>
                </div>
            </div>

            <button
                onClick={() => setSetupStep(1)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
                <ChevronLeft size={16} /> Back to Config
            </button>
        </div>

        {/* Right: Topic */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex-1 bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Tabs */}
            <div className="flex justify-center mb-8 relative z-10">
                <div className="bg-slate-900/80 p-1 rounded-xl flex gap-1 border border-slate-600">
                    <button 
                        onClick={() => setIsCustomTopic(false)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isCustomTopic ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        AI Generated
                    </button>
                    <button 
                        onClick={() => setIsCustomTopic(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isCustomTopic ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        Write My Own
                    </button>
                </div>
            </div>

            {/* Topic Area */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-[200px] relative z-10">
                
                {!isCustomTopic && mode !== SessionMode.COMEDY && (
                   <button 
                    onClick={fetchTopic} 
                    disabled={loading}
                    className="absolute top-0 right-0 p-3 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-bl-2xl transition-all"
                    title="Generate New Topic"
                    >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                   </button>
                )}

                {isCustomTopic ? (
                    <div className="w-full max-w-lg">
                        <input 
                            type="text" 
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder="Type your topic here..."
                            className="w-full bg-slate-900/50 border-b-2 border-slate-600 focus:border-blue-500 text-2xl font-serif text-white placeholder-slate-600 p-2 outline-none text-center transition-colors"
                            autoFocus
                        />
                    </div>
                ) : (
                    <div className="text-center w-full px-4">
                         {mode === SessionMode.COMEDY && (
                             <div className="mb-4">
                                <label className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-2">Theme</label>
                                <select 
                                    value={comedyTheme}
                                    onChange={(e) => setComedyTheme(e.target.value)}
                                    className="bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none"
                                >
                                    {COMEDY_THEMES.map(theme => <option key={theme} value={theme}>{theme}</option>)}
                                </select>
                             </div>
                         )}
                         {mode !== SessionMode.COMEDY && <label className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-4">Your Topic</label>}
                         <p className="text-2xl md:text-4xl font-serif font-medium leading-tight text-white animate-fade-in">
                            {loading ? <span className="text-slate-500 animate-pulse">Thinking...</span> : `"${topic}"`}
                        </p>
                    </div>
                )}

                {/* AI Tips Button */}
                <button 
                    onClick={handleGenerateMindmap}
                    disabled={loading || (isCustomTopic && !customTopic)}
                    className="mt-4 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/50 rounded-full text-sm font-medium flex items-center gap-2 transition-colors"
                >
                    <Sparkles size={16} /> Get AI Tips
                </button>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading || (isCustomTopic && !customTopic.trim())}
            className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xl font-bold rounded-2xl shadow-lg transition-transform transform active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Enter Stage <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
