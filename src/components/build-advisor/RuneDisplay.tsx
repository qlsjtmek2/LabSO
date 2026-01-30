import { useMemo } from 'react';
import type { RuneTemplate } from '@/types';
import { KEYSTONES, MINOR_RUNES, STAT_RUNES, RUNE_TREES } from '@/data/runeData';

interface RuneDisplayProps {
  template: RuneTemplate;
}

const CDN_BASE = 'https://ddragon.leagueoflegends.com/cdn/img';

export default function RuneDisplay({ template }: RuneDisplayProps) {
  // 메인 룬 트리의 모든 슬롯 데이터 가져오기
  const mainTreeRows = useMemo(() => {
    const tree = template.primaryTree;
    // Slot 0: Keystones
    const keystones = Object.values(KEYSTONES).filter((r) => r.tree === tree);
    // Slot 1-3: Minor Runes
    const slot1 = Object.values(MINOR_RUNES).filter((r) => r.tree === tree && r.slot === 1);
    const slot2 = Object.values(MINOR_RUNES).filter((r) => r.tree === tree && r.slot === 2);
    const slot3 = Object.values(MINOR_RUNES).filter((r) => r.tree === tree && r.slot === 3);

    return [keystones, slot1, slot2, slot3];
  }, [template.primaryTree]);

  // 보조 룬 트리의 모든 슬롯 데이터 가져오기
  const subTreeRows = useMemo(() => {
    const tree = template.secondaryTree;
    // Slot 1-3: Minor Runes (Secondary doesn't have keystones)
    const slot1 = Object.values(MINOR_RUNES).filter((r) => r.tree === tree && r.slot === 1);
    const slot2 = Object.values(MINOR_RUNES).filter((r) => r.tree === tree && r.slot === 2);
    const slot3 = Object.values(MINOR_RUNES).filter((r) => r.tree === tree && r.slot === 3);

    return [slot1, slot2, slot3];
  }, [template.secondaryTree]);

  // 스탯 룬 행 데이터
  const statRows = useMemo(() => {
    const slot0 = Object.values(STAT_RUNES).filter((r) => r.slot === 0);
    const slot1 = Object.values(STAT_RUNES).filter((r) => r.slot === 1);
    const slot2 = Object.values(STAT_RUNES).filter((r) => r.slot === 2);
    return [slot0, slot1, slot2];
  }, []);

  const renderRuneIcon = (
    iconPath: string,
    isSelected: boolean,
    isKeystone: boolean,
    name: string
  ) => {
    return (
      <div
        className={`relative rounded-full flex items-center justify-center transition-all ${
          isKeystone ? 'w-12 h-12' : 'w-8 h-8'
        } ${isSelected ? '' : 'opacity-40 grayscale hover:opacity-70 hover:grayscale-0'}`}
        title={name}
      >
        <img
          src={`${CDN_BASE}/${iconPath}`}
          alt={name}
          className={`w-full h-full object-contain ${isSelected ? 'drop-shadow-[0_0_5px_rgba(255,215,0,0.6)]' : ''}`}
        />
        {isSelected && (
          <div className={`absolute inset-0 rounded-full border-2 ${isKeystone ? 'border-yellow-500' : 'border-yellow-500'}`} />
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-8 p-4 bg-[#0a0a0c] rounded-xl border border-gray-800">
      {/* Main Tree */}
      <div className="flex-1">
        <h3 className="text-center text-yellow-500 font-bold mb-4" style={{ color: RUNE_TREES[template.primaryTree as keyof typeof RUNE_TREES]?.color }}>
          메인 룬
        </h3>
        <div className="flex flex-col gap-4 items-center">
          {mainTreeRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-4">
              {row.map((rune) => {
                const isSelected = 
                  rowIdx === 0 
                    ? rune.id === template.primaryKeystone 
                    : template.primaryRunes.includes(rune.id);
                return (
                  <div key={rune.id}>
                    {renderRuneIcon(rune.icon, isSelected, rowIdx === 0, rune.name)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Secondary Tree & Stats */}
      <div className="flex-1">
        <h3 className="text-center text-gray-400 font-bold mb-4">보조 룬</h3>
        <div className="flex flex-col gap-3 items-center mb-6">
          {subTreeRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-4">
              {row.map((rune) => {
                const isSelected = template.secondaryRunes.includes(rune.id);
                return (
                  <div key={rune.id}>
                    {renderRuneIcon(rune.icon, isSelected, false, rune.name)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-2 items-center pt-4 border-t border-gray-800/50">
          {statRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-4">
              {row.map((rune) => {
                const isSelected = template.statRunes[rowIdx] === rune.id;
                return (
                  <div
                    key={rune.id}
                    className={`relative w-6 h-6 rounded-full flex items-center justify-center p-1 bg-gray-900 border ${
                      isSelected ? 'border-yellow-500' : 'border-gray-700 opacity-40'
                    }`}
                    title={rune.name}
                  >
                     <img
                      src={`${CDN_BASE}/${rune.icon}`}
                      alt={rune.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
