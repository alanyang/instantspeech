
import React, { useMemo, useState, useRef } from 'react';
import { AnalysisResult, SessionMode } from '../types';
import { VirtualCoach } from './VirtualCoach';
import { 
  AlertCircle, CheckCircle, Zap, MessageSquare, Mic, 
  ThumbsUp, ThumbsDown, Heart, Brain, Play, Pause, BookOpen, Volume2, ChevronDown, ChevronUp, Bot, FileText, Laugh, Languages, PenTool, Scale, Menu
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis
} from 'recharts';

interface Props {
  result: AnalysisResult;
  onRestart: () => void;
  mode: SessionMode;
  audioBlob?: Blob | null;
  recordedDuration?: number;
  topic?: string;
  language?: string;
}

const CustomAudioPlayer: React.FC<{ src: string, recordedDuration: number }> = ({ src, recordedDuration }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  
  // Use explicit recorded duration if available, else standard fallback
  const duration = recordedDuration || 0;

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setSpeed(nextSpeed);
    if (audioRef.current) {
        audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 flex flex-col gap-3">
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
      />
      
      <div className="flex items-center gap-4">
        <button 
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center text-white transition-all shadow-lg shadow-blue-500/20 shrink-0"
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
        </button>

        <div className="flex-1 flex flex-col justify-center gap-1">
          <input 
            type="range" 
            min="0" 
            max={duration} 
            value={currentTime} 
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button 
            onClick={toggleSpeed}
            className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded border border-slate-700 min-w-[3rem]"
        >
            {speed}x
        </button>
      </div>
    </div>
  );
};

