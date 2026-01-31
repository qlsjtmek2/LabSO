/**
 * 경제 및 상점 시스템
 * 
 * 골드 수급, 아이템 구매, 하위템 트리 탐색을 담당합니다.
 */

import itemsData from '../../../../data/json/items.json';

// 아이템 데이터 타입 정의 (JSON 구조에 맞게)
interface ItemData {
  id: number;
  name: string;
  price: number;
  from?: number[]; // 하위템 ID 목록
  stats: any;
}

const ITEM_DB: Record<number, ItemData> = {};
Object.values(itemsData).forEach((item: any) => {
  ITEM_DB[item.id] = {
    id: item.id,
    name: item.name,
    price: item.price,
    from: item.from, // DataDragon에는 'from' 필드가 있음 (fetch_items.js에서 파싱 필요할 수도)
    stats: item.stats
  };
});

export class EconomyEngine {
  currentGold: number;
  inventory: number[]; // 보유 아이템 ID 목록

  constructor(startGold: number = 500) {
    this.currentGold = startGold;
    this.inventory = [];
  }

  // 골드 획득
  addGold(amount: number) {
    this.currentGold += amount;
  }

  // 아이템 구매 시도 (상위템 목표)
  buyItemTowards(targetItemId: number): boolean {
    // 1. 이미 가지고 있으면 종료
    if (this.inventory.includes(targetItemId)) return true;

    // 2. 바로 살 수 있으면 구매 (조합비만 내면 됨)
    const cost = this.calculateCost(targetItemId);
    if (this.currentGold >= cost) {
      this.purchase(targetItemId);
      return true;
    }

    // 3. 못 사면 하위템 탐색 (재귀)
    const targetItem = ITEM_DB[targetItemId];
    if (!targetItem || !targetItem.from) return false;

    for (const subId of targetItem.from) {
      // 하위템 중 없는 것부터 구매 시도
      // (단순화를 위해 순서대로 시도하지만, 실제론 비싼거 먼저 or 스탯 좋은거 먼저 로직 필요)
      if (!this.hasItemOrComponent(subId)) {
        this.buyItemTowards(subId);
      }
    }
    
    return false;
  }

  // 실제 구매 로직
  private purchase(itemId: number) {
    const cost = this.calculateCost(itemId);
    this.currentGold -= cost;
    
    // 하위템 제거 (조합)
    const itemData = ITEM_DB[itemId];
    if (itemData.from) {
      itemData.from.forEach(subId => {
        const idx = this.inventory.indexOf(subId);
        if (idx > -1) {
          this.inventory.splice(idx, 1);
        }
      });
    }
    
    this.inventory.push(itemId);
  }

  // 아이템 가격 계산 (보유 하위템 차감)
  private calculateCost(itemId: number): number {
    const item = ITEM_DB[itemId];
    if (!item) return 99999;

    let cost = item.price;
    
    // 보유 중인 하위템 가치 차감
    // (DataDragon price는 총 가격임)
    // 정확한 로직: 내 인벤토리에 있는 템 중, 이 아이템의 재료로 쓸 수 있는 것들을 찾아 가격을 뺌
    // 이것은 '조합 트리' 탐색이 필요함.
    
    // 간이 로직: 인벤토리에 item.from에 해당하는 템이 있으면 그 가격만큼 뺌
    if (item.from) {
      item.from.forEach(subId => {
        if (this.inventory.includes(subId)) {
          const subItem = ITEM_DB[subId];
          if (subItem) cost -= subItem.price;
        }
      });
    }
    
    return Math.max(0, cost);
  }

  // 해당 아이템이나 그 상위템을 가지고 있는지 확인 (중복 구매 방지용)
  private hasItemOrComponent(itemId: number): boolean {
    if (this.inventory.includes(itemId)) return true;
    // TODO: 상위템을 가지고 있어도 true여야 함 (이미 조합해버렸으면)
    return false;
  }
}
