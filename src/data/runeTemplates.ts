/**
 * 룬 템플릿
 *
 * 챔피언별, 상황별 추천 룬 세트를 정의합니다.
 */

import type { RuneTemplate } from '@/types';

import runeTemplatesData from './json/runeTemplates.json';

// JSON 데이터를 Record 형태로 변환
export const RUNE_TEMPLATES: Record<string, RuneTemplate> = {};

runeTemplatesData.forEach((template: any) => {
  RUNE_TEMPLATES[template.id] = template as RuneTemplate;
});

// 템플릿 ID로 가져오기
export function getRuneTemplate(templateId: string): RuneTemplate | undefined {
  return RUNE_TEMPLATES[templateId];
}

// 모든 템플릿 가져오기
export function getAllRuneTemplates(): RuneTemplate[] {
  return Object.values(RUNE_TEMPLATES);
}

// 조건에 맞는 템플릿 필터링
export function filterRuneTemplates(
  options: {
    primaryTree?: string;
    keystoneId?: string;
    playstyle?: 'Aggressive' | 'Defensive' | 'Scaling' | 'Utility';
    vsClass?: string;
  }
): RuneTemplate[] {
  return Object.values(RUNE_TEMPLATES).filter((t) => {
    if (options.primaryTree && t.primaryTree !== options.primaryTree) return false;
    if (options.keystoneId && t.primaryKeystone !== options.keystoneId) return false;
    if (options.playstyle && t.condition?.playstyle !== options.playstyle) return false;
    if (options.vsClass && !t.condition?.vsClass?.includes(options.vsClass as any)) return false;
    return true;
  });
}