// Helper to highlight bold text from markdown (e.g. **bold**)
const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-indigo-300 font-bold bg-indigo-900/30 px-1 rounded">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// Helper to highlight words wrapped in [[ ]] with a yellow/gold badge style
const TranscriptHighlighter: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('[[') && part.endsWith(']]')) {
          const content = part.slice(2, -2);
          return (
            <span key={i} className="mx-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-200 rounded border border-yellow-500/30 text-sm font-medium" title="Advanced Vocabulary">
              {content}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

export const Analysis: React.FC<Props> = ({ result, onRestart, mode, audioBlob, recordedDuration = 0, topic = "Your Speech", language = "English" }) => {
  const isSpeech = mode === SessionMode.SPEECH;
  const [activeFrameworkIndex, setActiveFrameworkIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'REPORT' | 'COACH'>('REPORT');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const audioUrl = useMemo(() => {
    return audioBlob ? URL.createObjectURL(audioBlob) : null;
  }, [audioBlob]);

  const structureTitle = isSpeech ? "Suggested Structure (Polished)" : "Narrative Flow (Polished)";
  const structureLabels = isSpeech 
    ? { point: 'Point', reason: 'Reason', example: 'Example', restate: 'Point (End)' }
    : { point: 'Emotion', reason: 'Context', example: 'Story', restate: 'Insight' };
  
  const isChinese = language?.toLowerCase().includes('chinese') || language?.toLowerCase().includes('cantonese') || language?.toLowerCase().includes('mandarin') || language?.toLowerCase().includes('japanese');

  // Prepare Radar Data
  const radarData = [
    { subject: 'Logic', A: result.subScores?.logic || result.overallScore, fullMark: 100 },
    { subject: 'Delivery', A: result.subScores?.delivery || result.overallScore, fullMark: 100 },
    { subject: 'Structure', A: result.subScores?.structure || result.overallScore, fullMark: 100 },
    { subject: 'Vocab', A: result.subScores?.vocabulary || result.overallScore, fullMark: 100 },
    { subject: 'Emotion', A: result.subScores?.emotion || result.overallScore, fullMark: 100 },
  ];

  const getModeIcon = () => {
      switch(mode) {
          case SessionMode.COMEDY: return <Laugh className="text-yellow-400" />;
          case SessionMode.DEBATE: return <Scale className="text-green-400" />;
          case SessionMode.EXPRESS: return <Heart className="text-rose-400" />;
          default: return <Brain className="text-blue-400" />;
      }
  };

  // Custom Tick for Radar Chart to show Score Under Label
  const renderTick = ({ payload, x, y, textAnchor, stroke, radius }: any) => {
    const data = radarData.find(d => d.subject === payload.value);
    if (!data) return null;
    
    return (
      <g className="layer">
        <text radius={radius} stroke={stroke} x={x} y={y} className="fill-slate-400 text-[10px] font-bold uppercase" textAnchor={textAnchor}>
          {payload.value}
        </text>
        <text radius={radius} stroke={stroke} x={x} y={y + 12} className={`text-sm font-black ${data.A < 50 ? 'fill-red-400' : 'fill-white'}`} textAnchor={textAnchor}>
          {data.A}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 overflow-y-auto pb-20">
      {/* Header */}
      <div className="w-full bg-slate-800 border-b border-slate-700 p-4 pt-12 md:pt-6 sticky top-0 z-50 backdrop-blur-md bg-opacity-90 shadow-md">
        <div className="max-w-[95%] mx-auto flex justify-between items-center gap-4 relative">
          
          {/* Hamburger Menu */}
          <div className="relative">
             <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
             >
                <Menu size={24} />
             </button>
             {isMenuOpen && (
                 <div className="absolute top-12 left-0 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in flex flex-col z-50">
                     <button onClick={() => window.location.reload()} className="px-4 py-3 text-left text-sm hover:bg-slate-700 text-slate-200">Home</button>
                     <button onClick={onRestart} className="px-4 py-3 text-left text-sm hover:bg-slate-700 text-slate-200">New Session</button>
                 </div>
             )}
          </div>

          {/* Mode Switcher */}
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-700 flex gap-1">
             <button 
               onClick={() => setViewMode('REPORT')}
               className={`px-3 py-1.5 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'REPORT' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
             >
               <FileText size={16} /> <span className="hidden md:inline">Static Report</span>
             </button>
             <button 
               onClick={() => setViewMode('COACH')}
               className={`px-3 py-1.5 md:px-4 md:py-2 rounded-md text-xs md:text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'COACH' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
             >
               <Bot size={16} /> <span className="hidden md:inline">Virtual Coach</span>
             </button>
          </div>
          
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>
      </div>

      <div className="max-w-[95%] mx-auto p-4 md:p-6 space-y-6 pt-6">
        
        {/* Virtual Coach - Preserved in DOM with CSS toggling to keep state */}
        <div className={viewMode === 'COACH' ? 'block animate-fade-in' : 'hidden'}>
           <div className="max-w-4xl mx-auto">
             <div className="mb-6 text-center">
               <h2 className="text-2xl font-bold text-white mb-2">Speak with your AI Coach</h2>
               <p className="text-slate-400">Have a natural conversation. Ask for advice or practice a section of your speech.</p>
             </div>
             <VirtualCoach result={result} topic={topic} mode={mode} language={language || 'English'} />
          </div>
        </div>

        {/* Static Report */}
        <div className={viewMode === 'REPORT' ? 'block animate-fade-in space-y-6' : 'hidden'}>
             <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
               {getModeIcon()} Analysis Report
             </h1>

            {/* Top Cards: Score & Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Score - Radar Chart */}
              <div className="md:col-span-1 bg-slate-800 rounded-2xl p-4 border border-slate-700 flex flex-col relative overflow-hidden group hover:border-slate-600 transition-colors">
                <div className="absolute top-4 left-4 z-10">
                   <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Overall Score</h3>
                   <span className="text-3xl font-black text-white">{result.overallScore}</span>
                </div>
                
                <div className="w-full h-[250px] mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={renderTick} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Score"
                        dataKey="A"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="#f59e0b"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Metrics & Audio */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-colors">
                        <div className={`flex items-center gap-2 mb-2 ${isSpeech ? 'text-blue-400' : 'text-rose-400'}`}>
                          <Mic size={18} />
                          <span className="font-bold text-sm">Pacing</span>
                        </div>
                        <div>
                          <span className="text-4xl font-bold text-white">{result.wpm}</span>
                          <span className="text-slate-500 text-xs ml-2">{isChinese ? 'CPM' : 'WPM'}</span>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between hover:border-slate-600 transition-colors">
                        <div className="flex items-center gap-2 text-yellow-400 mb-2">
                          <AlertCircle size={18} />
                          <span className="font-bold text-sm">Fillers</span>
                        </div>
                        <div>
                          <span className="text-4xl font-bold text-white">{result.fillerWordCount}</span>
                          <span className="text-slate-500 text-xs ml-2">detected</span>
                        </div>
                    </div>
                </div>

                {/* Audio Player */}
                {audioUrl && (
                  <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-2 flex items-center gap-2">
                      Recording Playback
                    </p>
                    <CustomAudioPlayer src={audioUrl} recordedDuration={recordedDuration} />
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Frameworks Accordion */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
               <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
                 <BookOpen size={20} className="text-teal-400" />
                 <h3 className="font-bold text-white">Recommended Frameworks</h3>
                 <span className="text-xs text-slate-500 ml-2">(Tap to expand)</span>
               </div>
               
               <div>
                 {result.speechFramework.map((framework, idx) => (
                   <div key={idx} className="border-b border-slate-700 last:border-0">
                     <button 
                       onClick={() => setActiveFrameworkIndex(idx)}
                       className={`w-full flex items-center justify-between p-4 text-left transition-colors ${activeFrameworkIndex === idx ? 'bg-slate-700/30' : 'hover:bg-slate-700/10'}`}
                     >
                        <div className="flex items-center gap-3">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeFrameworkIndex === idx ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                             {idx + 1}
                           </div>
                           <span className={`font-semibold ${activeFrameworkIndex === idx ? 'text-white' : 'text-slate-300'}`}>
                             {framework.name}
                           </span>
                        </div>
                        {activeFrameworkIndex === idx ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-500" />}
                     </button>
                     
                     {activeFrameworkIndex === idx && (
                        <div className="p-4 pl-4 md:pl-8 bg-slate-900/30 space-y-4 animate-fade-in">
                           {/* Description */}
                           <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-sm text-slate-300 leading-relaxed italic">
                             "{framework.description}"
                           </div>

                           {/* Polished Script */}
                           <div className="relative mt-2">
                             <div className="absolute -top-3 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                               Polished Version
                             </div>
                             <div className="bg-slate-900 p-5 rounded-lg border border-indigo-900/50 shadow-inner text-slate-200 text-sm md:text-base leading-relaxed font-serif">
                               <HighlightedText text={framework.polishedScript} />
                             </div>
                           </div>
                        </div>
                     )}
                   </div>
                 ))}
               </div>
            </div>

            {/* Grammar & Vocab Polish (Compact) */}
            {result.grammarAnalysis && result.grammarAnalysis.length > 0 && (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                    <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
                        <PenTool size={20} className="text-pink-400" />
                        <h3 className="font-bold text-white">Grammar & Vocabulary Polish</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.grammarAnalysis.map((item, idx) => (
                            <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col gap-2">
                                <div className="text-sm text-slate-400 line-through decoration-red-500/50">{item.original}</div>
                                <div className="text-sm text-green-200 font-medium flex items-center gap-2">
                                    <CheckCircle size={12} className="text-green-500" /> {item.correction}
                                </div>
                                <div className="text-[10px] text-slate-500 italic border-t border-slate-800 pt-1 mt-1">{item.reason}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Structure Analysis & Strengths/Weaknesses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Structure Analysis */}
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center gap-2 mb-6">
                  <Zap size={20} className="text-purple-400" />
                  <h3 className="font-bold text-white">Structure Analysis</h3>
                </div>

                {/* Feedback on Original Speech */}
                <div className={`mb-6 p-4 rounded-xl border ${result.structure.isPrep ? 'bg-green-900/20 border-green-800' : 'bg-orange-900/20 border-orange-800'}`}>
                   <div className="flex items-start gap-3">
                      {result.structure.isPrep ? <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} /> : <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />}
                      <div>
                        <h4 className={`text-sm font-bold mb-1 ${result.structure.isPrep ? 'text-green-400' : 'text-orange-400'}`}>
                          {result.structure.isPrep ? "Good Structure" : "Needs Structure"}
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {result.structure.feedback}
                        </p>
                      </div>
                   </div>
                </div>

                {/* Breakdown Cards (Polished) */}
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{structureTitle}</h4>
                <div className="space-y-3">
                  {[
                    { label: structureLabels.point, text: result.structure.point, color: 'border-blue-500/50' },
                    { label: structureLabels.reason, text: result.structure.reason, color: 'border-cyan-500/50' },
                    { label: structureLabels.example, text: result.structure.example, color: 'border-teal-500/50' },
                    { label: structureLabels.restate, text: result.structure.pointRestated, color: 'border-blue-500/50' },
                  ].map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg bg-slate-900/50 border-l-4 ${item.color}`}>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">{item.label}</div>
                      <p className="text-sm text-slate-200">{item.text || "Not detected"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses (Bullet Points) */}
              <div className="space-y-6">
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                   <div className="flex items-center gap-2 mb-4 text-green-400">
                     <ThumbsUp size={20} />
                     <h3 className="font-bold">Strengths</h3>
                   </div>
                   <ul className="space-y-2">
                     {result.strengths.map((str, i) => (
                       <li key={i} className="flex gap-2 text-sm text-slate-300 items-start">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                         <span>{str}</span>
                       </li>
                     ))}
                   </ul>
                </div>

                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                   <div className="flex items-center gap-2 mb-4 text-red-400">
                     <ThumbsDown size={20} />
                     <h3 className="font-bold">Areas for Improvement</h3>
                   </div>
                   <ul className="space-y-2">
                     {result.weaknesses.map((weak, i) => (
                       <li key={i} className="flex gap-2 text-sm text-slate-300 items-start">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                         <span>{weak}</span>
                       </li>
                     ))}
                   </ul>
                </div>
              </div>

            </div>

            {/* Original Transcript */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
                <MessageSquare size={20} className="text-slate-400" />
                <h3 className="font-bold text-white">Original Transcript</h3>
              </div>
              <div className="p-6 text-slate-300 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                <TranscriptHighlighter text={result.transcript} />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};
