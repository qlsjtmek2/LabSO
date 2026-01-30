/**
 * Context-Aware Build Recommendation Engine
 *
 * Provides item recommendations based on:
 * - Enemy team composition (damage types)
 * - Game phase (early/mid/late)
 * - Champion synergies
 * - Play style (from timeline analysis)
 * - Statistical data (high win-rate builds)
 *
 * Usage:
 *   const recommender = new BuildRecommender(championId, matchData);
 *   const recommendations = recommender.recommend();
 */

interface Champion {
  id: number;
  name: string;
  tags: string[]; // "Fighter", "Tank", "Mage", etc.
}

interface MatchParticipant {
  puuid: string;
  championId: number;
  championName: string;
  teamId: number;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  physicalDamageDealtToChampions: number;
  magicDamageDealtToChampions: number;
  trueDamageDealtToChampions: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  win: boolean;
}

interface ItemRecommendation {
  itemId: number;
  itemName: string;
  priority: number; // 1-10 (10 = highest)
  reasoning: string;
  category: 'damage' | 'defense' | 'utility' | 'sustain';
  situational: boolean;
}

interface EnemyComposition {
  physicalDamage: number;
  magicDamage: number;
  trueDamage: number;
  totalDamage: number;
  tankCount: number;
  squishyCount: number;
  ccCount: number;
}

export class BuildRecommender {
  private championId: number;
  private myTeam: MatchParticipant[];
  private enemyTeam: MatchParticipant[];
  private gameDuration: number;
  private enemyComp: EnemyComposition;

  constructor(championId: number, match: any, myPuuid: string) {
    this.championId = championId;
    this.gameDuration = match.info.gameDuration;

    const myParticipant = match.info.participants.find((p: any) => p.puuid === myPuuid);
    const myTeamId = myParticipant.teamId;

    this.myTeam = match.info.participants.filter((p: any) => p.teamId === myTeamId);
    this.enemyTeam = match.info.participants.filter((p: any) => p.teamId !== myTeamId);

    this.enemyComp = this.analyzeEnemyComposition();
  }

  /**
   * Get item recommendations
   */
  recommend(phase: 'early' | 'mid' | 'late' = 'mid'): ItemRecommendation[] {
    const recommendations: ItemRecommendation[] = [];

    // Defensive recommendations based on enemy damage
    recommendations.push(...this.getDefensiveItems());

    // Offensive recommendations based on champion role
    recommendations.push(...this.getOffensiveItems(phase));

    // Utility recommendations
    recommendations.push(...this.getUtilityItems());

    // Sort by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    return recommendations.slice(0, 6); // Return top 6 items
  }

  /**
   * Analyze enemy team composition
   */
  private analyzeEnemyComposition(): EnemyComposition {
    const totalPhysical = this.enemyTeam.reduce(
      (sum, p) => sum + p.physicalDamageDealtToChampions,
      0
    );
    const totalMagic = this.enemyTeam.reduce(
      (sum, p) => sum + p.magicDamageDealtToChampions,
      0
    );
    const totalTrue = this.enemyTeam.reduce(
      (sum, p) => sum + p.trueDamageDealtToChampions,
      0
    );
    const totalDamage = totalPhysical + totalMagic + totalTrue;

    // Simple heuristics for composition analysis
    const tankCount = this.enemyTeam.filter(p =>
      ['Ornn', 'Sion', 'Malphite', 'Maokai', 'Sejuani'].includes(p.championName)
    ).length;

    const squishyCount = this.enemyTeam.filter(p =>
      ['Jinx', 'Caitlyn', 'Lux', 'Xerath', 'Ziggs'].includes(p.championName)
    ).length;

    // CC champions (simplified)
    const ccCount = this.enemyTeam.filter(p =>
      ['Morgana', 'Leona', 'Nautilus', 'Thresh', 'Alistar'].includes(p.championName)
    ).length;

    return {
      physicalDamage: totalPhysical / totalDamage,
      magicDamage: totalMagic / totalDamage,
      trueDamage: totalTrue / totalDamage,
      totalDamage,
      tankCount,
      squishyCount,
      ccCount
    };
  }

