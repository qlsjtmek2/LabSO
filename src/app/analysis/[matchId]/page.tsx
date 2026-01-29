'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getLatestVersion, getItems } from '@/lib/dataDragon';

function AnalysisContent() {
  const { matchId } = useParams();
  const searchParams = useSearchParams();
  const puuid = searchParams.get('puuid');
  
  const [version, setVersion] = useState('');
  const [data, setData] = useState<any>(null);
  const [items, setItems] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [targetParticipantId, setTargetParticipantId] = useState<number | null>(null);

  // 툴팁 상태
  const [hoverData, setHoverData] = useState({
    show: false,
    title: '',
    description: '',
    x: 0,
    y: 0
  });

  useEffect(() => {
    const init = async () => {
      const v = await getLatestVersion();
      setVersion(v);
      const [res, allItems] = await Promise.all([
        fetch(`/api/analysis/${matchId}`),
        getItems(v)
      ]);
      const json = await res.json();
      setData(json);
      setItems(allItems);

      const participant = json.detail.info.participants.find((p: any) => p.puuid === puuid);
      if (participant) setTargetParticipantId(participant.participantId);
      
      setLoading(false);
    };
    init();
  }, [matchId, puuid]);

  if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const participant = data.detail.info.participants.find((p: any) => p.participantId === targetParticipantId);

  const itemEvents = data.timeline.info.frames.flatMap((frame: any) => 
    frame.events.filter((e: any) => e.participantId === targetParticipantId && e.type === 'ITEM_PURCHASED')
  );

  const skillEvents = data.timeline.info.frames.flatMap((frame: any) => 
    frame.events.filter((e: any) => e.participantId === targetParticipantId && e.type === 'SKILL_LEVEL_UP')
  );

  const positionData = data.timeline.info.frames.map((frame: any) => ({
      timestamp: frame.timestamp,
      position: frame.participantFrames[targetParticipantId!].position
  }));

  const mapCoord = (val: number) => (val / 15000) * 100;

  // 툴팁 표시 함수
  const showTooltip = (e: React.MouseEvent, itemId: number) => {
    const item = items[itemId];
    if (!item) return;

    const cleanDesc = item.description
        .replace(/<br>/g, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/{{[^}]*}}/g, '...');

    setHoverData({
      show: true,
      title: item.name,
      description: cleanDesc,
      x: e.clientX,
      y: e.clientY
    });
  };

  const hideTooltip = () => setHoverData({ ...hoverData, show: false });

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-blue-500 selection:text-white pb-20 relative">
      
      {/* 툴팁 엘리먼트 */}
      {hoverData.show && (
        <div 
            className="fixed z-[100] pointer-events-none bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl max-w-xs animate-in fade-in duration-200"
            style={{ left: hoverData.x + 20, top: hoverData.y + 20 }}
        >
            <h4 className="text-blue-400 font-black mb-2 uppercase tracking-tighter text-sm">{hoverData.title}</h4>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{hoverData.description}</p>
        </div>
      )}

      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${participant.championName}.png`} className="w-12 h-12 rounded-xl shadow-lg border border-gray-700" alt="Champ" />
                <div>
                    <h1 className="text-xl font-black italic tracking-tighter uppercase">{participant.championName} 전략 분석</h1>
                    <p className={`text-xs font-bold uppercase tracking-widest ${participant.win ? 'text-blue-500' : 'text-red-500'}`}>{participant.win ? 'VICTORY' : 'DEFEAT'}</p>
                </div>
            </div>
            <div className="flex gap-8 text-right">
                <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">KDA</p>
                    <p className="font-mono font-bold text-lg">{participant.kills} / <span className="text-red-500">{participant.deaths}</span> / {participant.assists}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">CS</p>
                    <p className="font-mono font-bold text-lg">{participant.totalMinionsKilled + participant.neutralMinionsKilled}</p>
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">GOLD</p>
                    <p className="font-mono font-bold text-lg text-yellow-500">{(participant.goldEarned / 1000).toFixed(1)}k</p>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10 space-y-10">
        <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">아이템 빌드 타임라인</h2>
            <div className="bg-gray-900 rounded-[2rem] p-8 border border-gray-800 overflow-x-auto custom-scrollbar">
                <div className="flex items-start gap-12 min-w-max px-4">
                    {itemEvents.map((event: any, i: number) => {
                        const time = Math.floor(event.timestamp / 60000);
                        return (
                            <div key={i} className="flex flex-col items-center gap-3 relative group">
                                <div className="text-xs font-mono font-bold text-gray-500">{time}분</div>
                                <div 
                                    className="relative cursor-help"
                                    onMouseEnter={(e) => showTooltip(e, event.itemId)}
                                    onMouseLeave={hideTooltip}
                                >
                                    <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${event.itemId}.png`} className="w-12 h-12 rounded-xl border border-gray-700 shadow-lg group-hover:border-blue-500 transition hover:scale-110" alt="Item" />
                                    {i < itemEvents.length - 1 && <div className="absolute top-1/2 left-full w-12 h-0.5 bg-gray-800 -z-10" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <section className="bg-gray-900 rounded-[2rem] p-8 border border-gray-800 h-full">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">스킬 마스터 순서</h2>
                    <div className="grid grid-cols-6 gap-2">
                        {skillEvents.slice(0, 18).map((event: any, i: number) => {
                            const skill = ['Q', 'W', 'E', 'R'][event.skillSlot - 1];
                            const color = skill === 'R' ? 'bg-red-600 border-red-800' : 'bg-blue-600 border-blue-800';
                            return (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center font-black text-sm border-b-4 shadow-lg`}>{skill}</div>
                                    <span className="text-[10px] text-gray-600 font-mono">{i + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            <div className="lg:col-span-2">
                <section className="bg-gray-900 rounded-[2rem] p-8 border border-gray-800 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">분 단위 이동 경로</h2>
                        <div className="bg-black/30 px-3 py-1 rounded-full text-xs text-blue-400 font-bold border border-blue-500/30">총 {positionData.length}분간의 기록</div>
                    </div>
                    <div className="relative aspect-square w-full max-w-[500px] mx-auto bg-[#050505] rounded-3xl border-4 border-gray-800 shadow-2xl overflow-hidden group">
                        <div className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition duration-700 bg-[url('https://raw.communitydragon.org/latest/game/data/menu/textures/map11.png')] bg-cover" />
                        <svg className="absolute inset-0 w-full h-full transform -scale-y-100 filter drop-shadow-[0_0_4px_rgba(59,130,246,0.8)]">
                            <polyline points={positionData.map((d: any) => `${mapCoord(d.position.x)},${mapCoord(d.position.y)}`).join(' ')} fill="none" stroke="rgba(59, 130, 246, 0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
                            {positionData.map((d: any, i: number) => (
                                <circle key={i} cx={`${mapCoord(d.position.x)}%`} cy={`${mapCoord(d.position.y)}%`} r="3" className="fill-white stroke-blue-600 stroke-2"><title>{i}분</title></circle>
                            ))}
                            <circle cx={`${mapCoord(positionData[0].position.x)}%`} cy={`${mapCoord(positionData[0].position.y)}%`} r="6" className="fill-green-500" />
                            <circle cx={`${mapCoord(positionData[positionData.length-1].position.x)}%`} cy={`${mapCoord(positionData[positionData.length-1].position.y)}%`} r="6" className="fill-red-500" />
                        </svg>
                    </div>
                </section>
            </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><div className="text-white font-bold animate-pulse">데이터 분석 중...</div></div>}>
      <AnalysisContent />
    </Suspense>
  );
}