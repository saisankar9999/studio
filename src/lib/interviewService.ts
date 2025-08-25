
import { configureFirebase } from './firebase/firebase-admin';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore/lite';

export async function getUserPrepData(userId: string) {
  try {
    const { db } = configureFirebase();
    if (!db) {
      console.log('Firestore not configured, skipping prep data fetch.');
      return null;
    }

    const q = query(
      collection(db, 'prepConversations'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return doc.data();
  } catch (error) {
    console.error('Error fetching user prep data:', error);
    return null;
  }
}

export function buildPromptWithPrepData(question: string, prepData: any) {
  if (!prepData) {
    return `You are an expert career coach. Answer the following interview question concisely and professionally in the first person, as if you were the candidate. Question: ${question}`;
  }
  
  const { resumeAnalysis, messages } = prepData;
  
  // Extract key topics from the conversation
  const conversationSummary = messages
    .filter((msg: any) => msg.role === 'assistant')
    .map((msg: any) => msg.content)
    .join('\n\n');
  
  return `
You are an expert career coach acting as an applicant in a high-stakes job interview. Your goal is to answer the interviewer's questions as if you were the applicant, using the first person ("I," "my," etc.).
Your responses must be grounded in the provided context and sound natural, not like a generic chatbot.

Based on the user's preparation data, answer the following interview question:

**Question:**
${question}

**Context from User's Resume and Job Description Analysis:**
---
${resumeAnalysis}
---

**Key Topics Discussed During Preparation:**
---
${conversationSummary}
---

Provide a concise, professional answer that:
1.  Directly addresses the question from the perspective of the candidate.
2.  Incorporates relevant experience from the user's background (from the analysis).
3.  Highlights key skills and technologies mentioned in the preparation.
4.  Is tailored to the specific job requirements.
5.  Is under 150 words.
`;
}
