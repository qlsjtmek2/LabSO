const fs = require('fs');
const path = require('path');

const BIN_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/bin');
const binPath = path.join(BIN_DIR, 'nidalee.bin.json');

try {
  const binData = JSON.parse(fs.readFileSync(binPath, 'utf-8'));
  const key = 'Characters/Nidalee/Spells/Takedown';
  const data = binData[key];
  
  if (data) {
      console.log('Key found.');
      if (data.mSpell) {
          if (data.mSpell.mEffectAmount) {
              console.log('mEffectAmount:', JSON.stringify(data.mSpell.mEffectAmount, null, 2));
          }
          if (data.mSpell.DataValues) {
              console.log('DataValues:', JSON.stringify(data.mSpell.DataValues, null, 2));
          }
          console.log('mCoefficient:', data.mSpell.mCoefficient);
          console.log('mCoefficient2:', data.mSpell.mCoefficient2);
      } else {
          console.log('mSpell NOT found. Keys:', Object.keys(data));
      }
  } else {
      console.log('Key NOT found.');
  }

} catch (e) {
  console.error(e);
}
