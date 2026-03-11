import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { calculateAssessmentScores } from '@/lib/assessment-scoring';

export async function POST(req: Request) {
  try {
    const { answers } = await req.json();

    if (!answers) {
      return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Compute server-side scores securely
    const computed_scores = calculateAssessmentScores(answers);

    // Get current user if available to link session
    const { data: { session } } = await supabase.auth.getSession();
    const user_id = session?.user?.id || null;

    // Insert into the new lead-gen table
    const { data, error } = await supabase
      .from('assessment_sessions')
      .insert([
        { 
          user_id,
          answers,
          computed_scores
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error.message);
      return NextResponse.json({ 
        success: false,
        error: 'Database operation failed'
      }, { status: 500 });
    }

    return NextResponse.json({ session_id: data.id });
    
  } catch (error) {
    console.error('Assessment Submission Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An internal error occurred' 
    }, { status: 500 });
  }
}
