import type { ClientConfig, ClientData, SheetKeyword, MonthlySearchVolume, KeywordGroup, Project, DemandTrackerConfig } from './types';

// ─── Sample Client: New Balance Australia ────────────────────────────────────

const newBalanceGroups: KeywordGroup[] = [
  // Brand
  {
    id: 'nb-brand',
    name: 'New Balance',
    color: '#FBDB1E',
    type: 'brand',
    seedTerms: ['new balance'],
    excludeTerms: [],
    matchedKeywords: [
      'new balance', 'new balance shoes', 'new balance australia',
      'new balance running shoes', 'new balance sneakers', 'new balance sale',
      'new balance outlet',
    ],
    strokeWidth: 3,
    showTrendLine: false,
  },
  // Individual competitors
  {
    id: 'comp-nike',
    name: 'Nike',
    color: '#FF6B00',
    type: 'competitor',
    seedTerms: ['nike'],
    excludeTerms: [],
    matchedKeywords: ['nike running shoes', 'nike shoes australia', 'nike air max', 'nike pegasus'],
  },
  {
    id: 'comp-adidas',
    name: 'Adidas',
    color: '#E53935',
    type: 'competitor',
    seedTerms: ['adidas'],
    excludeTerms: [],
    matchedKeywords: ['adidas running shoes', 'adidas ultraboost', 'adidas australia'],
  },
  {
    id: 'comp-asics',
    name: 'ASICS',
    color: '#1565C0',
    type: 'competitor',
    seedTerms: ['asics'],
    excludeTerms: [],
    matchedKeywords: ['asics running shoes', 'asics gel kayano', 'asics nimbus'],
  },
  {
    id: 'comp-hoka',
    name: 'Hoka',
    color: '#00BCD4',
    type: 'competitor',
    seedTerms: ['hoka'],
    excludeTerms: [],
    matchedKeywords: ['hoka running shoes', 'hoka clifton', 'hoka bondi', 'hoka speedgoat'],
  },
  {
    id: 'comp-on',
    name: 'On Running',
    color: '#78909C',
    type: 'competitor',
    seedTerms: ['on running', 'on cloud'],
    excludeTerms: [],
    matchedKeywords: ['on running shoes', 'on cloud', 'on cloudmonster'],
  },
  // Category
  {
    id: 'nb-cat',
    name: 'Category',
    color: '#4CAF50',
    type: 'category',
    seedTerms: ['running shoes', 'sneakers', 'trainers', 'walking shoes'],
    excludeTerms: [],
    matchedKeywords: [
      'best running shoes', 'running shoes online', 'mens running shoes',
      'womens running shoes', 'trail running shoes', 'sneakers online',
      'best sneakers', 'gym trainers', 'walking shoes australia',
    ],
  },
  // Individual product lines
  {
    id: 'prod-574',
    name: '574',
    color: '#9C27B0',
    type: 'product',
    seedTerms: ['574'],
    excludeTerms: [],
    matchedKeywords: ['new balance 574', '574 classic', '574 grey'],
  },
  {
    id: 'prod-990',
    name: '990',
    color: '#E91E63',
    type: 'product',
    seedTerms: ['990'],
    excludeTerms: [],
    matchedKeywords: ['new balance 990', '990v6', '990v5'],
  },
  {
    id: 'prod-550',
    name: '550',
    color: '#FF5722',
    type: 'product',
    seedTerms: ['550'],
    excludeTerms: [],
    matchedKeywords: ['new balance 550', '550 white green', '550 white'],
  },
  {
    id: 'prod-2002r',
    name: '2002R',
    color: '#795548',
    type: 'product',
    seedTerms: ['2002r'],
    excludeTerms: [],
    matchedKeywords: ['new balance 2002r', '2002r protection pack'],
  },
  {
    id: 'prod-1080',
    name: 'Fresh Foam 1080',
    color: '#607D8B',
    type: 'product',
    seedTerms: ['1080', 'fresh foam'],
    excludeTerms: [],
    matchedKeywords: ['new balance 1080', 'fresh foam 1080v13', 'fresh foam x more v5'],
  },
];

function generateMonthlyVolumes(baseVolume: number, months: number, seasonalPeak: number = 11): MonthlySearchVolume[] {
  const volumes: MonthlySearchVolume[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth() + 1;

    const distFromPeak = Math.min(
      Math.abs(month - seasonalPeak),
      12 - Math.abs(month - seasonalPeak)
    );
    const seasonalMultiplier = 1 + (0.5 * Math.max(0, 1 - distFromPeak / 4));

    const yearIndex = Math.floor(i / 12);
    const growthMultiplier = 1 + (0.1 * (months / 12 - yearIndex - 1));

    const noise = 0.85 + Math.random() * 0.3;

    volumes.push({
      year: date.getFullYear(),
      month,
      volume: Math.round(baseVolume * seasonalMultiplier * growthMultiplier * noise),
    });
  }

  return volumes;
}

function generateKeywordData(keyword: string, groupId: string | null, baseVolume: number): SheetKeyword {
  return {
    keyword,
    avgMonthlySearches: baseVolume,
    competition: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
    competitionIndex: Math.floor(Math.random() * 80) + 10,
    topOfPageBidLow: Math.round((0.5 + Math.random() * 2) * 100) / 100,
    topOfPageBidHigh: Math.round((2 + Math.random() * 5) * 100) / 100,
    monthlySearchVolumes: generateMonthlyVolumes(baseVolume, 24),
    assignedGroupId: groupId,
  };
}

