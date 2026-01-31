import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

async function testFetchBin() {
  const url = 'https://raw.communitydragon.org/latest/game/data/characters/ahri/ahri.bin.json';
  try {
    const res = await axios.get(url);
    await fs.writeFile('ahri.bin.json', JSON.stringify(res.data, null, 2));
    console.log('Downloaded ahri.bin.json');
  } catch (err) {
    console.error(err);
  }
}

testFetchBin();
