import { NextResponse } from 'next/server';
import { getMatchTimeline, getMatchDetail } from '@/lib/riotApi';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  try {
    const [timeline, detail] = await Promise.all([
      getMatchTimeline(matchId),
      getMatchDetail(matchId)
    ]);
    
    return NextResponse.json({ timeline, detail });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
