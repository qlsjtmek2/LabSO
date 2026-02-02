'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getLatestVersion, getChampionDetail, getItems } from '@/lib/dataDragon';
import Link from 'next/link';
import SimulationReport from '@/components/calculator/SimulationReport';

export default function CalculatorPage() {
  const { id } = useParams();
  const [version, setVersion] = useState('');
  const [champion, setChampion] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [level, setLevel] = useState(6);
  const [selectedItems, setSelectedItems] = useState<any[]>(Array(6).fill(null));
  const [showItemModal, setShowItemModal] = useState<{show: boolean, slot: number | null}>({show: false, slot: null});
  const [skillLevels, setSkillLevels] = useState<number[]>([1, 1, 1, 1]); // Q, W, E, R
  const [combo, setCombo] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemSearch, setItemSearch] = useState('');

  const [hoverData, setHoverData] = useState<{show: boolean, title: string, description: string, x: number, y: number}>({ show: false, title: '', description: '', x: 0, y: 0 });

  const [simulationResult, setSimulationResult] = useState<{ totalDamage: number, events: any[], championStats?: any }>({ totalDamage: 0, events: [] });
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const v = await getLatestVersion();
      setVersion(v);
      const [champData, allItems] = await Promise.all([
        getChampionDetail(v, id as string),
        getItems(v)
      ]);
      setChampion(champData);
      
      // 아이템 ID 주입
      const itemsArr = Object.entries(allItems).map(([key, val]: [string, any]) => ({
        ...val,
        id: key 
      }));
      
      const filteredItems = itemsArr.filter((item: any) => 
        item.gold.purchasable && !item.tags.includes('Consumable')
      );
      setItems(filteredItems);
      setLoading(false);
    };
    init();
  }, [id]);

  // 시뮬레이션 API 호출
  useEffect(() => {
    const runSimulation = async () => {
      if (!champion) return;
      
      // 콤보가 없어도 스탯 확인 등을 위해 호출 가능하지만, 현재는 데미지 위주
      if (combo.length === 0) {
        setSimulationResult(prev => ({ ...prev, totalDamage: 0 }));
        return;
      }

      setIsSimulating(true);
      try {
        const itemIds = selectedItems.map(i => i ? parseInt(i.id) : null).filter(i => i !== null);
        
        const res = await fetch('/api/simulate/combo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            championId: champion.id, // e.g. "Ahri"
            level,
            items: itemIds,
            skillLevels,
            combo
          })
        });
        
        const data = await res.json();
        if (data.error) {
          console.error(data.error);
        } else {
          setSimulationResult(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSimulating(false);
      }
    };

    const timer = setTimeout(runSimulation, 500); // Debounce
    return () => clearTimeout(timer);
  }, [combo, level, selectedItems, skillLevels, champion]);

  if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const calculateBaseStat = (base: number, growth: number, lv: number) => {
    return base + growth * (lv - 1) * (0.7025 + 0.0175 * (lv - 1));
  };

  const itemStats = selectedItems.reduce((acc, item) => {
    if (!item) return acc;
    const s = item.stats;
    return {
      ad: acc.ad + (s.FlatPhysicalDamageMod || 0),
      ap: acc.ap + (s.FlatMagicDamageMod || 0),
      hp: acc.hp + (s.FlatHPPoolMod || 0),
      armor: acc.armor + (s.FlatArmorMod || 0),
      mr: acc.mr + (s.FlatSpellBlockMod || 0),
    };
  }, { ad: 0, ap: 0, hp: 0, armor: 0, mr: 0 });

  // 서버에서 받은 스탯이 있으면 우선 사용, 없으면 클라이언트 추정치 (Fallback)
  const currentStats = simulationResult.championStats || {
    hp: calculateBaseStat(champion.stats.hp, champion.stats.hpperlevel, level) + itemStats.hp,
    ad: calculateBaseStat(champion.stats.attackdamage, champion.stats.attackdamageperlevel, level) + itemStats.ad,
    ap: itemStats.ap,
    armor: calculateBaseStat(champion.stats.armor, champion.stats.armorperlevel, level) + itemStats.armor,
    mr: calculateBaseStat(champion.stats.spellblock, champion.stats.spellblockperlevel, level) + itemStats.mr,
  };

  const parseTooltip = (tooltip: string, spell?: any) => {
    if (!tooltip) return '';
    let parsed = tooltip;

    if (spell) {
        parsed = parsed.replace(/{{ e(\d+) }}/g, (_, index) => {
            const idx = parseInt(index);
            return spell.effectBurn[idx] || '?';
        });

        if (spell.vars) {
            spell.vars.forEach((v: any) => {
                const key = v.key;
                const coeff = v.coeff;
                let link = '';
                
                if (v.link === 'attackdamage') link = 'AD';
                else if (v.link === 'bonusattackdamage') link = '추가 AD';
                else if (v.link === 'spelldamage') link = 'AP';
                else if (v.link === 'armor') link = '방어력';
                else if (v.link === 'spellblock') link = '마법저항력';
                else if (v.link === 'bonushealth') link = '추가 체력';
                else link = v.link;

                const replacement = `(+${coeff} ${link})`;
                const regex = new RegExp(`{{ ${key} }}`, 'g');
                parsed = parsed.replace(regex, replacement);
            });
        }
    }

    parsed = parsed
        .replace(/<br>/g, '\n')
        .replace(/<physicalDamage>/g, ' [물리] ')
        .replace(/<magicDamage>/g, ' [마법] ')
        .replace(/<trueDamage>/g, ' [고정] ')
        .replace(/<[^>]*>/g, '')
        .replace(/{{[^}]*}}/g, '(?)');

    return parsed;
  };

  const showTooltip = (e: React.MouseEvent, title: string, desc: string, spell?: any) => {
    const cleanDesc = parseTooltip(spell ? spell.tooltip : desc, spell);
    setHoverData({
      show: true,
      title,
      description: cleanDesc,
      x: e.clientX,
      y: e.clientY
    });
  };

  const hideTooltip = () => setHoverData({ ...hoverData, show: false });

  const handleSelectItem = (item: any) => {
    if (showItemModal.slot !== null) {
        const newSelected = [...selectedItems];
        newSelected[showItemModal.slot] = item;
        setSelectedItems(newSelected);
        setShowItemModal({show: false, slot: null});
        hideTooltip();
    }
  };

  const removeItem = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const newSelected = [...selectedItems];
    newSelected[idx] = null;
    setSelectedItems(newSelected);
    hideTooltip();
  };

  const StatBar = ({ label, value, max, color }: { label: string, value: number, max: number, color: string }) => (
    <div className="flex items-center gap-3 text-xs font-bold mb-2">
        <div className="w-16 text-gray-500">{label}</div>
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }}></div>
        </div>
        <div className="w-10 text-right text-white font-mono">{Math.round(value)}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-blue-500 selection:text-white pb-20 relative">
      
      {/* Tooltip */}
      {hoverData.show && (
        <div 
            className="fixed z-[100] pointer-events-none bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl max-w-sm animate-in fade-in duration-200"
            style={{ left: hoverData.x + 20, top: hoverData.y + 20 }}
        >
            <h4 className="text-blue-400 font-black mb-2 uppercase tracking-tighter text-sm">{hoverData.title}</h4>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{hoverData.description}</p>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden mb-8 border-b border-gray-800">
        <div className="absolute inset-0 bg-blue-900/10 blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex flex-col md:flex-row items-center gap-8">
            <Link href="/" className="absolute top-8 left-6 md:static">
                <span className="text-2xl font-black italic tracking-tighter text-blue-500 hover:text-white transition cursor-pointer">LabSO</span>
            </Link>
            
            <img 
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.image.full}`}
                className="w-24 h-24 rounded-2xl border-2 border-gray-700 shadow-2xl mt-8 md:mt-0"
                alt={champion.name}
            />
            <div className="flex-1 text-center md:text-left">
                <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-2">{champion.name}</h1>
                <p className="text-gray-400 font-medium">{champion.title}</p>
            </div>
            
            <div className="bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border border-gray-800 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Champion Level</span>
                <div className="flex items-center gap-4">
                    <button onClick={() => setLevel(Math.max(1, level - 1))} className="w-8 h-8 bg-gray-800 rounded-lg text-gray-400 hover:text-white">-</button>
                    <span className="text-2xl font-black text-blue-500 w-8 text-center">{level}</span>
                    <button onClick={() => setLevel(Math.min(18, level + 1))} className="w-8 h-8 bg-gray-800 rounded-lg text-gray-400 hover:text-white">+</button>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-6">
            <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">전투 능력치</h2>
                <div className="space-y-4">
                    <StatBar label="공격력" value={currentStats.ad} max={600} color="bg-orange-500" />
                    <StatBar label="주문력" value={currentStats.ap} max={800} color="bg-purple-500" />
                    <StatBar label="방어력" value={currentStats.armor} max={300} color="bg-yellow-500" />
                    <StatBar label="마법저항" value={currentStats.mr} max={300} color="bg-blue-500" />
                    <StatBar label="체력" value={currentStats.hp} max={4000} color="bg-green-500" />
                </div>
            </section>

            <section className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">아이템 빌드</h2>
                <div className="grid grid-cols-3 gap-3">
                    {selectedItems.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setShowItemModal({show: true, slot: idx})}
                            onMouseEnter={(e) => item && showTooltip(e, item.name, item.description)}
                            onMouseLeave={hideTooltip}
                            className="aspect-square bg-gray-950 rounded-xl border border-gray-800 hover:border-blue-500/50 transition cursor-pointer flex items-center justify-center relative group overflow-hidden"
                        >
                            {item ? (
                                <>
                                    <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.image.full}`} alt={item.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <button onClick={(e) => removeItem(e, idx)} className="text-xs font-bold text-red-400 bg-gray-900 px-2 py-1 rounded">제거</button>
                                    </div>
                                </>
                            ) : (
                                <span className="text-gray-800 text-2xl">+</span>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>

        {/* Right Main */}
        <div className="lg:col-span-8 space-y-6">
            <section className="bg-gray-900 rounded-[2.5rem] p-8 md:p-12 border border-gray-800 relative min-h-[600px] flex flex-col">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="flex justify-between items-center mb-10 relative z-10">
                    <div>
                        <h2 className="text-3xl font-black italic mb-2">COMBO TEST</h2>
                        <p className="text-gray-500 text-sm">스킬과 평타를 섞어 최적의 콤보를 찾아보세요.</p>
                    </div>
                    <button onClick={() => setCombo([])} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-xs font-bold text-gray-400 transition">초기화</button>
                </div>

                <div className="flex justify-center gap-4 md:gap-6 mb-16 relative z-10 flex-wrap">
                    {/* Passive */}
                    <div className="flex flex-col items-center gap-3">
                        <div 
                            className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-yellow-500/30 overflow-hidden shadow-lg cursor-help"
                            onMouseEnter={(e) => showTooltip(e, champion.passive.name, champion.passive.description)}
                            onMouseLeave={hideTooltip}
                        >
                            <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/passive/${champion.passive.image.full}`} className="w-full h-full object-cover" alt="P" />
                        </div>
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Passive</span>
                    </div>

                    <div className="w-px h-12 bg-gray-800 my-auto mx-2" />

                    {/* Auto Attack */}
                    <div className="flex flex-col items-center gap-3">
                        <button
                            onClick={() => setCombo([...combo, -1])}
                            className="group relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gray-950 border-2 border-gray-800 hover:border-orange-500 hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center justify-center"
                        >
                            <span className="text-2xl font-black text-gray-500 group-hover:text-orange-500 transition">AA</span>
                        </button>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Basic Attack</span>
                    </div>

                    {/* Spells */}
                    {champion.spells.map((spell: any, idx: number) => (
                        <div key={spell.id} className="flex flex-col items-center gap-3">
                            <button
                                onClick={() => setCombo([...combo, idx])}
                                onMouseEnter={(e) => showTooltip(e, spell.name, spell.tooltip, spell)}
                                onMouseLeave={hideTooltip}
                                className="group relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gray-950 border-2 border-gray-800 hover:border-blue-500 hover:scale-105 transition-all shadow-xl active:scale-95"
                            >
                                <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.image.full}`} className="w-full h-full rounded-[14px] opacity-80 group-hover:opacity-100 transition" alt={spell.name} />
                                <span className="absolute -top-3 -right-3 w-8 h-8 bg-gray-900 border-2 border-gray-700 rounded-full flex items-center justify-center font-black text-gray-300 text-xs">
                                    {['Q', 'W', 'E', 'R'][idx]}
                                </span>
                            </button>
                            <div className="flex items-center bg-gray-950 rounded-lg p-1 border border-gray-800">
                                <button className="w-6 h-6 text-gray-500 hover:text-white" onClick={() => {
                                    const newLv = [...skillLevels];
                                    newLv[idx] = Math.max(1, newLv[idx] - 1);
                                    setSkillLevels(newLv);
                                }}>-</button>
                                <span className="text-xs font-bold w-4 text-center text-blue-500">{skillLevels[idx]}</span>
                                <button className="w-6 h-6 text-gray-500 hover:text-white" onClick={() => {
                                    const newLv = [...skillLevels];
                                    newLv[idx] = Math.min(idx === 3 ? 3 : 5, newLv[idx] + 1);
                                    setSkillLevels(newLv);
                                }}>+</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Result Area */}
                <div className="flex-1 bg-black/20 rounded-3xl p-8 border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-4 flex-wrap min-h-[80px] mb-8">
                        {combo.length === 0 ? (
                            <span className="text-gray-600 font-medium italic">스킬이나 평타 아이콘을 눌러보세요...</span>
                        ) : (
                            combo.map((spellIdx, i) => (
                                <div key={i} className="flex items-center gap-3 relative group cursor-pointer" onClick={() => setCombo(combo.filter((_, idx) => idx !== i))}>
                                    <div className={`w-10 h-10 rounded flex items-center justify-center border font-black relative overflow-hidden ${spellIdx === -1 ? 'bg-orange-900/20 border-orange-500/50 text-orange-500' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                        {spellIdx === -1 ? 'AA' : ['Q', 'W', 'E', 'R'][spellIdx]}
                                        <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">✕</div>
                                    </div>
                                    {i < combo.length - 1 && <span className="text-gray-700">›</span>}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
                        <div>
                            <p className="text-blue-500 text-xs font-black uppercase tracking-widest mb-2">TOTAL BURST DAMAGE</p>
                            <div className="text-7xl md:text-8xl font-black text-white tracking-tighter drop-shadow-2xl">
                                {isSimulating ? (
                                    <span className="text-gray-600 text-5xl">...</span>
                                ) : (
                                    simulationResult.totalDamage.toLocaleString()
                                )}
                            </div>
                        </div>
                        <div className="text-right text-gray-500 text-xs space-y-1">
                            <p>적 방어력 100 / 마저 100 기준</p>
                            <p>실제 데미지 시뮬레이션 결과</p>
                        </div>
                    </div>

                    {/* 상세 리포트 */}
                    {!isSimulating && simulationResult.events && simulationResult.events.length > 0 && (
                        <SimulationReport result={simulationResult} />
                    )}
                </div>
            </section>
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
            <div className="bg-[#0f0f13] w-full max-w-5xl h-[80vh] rounded-[2rem] overflow-hidden flex flex-col border border-gray-800 shadow-2xl">
                <header className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <input 
                        type="text" 
                        placeholder="아이템 검색..." 
                        className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 w-64 text-sm focus:outline-none focus:border-blue-500 transition"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        autoFocus
                    />
                    <button onClick={() => setShowItemModal({show: false, slot: null})} className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition">✕</button>
                </header>
                <div className="p-6 overflow-y-auto grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-3">
                    {items.filter(item => item.name.includes(itemSearch)).map((item: any) => (
                        <div 
                            key={item.id} 
                            className="group cursor-pointer"
                            onClick={() => handleSelectItem(item)}
                            onMouseEnter={(e) => showTooltip(e, item.name, item.description)}
                            onMouseLeave={hideTooltip}
                        >
                            <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group-hover:border-blue-500 transition relative">
                                <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.image.full}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" alt={item.name} />
                                <div className="absolute bottom-0 right-0 bg-gray-950/90 text-[10px] px-1.5 py-0.5 rounded-tl-lg font-mono text-yellow-500">{item.gold.total}</div>
                            </div>
                            <p className="text-[10px] text-gray-500 text-center mt-1 truncate group-hover:text-white transition">{item.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
