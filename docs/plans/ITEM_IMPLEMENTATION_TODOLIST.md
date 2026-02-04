# 아이템 상세 구현 계획 (Item Implementation Todo List)

> **목표**: 소환사의 협곡(Summoner's Rift) 기준, 1v1 전투 시뮬레이션에 유의미한 효과를 가진 아이템을 선별하여 구현합니다.
> **상태**: 아레나/이벤트 모드 아이템 제외, **액티브 아이템 추가**.

## 🔴 Active Items (사용 효과)

> 시뮬레이터에서 `useItem(id)` 호출 시 발동할 로직입니다.

- [ ] **거대한 히드라 (3748)**
    - 로직: (평캔) 다음 공격이 최대 체력의 4%(근접)/2%(원거리) 추가 물리 피해. 충격파 범위 증가.
    - 구현: `onActivate` -> `nextAttackEmpowered` 플래그 설정.
- [ ] **굶주린 히드라 (3074)**
    - 로직: (평캔) 주변 적에게 공격력 100% 물리 피해. 생명력 흡수 적용.
    - 구현: `onActivate` -> 즉시 데미지 및 흡혈 처리.
- [ ] **불경한 히드라 (6698)**
    - 로직: (평캔) 주변 적에게 공격력 100% 물리 피해. 체력 50% 이하 적에게 130% 피해.
    - 구현: `onActivate` -> 조건부 데미지 처리.
- [ ] **발걸음 분쇄기 (6631)**
    - 로직: 주변 적에게 공격력 80% 물리 피해 + 35% 둔화. 적중 시 이속 증가.
    - 구현: `onActivate` -> 데미지 및 버프/디버프 처리.
- [ ] **마법공학 로켓 벨트 (3152)**
    - 로직: 돌진 + 마법 피해.
    - 구현: `onActivate` -> 데미지 처리. (돌진은 거리 좁히기 로직에 반영 가능)
- [ ] **요우무의 유령검 (3142)**
    - 로직: 6초간 이속 20% 증가 + 유체화.
    - 구현: `onActivate` -> 이속 버프.
- [ ] **존야의 모래시계 (3157)**
    - 로직: 2.5초 경직 (무적 + 공격 불가).
    - 구현: `onActivate` -> `stasis` 상태 적용 (시뮬레이터 틱 스킵).
- [ ] **강철의 솔라리 펜던트 (3190)**
    - 로직: 2.5초간 보호막.
    - 구현: `onActivate` -> 보호막 적용.
- [ ] **몰락한 왕의 검 (3153) - (구버전 액티브 아님, 패시브만 존재)**
    - *참고: 현재 시즌 몰왕은 액티브가 없고 3타 패시브 둔화만 있음.*

## ⚔️ On-Hit & Attack Effects (적중 및 공격 시 효과)

- [ ] **몰락한 왕의 검 (3153)**
    - 로직: 대상 `currentHp`의 12%(근접)/9%(원거리) 물리 피해. (최소 15) + 3타 둔화.
    - 구현: `onHit` (데미지), `onAttack` (3타 카운트 -> `slow` 효과).
- [ ] **마법사의 최후 (3091)**
    - 로직: 레벨(1/9/11~18)에 따라 15/25/35~80 마법 피해 + 강인함.
    - 구현: `onHit` (레벨 비례 데미지).
- [ ] **내셔의 이빨 (3115)**
    - 로직: 15 + 20% AP 마법 피해.
    - 구현: `onHit` (AP 계수).
- [ ] **구인수의 격노검 (3124)**
    - 로직: 치명타 확률 -> 온힛 데미지 변환. 3타마다 온힛 2번 적용.
    - 구현: `passive` (스탯 변환), `onAttack` (스택 -> `phantomHit` 플래그 -> `onHit` 반복 호출).
- [ ] **크라켄 학살자 (6672)**
    - 로직: 3타마다 추가 물리 피해 (잃은 체력 비례 증가).
    - 구현: `onAttack` 카운터 -> 3타 시 `onHit`에서 추가 데미지.
- [ ] **경계 (3302)**
    - 로직: 공격 시 방/마저 관통 스택 (빛/어둠) 교차 적용.
    - 구현: `onAttack`에서 `armorPen/magicPen` 버프 스택 관리.
- [ ] **거대한 히드라 (3748) - 패시브**
    - 로직: 평타 시 충격파 (체력 비례 물리 피해).
    - 구현: `onHit` (체력 계수 추가 피해).
- [ ] **굶주린 히드라 (3074) - 패시브**
    - 로직: 생명력 흡수 적용되는 광역 피해.
    - 구현: `onHit` (광역 피해 계산, 흡혈 적용).
- [ ] **나보리 명멸검 (6675)**
    - 로직: 평타 시 기본 스킬 남은 쿨타임 15% 감소.
    - 구현: `onAttack` -> `reduceCooldowns(0.15)`.

## 🗡️ Spellblade (주문 검 계열)

- [ ] **광휘의 검 (3057)**
    - 로직: 스킬 사용 후 다음 평타에 100% 기본 AD 물리 피해.
    - 구현: `onSpellCast` (준비), `onHit` (소모 및 데미지).
- [ ] **삼위일체 (3078)**
    - 로직: 주문 검 200% 기본 AD + 삼중 공격(이속/공격력 스택).
    - 구현: 주문 검 로직 + `onAttack` 버프.
- [ ] **리치베인 (3100)**
    - 로직: 주문 검 (75% 기본 AD + 50% AP) 마법 피해.
    - 구현: 주문 검 데미지 공식 변경.
- [ ] **얼어붙은 건틀릿 (6662)**
    - 로직: 주문 검 (100% 기본 AD) + 역장(둔화/뎀감).
    - 구현: 주문 검 + `onHit` 시 적 `damageReduction` 디버프.
- [ ] **피의 노래 (3877)**
    - 로직: 주문 검 (150% 기본 AD) + 받는 피해 12% 증가 디버프.
    - 구현: 주문 검 + `onHit` 시 적 `damageAmp` 디버프.

## 🧙‍♂️ Mage & Ability Power (주문력 및 스킬)

- [ ] **라바돈의 죽음모자 (3089)**
    - 로직: 총 주문력 35% 증가.
    - 구현: `finalizeStats`에서 `ap *= 1.35`.
- [ ] **공허의 지팡이 (3135) / 무덤꽃 (3137)**
    - 로직: 마법 관통력 %.
    - 구현: `stats.magicPenPercent` 자동 파싱 확인.
- [ ] **대천사의 포옹 (3003) / 세라프**
    - 로직: 추가 마나의 2%만큼 AP 증가 + 생명선.
    - 구현: `passive` (마나 비례 AP), `onDamageTaken` (생명선 실드).
- [ ] **무라마나 (3004)**
    - 로직: 마나의 2.5%만큼 AD 증가 + 스킬/평타 추가 피해.
    - 구현: `passive` (마나 비례 AD), `onHit`/`onSpellHit` (추가 피해).
- [ ] **루덴의 동반자 (6655)**
    - 로직: 시간 비례 충전(최대 6). 스킬 적중 시 소모하여 추가 피해.
    - 구현: 시간 경과 `update` -> 스택 충전, `onSpellHit` -> 소모.
- [ ] **폭풍 쇄도 (4646)**
    - 로직: 단시간 내 최대 체력 35% 피해 입히면 발동.
    - 구현: `recentDamage` 기록 -> 조건 충족 시 `triggerEffect`.
- [ ] **리안드리의 고통 (6653) / 악의 (3118)**
    - 로직: 스킬/궁극기 피해 시 체력 비례 DoT.
    - 구현: `onSpellHit` -> `applyDoT`. 악의는 `isUltimate` 체크.
- [ ] **지평선의 초점 (4628)**
    - 로직: 600 사거리 이상 스킬 적중 시 10% 추가 피해.
    - 구현: `onSpellHit`에서 사거리 체크 -> `damageAmp` 적용.
- [ ] **라일라이의 수정홀 (3116)**
    - 로직: 스킬 적중 시 둔화.
    - 구현: `onSpellHit` -> `applySlow`.

## 🛡️ Tank & Defense (방어 및 탱킹)

- [ ] **태양불꽃 방패 (3068) / 공허한 광휘 (6664)**
    - 로직: 주변 적에게 매초 마법 피해 (체력 비례).
    - 구현: `onTick` (매초 데미지).
- [ ] **가시 갑옷 (3075)**
    - 로직: 피격 시 반사 데미지 + 치감.
    - 구현: `onBeingHit` (BasicAttack) -> 반사 데미지 + `applyGrievousWounds`.
- [ ] **강철심장 (3084)**
    - 로직: 30초마다 강타. 체력 비례 피해 + 최대 체력 영구 증가.
    - 구현: `onAttack` (쿨타임 체크) -> 추가 피해 + `maxHp` 증가.
- [ ] **워모그의 갑옷 (3083)**
    - 로직: 추가 체력 1300+ 시 비전투 체력 회복.
    - 구현: `passive`에서 조건 체크 -> `hpRegen` 증가.
- [ ] **해신 작쇼 (6665)**
    - 로직: 전투 지속 시 방마저 증가 (최대 30%).
    - 구현: 전투 시간 비례 `armor/mr` 버프.
- [ ] **대자연의 힘 (4401)**
    - 로직: 마법 피해 받으면 이속/마저 증가.
    - 구현: `onBeingHit` (Magic) -> 스택 버프.
- [ ] **얼어붙은 심장 (3110)**
    - 로직: 주변 공속 감소 (오라).
    - 구현: `passive` (적 공속 감소).
- [ ] **끝없는 절망 (2502)**
    - 로직: 7초마다 주변 광역 흡혈.
    - 구현: `onTick` (주기적 발동).

## ⚡ Lethality & Assassin (물리 관통 및 암살)

- [ ] **징수의 총 (6676)**
    - 로직: 체력 5% 이하 처형.
    - 구현: `onDamageDealt` -> 남은 체력 체크 -> `kill`.
- [ ] **원칙의 원형낫 (6696)**
    - 로직: 킬 관여 시 궁극기 쿨감.
    - 구현: `onKill` -> `reduceUltCooldown`.
- [ ] **밤의 끝자락 (3814)**
    - 로직: 스킬 방어막.
    - 구현: `onBeingHit` (Skill) -> 데미지 무효화 (쿨타임 적용).
- [ ] **기회 (6701)**
    - 로직: 비전투 시 물관 증가 / 처치 시 이속.
    - 구현: 전투 시작 전 스탯 부여 / `onKill` 이속 버프.
- [ ] **월식 (6692)**
    - 로직: 2회 타격 시 최대 체력 비례 피해 + 보호막.
    - 구현: `onHit`/`onSpellHit` -> 타격 카운트 -> 발동.
- [ ] **요우무의 유령검 (3142)**
    - 로직: 이동 시 스택 -> 비전투 이속. (액티브는 상단 참조)
    - 구현: `passive` (이속 증가).

## 👞 Boots (신발)

- [ ] **판금 장화 (3047)**
    - 로직: 평타 피해 12% 감소.
    - 구현: `onBeingHit` (BasicAttack) -> `multiplier: 0.88`.
- [ ] **헤르메스의 발걸음 (3111)**
    - 로직: 강인함 30%.
    - 구현: `stats.tenacity` (스탯으로 처리).
- [ ] **신속의 장화 (3009)**
    - 로직: 둔화 저항 25%.
    - 구현: `stats.slowResist` (새로운 스탯 필드 필요).

## 🥊 Fighter & Bruiser (전사)

- [ ] **칠흑의 양날 도끼 (3071)**
    - 로직: 물리 피해 시 방깎 스택.
    - 구현: `onPhysicalDamage` -> 적 `armor` 감소 디버프.
- [ ] **쇼진의 창 (3161)**
    - 로직: 스킬 적중 시 스킬 피해량 증가 (스택).
    - 구현: `onSpellHit` -> `skillDamageAmp` 스택.
- [ ] **죽음의 무도 (6333)**
    - 로직: 받는 피해의 30%를 3초간 나누어 입음 (고통 무시). 처치 시 정화/회복.
    - 구현: `onBeingHit` (데미지 유예) -> `onTick` (유예된 데미지 적용). (구현 난이도 상)
- [ ] **스테락의 도전 (3053)**
    - 로직: 생명선 (체력 30% 이하 시 보호막 + 강인함).
    - 구현: `onDamageTaken` -> 조건 체크 -> `gainShield`.
- [ ] **갈라진 하늘 (6610)**
    - 로직: 챔피언 대상 첫 타 치명타 & 힐. (대상별 쿨타임)
    - 구현: `onAttack` (대상별 플래그 체크) -> 확정 치명타/힐.

---

## 🛠️ Required Engine Extensions

1.  **Hooks**: `onAttack`, `onHit`, `onSpellHit`, `onBeingHit`, `onDamageDealt`, `onKill`, `onTick`, `onActivate` (NEW).
2.  **State**: `ItemState` (쿨타임, 스택, 고유 대상 추적).
3.  **Stats**: `tenacity`, `slowResist` 추가.
4.  **Logic**: `DoT` (지속 피해) 시스템, `Shield` (보호막) 시스템.

## 📦 Missing Items to Implement (Auto-generated)

> All items > 900g on Summoner's Rift not yet listed above.

### CriticalStrike
- [ ] **무한의 대검 (3031)** - Cost: 3500
    - Tags: CriticalStrike, Damage
    - Desc: 치명타 확률이 대폭 증가합니다.
- [ ] **악마사냥꾼의 화살 (2512)** - Cost: 2650
    - Tags: CriticalStrike, AttackSpeed, NonbootsMovement, AbilityHaste
    - Desc: No description
- [ ] **유령 무희 (3046)** - Cost: 2650
    - Tags: CriticalStrike, AttackSpeed, NonbootsMovement
    - Desc: 적을 공격할 때 더 빠르게 움직이며 체력이 낮으면 보호막이 생성됩니다.
- [ ] **루난의 허리케인 (3085)** - Cost: 2650
    - Tags: CriticalStrike, AttackSpeed, OnHit, NonbootsMovement
    - Desc: 원거리 공격 시 주변의 적들에게 두 발의 탄환을 발사합니다.
- [ ] **고속 연사포 (3094)** - Cost: 2650
    - Tags: CriticalStrike, AttackSpeed, NonbootsMovement
    - Desc: 이동하며 완전히 충전하면 강력한 일격을 발사합니다.
- [ ] **열정의 검 (3086)** - Cost: 1200
    - Tags: CriticalStrike, AttackSpeed, NonbootsMovement
    - Desc: 치명타 확률, 이동 속도와 공격 속도가 약간 상승합니다.

### Damage
- [ ] **피바라기 (3072)** - Cost: 3400
    - Tags: Damage, LifeSteal
    - Desc: 공격력 및 생명력 흡수가 증가하며, 생명력 흡수가 최대 체력 이상으로 가능해집니다.
- [ ] **도미닉 경의 인사 (3036)** - Cost: 3300
    - Tags: Damage, CriticalStrike, ArmorPenetration
    - Desc: 체력과 방어력이 뛰어난 적에게 효과적입니다.
- [ ] **요새파괴자 (2520)** - Cost: 3200
    - Tags: Damage, ArmorPenetration, AbilityHaste
    - Desc: No description
- [ ] **폭풍갈퀴 (3097)** - Cost: 3200
    - Tags: Damage, CriticalStrike, AttackSpeed, NonbootsMovement
    - Desc: 주기적으로 적 미니언을 처치하여 근처 아군을 치유하고 골드를 부여합니다.
- [ ] **끝없는 갈망 (2517)** - Cost: 3100
    - Tags: Damage, LifeSteal, SpellVamp, Tenacity, AbilityHaste
    - Desc: No description
- [ ] **윤 탈 야생화살 (3032)** - Cost: 3100
    - Tags: Damage, CriticalStrike, AttackSpeed
    - Desc: No description
- [ ] **정수 약탈자 (3508)** - Cost: 3050
    - Tags: Damage, CriticalStrike, ManaRegen, CooldownReduction, OnHit, AbilityHaste
    - Desc: No description
- [ ] **필멸자의 운명 (3033)** - Cost: 3000
    - Tags: Damage, CriticalStrike, ArmorPenetration
    - Desc: 체력 회복력과 방어력이 뛰어난 적에게 효과적입니다.
- [ ] **마법공학 총검 (3146)** - Cost: 3000
    - Tags: Damage, LifeSteal, SpellDamage, Active, SpellVamp
    - Desc: 공격력과 주문력이 증가합니다. 사용하면 대상이 둔화에 걸립니다.
- [ ] **불멸의 철갑궁 (6673)** - Cost: 3000
    - Tags: Damage, CriticalStrike
    - Desc: No description
- [ ] **세릴다의 원한 (6694)** - Cost: 3000
    - Tags: Damage, CooldownReduction, ArmorPenetration, AbilityHaste
    - Desc: No description
- [ ] **오만 (6697)** - Cost: 3000
    - Tags: Damage, Active, CooldownReduction, ArmorPenetration, AbilityHaste
    - Desc: No description
- [ ] **벼락폭풍검 (6699)** - Cost: 3000
    - Tags: Damage, Active, CooldownReduction, ArmorPenetration, AbilityHaste
    - Desc: No description
- [ ] **마나무네 (3004)** - Cost: 2900
    - Tags: Damage, Mana, CooldownReduction, OnHit, AbilityHaste
    - Desc: 최대 마나량에 따라 공격력이 상승합니다.
- [ ] **마나무네 (323004)** - Cost: 2900
    - Tags: Damage, Mana, CooldownReduction, OnHit, AbilityHaste
    - Desc: No description
- [ ] **마법광학 장치 C44 (2523)** - Cost: 2800
    - Tags: Damage, CriticalStrike
    - Desc: No description
- [ ] **그림자 검 (3179)** - Cost: 2800
    - Tags: Damage, Vision, CooldownReduction, ArmorPenetration, AbilityHaste
    - Desc: 주기적으로 덫 및 와드를 감지할 수 있습니다.
- [ ] **스태틱의 단검 (3087)** - Cost: 2700
    - Tags: Damage, AttackSpeed, OnHit, NonbootsMovement
    - Desc: 이동 시 점차 충전되어, 기본 공격 시 연쇄 번개를 발사합니다.
- [ ] **독사의 송곳니 (6695)** - Cost: 2500
    - Tags: Damage, ArmorPenetration
    - Desc: No description
- [ ] **신성의 검 (663060)** - Cost: 2500
    - Tags: Damage, CriticalStrike, SpellDamage
    - Desc: No description
- [ ] **마법공학 총검 (663146)** - Cost: 2500
    - Tags: Damage, LifeSteal, SpellDamage, Active, SpellVamp
    - Desc: No description
- [ ] **도박꾼의 칼날 (667101)** - Cost: 2500
    - Tags: Damage, NonbootsMovement, MagicPenetration, ArmorPenetration, AbilityHaste
    - Desc: No description
- [ ] **살점포식자 (667112)** - Cost: 2500
    - Tags: Damage, SpellDamage, MagicPenetration, ArmorPenetration
    - Desc: No description
- [ ] **야수화 (2020)** - Cost: 1337
    - Tags: Damage, CooldownReduction, ArmorPenetration
    - Desc: No description
- [ ] **B.F. 대검 (1038)** - Cost: 1300
    - Tags: Damage
    - Desc: 공격력이 대폭 증가합니다.
- [ ] **주문포식자 (3155)** - Cost: 1300
    - Tags: Damage, SpellBlock
    - Desc: 공격력과 마법 저항력이 증가합니다.
- [ ] **절정의 화살 (6670)** - Cost: 1300
    - Tags: Damage, CriticalStrike
    - Desc: No description
- [ ] **온기가 필요한 자의 도끼 (3051)** - Cost: 1200
    - Tags: Damage, AttackSpeed
    - Desc: No description
- [ ] **티아맷 (3077)** - Cost: 1200
    - Tags: Damage, OnHit
    - Desc: 주변 적에게 근접 피해를 입힙니다.
- [ ] **콜필드의 전투 망치 (3133)** - Cost: 1050
    - Tags: Damage, CooldownReduction, AbilityHaste
    - Desc: 공격력과 재사용 대기시간 감소율이 증가합니다.
- [ ] **톱날 단검 (3134)** - Cost: 1000
    - Tags: Damage, ArmorPenetration
    - Desc: 공격력과 물리 관통력이 증가합니다.

### Health
- [ ] **지배자의 피갑옷 (2501)** - Cost: 3300
    - Tags: Health, Damage
    - Desc: No description
- [ ] **황혼과 새벽 (2510)** - Cost: 3100
    - Tags: Health, AttackSpeed, SpellDamage, OnHit, AbilityHaste
    - Desc: No description
- [ ] **균열 생성기 (4633)** - Cost: 3100
    - Tags: Health, SpellDamage, CooldownReduction, SpellVamp
    - Desc: No description
- [ ] **화공 펑크 사슬검 (6609)** - Cost: 3100
    - Tags: Health, Damage, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **실험적 마공학판 (3073)** - Cost: 3000
    - Tags: Health, Damage, AttackSpeed, CooldownReduction, NonbootsMovement, AbilityHaste
    - Desc: 마나를 소모하면 최대 마나량이 증가합니다.
- [ ] **선체파괴자 (3181)** - Cost: 3000
    - Tags: Health, Damage, NonbootsMovement
    - Desc: No description
- [ ] **우주의 추진력 (4629)** - Cost: 3000
    - Tags: Health, SpellDamage, NonbootsMovement, AbilityHaste
    - Desc: 재사용 대기시간이 대폭 감소합니다.
- [ ] **케이닉 루컨 (2504)** - Cost: 2900
    - Tags: Health, SpellBlock, HealthRegen
    - Desc: No description
- [ ] **망자의 갑옷 (3742)** - Cost: 2900
    - Tags: Health, Armor, Slow, NonbootsMovement
    - Desc: 이동 시 추진력이 올라 적들을 강하게 타격합니다.
- [ ] **핏빛 저주 (8010)** - Cost: 2900
    - Tags: Health, SpellDamage, CooldownReduction, MagicPenetration
    - Desc: No description
- [ ] **기사의 맹세 (323109)** - Cost: 2900
    - Tags: Health, HealthRegen, Armor, Aura, Active, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **월석 재생기 (326617)** - Cost: 2900
    - Tags: Health, SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **모렐로노미콘 (3165)** - Cost: 2850
    - Tags: Health, SpellDamage, CooldownReduction, AbilityHaste
    - Desc: 마법 피해량이 증가합니다.
- [ ] **심연의 가면 (328020)** - Cost: 2850
    - Tags: Health, SpellBlock, CooldownReduction, MagicResist, AbilityHaste
    - Desc: No description
- [ ] **공허한 광휘 (6664)** - Cost: 2800
    - Tags: Health, SpellBlock, HealthRegen, Aura, MagicResist, AbilityHaste
    - Desc: 적을 이동 불가 상태로 만들면 보호막을 얻습니다. 사용 시 적에게 접근할 때 이동 속도가 상승합니다.
- [ ] **미카엘의 축복 (323222)** - Cost: 2800
    - Tags: Health, ManaRegen, Active, CooldownReduction, Tenacity, AbilityHaste
    - Desc: No description
- [ ] **정령의 형상 (3065)** - Cost: 2700
    - Tags: Health, SpellBlock, HealthRegen, CooldownReduction, AbilityHaste
    - Desc: 체력이 오르며 치유 효과가 커집니다.
- [ ] **란두인의 예언 (3143)** - Cost: 2700
    - Tags: Health, Armor, Active, Slow
    - Desc: 방어력이 대폭 강화됩니다. 사용하면 주변 적들이 둔화에 걸립니다.
- [ ] **심연의 가면 (8020)** - Cost: 2650
    - Tags: Health, SpellBlock, CooldownReduction, MagicResist, AbilityHaste
    - Desc: No description
- [ ] **영겁의 지팡이 (6657)** - Cost: 2600
    - Tags: Health, HealthRegen, SpellDamage, Mana, ManaRegen
    - Desc: No description
- [ ] **개척자 (323002)** - Cost: 2600
    - Tags: Health, Armor, NonbootsMovement
    - Desc: No description
- [ ] **헬리아의 메아리 (326620)** - Cost: 2600
    - Tags: Health, SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **영겁의 지팡이 (326657)** - Cost: 2600
    - Tags: Health, HealthRegen, SpellDamage, Mana, ManaRegen
    - Desc: No description
- [ ] **원형질 안전벨트 (2525)** - Cost: 2500
    - Tags: Health, NonbootsMovement, Tenacity, AbilityHaste
    - Desc: No description
- [ ] **아트마의 심판 (663039)** - Cost: 2500
    - Tags: Health, CriticalStrike, Lane
    - Desc: No description
- [ ] **불사대마왕의 왕관 (663056)** - Cost: 2500
    - Tags: Health, Armor, Damage, AttackSpeed, SpellDamage, MagicResist, AbilityHaste
    - Desc: No description
- [ ] **용암의 방패 (663058)** - Cost: 2500
    - Tags: Health, Armor
    - Desc: No description
- [ ] **별빛밤 망토 (663059)** - Cost: 2500
    - Tags: Health, SpellBlock
    - Desc: No description
- [ ] **꽃피는 새벽의 검 (664011)** - Cost: 2500
    - Tags: Health, SpellDamage, CooldownReduction, OnHit, AbilityHaste
    - Desc: No description
- [ ] **부서진 여왕의 왕관 (664644)** - Cost: 2500
    - Tags: Health, SpellDamage, Mana, AbilityHaste
    - Desc: No description
- [ ] **개척자 (3002)** - Cost: 2400
    - Tags: Health, Armor, NonbootsMovement
    - Desc: No description
- [ ] **혹한의 손길 (3119)** - Cost: 2400
    - Tags: Health, Mana, AbilityHaste
    - Desc: No description
- [ ] **혹한의 손길 (323119)** - Cost: 2400
    - Tags: Health, Mana, AbilityHaste
    - Desc: No description
- [ ] **밴들파이프 (2524)** - Cost: 2300
    - Tags: Health, SpellBlock, Armor, AttackSpeed, NonbootsMovement, AbilityHaste
    - Desc: No description
- [ ] **기사의 맹세 (3109)** - Cost: 2300
    - Tags: Health, HealthRegen, Armor, Aura, Active, CooldownReduction, AbilityHaste
    - Desc: 동료를 지정해 서로를 보호합니다.
- [ ] **미카엘의 축복 (3222)** - Cost: 2300
    - Tags: Health, ManaRegen, Active, CooldownReduction, Tenacity, AbilityHaste
    - Desc: 사용하면 아군 챔피언 하나에게 걸린 방해 효과를 모두 제거해 줍니다.
- [ ] **지크의 융합 (323050)** - Cost: 2300
    - Tags: Health, SpellBlock, Armor, AbilityHaste
    - Desc: No description
- [ ] **속삭이는 머리띠 (2526)** - Cost: 2250
    - Tags: Health, Mana, ManaRegen
    - Desc: No description
- [ ] **속삭이는 머리띠 (322526)** - Cost: 2250
    - Tags: Health, Mana, ManaRegen
    - Desc: No description
- [ ] **지크의 융합 (3050)** - Cost: 2200
    - Tags: Health, SpellBlock, Armor, AbilityHaste
    - Desc: 궁극기 사용 시 아군 한 명과 함께 추가 효과를 받습니다.
- [ ] **월석 재생기 (6617)** - Cost: 2200
    - Tags: Health, SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: 체력 회복 및 보호막 스킬의 재사용 대기시간이 감소하고 체력이 낮은 아군에게 더 큰 효과를 냅니다.
- [ ] **헬리아의 메아리 (6620)** - Cost: 2200
    - Tags: Health, SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: 체력이 낮은 적에게 피해를 입히면 저주를 내려 폭발을 일으킵니다. 폭발에 닿은 주변 적들은 피해를 입고 둔화됩니다.
- [ ] **메자이의 영혼약탈자 (3041)** - Cost: 1500
    - Tags: Health, SpellDamage, NonbootsMovement
    - Desc: 챔피언을 처치하거나 어시스트를 올릴 경우, 주문력이 오릅니다.
- [ ] **기괴한 가면 (3147)** - Cost: 1300
    - Tags: Health, SpellDamage
    - Desc: 적에게 기습 공격 시 추가 물리 피해를 입힙니다.
- [ ] **억겁의 카탈리스트 (3803)** - Cost: 1300
    - Tags: Health, HealthRegen, Mana, ManaRegen
    - Desc: No description
- [ ] **망령의 두건 (3211)** - Cost: 1250
    - Tags: Health, HealthRegen, SpellBlock
    - Desc: 방어력이 증가하고, 피해를 입으면 체력이 재생됩니다.
- [ ] **땅굴 채굴기 (2021)** - Cost: 1150
    - Tags: Health, Damage
    - Desc: No description
- [ ] **탐식의 망치 (3044)** - Cost: 1100
    - Tags: Health, Damage, NonbootsMovement
    - Desc: 적을 공격하거나 처치하면 이동 속도가 잠시 상승합니다.
- [ ] **수호자의 뿔피리 (2051)** - Cost: 950
    - Tags: Health, HealthRegen, Lane
    - Desc: 탱커에게 특화된 시작 아이템입니다.
- [ ] **수호자의 보주 (3112)** - Cost: 950
    - Tags: Health, SpellDamage, ManaRegen, Lane
    - Desc: 마법사에게 특화된 시작 아이템입니다.
- [ ] **수호자의 검 (3177)** - Cost: 950
    - Tags: Health, Damage, Lane, AbilityHaste
    - Desc: 공격에 특화된 시작 아이템입니다.
- [ ] **수호자의 망치 (3184)** - Cost: 950
    - Tags: Health, Damage, LifeSteal, Lane
    - Desc: 공격에 특화된 ���작 아이템입니다.

### Armor
- [ ] **수호 천사 (3026)** - Cost: 3200
    - Tags: Armor, Damage
    - Desc: 주기적으로 챔피언 사망 시 부활시켜 줍니다.
- [ ] **잔혹 행위 (667109)** - Cost: 2500
    - Tags: Armor, SpellDamage, MagicResist
    - Desc: No description
- [ ] **추적자의 팔목 보호대 (2420)** - Cost: 1600
    - Tags: Armor, SpellDamage, Active
    - Desc: 사용하면 아무런 행동도 취할 수 없는 대신 공격도 받지 않는 무적 상태가 됩니다.
- [ ] **무장 진격 (3174)** - Cost: 1200
    - Tags: Armor, Boots
    - Desc: 적에게 피해를 입혀 회복과 보호막을 강화합니다.
- [ ] **강철 인장 (2019)** - Cost: 1100
    - Tags: Armor, Damage
    - Desc: No description
- [ ] **파수꾼의 갑옷 (3082)** - Cost: 1000
    - Tags: Armor
    - Desc: No description

### SpellBlock
- [ ] **헤르메스의 시미터 (3139)** - Cost: 3200
    - Tags: SpellBlock, Damage, LifeSteal, Active, NonbootsMovement, Tenacity
    - Desc: 사용하면 모든 군중 제어 효과가 제거되며, 이동 속도가 대폭 증가합니다.
- [ ] **맬모셔스의 아귀 (3156)** - Cost: 3100
    - Tags: SpellBlock, Damage, LifeSteal, SpellVamp, AbilityHaste
    - Desc: 체력이 낮아지면 추가 공격력이 부여됩니다.
- [ ] **밴시의 장막 (3102)** - Cost: 3000
    - Tags: SpellBlock, SpellDamage
    - Desc: 주기적으로 적 스킬 공격을 막아줍니다.
- [ ] **가고일 돌갑옷 (663193)** - Cost: 2500
    - Tags: SpellBlock, Armor, Active, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **신록의 장벽 (4632)** - Cost: 1600
    - Tags: SpellBlock, SpellDamage
    - Desc: No description
- [ ] **사슬끈 분쇄자 (3173)** - Cost: 1250
    - Tags: SpellBlock, Boots, Tenacity, MagicResist
    - Desc: 이동 속도와 재사용 대기시간 감소율이 증가합니다.

### SpellDamage
- [ ] **그림자불꽃 (4645)** - Cost: 3200
    - Tags: SpellDamage, MagicPenetration
    - Desc: No description
- [ ] **무덤꽃 (3137)** - Cost: 3000
    - Tags: SpellDamage, MagicPenetration, AbilityHaste
    - Desc: 사용하면 모든 해로운 효과가 제거되며, 이동 속도가 대폭 증가합니다.
- [ ] **대천사의 지팡이 (3003)** - Cost: 2900
    - Tags: SpellDamage, Mana, AbilityHaste
    - Desc: 최대 마나량에 따라 주문력이 대폭 상승합니다.
- [ ] **대천사의 지팡이 (323003)** - Cost: 2900
    - Tags: SpellDamage, Mana, AbilityHaste
    - Desc: No description
- [ ] **새벽심장 (326621)** - Cost: 2900
    - Tags: SpellDamage, ManaRegen
    - Desc: No description
- [ ] **어둠불꽃 횃불 (2503)** - Cost: 2800
    - Tags: SpellDamage, Mana, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **실체화 장비 (2522)** - Cost: 2800
    - Tags: SpellDamage, Mana, AbilityHaste
    - Desc: No description
- [ ] **구원 (323107)** - Cost: 2800
    - Tags: SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **루덴의 메아리 (6655)** - Cost: 2750
    - Tags: SpellDamage, Mana, CooldownReduction, AbilityHaste
    - Desc: 폭발적인 피해를 입힙니다. 유지력이 약한 적에게 효과적입니다.
- [ ] **제국의 명령 (324005)** - Cost: 2750
    - Tags: SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **악의 (3118)** - Cost: 2700
    - Tags: SpellDamage, Mana, AbilityHaste
    - Desc: 동료를 지정해 서로를 보호합니다.
- [ ] **슈렐리아의 군가 (322065)** - Cost: 2600
    - Tags: SpellDamage, ManaRegen, Active, CooldownReduction, NonbootsMovement, AbilityHaste
    - Desc: No description
- [ ] **흐르는 물의 지팡이 (326616)** - Cost: 2600
    - Tags: SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: No description
- [ ] **새벽심장 (6621)** - Cost: 2500
    - Tags: SpellDamage, ManaRegen
    - Desc: No description
- [ ] **구원 (3107)** - Cost: 2300
    - Tags: SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: 활성화하면 주변 지역의 아군을 회복시키고 적에게는 피해를 입힙니다.
- [ ] **제국의 명령 (4005)** - Cost: 2250
    - Tags: SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: 피해량의 일부를 나중에 받습니다.
- [ ] **흐르는 물의 지팡이 (6616)** - Cost: 2250
    - Tags: SpellDamage, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: 체력 회복 및 보호막 스킬이 군중 제어 효과의 지속시간을 줄이고 이동 속도를 상승시킵니다.
- [ ] **슈렐리아의 군가 (2065)** - Cost: 2200
    - Tags: SpellDamage, ManaRegen, Active, CooldownReduction, NonbootsMovement, AbilityHaste
    - Desc: 사용하면 주변 아군의 속도가 빨라집니다.
- [ ] **쓸데없이 큰 지팡이 (1058)** - Cost: 1200
    - Tags: SpellDamage
    - Desc: 주문력이 대폭 상승합니다.
- [ ] **사라진 양피지 (3802)** - Cost: 1200
    - Tags: SpellDamage, Mana, ManaRegen, CooldownReduction, AbilityHaste
    - Desc: 레벨이 오를 때마다 마나를 회복합니다.
- [ ] **마법공학 교류 발전기 (3145)** - Cost: 1100
    - Tags: SpellDamage
    - Desc: 주문력이 상승합니다. 공격 시 주기적으로 추가 마법 피해를 입힙니다.

### AttackSpeed
- [ ] **불타는 향로 (323504)** - Cost: 2600
    - Tags: AttackSpeed, SpellDamage, ManaRegen, NonbootsMovement
    - Desc: No description
- [ ] **서풍 (663172)** - Cost: 2500
    - Tags: AttackSpeed, CooldownReduction, OnHit, NonbootsMovement, Tenacity
    - Desc: No description
- [ ] **불타는 향로 (3504)** - Cost: 2200
    - Tags: AttackSpeed, SpellDamage, ManaRegen, NonbootsMovement
    - Desc: 다른 유닛에게 보호막과 치유 효과를 쓰면 잠깐 동안 대상과 자신의 공격 속도가 상승합니다. 또한 이 상태에서 기본 공격이 적중하면 추가 마법 피해를 입힙니다.
- [ ] **광전사의 군화 (3006)** - Cost: 1100
    - Tags: AttackSpeed, Boots
    - Desc: 이동 속도와 공격 속도가 상승합니다.
- [ ] **건메탈 군화 (3172)** - Cost: 1100
    - Tags: AttackSpeed, LifeSteal, NonbootsMovement
    - Desc: 이동 속도가 증가하고 강인함 효과를 받습니다.

### Other
- [ ] **부서진 팔목 보호대 (2421)** - Cost: 1600
    - Tags: 
    - Desc: 초시계로 업그레이드할 수 있습니다.

### ArmorPenetration
- [ ] **최후의 속삭임 (3035)** - Cost: 1450
    - Tags: ArmorPenetration, Damage
    - Desc: 방어력이 뛰어난 적에게 효과적입니다.

### Active
- [ ] **수은 장식띠 (3140)** - Cost: 1300
    - Tags: Active, SpellBlock
    - Desc: 사용하면 모든 군중 제어 효과가 제거됩니다.

### Boots
- [ ] **마법사의 신발 (3020)** - Cost: 1100
    - Tags: Boots, MagicPenetration
    - Desc: 이동 속도와 마법 피해량이 증가합니다.
- [ ] **주문투척자의 신발 (3175)** - Cost: 1100
    - Tags: Boots, MagicPenetration
    - Desc: No description
- [ ] **신속행진 (3170)** - Cost: 1000
    - Tags: Boots
    - Desc: 방어력이 증가하고, 방해 효과의 지속시간이 줄어듭니다.

### MagicPenetration
- [ ] **역병의 보석 (4630)** - Cost: 1100
    - Tags: MagicPenetration, SpellDamage
    - Desc: No description

