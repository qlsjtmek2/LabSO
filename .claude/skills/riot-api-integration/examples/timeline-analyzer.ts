/**
 * Match Timeline Analyzer
 *
 * Utilities for parsing and analyzing Match-V5 Timeline data:
 * - Event extraction and filtering
 * - Skill order analysis
 * - Item build progression
 * - Position tracking and heatmaps
 * - Gold efficiency calculations
 * - Objective control analysis
 *
 * Usage:
 *   const analyzer = new TimelineAnalyzer(timeline, puuid);
 *   const skillOrder = analyzer.getSkillOrder();
 *   const buildOrder = analyzer.getBuildOrder();
 */

interface Position {
  x: number;
  y: number;
}

interface TimelineEvent {
  timestamp: number;
  type: string;
  [key: string]: any;
}

interface ParticipantFrame {
  participantId: number;
  totalGold: number;
  level: number;
  currentGold: number;
  xp: number;
  minionsKilled: number;
  jungleMinionsKilled: number;
  position: Position;
  damageStats: {
    totalDamageDone: number;
    totalDamageDoneToChampions: number;
    [key: string]: number;
  };
}

interface Frame {
  timestamp: number;
  participantFrames: { [key: string]: ParticipantFrame };
  events: TimelineEvent[];
}

interface Timeline {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    frameInterval: number;
    frames: Frame[];
    participants: any[];
  };
}

interface SkillLevelUp {
  skill: 'Q' | 'W' | 'E' | 'R';
  level: number;
  timestamp: number;
  gameTime: string;
}

interface ItemPurchase {
  itemId: number;
  timestamp: number;
  gameTime: string;
  minute: number;
}

interface KillEvent {
  killerId: number;
  victimId: number;
  assistingParticipantIds: number[];
  timestamp: number;
  gameTime: string;
  position: Position;
}

interface ObjectiveEvent {
  type: 'DRAGON' | 'BARON' | 'HERALD' | 'TOWER' | 'INHIBITOR';
  subType?: string;
  teamId: number;
  timestamp: number;
  gameTime: string;
  position: Position;
}

export class TimelineAnalyzer {
  private timeline: Timeline;
  private puuid: string;
  private participantId: number;
  private teamId: number;

  constructor(timeline: Timeline, puuid: string) {
    this.timeline = timeline;
    this.puuid = puuid;

    // Find participant ID from PUUID
    const participantIndex = timeline.metadata.participants.indexOf(puuid);
    if (participantIndex === -1) {
      throw new Error(`PUUID ${puuid} not found in match participants`);
    }
    this.participantId = participantIndex + 1; // ParticipantId is 1-indexed

    // Determine team ID (1-5 = team 100, 6-10 = team 200)
    this.teamId = this.participantId <= 5 ? 100 : 200;
  }

