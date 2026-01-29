// src/lib/riotApi.ts
import axios from 'axios';

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const REGION = 'kr'; 
const BASE_URL = `https://${REGION}.api.riotgames.com`;
const MATCH_BASE_URL = 'https://asia.api.riotgames.com'; // KR, JP 등은 asia 지역 사용

const riotClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Riot-Token': RIOT_API_KEY,
  },
});

export const getSummonerByName = async (summonerName: string, tagLine: string) => {
  try {
    const accountUrl = `${MATCH_BASE_URL}/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}`;
    const accountRes = await axios.get(accountUrl, {
        headers: { 'X-Riot-Token': RIOT_API_KEY }
    });
    const { puuid, gameName, tagLine: tag } = accountRes.data;

    const summonerRes = await riotClient.get(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
    
    return {
        ...summonerRes.data,
        puuid,
        gameName,
        tagLine: tag
    };
  } catch (error) {
    console.error('Riot API Error:', error);
    throw error;
  }
};

export const getMatchList = async (puuid: string, count: number = 10) => {
  const url = `${MATCH_BASE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
  const res = await axios.get(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
  return res.data;
};

export const getMatchDetail = async (matchId: string) => {
  const url = `${MATCH_BASE_URL}/lol/match/v5/matches/${matchId}`;
  const res = await axios.get(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
  return res.data;
};

export const getMatchTimeline = async (matchId: string) => {
  const url = `${MATCH_BASE_URL}/lol/match/v5/matches/${matchId}/timeline`;
  const res = await axios.get(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
  return res.data;
};
