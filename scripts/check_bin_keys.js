const fs = require('fs');
const path = require('path');

const BIN_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/bin');
const binPath = path.join(BIN_DIR, 'nidalee.bin.json');

try {
  const binData = JSON.parse(fs.readFileSync(binPath, 'utf-8'));
  const keys = Object.keys(binData);
  
  console.log('Nidalee Bin Keys (Spell related):');
  keys.filter(k => k.includes('Spell') && (k.includes('Q') || k.includes('W') || k.includes('E'))).forEach(k => {
    console.log(k);
  });

} catch (e) {
  console.error(e);
}