  /**
   * Get defensive item recommendations
   */
  private getDefensiveItems(): ItemRecommendation[] {
    const recommendations: ItemRecommendation[] = [];

    const physicalRatio = this.enemyComp.physicalDamage;
    const magicRatio = this.enemyComp.magicDamage;

    // Armor items (if enemy has >60% physical damage)
    if (physicalRatio > 0.6) {
      recommendations.push({
        itemId: 3047,
        itemName: 'Plated Steelcaps',
        priority: 9,
        reasoning: `Enemy team deals ${(physicalRatio * 100).toFixed(0)}% physical damage`,
        category: 'defense',
        situational: false
      });

      recommendations.push({
        itemId: 3143,
        itemName: "Randuin's Omen",
        priority: 8,
        reasoning: 'High physical damage from enemy team',
        category: 'defense',
        situational: false
      });

      if (this.enemyTeam.some(p => ['Jinx', 'Caitlyn', 'Vayne'].includes(p.championName))) {
        recommendations.push({
          itemId: 3075,
          itemName: 'Thornmail',
          priority: 8,
          reasoning: 'Enemy has strong ADC',
          category: 'defense',
          situational: true
        });
      }
    }

    // Magic resist items (if enemy has >60% magic damage)
    if (magicRatio > 0.6) {
      recommendations.push({
        itemId: 3111,
        itemName: "Mercury's Treads",
        priority: 9,
        reasoning: `Enemy team deals ${(magicRatio * 100).toFixed(0)}% magic damage`,
        category: 'defense',
        situational: false
      });

      recommendations.push({
        itemId: 3156,
        itemName: 'Maw of Malmortius',
        priority: 8,
        reasoning: 'High magic damage from enemy team',
        category: 'defense',
        situational: false
      });

      if (this.enemyComp.ccCount >= 3) {
        recommendations.push({
          itemId: 3140,
          itemName: 'Quicksilver Sash',
          priority: 9,
          reasoning: 'Enemy has heavy CC',
          category: 'defense',
          situational: true
        });
      }
    }

    // Balanced damage (40-60% split)
    if (physicalRatio >= 0.4 && physicalRatio <= 0.6) {
      recommendations.push({
        itemId: 3071,
        itemName: 'Black Cleaver',
        priority: 7,
        reasoning: 'Balanced damage composition',
        category: 'defense',
        situational: false
      });
    }

    return recommendations;
  }

  /**
   * Get offensive item recommendations
   */
  private getOffensiveItems(phase: 'early' | 'mid' | 'late'): ItemRecommendation[] {
    const recommendations: ItemRecommendation[] = [];

    // Tank shredding (if enemy has 2+ tanks)
    if (this.enemyComp.tankCount >= 2) {
      recommendations.push({
        itemId: 3153,
        itemName: 'Blade of the Ruined King',
        priority: 8,
        reasoning: `Enemy has ${this.enemyComp.tankCount} tanks`,
        category: 'damage',
        situational: false
      });

      recommendations.push({
        itemId: 3036,
        itemName: 'Lord Dominik\'s Regards',
        priority: 8,
        reasoning: 'Armor penetration needed against tanks',
        category: 'damage',
        situational: false
      });
    }

    // Squishy punishing (if enemy has 3+ squishies)
    if (this.enemyComp.squishyCount >= 3) {
      recommendations.push({
        itemId: 3031,
        itemName: 'Infinity Edge',
        priority: 9,
        reasoning: 'Enemy team is squishy',
        category: 'damage',
        situational: false
      });

      recommendations.push({
        itemId: 3142,
        itemName: "Youmuu's Ghostblade",
        priority: 8,
        reasoning: 'Mobility to catch squishies',
        category: 'damage',
        situational: true
      });
    }

    // Phase-specific items
    if (phase === 'early') {
      recommendations.push({
        itemId: 3134,
        itemName: 'Serrated Dirk',
        priority: 7,
        reasoning: 'Early game power spike',
        category: 'damage',
        situational: false
      });
    } else if (phase === 'late') {
      recommendations.push({
        itemId: 3094,
        itemName: 'Rapid Firecannon',
        priority: 7,
        reasoning: 'Late game range and poke',
        category: 'damage',
        situational: false
      });
    }

    return recommendations;
  }

  /**
   * Get utility item recommendations
   */
  private getUtilityItems(): ItemRecommendation[] {
    const recommendations: ItemRecommendation[] = [];

    // Healing reduction (if enemy has healers)
    const healers = this.enemyTeam.filter(p =>
      ['Soraka', 'Yuumi', 'Sona', 'Vladimir', 'Aatrox'].includes(p.championName)
    );

    if (healers.length > 0) {
      recommendations.push({
        itemId: 3033,
        itemName: 'Mortal Reminder',
        priority: 9,
        reasoning: `Enemy has ${healers.map(p => p.championName).join(', ')}`,
        category: 'utility',
        situational: false
      });
    }

    // Stealth detection (if enemy has stealth champions)
    const stealthChamps = this.enemyTeam.filter(p =>
      ['Evelynn', 'Twitch', 'Shaco', 'Kha\'Zix', 'Rengar'].includes(p.championName)
    );

    if (stealthChamps.length > 0) {
      recommendations.push({
        itemId: 3364,
        itemName: 'Oracle Lens',
        priority: 8,
        reasoning: `Enemy has ${stealthChamps.map(p => p.championName).join(', ')}`,
        category: 'utility',
        situational: true
      });
    }

    // Mobility/engage tools
    if (this.enemyComp.squishyCount >= 3) {
      recommendations.push({
        itemId: 6693,
        itemName: 'Prowler\'s Claw',
        priority: 7,
        reasoning: 'Engage tool for backline access',
        category: 'utility',
        situational: true
      });
    }

    return recommendations;
  }

  /**
   * Get build path recommendations (core → situational)
   */
  getBuildPath(): {
    core: ItemRecommendation[];
    situational: ItemRecommendation[];
  } {
    const allRecommendations = this.recommend();

    return {
      core: allRecommendations.filter(r => !r.situational),
      situational: allRecommendations.filter(r => r.situational)
    };
  }

