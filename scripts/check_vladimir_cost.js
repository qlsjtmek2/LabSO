const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/champions');
const ddragonPath = path.join(RAW_DIR, 'ddragon_championFull.json');

try {
  const ddragonData = JSON.parse(fs.readFileSync(ddragonPath, 'utf-8'));
  const vlad = ddragonData.data['Vladimir'];
  
  if (vlad) {
    console.log(`Vladimir Partype: ${vlad.partype}`);
    vlad.spells.forEach((spell, i) => {
      console.log(`Spell ${i}: ${spell.name}`);
      console.log(`  Cost: ${JSON.stringify(spell.cost)}`);
      console.log(`  CostBurn: ${spell.costBurn}`);
      console.log(`  CostType: ${spell.costType}`);
      console.log(`  Resource: ${spell.resource}`);
      if (spell.vars) console.log(`  Vars: ${JSON.stringify(spell.vars)}`);
      if (spell.effect) console.log(`  Effect: ${JSON.stringify(spell.effect)}`);
    });
  }

} catch (e) {
  console.error(e);
}
