// src/lib/dataDragon.ts
import axios from 'axios';

const DDragon_BASE_URL = 'https://ddragon.leagueoflegends.com';

export const getLatestVersion = async () => {
  const res = await axios.get(`${DDragon_BASE_URL}/api/versions.json`);
  return res.data[0];
};

export const getChampions = async (version: string) => {
  const res = await axios.get(`${DDragon_BASE_URL}/cdn/${version}/data/ko_KR/champion.json`);
  return res.data.data;
};

export const getItems = async (version: string) => {
  const res = await axios.get(`${DDragon_BASE_URL}/cdn/${version}/data/ko_KR/item.json`);
  return res.data.data;
};

export const getRuneReforged = async (version: string) => {
  const res = await axios.get(`${DDragon_BASE_URL}/cdn/${version}/data/ko_KR/runesReforged.json`);
  return res.data;
};

// 특정 챔피언의 상세 데이터(스킬 계수 등)를 가져옵니다.
export const getChampionDetail = async (version: string, championId: string) => {
  const res = await axios.get(`${DDragon_BASE_URL}/cdn/${version}/data/ko_KR/champion/${championId}.json`);
  return res.data.data[championId];
};

export const getAssetUrl = (version: string, type: 'champion' | 'item' | 'spell', id: string) => {
    if (type === 'champion') return `${DDragon_BASE_URL}/cdn/${version}/img/champion/${id}.png`;
    if (type === 'item') return `${DDragon_BASE_URL}/cdn/${version}/img/item/${id}.png`;
    if (type === 'spell') return `${DDragon_BASE_URL}/cdn/${version}/img/spell/${id}.png`;
    return '';
};
