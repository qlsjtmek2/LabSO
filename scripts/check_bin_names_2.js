const fs = require('fs');
const path = require('path');

const BIN_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/bin');
const binPath = path.join(BIN_DIR, 'nidalee.bin.json');

try {
  const binData = JSON.parse(fs.readFileSync(binPath, 'utf-8'));
  const keys = Object.keys(binData);
  
  console.log('Nidalee Bin Keys (Name search):');
  keys.filter(k => 
    k.toLowerCase().includes('bushwhack') || 
    k.toLowerCase().includes('primal')
  ).forEach(k => {
    console.log(k);
  });

} catch (e) {
  console.error(e);
}