  /**
   * Get skill level-up order
   */
  getSkillOrder(): SkillLevelUp[] {
    return this.timeline.info.frames
      .flatMap(f => f.events)
      .filter(
        e => e.type === 'SKILL_LEVEL_UP' && e.participantId === this.participantId
      )
      .map(e => ({
        skill: ['Q', 'W', 'E', 'R'][e.skillSlot - 1] as 'Q' | 'W' | 'E' | 'R',
        level: e.level,
        timestamp: e.timestamp,
        gameTime: this.formatTime(e.timestamp)
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get item purchase order
   */
  getBuildOrder(): ItemPurchase[] {
    return this.timeline.info.frames
      .flatMap(f => f.events)
      .filter(
        e => e.type === 'ITEM_PURCHASED' && e.participantId === this.participantId
      )
      .map(e => ({
        itemId: e.itemId,
        timestamp: e.timestamp,
        gameTime: this.formatTime(e.timestamp),
        minute: Math.floor(e.timestamp / 60000)
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all kills and assists
   */
  getKillParticipation(): {
    kills: KillEvent[];
    assists: KillEvent[];
    deaths: KillEvent[];
    participation: number;
  } {
    const killEvents = this.timeline.info.frames
      .flatMap(f => f.events)
      .filter(e => e.type === 'CHAMPION_KILL') as any[];

    const kills = killEvents.filter(e => e.killerId === this.participantId);

    const assists = killEvents.filter(
      e =>
        e.assistingParticipantIds &&
        e.assistingParticipantIds.includes(this.participantId)
    );

    const deaths = killEvents.filter(e => e.victimId === this.participantId);

    // Calculate team kills for participation rate
    const teamKills = killEvents.filter(
      e =>
        (e.killerId <= 5 && this.teamId === 100) ||
        (e.killerId > 5 && this.teamId === 200)
    );

    const playerParticipation = kills.length + assists.length;
    const participation =
      teamKills.length > 0 ? (playerParticipation / teamKills.length) * 100 : 0;

    return {
      kills: kills.map(this.mapKillEvent),
      assists: assists.map(this.mapKillEvent),
      deaths: deaths.map(this.mapKillEvent),
      participation
    };
  }

  /**
   * Get objective control (dragons, barons, heralds)
   */
  getObjectives(): ObjectiveEvent[] {
    const objectives: ObjectiveEvent[] = [];

    this.timeline.info.frames.flatMap(f => f.events).forEach(e => {
      if (e.type === 'ELITE_MONSTER_KILL') {
        objectives.push({
          type: e.monsterType === 'BARON_NASHOR' ? 'BARON' :
                e.monsterType === 'RIFTHERALD' ? 'HERALD' : 'DRAGON',
          subType: e.monsterSubType,
          teamId: e.killerTeamId,
          timestamp: e.timestamp,
          gameTime: this.formatTime(e.timestamp),
          position: e.position
        });
      } else if (e.type === 'BUILDING_KILL') {
        if (e.buildingType === 'TOWER_BUILDING') {
          objectives.push({
            type: 'TOWER',
            subType: e.towerType,
            teamId: e.teamId === 100 ? 200 : 100, // Team that killed it is opposite
            timestamp: e.timestamp,
            gameTime: this.formatTime(e.timestamp),
            position: e.position
          });
        } else if (e.buildingType === 'INHIBITOR_BUILDING') {
          objectives.push({
            type: 'INHIBITOR',
            teamId: e.teamId === 100 ? 200 : 100,
            timestamp: e.timestamp,
            gameTime: this.formatTime(e.timestamp),
            position: e.position
          });
        }
      }
    });

    return objectives.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get position heatmap data
   */
  getPositionHeatmap(gridSize: number = 50): number[][] {
    const heatmap = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));

    this.timeline.info.frames.forEach(frame => {
      const participantFrame = frame.participantFrames[this.participantId];
      if (participantFrame?.position) {
        const x = Math.floor((participantFrame.position.x / 15000) * gridSize);
        const y = Math.floor((participantFrame.position.y / 15000) * gridSize);

        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          heatmap[x][y]++;
        }
      }
    });

    return heatmap;
  }

  /**
   * Get gold efficiency over time
   */
  getGoldEfficiency(): {
    timestamp: number;
    gameTime: string;
    totalGold: number;
    goldPerMinute: number;
    cs: number;
    csPerMinute: number;
  }[] {
    const efficiency: any[] = [];

    this.timeline.info.frames.forEach((frame, i) => {
      const participantFrame = frame.participantFrames[this.participantId];
      if (!participantFrame) return;

      let goldPerMinute = 0;
      let csPerMinute = 0;

      if (i > 0) {
        const prevFrame = this.timeline.info.frames[i - 1].participantFrames[this.participantId];
        const timeElapsed = (frame.timestamp - this.timeline.info.frames[i - 1].timestamp) / 60000;

        goldPerMinute =
          (participantFrame.totalGold - prevFrame.totalGold) / timeElapsed;
        csPerMinute =
          (participantFrame.minionsKilled +
            participantFrame.jungleMinionsKilled -
            (prevFrame.minionsKilled + prevFrame.jungleMinionsKilled)) /
          timeElapsed;
      }

      efficiency.push({
        timestamp: frame.timestamp,
        gameTime: this.formatTime(frame.timestamp),
        totalGold: participantFrame.totalGold,
        goldPerMinute: Math.round(goldPerMinute),
        cs: participantFrame.minionsKilled + participantFrame.jungleMinionsKilled,
        csPerMinute: Math.round(csPerMinute * 10) / 10
      });
    });

    return efficiency;
  }

  /**
   * Get vision score (ward placements and kills)
   */
  getVisionScore(): {
    wardsPlaced: number;
    wardsKilled: number;
    controlWards: number;
    timeline: { timestamp: number; gameTime: string; type: string }[];
  } {
    const visionEvents = this.timeline.info.frames
      .flatMap(f => f.events)
      .filter(
        e =>
          (e.type === 'WARD_PLACED' && e.creatorId === this.participantId) ||
          (e.type === 'WARD_KILL' && e.killerId === this.participantId)
      );

    const wardsPlaced = visionEvents.filter(e => e.type === 'WARD_PLACED').length;
    const wardsKilled = visionEvents.filter(e => e.type === 'WARD_KILL').length;
    const controlWards = visionEvents.filter(
      e => e.type === 'WARD_PLACED' && e.wardType === 'CONTROL_WARD'
    ).length;

    const timeline = visionEvents.map(e => ({
      timestamp: e.timestamp,
      gameTime: this.formatTime(e.timestamp),
      type: e.type === 'WARD_PLACED' ? `Placed ${e.wardType}` : 'Killed ward'
    }));

    return {
      wardsPlaced,
      wardsKilled,
      controlWards,
      timeline
    };
  }

  /**
   * Get damage dealt over time
   */
  getDamageTimeline(): {
    timestamp: number;
    gameTime: string;
    totalDamage: number;
    championDamage: number;
    dps: number;
  }[] {
    return this.timeline.info.frames.map((frame, i) => {
      const participantFrame = frame.participantFrames[this.participantId];
      if (!participantFrame) {
        return {
          timestamp: frame.timestamp,
          gameTime: this.formatTime(frame.timestamp),
          totalDamage: 0,
          championDamage: 0,
          dps: 0
        };
      }

      let dps = 0;
      if (i > 0) {
        const prevFrame = this.timeline.info.frames[i - 1].participantFrames[this.participantId];
        const timeElapsed = (frame.timestamp - this.timeline.info.frames[i - 1].timestamp) / 1000;
        const damageDone =
          participantFrame.damageStats.totalDamageDoneToChampions -
          prevFrame.damageStats.totalDamageDoneToChampions;
        dps = damageDone / timeElapsed;
      }

      return {
        timestamp: frame.timestamp,
        gameTime: this.formatTime(frame.timestamp),
        totalDamage: participantFrame.damageStats.totalDamageDone,
        championDamage: participantFrame.damageStats.totalDamageDoneToChampions,
        dps: Math.round(dps)
      };
    });
  }

  /**
   * Analyze early game (0-15 minutes)
   */
  getEarlyGameAnalysis(): {
    firstBlood: boolean;
    firstTower: boolean;
    level6Time: string | null;
    kills: number;
    deaths: number;
    assists: number;
    cs15: number;
    gold15: number;
    firstItem: ItemPurchase | null;
  } {
    const earlyFrames = this.timeline.info.frames.filter(f => f.timestamp <= 900000); // 15 min

    const firstBloodEvent = this.timeline.info.frames
      .flatMap(f => f.events)
      .find(
        e =>
          e.type === 'CHAMPION_SPECIAL_KILL' &&
          e.killType === 'KILL_FIRST_BLOOD' &&
          e.killerId === this.participantId
      );

    const firstTowerEvent = this.timeline.info.frames
      .flatMap(f => f.events)
      .find(
        e =>
          e.type === 'BUILDING_KILL' &&
          e.buildingType === 'TOWER_BUILDING' &&
          e.killerId === this.participantId
      );

    const level6Event = this.timeline.info.frames
      .flatMap(f => f.events)
      .find(
        e =>
          e.type === 'LEVEL_UP' &&
          e.participantId === this.participantId &&
          e.level === 6
      );

    const earlyKills = this.timeline.info.frames
      .flatMap(f => f.events)
      .filter(
        e =>
          e.type === 'CHAMPION_KILL' &&
          e.killerId === this.participantId &&
          e.timestamp <= 900000
      );

    const earlyDeaths = this.timeline.info.frames
      .flatMap(f => f.events)
      .filter(
        e =>
          e.type === 'CHAMPION_KILL' &&
          e.victimId === this.participantId &&
          e.timestamp <= 900000
      );

    const earlyAssists = this.timeline.info.frames
      .flatMap(f => f.events)
      .filter(
        e =>
          e.type === 'CHAMPION_KILL' &&
          e.assistingParticipantIds?.includes(this.participantId) &&
          e.timestamp <= 900000
      );

    const frame15 = earlyFrames[earlyFrames.length - 1]?.participantFrames[this.participantId];

    const buildOrder = this.getBuildOrder();
    const firstItem = buildOrder.length > 0 ? buildOrder[0] : null;

    return {
      firstBlood: !!firstBloodEvent,
      firstTower: !!firstTowerEvent,
      level6Time: level6Event ? this.formatTime(level6Event.timestamp) : null,
      kills: earlyKills.length,
      deaths: earlyDeaths.length,
      assists: earlyAssists.length,
      cs15: frame15
        ? frame15.minionsKilled + frame15.jungleMinionsKilled
        : 0,
      gold15: frame15 ? frame15.totalGold : 0,
      firstItem
    };
  }

  /**
   * Helper: Map kill event to structured format
   */
  private mapKillEvent = (e: any): KillEvent => ({
    killerId: e.killerId,
    victimId: e.victimId,
    assistingParticipantIds: e.assistingParticipantIds || [],
    timestamp: e.timestamp,
    gameTime: this.formatTime(e.timestamp),
    position: e.position
  });

  /**
   * Helper: Format milliseconds to MM:SS
   */
  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Example Usage
 */
export async function exampleUsage() {
  // Assume timeline is fetched from Riot API
  const timeline: Timeline = await fetchTimeline('KR_6549876543');
  const puuid = 'abc123...';

  const analyzer = new TimelineAnalyzer(timeline, puuid);

  // Get skill order
  const skillOrder = analyzer.getSkillOrder();
  console.log('Skill Order:', skillOrder.map(s => s.skill).join(' → '));

  // Get build order
  const buildOrder = analyzer.getBuildOrder();
  console.log('Build:', buildOrder);

  // Get kill participation
  const kp = analyzer.getKillParticipation();
  console.log(`KDA: ${kp.kills.length}/${kp.deaths.length}/${kp.assists.length}`);
  console.log(`Kill Participation: ${kp.participation.toFixed(1)}%`);

  // Get early game analysis
  const earlyGame = analyzer.getEarlyGameAnalysis();
  console.log('Early Game:', earlyGame);

  // Get position heatmap
  const heatmap = analyzer.getPositionHeatmap(50);
  console.log('Heatmap generated:', heatmap.length, 'x', heatmap[0].length);

  // Get objectives
  const objectives = analyzer.getObjectives();
  console.log('Objectives:', objectives);
}

async function fetchTimeline(matchId: string): Promise<Timeline> {
  // Placeholder - implement with actual API call
  throw new Error('Not implemented');
}
