'use client';

import { useState, useEffect } from 'react';
import { getLatestVersion, getChampions } from '@/lib/dataDragon';
import * as Hangul from 'hangul-js';

export default function Home() {
  const [version, setVersion] = useState<string>('');
  const [champions, setChampions] = useState<any[]>([]);
  const [filteredChampions, setFilteredChampions] = useState<any[]>([]);
  const [champSearch, setChampSearch] = useState('');
  
  const [searchName, setSearchName] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [summonerData, setSummonerData] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const v = await getLatestVersion();
      setVersion(v);
      const champsObj = await getChampions(v);
      const champsArr = Object.values(champsObj);
      setChampions(champsArr);
      setFilteredChampions(champsArr);
    };
    init();
  }, []);

  useEffect(() => {
    if (champSearch === '') {
      setFilteredChampions(champions);
    } else {
      setFilteredChampions(
        champions.filter((c) => {
          // 영어 이름 검색
          if (c.id.toLowerCase().includes(champSearch.toLowerCase())) return true;
          // 한글 이름 검색 (일반)
          if (c.name.includes(champSearch)) return true;
          // 초성 검색 (Hangul.search는 포함되면 0 이상의 인덱스 반환)
          if (Hangul.search(c.name, champSearch) >= 0) return true;
          return false;
        })
      );
    }
  }, [champSearch, champions]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMatches([]);
    setSummonerData(null); // 기존 결과 초기화로 깜빡임 방지
    
    try {
      const res = await fetch(`/api/summoner?name=${searchName}&tag=${searchTag}`);
      const data = await res.json();
      if (data.error) {
          alert(data.error);
      } else {
          setSummonerData(data);
          const matchRes = await fetch(`/api/matches/${data.puuid}`);
          const matchData = await matchRes.json();
          setMatches(matchData);
      }
    } catch (err) {
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-black italic text-white hover:text-blue-400 transition">
            LabSO
          </a>
          <nav className="flex gap-6">
            <a href="/" className="text-blue-400 text-sm font-bold">
              홈
            </a>
            <a href="/build-advisor" className="text-gray-400 hover:text-white transition text-sm font-medium">
              빌드 추천
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section & Search */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10 text-center">
            <h1 className="text-7xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 italic">
                LabSO
            </h1>
            <p className="text-gray-400 text-lg mb-10 font-medium">
                데이터 기반 롤 전략 분석 & 콤보 최적화
            </p>

            <form onSubmit={handleSearch} className="flex items-center bg-gray-900/80 backdrop-blur-md p-2 rounded-3xl border border-gray-700 shadow-2xl max-w-2xl mx-auto transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                <div className="flex-1 flex items-center px-4 gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input
                        type="text"
                        placeholder="소환사 이름 (예: Hide on bush)"
                        className="w-full bg-transparent border-none focus:outline-none text-white font-bold placeholder-gray-600 h-12"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                    />
                </div>
                <div className="w-px h-8 bg-gray-700 mx-2"></div>
                <div className="w-32 flex items-center px-2">
                    <span className="text-gray-500 font-bold mr-1">#</span>
                    <input
                        type="text"
                        placeholder="태그"
                        className="w-full bg-transparent border-none focus:outline-none text-white font-bold placeholder-gray-600 h-12"
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? '검색 중' : '검색'}
                </button>
            </form>
        </div>
      </section>

      {/* Search Result */}
      {summonerData && (
        <section className="max-w-6xl mx-auto px-6 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-4">
                    <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 sticky top-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <img 
                                    src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${summonerData.profileIconId}.png`}
                                    className="w-32 h-32 rounded-3xl border-4 border-gray-800 shadow-2xl"
                                    alt="Profile"
                                />
                                <div className="absolute -bottom-3 bg-gray-800 px-4 py-1 rounded-full border border-gray-700 text-sm font-bold text-white shadow-lg">
                                    Lv.{summonerData.summonerLevel}
                                </div>
                            </div>
                            <h2 className="text-2xl font-black mb-1">{summonerData.gameName}</h2>
                            <p className="text-gray-500 font-medium mb-8">#{summonerData.tagLine}</p>
                            
                            <div className="w-full bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-2">분석 가능한 데이터</p>
                                <div className="flex justify-around">
                                    <div className="text-center">
                                        <div className="text-blue-500 font-black text-xl">5</div>
                                        <div className="text-[10px] text-gray-400">최근 경기</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-purple-500 font-black text-xl">ON</div>
                                        <div className="text-[10px] text-gray-400">타임라인</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Match List */}
                <div className="lg:col-span-8 space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">최근 전적</h3>
                    {matches.length > 0 ? matches.map((match) => {
                        const participant = match.info.participants.find((p: any) => p.puuid === summonerData.puuid);
                        const isWin = participant.win;
                        
                        return (
                            <div 
                                key={match.metadata.matchId} 
                                onClick={() => window.location.href = `/analysis/${match.metadata.matchId}?puuid=${summonerData.puuid}`}
                                className={`group relative bg-gray-900 rounded-2xl p-1 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer border ${isWin ? 'border-blue-900/30 hover:border-blue-500/50' : 'border-red-900/30 hover:border-red-500/50'}`}
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isWin ? 'bg-blue-500' : 'bg-red-500'}`} />
                                <div className="flex items-center p-4 pl-6 gap-6">
                                    <div className="relative">
                                        <img 
                                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${participant.championName}.png`}
                                            className="w-16 h-16 rounded-xl shadow-lg"
                                            alt={participant.championName}
                                        />
                                        <div className="absolute -bottom-2 -right-2 bg-gray-900 text-[10px] font-black px-1.5 py-0.5 rounded border border-gray-700">
                                            {participant.championName}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className={`text-lg font-black ${isWin ? 'text-blue-400' : 'text-red-400'}`}>
                                                {isWin ? '승리' : '패배'}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">
                                                {match.info.gameMode}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-300">
                                            <span className="font-bold text-white">{participant.kills}</span> / 
                                            <span className="font-bold text-red-400">{participant.deaths}</span> / 
                                            <span className="font-bold text-white">{participant.assists}</span>
                                            <span className="text-gray-600 mx-1">•</span>
                                            <span className="text-gray-400 text-xs">KDA {((participant.kills + participant.assists) / Math.max(1, participant.deaths)).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2">
                                            <span>전략 분석</span>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        loading && <div className="text-center py-20 bg-gray-900 rounded-3xl border border-gray-800 text-gray-500 animate-pulse">전적 데이터를 불러오고 있습니다...</div>
                    )}
                </div>
            </div>
        </section>
      )}

      {/* Champion Calculator List */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
                <h2 className="text-3xl font-black mb-2">챔피언 연구소</h2>
                <p className="text-gray-400 text-sm">원하는 챔피언을 선택하여 콤보 데미지를 계산해보세요.</p>
            </div>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="챔피언 검색..." 
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 w-64 text-sm focus:outline-none focus:border-blue-500 transition"
                    value={champSearch}
                    onChange={(e) => setChampSearch(e.target.value)}
                />
                <svg className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
          {filteredChampions.map((champ) => (
            <div
              key={champ.id}
              className="group cursor-pointer"
              onClick={() => window.location.href = `/calculator/${champ.id}`}
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-2 border border-gray-800 group-hover:border-blue-500 transition-colors">
                <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.image.full}`}
                    alt={champ.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    loading="lazy"
                />
              </div>
              <p className="text-xs font-bold text-gray-400 text-center group-hover:text-white transition truncate">{champ.name}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