  /**
   * Get counter-build for specific enemy champion
   */
  getCounterBuild(enemyChampionId: number): ItemRecommendation[] {
    const enemy = this.enemyTeam.find(p => p.championId === enemyChampionId);
    if (!enemy) return [];

    const recommendations: ItemRecommendation[] = [];

    // Champion-specific counters (simplified examples)
    const counterMap: { [key: string]: ItemRecommendation } = {
      Zed: {
        itemId: 3157,
        itemName: "Zhonya's Hourglass",
        priority: 10,
        reasoning: 'Counters Zed ultimate',
        category: 'defense',
        situational: false
      },
      Yasuo: {
        itemId: 3075,
        itemName: 'Thornmail',
        priority: 9,
        reasoning: 'Reflects Yasuo\'s damage',
        category: 'defense',
        situational: false
      },
      Vayne: {
        itemId: 3143,
        itemName: "Randuin's Omen",
        priority: 9,
        reasoning: 'Reduces Vayne crit damage',
        category: 'defense',
        situational: false
      }
    };

    if (counterMap[enemy.championName]) {
      recommendations.push(counterMap[enemy.championName]);
    }

    return recommendations;
  }

  /**
   * Analyze play style from timeline and recommend accordingly
   */
  recommendByPlayStyle(playStyle: {
    aggressive: boolean;
    roaming: boolean;
    farming: boolean;
    teamfighting: boolean;
  }): ItemRecommendation[] {
    const recommendations: ItemRecommendation[] = [];

    if (playStyle.aggressive && playStyle.roaming) {
      recommendations.push({
        itemId: 3142,
        itemName: "Youmuu's Ghostblade",
        priority: 9,
        reasoning: 'Suits aggressive roaming playstyle',
        category: 'damage',
        situational: false
      });
    }

    if (playStyle.farming) {
      recommendations.push({
        itemId: 3031,
        itemName: 'Infinity Edge',
        priority: 8,
        reasoning: 'Scale with farm advantage',
        category: 'damage',
        situational: false
      });
    }

    if (playStyle.teamfighting) {
      recommendations.push({
        itemId: 3190,
        itemName: "Locket of the Iron Solari",
        priority: 8,
        reasoning: 'Team fight utility',
        category: 'utility',
        situational: false
      });
    }

    return recommendations;
  }
}

/**
 * Example Usage
 */
export async function exampleUsage() {
  // Assume match data is fetched from Riot API
  const match = await fetchMatch('KR_6549876543');
  const myPuuid = 'abc123...';
  const myChampionId = 157; // Yasuo

  const recommender = new BuildRecommender(myChampionId, match, myPuuid);

  // Get general recommendations
  const recommendations = recommender.recommend('mid');
  console.log('Recommended Items:');
  recommendations.forEach(rec => {
    console.log(`${rec.itemName} (Priority: ${rec.priority}) - ${rec.reasoning}`);
  });

  // Get build path
  const buildPath = recommender.getBuildPath();
  console.log('\nCore Build:', buildPath.core.map(r => r.itemName).join(' → '));
  console.log('Situational:', buildPath.situational.map(r => r.itemName).join(', '));

  // Get counter-build for specific enemy
  const enemyZedId = 238;
  const counterBuild = recommender.getCounterBuild(enemyZedId);
  console.log('\nCounter to Zed:', counterBuild.map(r => r.itemName).join(', '));

  // Recommend by play style
  const playStyle = {
    aggressive: true,
    roaming: true,
    farming: false,
    teamfighting: false
  };
  const styleRecommendations = recommender.recommendByPlayStyle(playStyle);
  console.log('\nFor Aggressive Roamer:', styleRecommendations.map(r => r.itemName).join(', '));
}

async function fetchMatch(matchId: string): Promise<any> {
  // Placeholder - implement with actual API call
  throw new Error('Not implemented');
}

/**
 * Advanced: Machine Learning Build Recommendation
 *
 * For production, consider training a model on historical match data:
 * - Features: Champion matchup, team compositions, game phase, player stats
 * - Labels: Win rate with specific item builds
 * - Model: Gradient boosting (XGBoost) or neural network
 *
 * This example provides rule-based recommendations, but ML can capture
 * complex patterns that rules miss.
 */
export class MLBuildRecommender {
  /**
   * Placeholder for ML model integration
   */
  async predictBestBuild(features: any): Promise<ItemRecommendation[]> {
    // In production:
    // 1. Extract features from match data
    // 2. Call ML model API (TensorFlow, PyTorch served via API)
    // 3. Get probability distribution over items
    // 4. Return top-k items with confidence scores

    throw new Error('ML model not implemented');
  }

  /**
   * Feature engineering for ML model
   */
  extractFeatures(match: any, championId: number, myPuuid: string): any {
    // Extract relevant features for ML model
    return {
      championId,
      enemyChampions: [],
      allyChampions: [],
      enemyDamageRatio: { physical: 0, magic: 0, true: 0 },
      gamePhase: 'mid',
      playerKDA: 0,
      playerCS: 0,
      goldAdvantage: 0
      // ... more features
    };
  }
}
