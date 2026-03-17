import type { ToolDefinition } from './types';

export const TOOLS: ToolDefinition[] = [
  {
    id: 'demand-tracker',
    name: 'Demand Tracker',
    description: 'Track keyword search demand from Google Keyword Planner data. Analyse brand vs competitor search share, product trends, and category performance.',
    icon: 'TrendingUp',
    href: (projectSlug: string) => `/${projectSlug}/demand-tracker`,
  },
  // Future tools:
  // {
  //   id: 'competitor-analysis',
  //   name: 'Competitor Analysis',
  //   description: 'Deep-dive into competitor positioning, messaging, and market presence.',
  //   icon: 'Users',
  //   href: (projectSlug: string) => `/${projectSlug}/competitor-analysis`,
  // },
];

export function getToolDefinition(id: string): ToolDefinition | undefined {
  return TOOLS.find(t => t.id === id);
}