// Generate all keywords for New Balance
const newBalanceKeywords: SheetKeyword[] = [
  // Brand keywords
  generateKeywordData('new balance', 'nb-brand', 40500),
  generateKeywordData('new balance shoes', 'nb-brand', 22200),
  generateKeywordData('new balance australia', 'nb-brand', 12100),
  generateKeywordData('new balance running shoes', 'nb-brand', 8100),
  generateKeywordData('new balance sneakers', 'nb-brand', 6600),
  generateKeywordData('new balance sale', 'nb-brand', 5400),
  generateKeywordData('new balance outlet', 'nb-brand', 3600),
  // Nike keywords
  generateKeywordData('nike running shoes', 'comp-nike', 18100),
  generateKeywordData('nike shoes australia', 'comp-nike', 9900),
  generateKeywordData('nike air max', 'comp-nike', 14800),
  generateKeywordData('nike pegasus', 'comp-nike', 8100),
  // Adidas keywords
  generateKeywordData('adidas running shoes', 'comp-adidas', 12100),
  generateKeywordData('adidas ultraboost', 'comp-adidas', 8100),
  generateKeywordData('adidas australia', 'comp-adidas', 6600),
  // ASICS keywords
  generateKeywordData('asics running shoes', 'comp-asics', 9900),
  generateKeywordData('asics gel kayano', 'comp-asics', 6600),
  generateKeywordData('asics nimbus', 'comp-asics', 4400),
  // Hoka keywords
  generateKeywordData('hoka running shoes', 'comp-hoka', 14800),
  generateKeywordData('hoka clifton', 'comp-hoka', 6600),
  generateKeywordData('hoka bondi', 'comp-hoka', 5400),
  generateKeywordData('hoka speedgoat', 'comp-hoka', 3600),
  // On Running keywords
  generateKeywordData('on running shoes', 'comp-on', 8100),
  generateKeywordData('on cloud', 'comp-on', 5400),
  generateKeywordData('on cloudmonster', 'comp-on', 3600),
  // Category keywords
  generateKeywordData('best running shoes', 'nb-cat', 14800),
  generateKeywordData('running shoes online', 'nb-cat', 4400),
  generateKeywordData('mens running shoes', 'nb-cat', 9900),
  generateKeywordData('womens running shoes', 'nb-cat', 8100),
  generateKeywordData('trail running shoes', 'nb-cat', 6600),
  generateKeywordData('sneakers online', 'nb-cat', 5400),
  generateKeywordData('best sneakers', 'nb-cat', 3600),
  generateKeywordData('gym trainers', 'nb-cat', 2900),
  generateKeywordData('walking shoes australia', 'nb-cat', 2400),
  // Product: 574
  generateKeywordData('new balance 574', 'prod-574', 4400),
  generateKeywordData('574 classic', 'prod-574', 2200),
  generateKeywordData('574 grey', 'prod-574', 1800),
  // Product: 990
  generateKeywordData('new balance 990', 'prod-990', 3200),
  generateKeywordData('990v6', 'prod-990', 2400),
  generateKeywordData('990v5', 'prod-990', 1600),
  // Product: 550
  generateKeywordData('new balance 550', 'prod-550', 5100),
  generateKeywordData('550 white green', 'prod-550', 2800),
  generateKeywordData('550 white', 'prod-550', 2200),
  // Product: 2002R
  generateKeywordData('new balance 2002r', 'prod-2002r', 2800),
  generateKeywordData('2002r protection pack', 'prod-2002r', 1300),
  // Product: Fresh Foam 1080
  generateKeywordData('new balance 1080', 'prod-1080', 2400),
  generateKeywordData('fresh foam 1080v13', 'prod-1080', 1800),
  generateKeywordData('fresh foam x more v5', 'prod-1080', 1300),
  // Ungrouped
  generateKeywordData('comfortable shoes', null, 3600),
  generateKeywordData('shoe stores near me', null, 9900),
  generateKeywordData('buy shoes online australia', null, 2400),
];

// ─── Sample Clients ──────────────────────────────────────────────────────────

export const sampleClients: ClientConfig[] = [
  {
    slug: 'new-balance-au',
    clientName: 'New Balance Australia',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1Tk4lCpkuovbaiQI7coXaiBqpRx13OI7uON_QU1iSckM/edit',
    sheetId: '1Tk4lCpkuovbaiQI7coXaiBqpRx13OI7uON_QU1iSckM',
    keywordGroups: newBalanceGroups,
    parsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// No pre-populated keyword data — fetch from real sheet on startup
export const sampleClientData: ClientData[] = [];

// ─── New Project-Based Exports ──────────────────────────────────────────────

export const sampleProjects: Project[] = [
  {
    slug: 'new-balance-au',
    name: 'New Balance Australia',
    tools: [{ toolId: 'demand-tracker', enabled: true, addedAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const sampleDemandTrackerConfigs: DemandTrackerConfig[] = [
  {
    projectSlug: 'new-balance-au',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1Tk4lCpkuovbaiQI7coXaiBqpRx13OI7uON_QU1iSckM/edit',
    sheetId: '1Tk4lCpkuovbaiQI7coXaiBqpRx13OI7uON_QU1iSckM',
    sheetSources: [
      {
        id: 'src-1',
        label: 'Extended Date Range',
        sheetUrl: 'https://docs.google.com/spreadsheets/d/1Tk4lCpkuovbaiQI7coXaiBqpRx13OI7uON_QU1iSckM/edit',
        sheetId: '1Tk4lCpkuovbaiQI7coXaiBqpRx13OI7uON_QU1iSckM',
        lastFetchedAt: null,
        keywordCount: 0,
      },
    ],
    keywordGroups: newBalanceGroups,
    parsedAt: null,
  },
];
