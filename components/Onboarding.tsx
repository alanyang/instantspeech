
import React, { useState } from 'react';
import { UserPreferences, SessionMode } from '../types';
import { ArrowRight, Mic2, HeartHandshake, Scale, Laugh } from 'lucide-react';

interface Props {
  onComplete: (prefs: UserPreferences) => void;
}

const INTERESTS = [
  "Technology", "Philosophy", "Education", "Society", 
  "Workplace", "Relationships", "Politics", "World News",
  "Debate", "Abstract", "Humor"
];

const MODES = [
  { id: SessionMode.SPEECH, label: "Speech Practice", desc: "Logic & Structure focus", icon: Mic2, color: "blue" },
  { id: SessionMode.EXPRESS, label: "Express Feelings", desc: "Emotion & Clarity focus", icon: HeartHandshake, color: "rose" },
  { id: SessionMode.DEBATE, label: "Debate", desc: "Argue For/Against", icon: Scale, color: "green" },
  { id: SessionMode.COMEDY, label: "Comedy Training", desc: "Humor & Timing", icon: Laugh, color: "yellow" }
];

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<SessionMode>(SessionMode.SPEECH);

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const handleNext = () => {
    onComplete({
      topics: selectedInterests.length > 0 ? selectedInterests : ["General"],
      preferredMode: selectedMode
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 mb-4">
          Welcome to InstantSpeech AI
        </h1>
        <p className="text-slate-400 text-lg">
          Personalize your coaching experience.
        </p>
      </div>

      <div className="w-full space-y-8 bg-slate-800/40 p-8 rounded-3xl border border-slate-700 shadow-xl">
        {/* Interests Section */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">What interests you?</h3>
          <div className="flex flex-wrap gap-3">
            {INTERESTS.map(interest => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2 rounded-full border transition-all duration-200 text-sm font-medium ${
                  selectedInterests.includes(interest)
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Section */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Choose your training mode</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200 text-left ${
                  selectedMode === m.id
                    ? `bg-${m.color}-600/20 border-${m.color}-500 text-white shadow-md`
                    : 'bg-slate-900/50 border-slate-600 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className={`p-3 rounded-full ${selectedMode === m.id ? `bg-${m.color}-500 text-white` : 'bg-slate-700 text-slate-400'}`}>
                  <m.icon size={20} />
                </div>
                <div>
                  <div className="font-bold text-base">{m.label}</div>
                  <div className="text-xs opacity-70">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleNext}
          className="w-full py-4 mt-4 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-transform transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Begin Setup <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};