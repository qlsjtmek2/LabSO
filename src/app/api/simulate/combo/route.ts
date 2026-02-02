import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { GenericChampionModel } from '@/engine/simulator/models/GenericChampion';
import { ItemScript, CombatStats } from '@/engine/simulator/core/types';
import { ItemFactory } from '@/engine/simulator/items/itemFactory';

// 아이템 데이터 로드 (DataDragon JSON)
async function getItemData(itemIds: number[]): Promise<ItemScript[]> {
  try {
    const itemsPath = path.join(process.cwd(), 'src/data/json/items.json');
    // 파일이 없으면 빈 배열 반환 (에러 방지)
    try {
        await fs.access(itemsPath);
    } catch {
        // console.warn('Items JSON not found');
        return [];
    }
    
    const fileContent = await fs.readFile(itemsPath, 'utf-8');
    const itemsJson = JSON.parse(fileContent);

    return itemIds.map(id => {
      const itemData = itemsJson[String(id)] || itemsJson[id];
      if (!itemData) return { name: 'Unknown', stats: {} };

      // ID 주입 후 Factory 사용
      return ItemFactory.createItem({ ...itemData, id });
    });
  } catch (error) {
    console.error('Error loading item data:', error);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { championId, level, items, skillLevels, combo } = body; // items: number[]

    // 1. 챔피언 데이터 로드
    // 대소문자 무시하고 파일 찾기 위해 디렉토리 스캔
    const samplesDir = path.join(process.cwd(), 'src/engine/simulator/data/samples');
    const files = await fs.readdir(samplesDir);
    const targetFile = files.find(f => f.toLowerCase() === `${championId.toLowerCase()}.json`);

    if (!targetFile) {
      return NextResponse.json({ error: `Champion data not found for ${championId}` }, { status: 404 });
    }

    const championJson = JSON.parse(await fs.readFile(path.join(samplesDir, targetFile), 'utf-8'));

    // 2. 아이템 데이터 로드 및 변환
    const itemScripts = await getItemData(items.filter((id: any) => id !== null));

    // 3. 모델 초기화
    const championModel = new GenericChampionModel(championJson, itemScripts, level);

    // 4. 타겟 더미 설정 (기본값)
    const targetDummy: CombatStats = {
      level: 1, // 더미 레벨
      range: 0, // 더미 사거리
      hp: 2000,
      maxHp: 2000,
      armor: 100,
      mr: 100,
      ad: 0, ap: 0, mana: 0, attackSpeed: 0, 
      abilityHaste: 0, critChance: 0, critDamage: 0, 
      lethality: 0, armorPen: 0, magicPenFlat: 0, magicPenPercent: 0,
      omnivamp: 0, lifesteal: 0, movementSpeed: 0
    };

    // 5. 콤보 시뮬레이션
    // skillLevels 배열 [Q, W, E, R] -> 객체 { Q: lv, ... }
    const skillLevelMap = {
      Q: skillLevels[0],
      W: skillLevels[1],
      E: skillLevels[2],
      R: skillLevels[3]
    };

    // combo 배열 (숫자 인덱스 or -1) -> 문자열 변환
    // 클라이언트에서 [0, -1, 2] 등으로 보내면 ['Q', 'AA', 'E']로 변환
    const spellKeys = ['Q', 'W', 'E', 'R'];
    const comboString = combo.map((c: number) => c === -1 ? 'AA' : spellKeys[c]);

    const events = championModel.simulateCombo(comboString, targetDummy, skillLevelMap);

    // 6. 결과 집계
    const totalDamage = events.reduce((sum, e) => sum + e.mitigatedDamage, 0);

    return NextResponse.json({
      totalDamage: Math.round(totalDamage),
      events,
      championStats: (championModel as any).stats // 디버깅용
    });

  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
