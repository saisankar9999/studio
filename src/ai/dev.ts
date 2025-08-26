import { config } from 'dotenv';
config();

import '@/ai/flows/generate-interview-questions.ts';
import '@/ai/flows/analyze-interview-performance.ts';
import '@/ai/flows/transcribe-audio.ts';
import '@/ai/flows/generate-interview-response.ts';
