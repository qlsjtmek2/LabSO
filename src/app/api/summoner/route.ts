import { NextResponse } from 'next/server';
import { getSummonerByName } from '@/lib/riotApi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const tag = searchParams.get('tag');

  if (!name || !tag) {
    return NextResponse.json({ error: 'Name and Tag are required' }, { status: 400 });
  }

  try {
    const data = await getSummonerByName(name, tag);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
