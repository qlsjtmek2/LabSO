'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLatestVersion, getChampions } from '@/lib/dataDragon';
import type { Lane, ChampionSlot, TeamComposition, ChampionMeta, TeamAnalysis, MatchupAnalysis, BuildRecommendation, StrategyGuide } from '@/types';
import { getChampionMeta } from '@/data/championMeta';
import { analyzeTeam, compareTeams } from '@/engine/analyzer/teamAnalyzer';
import { analyzeMatchup } from '@/engine/analyzer/matchupAnalyzer';
import { recommendBuild } from '@/engine/recommender/buildRecommender';
import { generateStrategy } from '@/engine/recommender/strategyRecommender';
import { RuneOptimizer } from '@/engine/recommender/runeOptimizer';
import { RUNE_TEMPLATES } from '@/data/runeTemplates';
import RuneDisplay from '@/components/build-advisor/RuneDisplay';

import ChampionSelectorModal from '@/components/build-advisor/ChampionSelectorModal';
import TeamSelector from '@/components/build-advisor/TeamSelector';
import AnalysisResult from '@/components/build-advisor/AnalysisResult';

// 분석 결과 타입
interface AnalysisResultType {
  composition: TeamComposition;
  allyAnalysis: TeamAnalysis;
  enemyAnalysis: TeamAnalysis;
  matchup: MatchupAnalysis | null;
  buildRecommendation: BuildRecommendation;
  strategyGuide: StrategyGuide;
  runeTemplate: typeof RUNE_TEMPLATES[string] | null;
  comparison: ReturnType<typeof compareTeams>;
}

