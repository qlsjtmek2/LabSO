import { useState } from 'react';
import { RUNE_TREES, getKeystonesByTree } from '@/data/runeData';
import type { RuneTree } from '@/types';

interface SimulationSettingsProps {
  level: number;
  setLevel: (v: number) => void;
  stacks: number;
  setStacks: (v: number) => void;
  championId: string;
  targetStats: { armor: number; mr: number; hp: number };
  setTargetStats: (v: { armor: number; mr: number; hp: number }) => void;
  runeIds: string[];
  setRuneIds: (v: string[]) => void;
}

export default function SimulationSettings({
  level,
  setLevel,
  stacks,
  setStacks,
  championId,
  targetStats,
  setTargetStats,
  runeIds,
  setRuneIds,
}: SimulationSettingsProps) {
  const isStackingChamp = ['Nasus', 'Veigar', 'Kindred', 'Senna'].includes(championId);
  const [selectedTree, setSelectedTree] = useState<RuneTree>('Precision');

  const handleKeystoneSelect = (id: string) => {
    // 현재는 키스톤 1개만 관리한다고 가정
    setRuneIds([id]);
  };

  return (
    <div className="space-y-6">
      {/* Rune Settings */}
      <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">핵심 룬 (Keystone)</h2>
        
        {/* Tree Selection */}
        <div className="flex justify-between mb-4 px-2">
          {(Object.entries(RUNE_TREES) as [RuneTree, any][]).map(([treeKey, info]) => (
            <button
              key={treeKey}
              onClick={() => setSelectedTree(treeKey)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                selectedTree === treeKey 
                  ? 'bg-gray-800 ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500 scale-110' 
                  : 'opacity-40 hover:opacity-100'
              }`}
              title={info.name}
            >
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: info.color }} 
              />
            </button>
          ))}
        </div>

        {/* Keystone Selection */}
        <div className="flex gap-2 justify-center flex-wrap">
          {getKeystonesByTree(selectedTree).map((rune) => (
            <button
              key={rune.id}
              onClick={() => handleKeystoneSelect(rune.id)}
              className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all ${
                runeIds.includes(rune.id)
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
            >-</button>
            <span className="text-xl font-black text-blue-500 w-8 text-center">{level}</span>
            <button 
              onClick={() => setLevel(Math.min(18, level + 1))} 
              className="w-8 h-8 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
            >+</button>
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
              >-</button>
              <input 
                type="number" 
                value={stacks} 
                onChange={(e) => setStacks(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 bg-transparent text-center font-black text-purple-500 focus:outline-none"
              />
              <button 
                onClick={() => setStacks(stacks + 10)} 
                className="w-8 h-8 bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
              >+</button>
            </div>
          </div>
        )}
      </section>

      {/* Target Dummy Settings */}
      <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">샌드백 설정</h2>
        
        <div className="space-y-4">
          {/* Armor */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400">방어력 (Armor)</span>
            <input 
              type="number" 
              value={targetStats.armor} 
              onChange={(e) => setTargetStats({ ...targetStats, armor: parseInt(e.target.value) || 0 })}
              className="w-16 bg-gray-800 rounded-lg px-2 py-1 text-center font-mono text-white focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* MR */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400">마법저항 (MR)</span>
            <input 
              type="number" 
              value={targetStats.mr} 
              onChange={(e) => setTargetStats({ ...targetStats, mr: parseInt(e.target.value) || 0 })}
              className="w-16 bg-gray-800 rounded-lg px-2 py-1 text-center font-mono text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* HP */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-green-400">체력 (HP)</span>
            <input 
              type="number" 
              value={targetStats.hp} 
              onChange={(e) => setTargetStats({ ...targetStats, hp: parseInt(e.target.value) || 0 })}
              className="w-16 bg-gray-800 rounded-lg px-2 py-1 text-center font-mono text-white focus:ring-1 focus:ring-green-500 outline-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
