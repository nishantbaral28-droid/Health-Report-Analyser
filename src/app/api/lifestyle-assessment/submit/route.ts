import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { calculateLifestyleAssessmentScores } from '@/lib/lifestyle-assessment-scoring';

function encodeFallbackPayload(computed_scores: unknown) {
  return Buffer.from(JSON.stringify({ computed_scores }), 'utf8').toString('base64url');
}

export async function POST(req: Request) {
  try {
    const { answers } = await req.json();

    if (!answers) {
      return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
    }

    const computed_scores = calculateLifestyleAssessmentScores(answers);
    const fallback_payload = encodeFallbackPayload(computed_scores);

    let supabase;
    try {
      supabase = await createClient();
    } catch (error) {
      console.error('Supabase Client Error:', error);
      return NextResponse.json({
        session_id: null,
        fallback_payload,
      });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user_id = session?.user?.id || null;

    const { data, error } = await supabase
      .from('assessment_sessions')
      .insert([
        {
          user_id,
          answers,
          computed_scores,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error.message);
      return NextResponse.json({
        session_id: null,
        fallback_payload,
      });
    }

    return NextResponse.json({ session_id: data.id, fallback_payload });
  } catch (error) {
    console.error('Assessment Submission Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An internal error occurred',
      },
      { status: 500 }
    );
  }
}
