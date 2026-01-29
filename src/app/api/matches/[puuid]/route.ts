import { NextResponse } from 'next/server';
import { getMatchList, getMatchDetail } from '@/lib/riotApi';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ puuid: string }> }
) {
  const { puuid } = await params;

  try {
    const matchIds = await getMatchList(puuid, 5); // 최근 5경기
    const matchDetails = await Promise.all(
      matchIds.map((id: string) => getMatchDetail(id))
    );
    
    return NextResponse.json(matchDetails);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
