import { NextRequest, NextResponse } from 'next/server';

// This is a placeholder API route. In a real application, you would
// use this to save the conversation to a database (e.g., Firestore)
// to be retrieved later for grounding the live interview co-pilot.

// For now, we'll save it to localStorage on the client side, but this
// API structure is here for future expansion.

export async function POST(request: NextRequest) {
  try {
    const { profileId, question, answer } = await request.json();

    if (!profileId || !question || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In a real app:
    // await db.collection('conversations').add({
    //   profileId,
    //   question,
    //   answer,
    //   timestamp: new Date(),
    // });

    console.log(`Conversation for profile ${profileId} saved.`);
    console.log(`Q: ${question}`);
    console.log(`A: ${answer}`);
    
    // For the purpose of this prototype, the client will handle storage.
    // This endpoint just confirms the data structure.

    return NextResponse.json({ success: true, message: 'Conversation logged for grounding.' });
  } catch (error) {
    console.error('Error saving conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to save conversation: ${errorMessage}` }, { status: 500 });
  }
}
