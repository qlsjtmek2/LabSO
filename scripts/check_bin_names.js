const fs = require('fs');
const path = require('path');

const BIN_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/bin');
const binPath = path.join(BIN_DIR, 'jayce.bin.json');

try {
  const binData = JSON.parse(fs.readFileSync(binPath, 'utf-8'));
  const keys = Object.keys(binData);
  
  console.log('Jayce Bin Keys (Name search):');
  keys.filter(k => 
    k.toLowerCase().includes('skies') || 
    k.toLowerCase().includes('field') || 
    k.toLowerCase().includes('static')
  ).forEach(k => {
    console.log(k);
  });

} catch (e) {
  console.error(e);
}
