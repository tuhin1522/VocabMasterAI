import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro'];

async function generateWithRetry(prompt: string, retries = 3): Promise<string> {
  for (const modelName of MODELS) {
    const model = genAI.getGenerativeModel({ model: modelName });
    for (let i = 0; i < retries; i++) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error: any) {
        const is503 = error?.message?.includes('503') || error?.message?.includes('Service Unavailable');
        const is404 = error?.message?.includes('404') || error?.message?.includes('not found');
        // If model is unavailable/not found, break inner loop and try next model
        if (is404) break;
        // If 503 or last retry, wait longer before retrying
        if (i === retries - 1) {
          if (is503) break; // Try next model
          throw error;
        }
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
  }
  throw new Error('All models are currently unavailable. Please try again later.');
}

function extractJSON(text: string): unknown {
  // Try to extract JSON from markdown code blocks or raw JSON
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  return JSON.parse(text.trim());
}

export async function generateVocabularyData(word: string): Promise<{
  word: string;
  meaning: string;
  bengaliMeaning: string;
  partOfSpeech: string;
  pronunciation: string;
  difficulty: string;
  category: string;
  mnemonic: string;
  memoryAssociation: string;
  usageExplanation: string;
  commonMistakes: string[];
  synonyms: string[];
  antonyms: string[];
  examples: Array<{ sentence: string; context: string }>;
}> {
  const prompt = `Generate comprehensive vocabulary data for the English word "${word}".
Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "word": "${word}",
  "meaning": "Clear English definition",
  "bengaliMeaning": "Bengali meaning in Bengali script",
  "partOfSpeech": "noun|verb|adjective|adverb|preposition|conjunction",
  "pronunciation": "IPA pronunciation like /wɜːrd/",
  "difficulty": "A1|A2|B1|B2|C1|C2",
  "category": "daily|academic|business|technology|ielts|communication|banking|job_interview",
  "mnemonic": "A creative, memorable mnemonic to remember this word (can reference Bengali sounds or concepts)",
  "memoryAssociation": "A vivid visual or story-based memory association",
  "usageExplanation": "When and how to use this word in context",
  "commonMistakes": ["Common mistake 1", "Common mistake 2"],
  "synonyms": ["syn1", "syn2", "syn3", "syn4", "syn5"],
  "antonyms": ["ant1", "ant2", "ant3"],
  "examples": [
    {"sentence": "Everyday example sentence using ${word}.", "context": "everyday"},
    {"sentence": "Academic example sentence using ${word}.", "context": "academic"},
    {"sentence": "Professional example sentence using ${word}.", "context": "professional"}
  ]
}`;

  const text = await generateWithRetry(prompt);
  const data = extractJSON(text) as ReturnType<typeof generateVocabularyData> extends Promise<infer T> ? T : never;
  return data;
}

export async function evaluateSentence(word: string, userSentence: string): Promise<{
  isCorrect: boolean;
  score: number;
  feedback: string;
  correctedSentence: string;
  explanation: string;
}> {
  const prompt = `Evaluate this English sentence written by a learner using the word "${word}".

Learner's sentence: "${userSentence}"

Return ONLY a valid JSON object:
{
  "isCorrect": true or false,
  "score": number from 0 to 100,
  "feedback": "Encouraging, specific feedback explaining what is good and what to improve",
  "correctedSentence": "The corrected version (or original if already correct)",
  "explanation": "Brief grammar/usage explanation"
}

Be encouraging and educational. Give partial credit for close attempts.`;

  const text = await generateWithRetry(prompt);
  return extractJSON(text) as {
    isCorrect: boolean;
    score: number;
    feedback: string;
    correctedSentence: string;
    explanation: string;
  };
}

export async function evaluateMeaning(word: string, correctMeaning: string, userMeaning: string): Promise<{
  isCorrect: boolean;
  score: number;
  feedback: string;
}> {
  const prompt = `A learner was asked to define the word "${word}".

Correct meaning: "${correctMeaning}"
Learner's answer: "${userMeaning}"

Evaluate if the learner's answer is semantically correct (exact wording not required, meaning matters).
Return ONLY valid JSON:
{
  "isCorrect": true or false (true if meaning is mostly correct, even if wording differs),
  "score": number 0-100,
  "feedback": "Brief encouraging feedback"
}`;

  const text = await generateWithRetry(prompt);
  return extractJSON(text) as { isCorrect: boolean; score: number; feedback: string };
}

export async function generateMnemonic(word: string, meaning: string): Promise<{
  mnemonic: string;
  soundAssociation: string;
  storyAssociation: string;
  bengaliAssociation: string;
}> {
  const prompt = `Create memorable mnemonics for the English word "${word}" meaning "${meaning}".
Target audience: Bengali-speaking learners.
Return ONLY valid JSON:
{
  "mnemonic": "Main creative mnemonic",
  "soundAssociation": "Sound-based memory trick",
  "storyAssociation": "Short memorable story",
  "bengaliAssociation": "Bengali language connection if possible"
}`;

  const text = await generateWithRetry(prompt);
  return extractJSON(text) as {
    mnemonic: string;
    soundAssociation: string;
    storyAssociation: string;
    bengaliAssociation: string;
  };
}

export async function generateExampleSentences(word: string, partOfSpeech: string): Promise<
  Array<{ sentence: string; context: string }>
> {
  const prompt = `Generate 3 natural example sentences for the ${partOfSpeech} "${word}".
Return ONLY valid JSON array:
[
  {"sentence": "Everyday example.", "context": "everyday"},
  {"sentence": "Academic example.", "context": "academic"},
  {"sentence": "Professional example.", "context": "professional"}
]`;

  const text = await generateWithRetry(prompt);
  return extractJSON(text) as Array<{ sentence: string; context: string }>;
}

export async function classifyDifficulty(word: string): Promise<string> {
  const prompt = `Rate the English word "${word}" on the CEFR scale.
Return ONLY one of: A1, A2, B1, B2, C1, C2`;

  const text = await generateWithRetry(prompt);
  const level = text.trim().toUpperCase();
  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return validLevels.includes(level) ? level : 'B1';
}
