const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/champions');
const ddragonPath = path.join(RAW_DIR, 'ddragon_championFull.json');

try {
  const ddragonData = JSON.parse(fs.readFileSync(ddragonPath, 'utf-8'));
  const nidalee = ddragonData.data['Nidalee'];
  
  if (nidalee) {
    console.log(`Nidalee Spells Count: ${nidalee.spells.length}`);
    nidalee.spells.forEach((spell, i) => {
      console.log(`Spell ${i}: ${spell.name} (ID: ${spell.id})`);
      console.log(`  Tooltip: ${spell.tooltip.substring(0, 50)}...`);
    });
  } else {
    console.log('Nidalee not found');
  }

  const jayce = ddragonData.data['Jayce'];
  if (jayce) {
    console.log(`\nJayce Spells Count: ${jayce.spells.length}`);
    jayce.spells.forEach((spell, i) => {
        console.log(`Spell ${i}: ${spell.name}`);
    });
  }

} catch (e) {
  console.error(e);
}
