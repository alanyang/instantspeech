
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, SessionMode, SpeechLevel, TopicOutline } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Schema for the structured output we want from the audio analysis
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.INTEGER, description: "Overall Score from 0-100. Be strict based on the User Level. If Beginner: be encouraging but fair. If Expert: be brutally strict." },
    subScores: {
      type: Type.OBJECT,
      description: "Breakdown of scores (0-100).",
      properties: {
        logic: { type: Type.INTEGER, description: "Logic & Coherence score." },
        delivery: { type: Type.INTEGER, description: "Delivery & Pacing score." },
        structure: { type: Type.INTEGER, description: "Structure & Organization score." },
        vocabulary: { type: Type.INTEGER, description: "Vocabulary & Rhetoric score." },
        emotion: { type: Type.INTEGER, description: "Emotion & Engagement score." },
      },
      required: ["logic", "delivery", "structure", "vocabulary", "emotion"]
    },
    transcript: { type: Type.STRING, description: "Verbatim transcript. Identify advanced vocabulary or eloquent phrasing and wrap them in double brackets like [[this]]." },
    fillerWordCount: { type: Type.INTEGER, description: "Count of filler words." },
    structure: {
      type: Type.OBJECT,
      properties: {
        isPrep: { type: Type.BOOLEAN, description: "Did the ORIGINAL speech follow a clear structure?" },
        feedback: { type: Type.STRING, description: "Feedback on the ORIGINAL speech's structure." },
        point: { type: Type.STRING, description: "Extract the 'Point' from the POLISHED/REVISED version." },
        reason: { type: Type.STRING, description: "Extract the 'Reason' from the POLISHED/REVISED version." },
        example: { type: Type.STRING, description: "Extract the 'Example' from the POLISHED/REVISED version." },
        pointRestated: { type: Type.STRING, description: "Extract the 'Restated Point' from the POLISHED/REVISED version." },
      },
      required: ["isPrep", "feedback", "point", "reason", "example", "pointRestated"]
    },
    sentiment: { type: Type.STRING, description: "A comma-separated list of 3-5 concise tone/emotion adjectives." },
    speechFramework: {
      type: Type.ARRAY,
      description: "Provide exactly 3 different potential frameworks.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the framework." },
          description: { type: Type.STRING, description: "Why this fits. MAX 20 WORDS." },
          polishedScript: { type: Type.STRING, description: "The speech rewritten using this framework. Highlight key phrases with **text**." }
        },
        required: ["name", "description", "polishedScript"]
      }
    },
    grammarAnalysis: {
      type: Type.ARRAY,
      description: "Identify 3-5 specific grammatical errors or awkward phrasing and provide the corrected version.",
      items: {
        type: Type.OBJECT,
        properties: {
            original: { type: Type.STRING, description: "The original sentence with error." },
            correction: { type: Type.STRING, description: "The grammatically correct or more native-sounding version." },
            reason: { type: Type.STRING, description: "EXTREMELY CONCISE explanation. Max 10 words. Point form." }
        }
      }
    },
    improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          reason: { type: Type.STRING }
        }
      }
    },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List strengths. Short, concise bullet points." },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List weaknesses. Short, concise bullet points." }
  },
  required: ["overallScore", "subScores", "transcript", "structure", "speechFramework", "grammarAnalysis", "strengths", "weaknesses"]
};

/**
 * Generates a practice topic. 
 */
export const generateTopic = async (interests: string[], goal: string, language: string, mode: SessionMode, level: SpeechLevel): Promise<string> => {
  try {
    const isChinese = language.toLowerCase().includes('chinese') || language.toLowerCase().includes('cantonese') || language.toLowerCase().includes('mandarin');

    // Context instructions based on level
    let levelContext = "";
    switch (level) {
        case SpeechLevel.BEGINNER:
            levelContext = isChinese 
                ? "程度：初學者/職場新人。場景：辦公室或社交場合。題目要具體、生活化，例如介紹新同事、分享一個簡單的觀點。避免太抽象。" 
                : "Level: Beginner/Corporate Junior. Context: Workplace or Networking. Concrete scenarios like 'Introducing a peer' or 'Sharing a simple opinion'. Avoid abstract philosophy.";
            break;
        case SpeechLevel.ADVANCED:
            levelContext = isChinese
                ? "程度：進階/管理層。場景：社會議題或職場決策。題目應涉及時事、趨勢或兩難局面，例如『遠距工作的利弊』。"
                : "Level: Advanced/Managerial. Context: Concrete Societal or Professional issues. Topics like 'The impact of AI on jobs' or 'Balancing profit and ethics'.";
            break;
        case SpeechLevel.EXPERT:
            levelContext = isChinese
                ? "程度：專家/高管。場景：抽象哲學或複雜策略。題目應具啟發性，例如『真理是絕對的嗎？』。"
                : "Level: Expert/Executive. Context: Abstract, Philosophical, or Complex Strategy. Topics like 'Is perception reality?' or 'Leadership in crisis'.";
            break;
    }

    // Mode instructions
    let modeInstruction = "";
    if (mode === SessionMode.SPEECH) {
        modeInstruction = isChinese 
            ? "類型：即興演講 (Table Topics)。給我一個引人深思的陳述或問題。" 
            : "Type: Impromptu Speech (Toastmasters Table Topics style). Give a thought-provoking statement or question to discuss.";
    } else if (mode === SessionMode.EXPRESS) {
        modeInstruction = isChinese
            ? "類型：情感表達。關於個人感受或經歷的反思。"
            : "Type: Personal Expression. A prompt about feelings, memories, or personal reflection.";
    } else if (mode === SessionMode.DEBATE) {
        modeInstruction = isChinese
            ? "類型：辯論。格式：『[議題] - 支持還是反對？』"
            : "Type: Debate Motion. Format: 'Argue For or Against: [Topic]'.";
    } else if (mode === SessionMode.COMEDY) {
        const theme = interests[0] || "General Life";
        modeInstruction = isChinese
            ? `類型：棟篤笑/脫口秀。主題：${theme}。給我一個好笑的情境設定。`
            : `Type: Stand-up Comedy Premise. Theme: ${theme}. Give a setup for a funny story or observation.`;
    }

    // Base Prompt
    const prompt = isChinese 
        ? `
            任務：生成 1 個獨特的即興演講題目，供 InstantSpeech AI 使用。
            語言：${language} (請使用自然、地道的表達，不要翻譯腔)。
            ${levelContext}
            ${modeInstruction}
            限制：最多 20 個字。不要前言，不要解釋，只輸出題目本身。
          `
        : `
            Task: Generate 1 unique impromptu speaking topic for InstantSpeech AI.
            Language: ${language}.
            ${levelContext}
            ${modeInstruction}
            Constraint: Max 20 words. No intro. No markdown. Just the text of the topic.
          `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || (isChinese ? "分享一次你克服困難的經歷。" : "Explain a recent challenge you overcame.");
  } catch (error) {
    console.error("Error generating topic:", error);
    return "What is the most important lesson you have learned?";
  }
};

