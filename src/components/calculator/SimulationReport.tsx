import { DamageEvent } from '@/engine/simulator/core/types';

interface SimulationReportProps {
  result: {
    totalDamage: number;
    targetMaxHp?: number;
    damagePercent?: number;
    canKill?: boolean;
    overkillDamage?: number;
    events: DamageEvent[];
  };
}

export default function SimulationReport({ result }: SimulationReportProps) {
  const { totalDamage, targetMaxHp = 2000, damagePercent = 0, canKill = false, overkillDamage = 0, events } = result;

  if (!events || events.length === 0) return null;

  // 데미지 퍼센트에 따른 색상
  const getDamageColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 70) return 'bg-orange-500';
    if (percent >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const damageBarColor = getDamageColor(damagePercent);

  // 1. 데미지 타입별 집계
  const typeStats = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + e.mitigatedDamage;
    return acc;
  }, { Physical: 0, Magical: 0, True: 0 } as Record<string, number>);

  // 2. 소스별 집계 (스킬, 아이템 등)
  const sourceStats = events.reduce((acc, e) => {
    // "Ahri Q (Q)" -> "Ahri Q"
    const name = e.source.split('(')[0].trim();
    acc[name] = (acc[name] || 0) + e.mitigatedDamage;
    return acc;
  }, {} as Record<string, number>);

  const sortedSources = Object.entries(sourceStats)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* HP 바 & 킬 가능 여부 표시 */}
      <div className={`rounded-2xl p-6 border ${canKill ? 'bg-red-950/50 border-red-500/50' : 'bg-gray-900/50 border-gray-800'} transition-all`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">적 체력 피해량</h3>
          {canKill && (
            <div className="flex items-center gap-2 animate-pulse">
              <span className="text-2xl">💀</span>
              <span className="text-red-500 font-black text-lg uppercase tracking-wider">KILL</span>
              {overkillDamage > 0 && (
                <span className="text-red-400 text-xs font-bold">+{overkillDamage.toLocaleString()} OVERKILL</span>
              )}
            </div>
          )}
        </div>

        {/* HP 바 시각화 */}
        <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden mb-3">
          {/* 데미지 영역 (깎인 피) */}
          <div
            style={{ width: `${Math.min(100, damagePercent)}%` }}
            className={`absolute left-0 top-0 h-full ${damageBarColor} transition-all duration-500`}
          />
          {/* 잔여 체력 영역 */}
          {!canKill && (
            <div
              style={{ width: `${100 - damagePercent}%`, left: `${damagePercent}%` }}
              className="absolute top-0 h-full bg-green-600"
            />
          )}
          {/* 중앙 텍스트 */}
          <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm drop-shadow-lg">
            {canKill ? (
              <span className="text-white">ELIMINATED</span>
            ) : (
              <span>{Math.round(targetMaxHp - totalDamage).toLocaleString()} / {targetMaxHp.toLocaleString()} HP</span>
            )}
          </div>
        </div>

        {/* 퍼센트 표시 */}
        <div className="flex justify-between text-xs font-mono">
          <span className={`font-bold ${canKill ? 'text-red-400' : 'text-gray-400'}`}>
            {damagePercent.toFixed(1)}% 체력 피해
          </span>
          <span className="text-gray-500">
            {totalDamage.toLocaleString()} / {targetMaxHp.toLocaleString()} HP
          </span>
        </div>
      </div>

      {/* 데미지 타입 바 차트 */}
      <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">데미지 구성</h3>
        <div className="flex h-4 rounded-full overflow-hidden mb-2">
          {typeStats.Physical > 0 && (
            <div style={{ width: `${(typeStats.Physical / totalDamage) * 100}%` }} className="bg-orange-500" />
          )}
          {typeStats.Magical > 0 && (
            <div style={{ width: `${(typeStats.Magical / totalDamage) * 100}%` }} className="bg-blue-500" />
          )}
          {typeStats.True > 0 && (
            <div style={{ width: `${(typeStats.True / totalDamage) * 100}%` }} className="bg-white" />
          )}
        </div>
        <div className="flex justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            물리 {Math.round(typeStats.Physical).toLocaleString()} ({Math.round((typeStats.Physical / totalDamage) * 100)}%)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            마법 {Math.round(typeStats.Magical).toLocaleString()} ({Math.round((typeStats.Magical / totalDamage) * 100)}%)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white" />
            고정 {Math.round(typeStats.True).toLocaleString()} ({Math.round((typeStats.True / totalDamage) * 100)}%)
          </div>
        </div>
      </div>

      {/* 스킬별 기여도 */}
      <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">스킬 기여도</h3>
        <div className="space-y-3">
          {sortedSources.map(([name, dmg]) => (
            <div key={name} className="flex items-center gap-4 text-sm">
              <div className="w-32 truncate text-gray-300 font-bold">{name}</div>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${(dmg / totalDamage) * 100}%` }} 
                  className="h-full bg-purple-500"
                />
              </div>
              <div className="w-16 text-right font-mono text-gray-400">{Math.round(dmg).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 로그 */}
      <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 max-h-96 overflow-y-auto custom-scrollbar">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 sticky top-0 bg-gray-900/90 py-2 backdrop-blur">전투 로그</h3>
        <table className="w-full text-xs text-left">
          <thead className="text-gray-500 border-b border-gray-800">
            <tr>
              <th className="py-2 pl-2">Time</th>
              <th className="py-2">Source</th>
              <th className="py-2 text-right">Damage</th>
              <th className="py-2 text-right pr-2">Type</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {events.map((e, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                <td className="py-2 pl-2 text-gray-500">{e.timestamp.toFixed(1)}s</td>
                <td className="py-2 text-white">
                  {e.source}
                  {e.isCrit && <span className="ml-2 text-red-500 font-black">CRIT!</span>}
                </td>
                <td className="py-2 text-right font-bold">
                  {Math.round(e.mitigatedDamage)}
                  <span className="text-gray-600 text-[10px] ml-1">({Math.round(e.rawDamage)})</span>
                </td>
                <td className={`py-2 text-right pr-2 font-bold ${
                  e.type === 'Physical' ? 'text-orange-500' : 
                  e.type === 'Magical' ? 'text-blue-500' : 'text-white'
                }`}>
                  {e.type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
