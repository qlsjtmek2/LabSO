import { useState, useEffect } from 'react';
import {
  RUNE_TREES,
  getKeystonesByTree,
  getMinorRunesBySlot,
  STAT_RUNES,
  RUNE_ID_MAP
} from '@/data/runeData';
import {
  DUMMY_PRESETS,
  calculateDummyStats,
  DummyPresetType
} from '@/data/dummyPresets';
import type { RuneTree, RuneInfo, StatRuneInfo } from '@/types';

// 전체 룬 페이지 타입
export interface FullRunePage {
  primaryTree: RuneTree;
  keystone: string;
  primaryRunes: [string, string, string]; // 슬롯 1-3
  secondaryTree: RuneTree;
  secondaryRunes: [string, string]; // 슬롯 1-3 중 2개
  secondarySlots: [number, number]; // 선택된 슬롯 번호
  statRunes: [string, string, string]; // 공격/유연/방어
}

// 기본 룬 페이지 (정밀 + 지배)
export const DEFAULT_RUNE_PAGE: FullRunePage = {
  primaryTree: 'Precision',
  keystone: 'Conqueror',
  primaryRunes: ['Triumph', 'LegendAlacrity', 'CoupDeGrace'],
  secondaryTree: 'Domination',
  secondaryRunes: ['SuddenImpact', 'TreasureHunter'],
  secondarySlots: [1, 3],
  statRunes: ['AdaptiveForce', 'AdaptiveForce2', 'Health'],
};

interface SimulationSettingsProps {
  level: number;
  setLevel: (v: number) => void;
  stacks: number;
  setStacks: (v: number) => void;
  championId: string;
  targetStats: { armor: number; mr: number; hp: number };
  setTargetStats: (v: { armor: number; mr: number; hp: number }) => void;
  runePage: FullRunePage;
  setRunePage: (v: FullRunePage) => void;
}

