import { Lane, ChampionSlot } from '@/types';

interface TeamSelectorProps {
  allySlots: ChampionSlot[];
  enemySlots: ChampionSlot[];
  myChampionLane: Lane | null;
  enemyLanerLane: Lane | null;
  onSlotClick: (team: 'ally' | 'enemy', index: number) => void;
  onClearSlot: (team: 'ally' | 'enemy', index: number, e: React.MouseEvent) => void;
  onSetMyChampion: (lane: Lane) => void;
  onSwapTeams: () => void;
  onRandomize: (team: 'ally' | 'enemy') => void;
  version: string;
}

const LANE_LABELS: Record<Lane, string> = {
  TOP: '탑',
  JGL: '정글',
  MID: '미드',
  ADC: '원딜',
  SUP: '서폿',
};

export default function TeamSelector({
  allySlots,
  enemySlots,
  myChampionLane,
  enemyLanerLane,
  onSlotClick,
  onClearSlot,
  onSetMyChampion,
  onSwapTeams,
  onRandomize,
  version,
}: TeamSelectorProps) {
  
  const renderSlot = (slot: ChampionSlot, index: number, team: 'ally' | 'enemy') => {
    const isAlly = team === 'ally';
    const isMe = isAlly && myChampionLane === slot.lane;
    const isTarget = !isAlly && enemyLanerLane === slot.lane;
    const hasChampion = !!slot.champion;

    return (
      <div key={slot.lane} className="relative group flex flex-col">
        {/* Lane Label */}
        <div className={`flex items-center gap-1.5 mb-2 text-[10px] md:text-xs font-bold uppercase tracking-wider ${
          isAlly ? 'text-blue-400 justify-start' : 'text-red-400 justify-end'
        }`}>
          {!isAlly && <span>{LANE_LABELS[slot.lane]}</span>}
          {isAlly && <span>{LANE_LABELS[slot.lane]}</span>}
        </div>

        {/* Slot Card (Image Only) */}
        <div
          onClick={() => onSlotClick(team, index)}
          className={`
            relative aspect-[1/1] rounded-xl cursor-pointer overflow-hidden transition-all duration-300
            border-2 shadow-lg group-hover:-translate-y-1
            ${hasChampion 
              ? isMe 
                ? 'border-yellow-400 shadow-yellow-500/20 ring-2 ring-yellow-400/30'
                : isTarget
                  ? 'border-red-500 shadow-red-500/20 ring-2 ring-red-500/30'
                  : isAlly 
                    ? 'border-blue-900/50 hover:border-blue-500 hover:shadow-blue-500/20' 
                    : 'border-red-900/50 hover:border-red-500 hover:shadow-red-500/20'
              : `bg-[#13151a] hover:bg-[#1a1d24] border-dashed ${
                  isAlly ? 'border-blue-900/30 hover:border-blue-500/50' : 'border-red-900/30 hover:border-red-500/50'
                }`
            }
          `}
        >
          {hasChampion ? (
            <>
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${slot.champion!.id}.png`}
                alt={slot.champion!.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Remove Button */}
              <button
                onClick={(e) => onClearSlot(team, index, e)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full text-white text-xs flex items-center justify-center backdrop-blur-sm transition-colors z-20"
              >
                ×
              </button>

              {/* Badges */}
              {isMe && (
                <div className="absolute top-1 left-1 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">
                  ME
                </div>
              )}
              {isTarget && (
                <div className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg z-10">
                  VS
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600 group-hover:text-gray-400 transition-colors">
              <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          )}
        </div>

        {/* Info Area Below Card */}
        <div className="mt-2 min-h-[48px] flex flex-col items-center">
          {hasChampion ? (
            <>
              <p className={`text-[11px] font-bold truncate w-full text-center mb-1.5 ${isAlly ? 'text-blue-200' : 'text-red-200'}`}>
                {slot.champion!.name}
              </p>
              
              {isAlly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetMyChampion(slot.lane);
                  }}
                  className={`w-full py-1 rounded-md text-[9px] font-black transition-all border ${
                    isMe 
                      ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                      : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-blue-500 hover:text-blue-400'
                  }`}
                >
                  {isMe ? 'MY HERO' : '내 챔프 지정'}
                </button>
              )}
            </>
          ) : (
            <p className="text-[10px] text-gray-700 font-medium italic">Empty</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0a0a0c] rounded-3xl border border-gray-800 p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/rewards-modal/bg-rewards-modal.png')] bg-cover bg-center opacity-5 pointer-events-none mix-blend-lighten" />
      
      <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">
        
        {/* Ally Team */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-900/30 justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-900/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                </div>
                <div>
                <h2 className="text-xl font-black text-white italic tracking-wide">BLUE TEAM</h2>
                <p className="text-xs text-blue-400 font-medium">우리 팀 (Win Condition)</p>
                </div>
            </div>
            <button 
                onClick={() => onRandomize('ally')}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition border border-gray-700"
                title="랜덤 조합 생성"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3 lg:gap-4">
            {allySlots.map((slot, idx) => renderSlot(slot, idx, 'ally'))}
          </div>
        </div>

        {/* VS Separator & Swap */}
        <div className="hidden lg:flex flex-col items-center justify-center relative">
          <div className="w-px h-full bg-gradient-to-b from-transparent via-gray-700 to-transparent absolute" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="bg-[#0a0a0c] border border-gray-700 rounded-full p-3 shadow-xl">
              <span className="text-2xl font-black text-gray-500 italic">VS</span>
            </div>
            <button
              onClick={onSwapTeams}
              className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-gray-600 hover:bg-purple-600 hover:border-purple-500 hover:text-white text-gray-400 transition-all shadow-lg"
              title="팀 스왑"
            >
              <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Separator & Swap */}
        <div className="lg:hidden flex items-center justify-center gap-4 py-2 relative">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-gray-600 italic">VS</span>
            <button
              onClick={onSwapTeams}
              className="p-2 rounded-full bg-gray-800 border border-gray-600 text-gray-400 hover:bg-purple-600 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
        </div>

        {/* Enemy Team */}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-red-900/30 text-right">
            <button 
                onClick={() => onRandomize('enemy')}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition border border-gray-700"
                title="랜덤 조합 생성"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </button>
            <div className="flex items-center gap-3">
                <div>
                <h2 className="text-xl font-black text-white italic tracking-wide">RED TEAM</h2>
                <p className="text-xs text-red-400 font-medium">상대 팀 (Counter Strategy)</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-900/20 border border-red-500/30 flex items-center justify-center text-red-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" /></svg>
                </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3 lg:gap-4">
            {enemySlots.map((slot, idx) => renderSlot(slot, idx, 'enemy'))}
          </div>
        </div>

      </div>
    </div>
  );
}
