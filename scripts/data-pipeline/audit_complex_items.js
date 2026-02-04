const fs = require('fs');
const path = require('path');

// 프로젝트 루트(process.cwd()) 기준으로 경로 설정
const itemsPath = path.join(process.cwd(), 'src/data/json/items.json');

console.log(`Reading items from: ${itemsPath}`);

try {
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

  // 제거할 단순 스탯 키워드 패턴 (정규식)
  const STAT_PATTERNS = [
    /공격력\s+\d+/g,
    /주문력\s+\d+/g,
    /체력\s+\d+/g,
    /마나\s+\d+/g,
    /방어력\s+\d+/g,
    /마법 저항력\s+\d+/g,
    /공격 속도\s+\d+%?/g,
    /스킬 가속\s+\d+/g,
    /이동 속도\s+\d+%?/g, 
    /치명타 확률\s+\d+%?/g,
    /생명력 흡수\s+\d+%?/g,
    /모든 피해 흡혈\s+\d+%?/g,
    /방어구 관통력\s+\d+%?/g,
    /마법 관통력\s+\d+%?/g,
    /기본 체력 재생\s+\d+%?/g,
    /기본 마나 재생\s+\d+%?/g,
    /체력 회복 및 보호막\s+\d+%?/g,
    /강인함\s+\d+%?/g,
    /물리 관통력\s+\d+/g,
    /10초당 골드\s+\d+/g,
    /적응형 능력치\s+\d+/g, // 적응형 능력치 추가
    /\s+/g, // 공백 제거
    /\n/g,   // 줄바꿈 제거
    /\./g,   // 점 제거
    /%/g     // 퍼센트 기호 제거
  ];

  const complexItems = [];

  Object.values(items).forEach(item => {
    let desc = item.description;
    if (!desc) return;

    // 스탯 텍스트 제거
    STAT_PATTERNS.forEach(pattern => {
      desc = desc.replace(pattern, '');
    });

    // 남은 텍스트가 있으면 특수 아이템
    if (desc.length > 0) {
      complexItems.push({
        id: item.id,
        name: item.name,
        residual: desc
      });
    }
  });

  console.log(`총 아이템 수: ${Object.keys(items).length}`);
  console.log(`특수 로직 의심 아이템 수: ${complexItems.length}`);
  console.log('--- 목록 ---');
  complexItems.forEach(i => console.log(`[${i.id}] ${i.name} : ${i.residual.substring(0, 30)}...`));

} catch (e) {
  console.error("Error reading file:", e);
}