export default function SimulationSettings({
  level,
  setLevel,
  stacks,
  setStacks,
  championId,
  targetStats,
  setTargetStats,
  runePage,
  setRunePage,
}: SimulationSettingsProps) {
  const isStackingChamp = ['Nasus', 'Veigar', 'Kindred', 'Senna'].includes(championId);
  const [showFullRunes, setShowFullRunes] = useState(false);

  // 샌드백 프리셋 상태
  const [dummyPreset, setDummyPreset] = useState<DummyPresetType>('bruiser');
  const [levelDiff, setLevelDiff] = useState(0);
  const [goldDiff, setGoldDiff] = useState(0);

  // 프리셋/레벨/골드 변경 시 타겟 스탯 자동 업데이트
  useEffect(() => {
    if (dummyPreset !== 'custom') {
      const newStats = calculateDummyStats(dummyPreset, level, levelDiff, goldDiff);
      setTargetStats(newStats);
    }
  }, [dummyPreset, level, levelDiff, goldDiff, setTargetStats]);

  // 커스텀 모드로 전환 (수동으로 스탯 변경 시)
  const handleManualStatChange = (newStats: { armor: number; mr: number; hp: number }) => {
    setDummyPreset('custom');
    setTargetStats(newStats);
  };

  // 주 트리 변경 시 키스톤과 일반 룬도 초기화
  const handlePrimaryTreeChange = (tree: RuneTree) => {
    const keystones = getKeystonesByTree(tree);
    const slot1 = getMinorRunesBySlot(tree, 1);
    const slot2 = getMinorRunesBySlot(tree, 2);
    const slot3 = getMinorRunesBySlot(tree, 3);

    setRunePage({
      ...runePage,
      primaryTree: tree,
      keystone: keystones[0]?.id || '',
      primaryRunes: [
        slot1[0]?.id || '',
        slot2[0]?.id || '',
        slot3[0]?.id || '',
      ],
      // 보조 트리가 같으면 다른 트리로 변경
      secondaryTree: tree === runePage.secondaryTree
        ? (tree === 'Domination' ? 'Precision' : 'Domination')
        : runePage.secondaryTree,
    });
  };

  // 보조 트리 변경 시 보조 룬 초기화
  const handleSecondaryTreeChange = (tree: RuneTree) => {
    if (tree === runePage.primaryTree) return; // 주 트리와 같으면 무시

    const slot1 = getMinorRunesBySlot(tree, 1);
    const slot2 = getMinorRunesBySlot(tree, 2);
    const slot3 = getMinorRunesBySlot(tree, 3);

    setRunePage({
      ...runePage,
      secondaryTree: tree,
      secondaryRunes: [slot1[0]?.id || '', slot3[0]?.id || ''],
      secondarySlots: [1, 3],
    });
  };

  // 보조 룬 선택 (슬롯 기반)
  const handleSecondaryRuneSelect = (runeId: string, slot: number) => {
    const currentSlots = [...runePage.secondarySlots];
    const currentRunes = [...runePage.secondaryRunes];

    // 이미 선택된 슬롯인지 확인
    const slotIndex = currentSlots.indexOf(slot);

    if (slotIndex !== -1) {
      // 같은 슬롯의 다른 룬 선택
      currentRunes[slotIndex] = runeId;
    } else {
      // 새 슬롯 선택 (기존 첫 번째 슬롯 대체)
      currentSlots[0] = slot;
      currentRunes[0] = runeId;
    }

    setRunePage({
      ...runePage,
      secondaryRunes: currentRunes as [string, string],
      secondarySlots: currentSlots as [number, number],
    });
  };

  // 스탯 룬 슬롯별 옵션
  const statRuneSlots = [
    Object.values(STAT_RUNES).filter(r => r.slot === 0),
    Object.values(STAT_RUNES).filter(r => r.slot === 1),
    Object.values(STAT_RUNES).filter(r => r.slot === 2),
  ];

  return (
    <div className="space-y-6">
      {/* Rune Settings */}
      <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">룬 설정</h2>
          <button
            onClick={() => setShowFullRunes(!showFullRunes)}
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            {showFullRunes ? '간단히' : '상세 설정'}
          </button>
        </div>

        {/* 주 트리 선택 */}
        <div className="flex justify-between mb-4 px-2">
          {(Object.entries(RUNE_TREES) as [RuneTree, { name: string; color: string }][]).map(([treeKey, info]) => (
            <button
              key={treeKey}
              onClick={() => handlePrimaryTreeChange(treeKey)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                runePage.primaryTree === treeKey
                  ? 'bg-gray-800 ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500 scale-110'
                  : 'opacity-40 hover:opacity-100'
              }`}
              title={info.name}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: info.color }} />
            </button>
          ))}
        </div>

        {/* 키스톤 선택 */}
        <div className="flex gap-2 justify-center flex-wrap mb-4">
          {getKeystonesByTree(runePage.primaryTree).map((rune) => (
            <button
              key={rune.id}
              onClick={() => setRunePage({ ...runePage, keystone: rune.id })}
              className={`w-12 h-12 rounded-full border-2 overflow-hidden transition-all ${
                runePage.keystone === rune.id
                  ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] scale-110'
                  : 'border-gray-700 opacity-50 hover:opacity-100 hover:scale-105'
              }`}
              title={rune.name}
            >
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                alt={rune.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>

        {showFullRunes && (
          <>
            {/* 주 트리 일반 룬 (슬롯 1-3) */}
            <div className="space-y-3 mb-6 pt-4 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">주 트리 룬</p>
              {[1, 2, 3].map((slot) => {
                const slotRunes = getMinorRunesBySlot(runePage.primaryTree, slot);
                return (
                  <div key={slot} className="flex gap-2 justify-center">
                    {slotRunes.map((rune) => (
                      <button
                        key={rune.id}
                        onClick={() => {
                          const newPrimary = [...runePage.primaryRunes] as [string, string, string];
                          newPrimary[slot - 1] = rune.id;
                          setRunePage({ ...runePage, primaryRunes: newPrimary });
                        }}
                        className={`w-8 h-8 rounded-full border overflow-hidden transition-all ${
                          runePage.primaryRunes[slot - 1] === rune.id
                            ? 'border-yellow-500 opacity-100 scale-105'
                            : 'border-gray-700 opacity-40 hover:opacity-80'
                        }`}
                        title={rune.name}
                      >
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                          alt={rune.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* 보조 트리 선택 */}
            <div className="mb-4 pt-4 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">보조 트리</p>
              <div className="flex justify-center gap-3 mb-3">
                {(Object.entries(RUNE_TREES) as [RuneTree, { name: string; color: string }][])
                  .filter(([treeKey]) => treeKey !== runePage.primaryTree)
                  .map(([treeKey, info]) => (
                    <button
                      key={treeKey}
                      onClick={() => handleSecondaryTreeChange(treeKey)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        runePage.secondaryTree === treeKey
                          ? 'bg-gray-800 ring-2 ring-offset-1 ring-offset-gray-900 ring-purple-500 scale-110'
                          : 'opacity-40 hover:opacity-100'
                      }`}
                      title={info.name}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                    </button>
                  ))}
              </div>

              {/* 보조 룬 (슬롯 1-3 중 2개 선택) */}
              <div className="space-y-2">
                {[1, 2, 3].map((slot) => {
                  const slotRunes = getMinorRunesBySlot(runePage.secondaryTree, slot);
                  const isSlotSelected = runePage.secondarySlots.includes(slot);
                  return (
                    <div key={slot} className="flex gap-2 justify-center">
                      {slotRunes.map((rune) => {
                        const isSelected = runePage.secondaryRunes.includes(rune.id);
                        return (
                          <button
                            key={rune.id}
                            onClick={() => handleSecondaryRuneSelect(rune.id, slot)}
                            className={`w-7 h-7 rounded-full border overflow-hidden transition-all ${
                              isSelected
                                ? 'border-purple-500 opacity-100 scale-105'
                                : isSlotSelected
                                ? 'border-gray-800 opacity-20'
                                : 'border-gray-700 opacity-40 hover:opacity-80'
                            }`}
                            title={rune.name}
                          >
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                              alt={rune.name}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 스탯 룬 */}
            <div className="pt-4 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">스탯 룬</p>
              <div className="space-y-2">
                {statRuneSlots.map((slotOptions, slotIdx) => (
                  <div key={slotIdx} className="flex gap-3 justify-center">
                    {slotOptions.map((rune) => (
                      <button
                        key={rune.id}
                        onClick={() => {
                          const newStats = [...runePage.statRunes] as [string, string, string];
                          newStats[slotIdx] = rune.id;
                          setRunePage({ ...runePage, statRunes: newStats });
                        }}
                        className={`w-6 h-6 rounded-full border overflow-hidden transition-all flex items-center justify-center ${
                          runePage.statRunes[slotIdx] === rune.id
                            ? 'border-cyan-500 bg-cyan-900/50 opacity-100'
                            : 'border-gray-700 opacity-40 hover:opacity-80'
                        }`}
                        title={`${rune.name}: ${rune.description}`}
                      >
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                          alt={rune.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Champion Settings */}
      <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">챔피언 설정</h2>

        {/* Level */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-gray-400">레벨 (Level)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLevel(Math.max(1, level - 1))}
              className="w-8 h-8 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
            >
              -
            </button>
            <span className="text-xl font-black text-blue-500 w-8 text-center">{level}</span>
            <button
              onClick={() => setLevel(Math.min(18, level + 1))}
              className="w-8 h-8 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
            >
              +
            </button>
          </div>
        </div>

        {/* Stacks (Conditional) */}
        {isStackingChamp && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
            <span className="text-xs font-bold text-purple-400">스택 (Stacks)</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStacks(Math.max(0, stacks - 10))}
                className="w-8 h-8 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
              >
                -
              </button>
              <input
                type="number"
                value={stacks}
                onChange={(e) => setStacks(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-transparent text-center font-black text-purple-500 focus:outline-none"
              />
              <button
                onClick={() => setStacks(stacks + 10)}
                className="w-8 h-8 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
              >
                +
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Target Dummy Settings */}
      <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">샌드백 설정</h2>

        {/* Preset Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {DUMMY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setDummyPreset(preset.id)}
              className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${
                dummyPreset === preset.id
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {preset.nameKo.split(' ')[0]}
            </button>
          ))}
          <button
            onClick={() => setDummyPreset('custom')}
            className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${
              dummyPreset === 'custom'
                ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            커스텀
          </button>
        </div>

        {/* Level & Gold Difference (only for presets) */}
        {dummyPreset !== 'custom' && (
          <div className="space-y-4 mb-6 pb-4 border-b border-gray-800">
            {/* Level Difference */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">레벨 차이</span>
                <span className={`text-sm font-mono font-bold ${
                  levelDiff > 0 ? 'text-red-400' : levelDiff < 0 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {levelDiff > 0 ? `+${levelDiff}` : levelDiff}
                </span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                value={levelDiff}
                onChange={(e) => setLevelDiff(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                <span>-5</span>
                <span>0</span>
                <span>+5</span>
              </div>
            </div>

            {/* Gold Difference */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400">골드 차이</span>
                <span className={`text-sm font-mono font-bold ${
                  goldDiff > 0 ? 'text-red-400' : goldDiff < 0 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {goldDiff > 0 ? `+${goldDiff.toLocaleString()}` : goldDiff.toLocaleString()}G
                </span>
              </div>
              <input
                type="range"
                min="-3000"
                max="3000"
                step="500"
                value={goldDiff}
                onChange={(e) => setGoldDiff(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                <span>-3k</span>
                <span>0</span>
                <span>+3k</span>
              </div>
            </div>
          </div>
        )}

        {/* Final Stats Display */}
        <div className="space-y-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
            {dummyPreset === 'custom' ? '수동 입력' : '계산된 스탯'}
            {dummyPreset !== 'custom' && ` (Lv.${Math.max(1, Math.min(18, level + levelDiff))})`}
          </p>

          {/* HP */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-green-400">체력 (HP)</span>
            <input
              type="number"
              value={targetStats.hp}
              onChange={(e) => handleManualStatChange({ ...targetStats, hp: parseInt(e.target.value) || 0 })}
              className="w-20 bg-gray-800 rounded-lg px-2 py-1 text-center font-mono text-white focus:ring-1 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Armor */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400">방어력 (Armor)</span>
            <input
              type="number"
              value={targetStats.armor}
              onChange={(e) => handleManualStatChange({ ...targetStats, armor: parseInt(e.target.value) || 0 })}
              className="w-20 bg-gray-800 rounded-lg px-2 py-1 text-center font-mono text-white focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* MR */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400">마법저항 (MR)</span>
            <input
              type="number"
              value={targetStats.mr}
              onChange={(e) => handleManualStatChange({ ...targetStats, mr: parseInt(e.target.value) || 0 })}
              className="w-20 bg-gray-800 rounded-lg px-2 py-1 text-center font-mono text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
