import { useState } from 'react';
import type { TeamComposition, TeamAnalysis, MatchupAnalysis, BuildRecommendation, StrategyGuide, RuneTemplate } from '@/types';
import RuneDisplay from './RuneDisplay';
import { compareTeams } from '@/engine/analyzer/teamAnalyzer';

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
}

export default function AnalysisResult({ result }: AnalysisResultProps) {
  const [activeTab, setActiveTab] = useState<'build' | 'runes' | 'strategy' | 'detail'>('build');

  const { matchup, buildRecommendation, strategyGuide, runeTemplate, allyAnalysis } = result;

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      {/* 1. Header Summary Card */}
      <div className="bg-gradient-to-br from-gray-900 to-[#0f1115] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-white italic mb-2">
              <span className="text-purple-400">AI</span> 분석 리포트
            </h2>
            <p className="text-gray-400 text-sm max-w-md">
              {buildRecommendation.summary}
            </p>
          </div>

          {matchup && (
            <div className="flex items-center gap-6 bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">라인전 상성</p>
                <p className={`text-xl font-black ${
                  matchup.advantageScore >= 2 ? 'text-green-400' : 
                  matchup.advantageScore <= -2 ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {matchup.advantageLevel === 'Heavy Advantage' ? '매우 유리' :
                   matchup.advantageLevel === 'Advantage' ? '유리함' :
                   matchup.advantageLevel === 'Even' ? '반반' :
                   matchup.advantageLevel === 'Disadvantage' ? '불리함' : '매우 불리'}
                </p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">승리 플랜</p>
                <p className="text-sm font-bold text-white">{strategyGuide.teamRole}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex p-1 bg-gray-900/50 rounded-xl border border-gray-800 backdrop-blur-sm sticky top-20 z-30">
        {[
          { id: 'build', label: '아이템 빌드', icon: '⚔️' },
          { id: 'runes', label: '룬 & 스탯', icon: '💎' },
          { id: 'strategy', label: '운영 전략', icon: '🗺️' },
          { id: 'detail', label: '상세 분석', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white shadow-lg ring-1 ring-white/10'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Tab Content */}
      <div className="min-h-[400px]">
        {/* BUILD TAB */}
        {activeTab === 'build' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Core Items */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-yellow-500 rounded-full" />
                  핵심 빌드
                </h3>
                <div className="flex flex-wrap gap-4">
                  {/* Boots */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-xl bg-[#1a1d24] border border-gray-700 flex items-center justify-center relative group">
                        <img 
                            src={`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/item/${buildRecommendation.boots.itemId}.png`} 
                            className="w-full h-full rounded-xl object-cover"
                            alt="Boots"
                        />
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 rounded-xl">
                            <p className="text-[10px] text-white text-center leading-tight">{buildRecommendation.boots.reason}</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-gray-400">신발</span>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex items-center text-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </div>

                  {/* Core Items */}
                  {buildRecommendation.coreItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-xl bg-[#1a1d24] border-2 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] relative group">
                                <img 
                                    src={`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/item/${item.itemId}.png`} 
                                    className="w-full h-full rounded-lg object-cover"
                                    alt="Core Item"
                                />
                                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                                    {idx + 1}
                                </div>
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 rounded-lg">
                                    <p className="text-[10px] text-white text-center leading-tight">{item.reason}</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-yellow-500">코어</span>
                        </div>
                        {idx < buildRecommendation.coreItems.length - 1 && (
                            <div className="flex items-center text-gray-700">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </div>
                        )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  상황별 아이템
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {buildRecommendation.situationalItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-[#13151a] rounded-xl border border-gray-800 hover:border-blue-500/50 transition-colors">
                        <img 
                            src={`https://ddragon.leagueoflegends.com/cdn/14.3.1/img/item/${item.itemId}.png`} 
                            className="w-10 h-10 rounded-lg border border-gray-700"
                            alt="Situational Item"
                        />
                        <div>
                            <p className="text-xs font-bold text-gray-300 mb-1">추천 {idx + 1}</p>
                            <p className="text-[11px] text-gray-500 leading-snug">{item.reason}</p>
                        </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Build Reasons */}
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 h-fit">
                <h3 className="text-lg font-bold text-white mb-4">빌드 추천 근거</h3>
                <div className="space-y-3">
                    {buildRecommendation.reasons.map((reason, idx) => (
                        <div key={idx} className="flex gap-3 text-sm text-gray-400">
                            <span className="text-purple-500 font-bold">•</span>
                            <p>{reason}</p>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* RUNES TAB */}
        {activeTab === 'runes' && (
          <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            {runeTemplate ? (
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-black text-white mb-2">{runeTemplate.name}</h3>
                        <p className="text-gray-400">{runeTemplate.description}</p>
                    </div>
                    <RuneDisplay template={runeTemplate} />
                </div>
            ) : (
                <div className="text-center text-gray-500 py-20">룬 데이터가 없습니다.</div>
            )}
          </div>
        )}

        {/* STRATEGY TAB */}
        {activeTab === 'strategy' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Early Game */}
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">1</div>
                    <h3 className="text-lg font-bold text-white">초반 (Early)</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-2">목표</p>
                        <ul className="space-y-2">
                            {strategyGuide.earlyGame.objectives.map((o, i) => (
                                <li key={i} className="text-sm text-gray-300 flex gap-2">
                                    <span className="text-blue-500">✓</span> {o}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {strategyGuide.earlyGame.tips.length > 0 && (
                        <div className="p-3 bg-blue-900/10 rounded-xl border border-blue-900/30">
                            <p className="text-xs text-blue-400 font-bold mb-1">💡 Tip</p>
                            <p className="text-xs text-gray-400">{strategyGuide.earlyGame.tips[0]}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mid Game */}
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">2</div>
                    <h3 className="text-lg font-bold text-white">중반 (Mid)</h3>
                </div>
                <p className="text-sm text-purple-200 font-bold mb-4 bg-purple-900/20 p-2 rounded-lg text-center">
                    "{strategyGuide.midGame.playstyle}"
                </p>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-2">목표</p>
                        <ul className="space-y-2">
                            {strategyGuide.midGame.objectives.map((o, i) => (
                                <li key={i} className="text-sm text-gray-300 flex gap-2">
                                    <span className="text-purple-500">✓</span> {o}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Late Game */}
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">3</div>
                    <h3 className="text-lg font-bold text-white">후반 (Late)</h3>
                </div>
                <p className="text-sm text-orange-200 font-bold mb-4 bg-orange-900/20 p-2 rounded-lg text-center">
                    "{strategyGuide.lateGame.teamfightRole}"
                </p>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase mb-2">목표</p>
                        <ul className="space-y-2">
                            {strategyGuide.lateGame.objectives.map((o, i) => (
                                <li key={i} className="text-sm text-gray-300 flex gap-2">
                                    <span className="text-orange-500">✓</span> {o}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* DETAIL TAB */}
        {activeTab === 'detail' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Power Graph */}
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-6">팀 파워 커브</h3>
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                            <span>초반 (Early)</span>
                            <span className="text-blue-400">{allyAnalysis.powerCurve.early}/10</span>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style={{ width: `${allyAnalysis.powerCurve.early * 10}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                            <span>중반 (Mid)</span>
                            <span className="text-purple-400">{allyAnalysis.powerCurve.mid}/10</span>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: `${allyAnalysis.powerCurve.mid * 10}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                            <span>후반 (Late)</span>
                            <span className="text-orange-400">{allyAnalysis.powerCurve.late}/10</span>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full" style={{ width: `${allyAnalysis.powerCurve.late * 10}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Stats */}
            <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <h3 className="text-lg font-bold text-white mb-6">팀 스탯 분석</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#13151a] rounded-2xl border border-gray-800">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">데미지 밸런스</p>
                        <div className="flex items-end gap-2">
                            <span className="text-xl font-black text-orange-400">AD {Math.round(allyAnalysis.adRatio * 100)}%</span>
                            <span className="text-sm font-bold text-gray-600">/</span>
                            <span className="text-xl font-black text-blue-400">AP {Math.round(allyAnalysis.apRatio * 100)}%</span>
                        </div>
                    </div>
                    <div className="p-4 bg-[#13151a] rounded-2xl border border-gray-800">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">CC 점수</p>
                        <span className="text-2xl font-black text-white">{allyAnalysis.ccScore}</span>
                        <span className="text-xs text-gray-500 ml-1">/ 100</span>
                    </div>
                    <div className="p-4 bg-[#13151a] rounded-2xl border border-gray-800">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">이니시에이팅</p>
                        <span className="text-2xl font-black text-white">{allyAnalysis.engageScore}</span>
                        <span className="text-xs text-gray-500 ml-1">/ 100</span>
                    </div>
                    <div className="p-4 bg-[#13151a] rounded-2xl border border-gray-800">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">아군 보호</p>
                        <span className="text-2xl font-black text-white">{allyAnalysis.peelScore}</span>
                        <span className="text-xs text-gray-500 ml-1">/ 100</span>
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
