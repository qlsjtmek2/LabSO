
import { GenericChampionModel } from '../src/engine/simulator/models/GenericChampion';
import ahriSchema from '../src/engine/simulator/data/samples/ahri.json';
import { CombatStats } from '../src/engine/simulator/core/types';

async function testAhri() {
    const enemyStats: CombatStats = {
        level: 11,
        hp: 1500,
        maxHp: 1500,
        mana: 500,
        ad: 100,
        baseAd: 65,
        ap: 0,
        armor: 50,
        mr: 40,
        attackSpeed: 0.7,
        range: 125,
        movementSpeed: 345,
        abilityHaste: 0,
        critChance: 0,
        critDamage: 1.75,
        lethality: 0,
        armorPen: 0,
        magicPenFlat: 0,
        magicPenPercent: 0,
        omnivamp: 0,
        lifesteal: 0,
        ccStatus: {}
    };

    const model = new GenericChampionModel(ahriSchema as any, [], 11);
    
    console.log("Simulating Ahri Combo: E -> Q -> W -> R");
    const events = model.simulateCombo(['E', 'Q', 'W', 'R'], enemyStats);

    events.forEach(e => {
        console.log(`[${e.timestamp.toFixed(2)}s] ${e.source}: ${e.mitigatedDamage.toFixed(1)} (${e.type})`);
    });

    const totalDamage = events.reduce((sum, e) => sum + e.mitigatedDamage, 0);
    console.log(`
Total Damage: ${totalDamage.toFixed(1)}`);
}

testAhri();
