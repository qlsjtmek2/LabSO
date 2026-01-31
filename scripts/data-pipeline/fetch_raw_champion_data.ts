import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const CDRAGON_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1';
const RAW_DATA_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/champions');

async function fetchRawChampionData() {
  try {
    console.log('Fetching champion summary...');
    const summaryRes = await axios.get(`${CDRAGON_BASE}/champion-summary.json`);
    // For testing: limit to first 3 champions
    // const champions = summaryRes.data.filter((c: any) => c.id > 0).slice(0, 3);
    
    // For production:
    const champions = summaryRes.data.filter((c: any) => c.id > 0);

    console.log(`Found ${champions.length} champions.`);
    
    // Ensure directory exists
    await fs.mkdir(RAW_DATA_DIR, { recursive: true });

    const RAW_BIN_DIR = path.join(process.cwd(), 'src/engine/simulator/data/raw/bin');
    await fs.mkdir(RAW_BIN_DIR, { recursive: true });

    // 0. Fetch DDragon ChampionFull (for Base Stats)
    console.log('Fetching DDragon version...');
    const versionRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
    const latestVersion = versionRes.data[0];
    console.log(`Latest Version: ${latestVersion}`);

    console.log('Fetching DDragon championFull.json...');
    const ddragonRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/championFull.json`);
    await fs.writeFile(path.join(RAW_DATA_DIR, 'ddragon_championFull.json'), JSON.stringify(ddragonRes.data, null, 2));

    for (const champ of champions) {
      // Limit for testing context (remove this block for full run)
      // if (!['Ahri', 'Garen', 'Katarina', 'Jhin', 'Yasuo'].includes(champ.alias)) continue;

      const champId = champ.id;
      const champName = champ.alias; // 'Ahri', 'Aatrox', etc.
      
      console.log(`Fetching data for ${champName} (${champId})...`);
      
      try {
        // 1. Basic Data (Client Data)
        const detailRes = await axios.get(`${CDRAGON_BASE}/champions/${champId}.json`);
        await fs.writeFile(path.join(RAW_DATA_DIR, `${champName}.json`), JSON.stringify(detailRes.data, null, 2));

        // 2. Bin Data (Game Data - Spells & Coeffs)
        const aliasLower = champName.toLowerCase();
        // CDragon path sometimes differs for specific champs (e.g. FiddleSticks vs Fiddlesticks), but mostly alias.toLowerCase()
        const binRes = await axios.get(`https://raw.communitydragon.org/latest/game/data/characters/${aliasLower}/${aliasLower}.bin.json`);
        await fs.writeFile(path.join(RAW_BIN_DIR, `${champName}.bin.json`), JSON.stringify(binRes.data, null, 2));

      } catch (err: any) {
        console.error(`Failed to fetch ${champName}:`, err.message);
      }
      
      // Rate limiting prevention
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('All downloads complete.');

  } catch (error) {
    console.error('Fatal Error:', error);
  }
}

fetchRawChampionData();
