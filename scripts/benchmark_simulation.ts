
import { GeneticOptimizer } from '../src/engine/simulator/genetic/geneticOptimizer';
import { ChampionSchema } from '../src/engine/simulator/data/schemas';
import fs from 'fs/promises';
import path from 'path';

// Load Schema Helper
async function loadSchema(name: string): Promise<ChampionSchema> {
  const filePath = path.join(process.cwd(), 'src/engine/simulator/data/samples', `${name}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

// Mock Items Data for Name resolution
import itemsData from '../src/data/json/items.json';
const ITEM_MAP: Record<number, string> = {};
Object.values(itemsData).forEach((item: any) => ITEM_MAP[item.id] = item.name);

async function runBenchmark() {
  console.log('Starting Simulation Benchmark...');

  const testCases = [
    { name: 'Ahri', role: 'Mage', enemy: 'Zed' },
    { name: 'Jinx', role: 'Marksman', enemy: 'Malphite' },
    { name: 'Zed', role: 'Assassin', enemy: 'Lux' },
    { name: 'Ornn', role: 'Tank', enemy: 'Jax' },
    { name: 'Darius', role: 'Fighter', enemy: 'Sion' },
  ];

  for (const test of testCases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Benchmarking: ${test.name} (${test.role}) vs ${test.enemy}`);
    
    try {
      const mySchema = await loadSchema(test.name.toLowerCase());
      const enemySchema = await loadSchema(test.enemy.toLowerCase());

      // Base Stats for Simulation (Level 18)
      const enemyStats = {
        level: 18,
        hp: enemySchema.baseStats.hp + (enemySchema.baseStats.hpPerLevel * 17),
        maxHp: enemySchema.baseStats.hp + (enemySchema.baseStats.hpPerLevel * 17),
        armor: enemySchema.baseStats.armor + (enemySchema.baseStats.armorPerLevel * 17),
        mr: enemySchema.baseStats.mr + (enemySchema.baseStats.mrPerLevel * 17),
        ad: 100, 
        baseAd: 100, // Added
        ap: 0, 
        attackSpeed: 1.0, 
        range: enemySchema.baseStats.range,
        movementSpeed: enemySchema.baseStats.moveSpeed, // Renamed from moveSpeed
        critChance: 0,
        critDamage: 1.75, // Added
        abilityHaste: 0,
        lethality: 0, armorPen: 0, magicPenFlat: 0, magicPenPercent: 0, omnivamp: 0, lifesteal: 0, mana: 1000, currentHp: 2000,
        tenacity: 0
      };

      const optimizer = new GeneticOptimizer(
        mySchema,
        enemyStats,
        {
          populationSize: 50, // Small for speed test
          generations: 20,
          mutationRate: 0.1,
          eliteCount: 5
        },
        enemySchema
      );

      const result = await optimizer.run();

      console.log(`Fitness Score: ${Math.round(result.fitness)} (Syn: ${result.stats.synergy})`);
      console.log(`Recommended Build:`);
      result.genes.items.forEach((id: number) => {
        console.log(`- ${ITEM_MAP[id] || id}`);
      });
      
      // Validation
      const items = result.genes.items.map((id: number) => ITEM_MAP[id] || '');
      // Simple check based on role
      if (test.role === 'Mage') {
        const hasAP = items.some(n => n.includes('Rabadon') || n.includes('Luden') || n.includes('Liandry') || n.includes('Shadowflame'));
        console.log(`Validation (Mage/AP): ${hasAP ? 'PASS' : 'FAIL'}`);
      } else if (test.role === 'Marksman') {
         const hasCrit = items.some(n => n.includes('Infinity') || n.includes('Kraken') || n.includes('Phantom'));
         console.log(`Validation (ADC/Crit): ${hasCrit ? 'PASS' : 'FAIL'}`);
      }

    } catch (e) {
      console.error(`Error benchmarking ${test.name}:`, e);
    }
  }
}

runBenchmark();
