/**
 * 빌드 경로 생성기
 * 
 * 완성 아이템 목록을 받아서, 주어진 골드에 맞춰
 * '지금 살 수 있는 최선의 하위 아이템 조합'을 반환합니다.
 */

import itemsData from '../../../../data/json/items.json';

const ITEM_DB: Record<number, any> = {};
Object.values(itemsData).forEach((item: any) => ITEM_DB[item.id] = item);

export class BuildPathGenerator {
  
  // 목표 아이템들을 순서대로 맞추기 위한 현재 인벤토리 상태 반환
  static getInventoryAtGold(targetBuild: number[], currentGold: number): number[] {
    const inventory: number[] = [];
    let remainingGold = currentGold;

    for (const targetId of targetBuild) {
      if (remainingGold <= 0) break;

      const targetItem = ITEM_DB[targetId];
      if (!targetItem) continue;

      // 1. 완성템을 살 돈이 되면 바로 구매
      if (remainingGold >= targetItem.price) {
        inventory.push(targetId);
        remainingGold -= targetItem.price;
      } else {
        // 2. 돈이 부족하면 하위템 구매 시도
        const components = this.getBestComponents(targetId, remainingGold);
        inventory.push(...components.items);
        remainingGold -= components.cost;
        break; // 다음 코어템은 아직 못 감
      }
    }

    return inventory;
  }

  // 주어진 골드로 살 수 있는 하위템 조합 찾기 (Greedy)
  private static getBestComponents(itemId: number, gold: number): { items: number[], cost: number } {
    const item = ITEM_DB[itemId];
    if (!item || !item.from || item.from.length === 0) return { items: [], cost: 0 };

    const result: number[] = [];
    let spent = 0;

    // 하위템 순회 (비싼 순서대로 정렬되어 있다고 가정하거나 정렬 필요)
    // 보통 from 배열은 구성요소 나열임.
    for (const subId of item.from) {
      const subItem = ITEM_DB[subId];
      if (gold - spent >= subItem.price) {
        // 하위템 구매
        result.push(subId);
        spent += subItem.price;
      } else {
        // 하위템의 하위템(재귀) 구매 시도
        const subComponents = this.getBestComponents(subId, gold - spent);
        result.push(...subComponents.items);
        spent += subComponents.cost;
      }
    }

    return { items: result, cost: spent };
  }
}
