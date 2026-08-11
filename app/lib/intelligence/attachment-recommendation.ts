import { classifySegment, type IntelligenceRow } from './core';

const text = (value: unknown) => String(value ?? '').trim();

const segmentAssetHints: Record<string, string[]> = {
  REAL_ESTATE_DEVELOPER: ['Capability Statement', 'Projects/References', 'Company Profile'],
  MAIN_CONTRACTOR: ['Capability Statement', 'Services', 'Projects/References'],
  INDUSTRIAL_FACTORY: ['Services', 'Licenses', 'Certifications'],
  INDUSTRIAL_CONTRACTOR: ['Capability Statement', 'Services', 'Certifications'],
  ENGINEERING_CONSULTANT: ['Company Profile', 'Capability Statement', 'Projects/References'],
  MANUFACTURER: ['Services', 'Licenses', 'Photos'],
  SUPPLIER: ['Services', 'Company Profile', 'Capability Statement'],
  FACILITY_OPERATOR: ['Services', 'Certifications', 'Licenses'],
  OTHER: ['Company Profile', 'Capability Statement'],
};

const roleAssetHints: Array<{ pattern: RegExp; preferred: string[] }> = [
  { pattern: /procurement|purchas|المشتريات|supply/i, preferred: ['Company Profile', 'Licenses', 'Certifications'] },
  { pattern: /project|delivery|execution|المشاريع|التنفيذ/i, preferred: ['Capability Statement', 'Services', 'Projects/References'] },
  { pattern: /engineering|technical|الهندسة|فني/i, preferred: ['Services', 'Projects/References', 'Certifications'] },
  { pattern: /quality|hse|compliance|الجودة|السلامة|الامتثال/i, preferred: ['Certifications', 'Licenses', 'Company Profile'] },
];

function scoreAsset(asset: IntelligenceRow, company: IntelligenceRow, role: string, segment: string) {
  if (asset.active === false) return -1;

  const assetType = text(asset.asset_type);
  const assetSector = text(asset.sector).toLowerCase();
  const companySector = text(company.sector).toLowerCase();

  let score = 0;
  const segmentHints = segmentAssetHints[segment] ?? segmentAssetHints.OTHER;

  segmentHints.forEach((hint, index) => {
    if (assetType === hint) score += (segmentHints.length - index) * 10;
  });

  for (const hint of roleAssetHints) {
    if (hint.pattern.test(role)) {
      hint.preferred.forEach((type, index) => {
        if (assetType === type) score += (hint.preferred.length - index) * 8;
      });
      break;
    }
  }

  if (companySector && assetSector && assetSector.includes(companySector)) score += 18;
  if (assetType === 'Company Profile') score += 6;
  if (assetType === 'Capability Statement') score += 5;

  return score;
}

export function recommendAttachment(assets: IntelligenceRow[], company: IntelligenceRow, recipientRole: string) {
  if (!assets.length) return null;

  const segment = classifySegment(company).segment;
  const role = text(recipientRole);

  const ranked = assets
    .map((asset) => ({ asset, score: scoreAsset(asset, company, role, segment) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.asset ?? null;
}
