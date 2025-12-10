
export enum AppStep {
  ONBOARDING = 'ONBOARDING',
  SETUP = 'SETUP',
  STAGE = 'STAGE',
  ANALYSIS = 'ANALYSIS'
}

export enum SessionMode {
  SPEECH = 'SPEECH',   // Objective, macro, logic-focused
  EXPRESS = 'EXPRESS',  // Subjective, micro, emotion-focused
  COMEDY = 'COMEDY',    // Humor, timing, entertainment-focused
  DEBATE = 'DEBATE'     // Argumentative, persuasive, side-taking
}

export enum SpeechLevel {
  BEGINNER = 'BEGINNER',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export interface UserPreferences {
  topics: string[];
  preferredMode: SessionMode;
}

export interface SessionConfig {
  topic: string;
  durationSeconds: number; // 60, 180, etc.
  language: string;
  mode: SessionMode;
  level: SpeechLevel;
  prepTimeSeconds: number;
}

export interface AnalysisResult {
  overallScore: number;
  subScores: {
    logic: number;
    delivery: number;
    structure: number;
    vocabulary: number;
    emotion: number;
  };
  transcript: string;
  wpm: number;
  fillerWordCount: number;
  structure: {
    isPrep: boolean;
    point: string;
    reason: string;
    example: string;
    pointRestated: string;
    feedback: string;
  };
  sentiment: string;
  speechFramework: Array<{
    name: string;
    description: string;
    polishedScript: string;
  }>;
  grammarAnalysis: Array<{
    original: string;
    correction: string;
    reason: string;
  }>;
  improvements: Array<{
    original: string;
    suggestion: string;
    reason: string;
  }>;
  strengths: string[];
  weaknesses: string[];
}

export interface HistoryItem {
  id: string;
  date: string;
  topic: string;
  mode: SessionMode;
  score: number;
  wpm: number;
  sentiment: string;
  fullResult: AnalysisResult; 
}

export interface TopicOutline {
  centralIdea: string;
  points: string[];
}

export type Chat = any;