/**
 * Generates a structured outline (Mindmap) for a topic.
 */
export const generateTopicOutline = async (topic: string, language: string): Promise<TopicOutline> => {
    try {
        const prompt = `
            Task: Create a simple mindmap for the topic: "${topic}".
            Language: ${language}.
            Output JSON with:
            - centralIdea: A concise core theme (max 3-5 words).
            - points: An array of 3 distinct, concise key arguments or sub-points (max 5 words each).
            Do not include any explanation. JSON Only.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        centralIdea: { type: Type.STRING },
                        points: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });

        if (response.text) {
             return JSON.parse(response.text) as TopicOutline;
        }
        throw new Error("No text");
    } catch (error) {
        console.error("Error generating outline:", error);
        return {
            centralIdea: topic,
            points: ["Key Point 1", "Key Point 2", "Key Point 3"]
        };
    }
};

/**
 * Helper to convert Blob to Base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Analyzes the audio recording using Gemini 2.5 Flash.
 */
export const analyzeSpeech = async (audioBlob: Blob, topic: string, durationSeconds: number, mode: SessionMode, language: string, level: SpeechLevel): Promise<AnalysisResult> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);

    let persona = "You are an expert public speaking coach.";
    if (mode === SessionMode.EXPRESS) persona = "You are an empathetic communication therapist.";
    if (mode === SessionMode.COMEDY) persona = "You are a professional stand-up comedian and writing coach.";
    if (mode === SessionMode.DEBATE) persona = "You are a competitive debate judge.";

    const systemInstruction = `
        ${persona}
        User Level: ${level}.
        Topic: "${topic}".
        Language: ${language}.
        
        Analyze audio:
        1. Transcribe.
        2. 3 Frameworks (Max 1 sentence desc).
        3. SCORING RULES: 
           - If Level is BEGINNER: Be encouraging but fair.
           - If Level is ADVANCED: Be strict on structure and rhetorical devices.
           - If Level is EXPERT: Be BRUTALLY STRICT. 
           - Short/repetitive/low-effort speeches must get < 50.
        4. "Polished Script" for each framework.
        5. 3-5 Grammar/Vocab corrections. Explanation must be short (point form).
        6. Highlight advanced vocab in transcript with [[ ]].
        7. Structure analysis: 'point', 'reason' etc. come from the POLISHED version.
    `;

    const prompt = `
      ${systemInstruction}
      Output JSON only. Language: ${language}.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema
      }
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    // Sanitize JSON
    let jsonText = response.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json/, "").replace(/```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```/, "").replace(/```$/, "");
    }

    const result = JSON.parse(jsonText) as any;

    // Calculate Pace
    const isChinese = language.toLowerCase().includes('cantonese') || 
                      language.toLowerCase().includes('mandarin') || 
                      language.toLowerCase().includes('chinese') ||
                      language.toLowerCase().includes('japanese');

    let contentCount = 0;
    if (result.transcript) {
        if (isChinese) {
            const cleanText = result.transcript.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "");
            contentCount = cleanText.length;
        } else {
            contentCount = result.transcript.trim().split(/\s+/).length;
        }
    }

    const safeDuration = Math.max(durationSeconds, 1); 
    const calculatedPace = Math.round(contentCount / (safeDuration / 60));
    result.wpm = calculatedPace;

    return result as AnalysisResult;

  } catch (error) {
    console.error("Error analyzing speech:", error);
    throw error;
  }
};

/**
 * Creates a chat session for the Virtual Expert Coach.
 */
export const createCoachChat = (result: AnalysisResult, topic: string, mode: SessionMode, language: string) => {
  let persona = "You are a world-class public speaking coach.";
  if (mode === SessionMode.EXPRESS) persona = "You are an empathetic communication therapist.";
  if (mode === SessionMode.COMEDY) persona = "You are a professional stand-up comedy coach.";
  if (mode === SessionMode.DEBATE) persona = "You are a competitive debate judge.";

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `
        ${persona}
        Language: ${language}.
        
        Context:
        Topic: "${topic}".
        Analysis:
        - Transcript: "${result.transcript}"
        - Score: ${result.overallScore}
        - Strengths: ${result.strengths.join(", ")}
        - Weaknesses: ${result.weaknesses.join(", ")}
        
        Your Goal:
        Engage in a voice-like conversation.
        Keep responses concise (1-3 sentences) so they are easy to listen to via Text-to-Speech.
        Ask one question at a time.
      `
    }
  });
};