// 라인 순서
const LANES: Lane[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const LANE_LABELS: Record<Lane, string> = {
  TOP: '탑',
  JGL: '정글',
  MID: '미드',
  ADC: '원딜',
  SUP: '서폿',
};

export default function BuildAdvisorPage() {
  const [version, setVersion] = useState<string>('');
  const [champions, setChampions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 팀 구성 상태
  const [allySlots, setAllySlots] = useState<ChampionSlot[]>(
    LANES.map((lane) => ({ lane, champion: null }))
  );
  const [enemySlots, setEnemySlots] = useState<ChampionSlot[]>(
    LANES.map((lane) => ({ lane, champion: null }))
  );
  const [myChampionLane, setMyChampionLane] = useState<Lane | null>(null);
  const [enemyLanerLane, setEnemyLanerLane] = useState<Lane | null>(null);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    team: 'ally' | 'enemy';
    laneIndex: number;
  } | null>(null);

  // 분석 결과 상태
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const v = await getLatestVersion();
      setVersion(v);
      const champsObj = await getChampions(v);
      const champsArr = Object.values(champsObj);
      setChampions(champsArr);
      setLoading(false);
    };
    init();
  }, []);

  // 챔피언 선택 핸들러
  const handleSelectChampion = useCallback(
    (champion: any) => {
      if (!modalTarget) return;

      const meta = getChampionMeta(champion.id);
      const championData = meta || {
        id: champion.id,
        name: champion.name,
        class: champion.tags[0] || 'Bruiser',
        damageType: 'AD' as const,
        damageProfile: { burst: 5, sustained: 5, poke: 5 },
        lanes: [LANES[modalTarget.laneIndex]],
        primaryLane: LANES[modalTarget.laneIndex],
        powerSpike: { early: 5, mid: 5, late: 5, itemSpikes: [5, 5, 5], levelSpikes: [6, 11, 16] },
        ccTypes: [],
        ccPower: 5,
        range: 'Melee' as const,
        mobility: 5,
        winCondition: { role: 'Carry' as const, teamfightPriority: 'Neutral' as const, scalingType: 'Mid' as const },
        defaultBuildIds: [],
        defaultRuneIds: [],
        tags: champion.tags,
      };

      if (modalTarget.team === 'ally') {
        setAllySlots((prev) =>
          prev.map((slot, idx) =>
            idx === modalTarget.laneIndex ? { ...slot, champion: championData } : slot
          )
        );
      } else {
        setEnemySlots((prev) =>
          prev.map((slot, idx) =>
            idx === modalTarget.laneIndex ? { ...slot, champion: championData } : slot
          )
        );
      }

      setShowModal(false);
      setModalTarget(null);
    },
    [modalTarget]
  );

  // 슬롯 클릭 핸들러
  const handleSlotClick = (team: 'ally' | 'enemy', laneIndex: number) => {
    setModalTarget({ team, laneIndex });
    setShowModal(true);
  };

  // 내 챔피언 지정
  const handleSetMyChampion = (lane: Lane) => {
    setMyChampionLane(myChampionLane === lane ? null : lane);
    if (myChampionLane !== lane) {
      setEnemyLanerLane(lane);
    }
  };

  // 슬롯 초기화
  const handleClearSlot = (team: 'ally' | 'enemy', laneIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (team === 'ally') {
      setAllySlots((prev) =>
        prev.map((slot, idx) => (idx === laneIndex ? { ...slot, champion: null } : slot))
      );
      if (myChampionLane === LANES[laneIndex]) {
        setMyChampionLane(null);
      }
    } else {
      setEnemySlots((prev) =>
        prev.map((slot, idx) => (idx === laneIndex ? { ...slot, champion: null } : slot))
      );
      if (enemyLanerLane === LANES[laneIndex]) {
        setEnemyLanerLane(null);
      }
    }
  };

  // 팀 스왑
  const handleSwapTeams = () => {
    setAllySlots((prevAlly) => {
      setEnemySlots(prevAlly);
      return enemySlots;
    });
    
    // 분석 결과 초기화 (팀이 바뀌었으므로)
    setAnalysisResult(null);
  };

  // 랜덤 팀 생성
  const handleRandomizeTeam = (team: 'ally' | 'enemy') => {
    if (champions.length === 0) return;

    // 역할군별 필터링 함수
    const getChampsByRole = (tags: string[]) => {
        return champions.filter(c => c.tags.some((t: string) => tags.includes(t)));
    };

    const topPool = getChampsByRole(['Fighter', 'Tank']);
    const jglPool = getChampsByRole(['Assassin', 'Fighter', 'Tank']);
    const midPool = getChampsByRole(['Mage', 'Assassin']);
    const adcPool = getChampsByRole(['Marksman']);
    const supPool = getChampsByRole(['Support', 'Tank', 'Mage']);

    const pools = [topPool, jglPool, midPool, adcPool, supPool];
    
    // 랜덤 선택
    const randomChamps = pools.map(pool => {
        if (pool.length === 0) return champions[Math.floor(Math.random() * champions.length)];
        return pool[Math.floor(Math.random() * pool.length)];
    });

    const newSlots = LANES.map((lane, idx) => {
        const champ = randomChamps[idx];
        const meta = getChampionMeta(champ.id) || {
            id: champ.id,
            name: champ.name,
            class: champ.tags[0] || 'Bruiser',
            damageType: 'AD' as const,
            damageProfile: { burst: 5, sustained: 5, poke: 5 },
            lanes: [lane],
            primaryLane: lane,
            powerSpike: { early: 5, mid: 5, late: 5, itemSpikes: [5, 5, 5], levelSpikes: [6, 11, 16] },
            ccTypes: [],
            ccPower: 5,
            range: 'Melee' as const,
            mobility: 5,
            winCondition: { role: 'Carry' as const, teamfightPriority: 'Neutral' as const, scalingType: 'Mid' as const },
            defaultBuildIds: [],
            defaultRuneIds: [],
            tags: champ.tags,
        };
        return { lane, champion: meta };
    });

    if (team === 'ally') setAllySlots(newSlots);
    else setEnemySlots(newSlots);
  };

  // 분석 가능 여부
  const canAnalyze =
    myChampionLane !== null &&
    allySlots.find((s) => s.lane === myChampionLane)?.champion !== null;

  // 분석 실행
  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setAnalyzing(true);
    // UI 스크롤을 결과 섹션으로 이동 (부드럽게)
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);

    // 잠시 대기 (UI 반응성)
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // 챔피언 데이터 추출 (null 제외)
      const allies = allySlots
        .map((s) => s.champion)
        .filter((c): c is ChampionMeta => c !== null);
      const enemies = enemySlots
        .map((s) => s.champion)
        .filter((c): c is ChampionMeta => c !== null);

      const myChampionSlot = allySlots.find((s) => s.lane === myChampionLane);
      if (!myChampionSlot?.champion) throw new Error('My Champion not found');
      const myChampion = myChampionSlot.champion;

      // 상대 라이너 찾기 (없으면 null)
      const enemyLanerSlot = enemySlots.find((s) => s.lane === (enemyLanerLane || myChampionLane));
      const enemyLaner = enemyLanerSlot?.champion || null;

      // 팀 분석
      const allyAnalysis = analyzeTeam(allies);
      const enemyAnalysis = analyzeTeam(enemies);
      const comparison = compareTeams(allies, enemies);

      // 매치업 분석 (상대 라이너가 있을 때만)
      const matchup = enemyLaner ? analyzeMatchup(myChampion, enemyLaner) : null;

      // 빌드 추천
      const buildRecommendation = await recommendBuild(
        myChampion,
        myChampionLane!,
        allies,
        enemies,
        enemyLaner
      );

      // 전략 가이드
      const strategyGuide = generateStrategy(
        myChampion,
        allies,
        enemies,
        allyAnalysis,
        enemyAnalysis,
        matchup
      );

      // 룬 템플릿 선택
      let runeTemplate = null;
      if (myChampion.class === 'Assassin') {
        runeTemplate = RUNE_TEMPLATES['assassin-electrocute'];
      } else if (myChampion.class === 'Marksman') {
        runeTemplate = RUNE_TEMPLATES['adc-lethal-tempo'];
      } else if (myChampion.class === 'Mage' || myChampion.class === 'Artillery') {
        runeTemplate = RUNE_TEMPLATES['mage-arcane-comet'];
      } else if (myChampion.class === 'Tank') {
        runeTemplate = RUNE_TEMPLATES['tank-grasp'];
      } else if (myChampion.class === 'Enchanter') {
        runeTemplate = RUNE_TEMPLATES['enchanter-aery'];
      } else if (myChampion.class === 'Bruiser') {
        runeTemplate = RUNE_TEMPLATES['bruiser-conqueror'];
      } else if (myChampion.class === 'Support') {
        runeTemplate = RUNE_TEMPLATES['engage-aftershock'];
      }
      
      if (!runeTemplate) {
           runeTemplate = RUNE_TEMPLATES['bruiser-conqueror'];
      }

      const composition: TeamComposition = {
        allies: allySlots.map((s) => ({
          ...s,
          isMyChampion: s.lane === myChampionLane,
        })),
        enemies: enemySlots.map((s) => ({
          ...s,
          isEnemyLaner: s.lane === enemyLanerLane,
        })),
        myChampionLane,
        enemyLanerLane,
      };

      setAnalysisResult({
        composition,
        allyAnalysis,
        enemyAnalysis,
        matchup,
        buildRecommendation,
        strategyGuide,
        runeTemplate,
        comparison,
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // 전체 초기화
  const handleReset = () => {
    setAllySlots(LANES.map((lane) => ({ lane, champion: null })));
    setEnemySlots(LANES.map((lane) => ({ lane, champion: null })));
    setMyChampionLane(null);
    setEnemyLanerLane(null);
    setAnalysisResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">데이터 로딩 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-black italic text-white hover:text-blue-400 transition">
            LabSO
          </a>
          <nav className="flex gap-6">
            <a href="/" className="text-gray-400 hover:text-white transition text-sm font-medium">
              홈
            </a>
            <a href="/build-advisor" className="text-blue-400 text-sm font-bold">
              빌드 추천
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-12 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            상황 인식형 빌드 추천
          </h1>
          <p className="text-gray-400 text-base md:text-lg mb-2">
            상대 조합을 분석하여 <span className="text-purple-400 font-bold">최적의 빌드</span>를 추천합니다.
          </p>
        </div>
      </section>

      {/* Team Selection */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <TeamSelector
          allySlots={allySlots}
          enemySlots={enemySlots}
          myChampionLane={myChampionLane}
          enemyLanerLane={enemyLanerLane}
          onSlotClick={handleSlotClick}
          onClearSlot={handleClearSlot}
          onSetMyChampion={handleSetMyChampion}
          onSwapTeams={handleSwapTeams}
          onRandomize={handleRandomizeTeam}
          version={version}
        />

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8 sticky bottom-8 z-30 lg:static">
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-800/80 backdrop-blur-md hover:bg-gray-700 rounded-xl font-bold text-gray-300 transition border border-gray-700 shadow-lg"
          >
            초기화
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className={`px-10 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-xl ${
              canAnalyze
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transform hover:scale-105'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
            }`}
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                분석 시작
              </>
            )}
          </button>
        </div>

        {!canAnalyze && (
          <p className="text-center text-gray-500 text-sm mt-4 animate-pulse">
            {!myChampionLane
              ? '👆 우리 팀에서 "내 챔프"를 선택해주세요'
              : '👆 내 챔피언 슬롯을 채워주세요'}
          </p>
        )}
      </section>

      {/* Analysis Result */}
      {analysisResult && (
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <AnalysisResult result={analysisResult} version={version} />
        </section>
      )}

      {/* Champion Selection Modal */}
      <ChampionSelectorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleSelectChampion}
        champions={champions}
        version={version}
        team={modalTarget?.team || 'ally'}
        laneLabel={modalTarget ? LANE_LABELS[LANES[modalTarget.laneIndex]] : ''}
      />
    </main>
  );
}