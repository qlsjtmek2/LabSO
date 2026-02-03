const fs = require('fs');
const path = require('path');

const BIN_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/bin');
const binPath = path.join(BIN_DIR, 'heimerdinger.bin.json');

try {
  const binData = JSON.parse(fs.readFileSync(binPath, 'utf-8'));
  const keys = Object.keys(binData);
  
  console.log('Heimerdinger Bin Keys (Turret related):');
  keys.filter(k => 
    k.toLowerCase().includes('beam') || 
    k.toLowerCase().includes('blast') ||
    k.toLowerCase().includes('energy')
  ).forEach(k => {
    console.log(k);
  });

} catch (e) {
  console.error(e);
}
