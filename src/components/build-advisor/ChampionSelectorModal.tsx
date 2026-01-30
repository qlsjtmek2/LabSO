import { useState, useEffect, useMemo } from 'react';
import * as Hangul from 'hangul-js';
import { hasChampionMeta } from '@/data/championMeta';

interface ChampionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (champion: any) => void;
  champions: any[];
  version: string;
  team: 'ally' | 'enemy';
  laneLabel: string;
}

export default function ChampionSelectorModal({
  isOpen,
  onClose,
  onSelect,
  champions,
  version,
  team,
  laneLabel,
}: ChampionSelectorModalProps) {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedClass('All');
    }
  }, [isOpen]);

  const filteredChampions = useMemo(() => {
    let result = champions;

    if (selectedClass !== 'All') {
      result = result.filter((c) => c.tags.includes(selectedClass));
    }

    if (search !== '') {
      result = result.filter((c) => {
        if (c.id.toLowerCase().includes(search.toLowerCase())) return true;
        if (c.name.includes(search)) return true;
        if (Hangul.search(c.name, search) >= 0) return true;
        return false;
      });
    }
    return result;
  }, [champions, search, selectedClass]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0f1115] rounded-3xl border border-gray-700 w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className={`w-2 h-6 rounded-full ${team === 'ally' ? 'bg-blue-500' : 'bg-red-500'}`} />
              챔피언 선택
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              <span className={team === 'ally' ? 'text-blue-400' : 'text-red-400'}>
                {team === 'ally' ? '우리 팀' : '상대 팀'}
              </span>
              {' '}{laneLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 text-gray-500 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 border-b border-gray-800 bg-gray-900/30 space-y-4">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="챔피언 검색 (가나다, 초성, 영어)..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['All', 'Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedClass(role)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                  selectedClass === role
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {role === 'All' ? '전체' : role}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#0f1115]">
          {filteredChampions.length > 0 ? (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {filteredChampions.map((champ) => {
                const hasMeta = hasChampionMeta(champ.id);
                return (
                  <div
                    key={champ.id}
                    onClick={() => onSelect(champ)}
                    className="group cursor-pointer flex flex-col items-center"
                  >
                    <div
                      className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                        hasMeta
                          ? 'border-purple-900/50 group-hover:border-purple-500 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                          : 'border-gray-800 group-hover:border-gray-600'
                      }`}
                    >
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.image.full}`}
                        alt={champ.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      {hasMeta && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-purple-500 rounded-full ring-2 ring-black/50" title="상세 분석 가능" />
                      )}
                    </div>
                    <p className={`text-[11px] mt-1.5 text-center truncate w-full px-1 transition-colors ${
                      hasMeta ? 'text-purple-200 group-hover:text-purple-400 font-medium' : 'text-gray-400 group-hover:text-white'
                    }`}>
                      {champ.name}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg font-medium">검색 결과가 없습니다</p>
              <p className="text-sm">다른 검색어나 카테고리를 시도해보세요</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full" />
            <span className="text-purple-400 font-bold">보라색 테두리</span>는 상세 전략 분석이 가능한 챔피언입니다
          </p>
        </div>
      </div>
    </div>
  );
}
