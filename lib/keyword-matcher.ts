import type { SheetKeyword, KeywordGroup } from './types';

export interface MatchResult {
  keyword: string;
  groupId: string;
  matchedBy: string;
}

/**
 * Match keywords against a group's seed terms using word-boundary matching.
 * Returns keywords that contain any seed term as a word boundary match.
 */
export function matchKeywordsToGroup(
  keywords: SheetKeyword[],
  group: KeywordGroup,
  excludeGroupIds?: string[],
): MatchResult[] {
  const results: MatchResult[] = [];

  const excludeTerms = group.excludeTerms || [];

  for (const kw of keywords) {
    // Skip if already assigned to another group we're not overriding
    if (kw.assignedGroupId && excludeGroupIds?.includes(kw.assignedGroupId)) continue;

    // Check includes: keyword must match at least one seed term
    let matched = false;
    let matchedSeed = '';
    for (const seed of group.seedTerms) {
      if (matchesSeedTerm(kw.keyword, seed)) {
        matched = true;
        matchedSeed = seed;
        break;
      }
    }

    if (!matched) continue;

    // Check excludes: keyword must NOT match any exclude term
    let excluded = false;
    for (const exclude of excludeTerms) {
      if (matchesSeedTerm(kw.keyword, exclude)) {
        excluded = true;
        break;
      }
    }

    if (excluded) continue;

    results.push({
      keyword: kw.keyword,
      groupId: group.id,
      matchedBy: matchedSeed,
    });
  }

  return results;
}

/**
 * Check if a keyword matches a seed term using word-boundary matching.
 * "running" matches "running shoes" and "trail running" but not "outrunning"
 */
function matchesSeedTerm(keyword: string, seed: string): boolean {
  const kwLower = keyword.toLowerCase();
  const seedLower = seed.toLowerCase().trim();

  if (!seedLower) return false;

  // Escape regex special chars in seed
  const escaped = seedLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\s|-)${escaped}($|\\s|-)`, 'i');
  return regex.test(kwLower);
}

/**
 * Apply all groups' seed terms to keywords in priority order.
 * First group to match a keyword claims it.
 */
export function applyAllGroupMatches(
  keywords: SheetKeyword[],
  groups: KeywordGroup[],
): SheetKeyword[] {
  // Reset all assignments
  const updated = keywords.map(kw => ({ ...kw, assignedGroupId: null as string | null }));

  // Track which keywords are already assigned
  const assigned = new Set<string>();

  for (const group of groups) {
    const matches = matchKeywordsToGroup(
      updated.filter(kw => !assigned.has(kw.keyword)),
      group,
    );

    // Update matched keywords
    const matchedKeywords: string[] = [];
    for (const match of matches) {
      const kw = updated.find(k => k.keyword === match.keyword);
      if (kw && !assigned.has(kw.keyword)) {
        kw.assignedGroupId = group.id;
        assigned.add(kw.keyword);
        matchedKeywords.push(kw.keyword);
      }
    }

    // Update group's matchedKeywords list
    group.matchedKeywords = matchedKeywords;
  }

  return updated;
}

/**
 * Get a preview of how many keywords each seed term would match.
 */
export function previewSeedMatches(
  keywords: SheetKeyword[],
  seedTerms: string[],
  excludeTerms: string[] = [],
  excludeAssigned: boolean = true,
): { seed: string; count: number; examples: string[] }[] {
  const available = excludeAssigned
    ? keywords.filter(kw => !kw.assignedGroupId)
    : keywords;

  // Pre-filter: remove keywords matching any exclude term
  const afterExcludes = excludeTerms.length > 0
    ? available.filter(kw => !excludeTerms.some(ex => matchesSeedTerm(kw.keyword, ex)))
    : available;

  return seedTerms.map(seed => {
    const matches = afterExcludes.filter(kw => matchesSeedTerm(kw.keyword, seed));
    return {
      seed,
      count: matches.length,
      examples: matches.slice(0, 5).map(kw => kw.keyword),
    };
  });
}
