import type { TeamComposition, TeamAnalysis, MatchupAnalysis, BuildRecommendation, StrategyGuide, RuneTemplate } from '@/types';
import RuneDisplay from './RuneDisplay';
import { compareTeams } from '@/engine/analyzer/teamAnalyzer';
import itemsData from '../../data/json/items.json';

interface AnalysisResultProps {
  result: {
    composition: TeamComposition;
    allyAnalysis: TeamAnalysis;
    enemyAnalysis: TeamAnalysis;
    matchup: MatchupAnalysis | null;
    buildRecommendation: BuildRecommendation;
    strategyGuide: StrategyGuide;
    runeTemplate: RuneTemplate | null;
    comparison: ReturnType<typeof compareTeams>;
  };
  version: string; // 버전 정보 추가
}

export default function AnalysisResult({ result, version }: AnalysisResultProps) {
  const { matchup, buildRecommendation, strategyGuide, runeTemplate, allyAnalysis } = result;
  const { simulationStats } = buildRecommendation;

  // 아이템 정보 가져오기 헬퍼 (키가 문자열일 수 있으므로 변환)
  const getItemInfo = (id: number) => {
    const data = (itemsData as any)[String(id)] || (itemsData as any)[id];
    return data;
  };

  // HTML 태그 제거 헬퍼 (DataDragon 태그 정제 강화)
  const stripHtml = (html: string) => {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?/gi, '\n') // 줄바꿈 보존
      .replace(/<[^>]*>?/gm, '')     // 태그 제거
      .replace(/(\r\n|\n|\r)/gm, ' ') // 줄바꿈을 공백으로 (툴팁용)
      .replace(/\s\s+/g, ' ')         // 다중 공백 제거
      .trim();
  };

  // 유전 알고리즘 결과 (없으면 에러 처리)
  const skillOrder = buildRecommendation.skillOrder;
  const spells = buildRecommendation.summonerSpells || ['SummonerFlash', 'SummonerIgnite'];

  const renderItemWithTooltip = (item: any, isBoots: boolean = false, idx?: number) => {    const info = getItemInfo(item.itemId);
    return (
      <div className="aspect-square relative group">
        <img 
          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.itemId}.png`} 
          className={`w-full h-full rounded-xl shadow-lg transition-all ${
            isBoots ? 'border border-gray-700 group-hover:border-yellow-500' :
            idx !== undefined && idx < 3 ? 'border-2 border-yellow-500/40 shadow-yellow-500/10' : 'border border-gray-700'
          }`}
          alt={info?.name || 'Item'}
        />
        {idx !== undefined && idx < 3 && !isBoots && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-500 text-black font-black text-[10px] flex items-center justify-center rounded-full shadow-md">
            {idx + 1}
          </div>
        )}
        {isBoots && (
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap font-bold">신발</span>
        )}
        
        {/* 강화된 툴팁 */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-black/95 p-4 rounded-2xl border border-gray-700 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl scale-95 group-hover:scale-100 origin-bottom">
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/10">
            <img 
              src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.itemId}.png`} 
              className="w-10 h-10 rounded-lg"
              alt=""
            />
            <div>
              <p className="text-sm font-black text-white leading-tight">{info?.name || '아이템'}</p>
              <p className="text-[10px] text-yellow-500 font-bold">{info?.price || 0} Gold</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {info?.description && (
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">아이템 효과</p>
                <p className="text-[11px] text-gray-300 leading-relaxed italic line-clamp-4">
                  {stripHtml(info.description)}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">AI 선정 이유</p>
              <p className="text-[11px] text-white leading-relaxed font-medium bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                {item.reason}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      {/* 1. 요약 카드 (상성 & 핵심 전략) */}
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-y border-white/10 p-6 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter">
              AI 전술 분석 리포트
            </h2>
            <p className="text-gray-300 text-sm mt-1 max-w-xl">
              {buildRecommendation.summary}
            </p>
          </div>
          
          {matchup && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">라인전 예상</p>
                <p className={`text-2xl font-black ${
                  matchup.advantageScore >= 2 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {matchup.advantageLevel === 'Heavy Advantage' ? '압도적 유리' :
                   matchup.advantageLevel === 'Advantage' ? '유리함' :
                   matchup.advantageLevel === 'Even' ? '팽팽함' : '불리함'}
                </p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">핵심 역할</p>
                <p className="text-xl font-bold text-white">{strategyGuide.teamRole.split(' - ')[0]}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. 좌측: 최적 로드아웃 (아이템 + 스펠 + 스킬) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 메인 빌드 카드 */}
          <div className="bg-[#0f1115] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-purple-500 to-blue-500" />
            
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  최적화 빌드 세트
                </h3>
                <div className="flex gap-2">
                  {spells.map((spell, i) => (
                    <img key={i} src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell}.png`} className="w-8 h-8 rounded border border-gray-600 shadow-lg" alt="Spell" />
                  ))}
                </div>
              </div>

              {/* 아이템 그리드 */}
              <div className="grid grid-cols-6 gap-2 md:gap-4 mb-8">
                {/* 신발 */}
                {renderItemWithTooltip(buildRecommendation.boots, true)}
                
                {/* 코어템 (5개) */}
                {buildRecommendation.coreItems.slice(0, 5).map((item, idx) => (
                  <div key={idx}>
                    {renderItemWithTooltip(item, false, idx)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-800">
                {/* 스킬 순서 */}
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase mb-3 tracking-widest">스킬 마스터 순서</p>
                  {skillOrder ? (
                    <div className="flex items-center gap-4">
                      {skillOrder.map((skill, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black ${
                            i === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}>
                            {skill}
                          </div>
                          {i < 2 && <span className="text-gray-600 font-bold">›</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-400 text-sm font-bold">⚠️ AI 분석 데이터 없음</p>
                  )}
                </div>

                {/* 룬 요약 */}
                {runeTemplate && (
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-3 tracking-widest">핵심 룬 세팅</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-900 rounded-full border border-gray-700 flex items-center justify-center p-1">
                        <img 
                          src={`https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${runeTemplate.primaryTree}/${runeTemplate.primaryKeystone}/${runeTemplate.primaryKeystone}.png`} 
                          className="w-full h-full object-contain" 
                          alt="Keystone"
                          onError={(e) => (e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${runeTemplate.primaryTree}/${runeTemplate.primaryKeystone}.png`)}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{runeTemplate.name}</p>
                        <p className="text-xs text-gray-500">{runeTemplate.primaryTree} + {runeTemplate.secondaryTree}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 상세 룬 페이지 */}
          <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-xl">💎</span> 상세 룬 페이지
            </h3>
            {runeTemplate && <RuneDisplay template={runeTemplate} />}
          </div>

          {/* 운영 전략 타임라인 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">🗺️</span> 단계별 운영 가이드
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['초반 (Early)', '중반 (Mid)', '후반 (Late)'].map((phase, i) => {
                const guide = i === 0 ? strategyGuide.earlyGame : i === 1 ? strategyGuide.midGame : strategyGuide.lateGame;
                const colors = ['border-blue-500/50 text-blue-400', 'border-purple-500/50 text-purple-400', 'border-orange-500/50 text-orange-400'];
                
                return (
                  <div key={phase} className={`bg-[#0f1115] p-5 rounded-2xl border-l-4 ${colors[i]} relative group overflow-hidden shadow-xl`}>
                    <p className="text-[10px] font-black uppercase mb-3 opacity-60 tracking-tighter">{phase}</p>
                    <ul className="space-y-2">
                      {guide.objectives.slice(0, 3).map((obj, idx) => (
                        <li key={idx} className="text-xs text-gray-300 leading-snug flex gap-2">
                          <span className="opacity-40">•</span> {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. 우측: 시뮬레이션 지표 & 인사이트 */}
        <div className="space-y-6">
          
          {/* 전투 시뮬레이션 카드 */}
          <div className="bg-[#1a1d24] rounded-3xl p-6 border border-gray-700 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-[40px] rounded-full pointer-events-none" />
            
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-6 tracking-wider">구간별 파워 커브</h3>
            
            <div className="space-y-6">
              {buildRecommendation.powerCurve ? (
                buildRecommendation.powerCurve.map((point, idx) => {
                  const maxDamage = Math.max(...buildRecommendation.powerCurve!.map(p => p.damage));
                  const percent = (point.damage / maxDamage) * 100;
                  
                  return (
                    <div key={point.level}>
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs text-gray-400 font-bold">Lv.{point.level}</span>
                        <span className="text-sm font-black text-white">{point.damage.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            idx === 3 ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gray-600'
                          }`} 
                          style={{ width: `${percent}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                // 기존 단일 뷰 (Fallback)
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-gray-500">콤보 총 데미지 (18Lv)</span>
                    <span className="text-3xl font-black text-white">{simulationStats?.damage?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full" style={{ width: simulationStats?.damage ? '85%' : '0%' }} />
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-gray-700">
                <p className="text-xs text-yellow-500 mb-4 font-bold">AI의 빌드 선정 이유</p>
                <ul className="space-y-3">
                  {buildRecommendation.reasons.slice(0, 4).map((reason, i) => (
                    <li key={i} className="text-[11px] text-gray-300 flex gap-2 leading-relaxed">
                      <span className="text-purple-500 font-bold">✓</span> {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 대체 아이템 리스트 */}
          <div className="bg-[#0f1115] rounded-3xl p-6 border border-gray-800">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">상황별 유동적 선택</h3>
            <div className="flex flex-col gap-4">
              {buildRecommendation.situationalItems.map((item, idx) => (
                <div key={idx}>
                  {renderItemWithTooltip(item, false)}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
