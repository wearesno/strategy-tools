import type { ClientConfig, ClientData, Project, DemandTrackerConfig } from './types';
import { sampleClients, sampleClientData, sampleProjects, sampleDemandTrackerConfigs } from './mock-data';

// ─── Legacy stores (kept during migration) ──────────────────────────────────

let clients: ClientConfig[] = [...sampleClients];
let clientDataStore: Map<string, ClientData> = new Map(
  sampleClientData.map(d => [d.clientSlug, d])
);

export function getClients(): ClientConfig[] { return clients; }
export function getClient(slug: string): ClientConfig | undefined { return clients.find(c => c.slug === slug); }
export function createClient(client: ClientConfig): ClientConfig { clients.push(client); return client; }
export function updateClient(slug: string, updates: Partial<ClientConfig>): ClientConfig | undefined {
  const index = clients.findIndex(c => c.slug === slug);
  if (index === -1) return undefined;
  clients[index] = { ...clients[index], ...updates, updatedAt: new Date().toISOString() };
  return clients[index];
}
export function deleteClient(slug: string): boolean {
  const index = clients.findIndex(c => c.slug === slug);
  if (index === -1) return false;
  clients.splice(index, 1);
  clientDataStore.delete(slug);
  return true;
}
export function getClientData(slug: string): ClientData | undefined { return clientDataStore.get(slug); }
export function setClientData(slug: string, data: ClientData): void { clientDataStore.set(slug, data); }

// ─── Project Store ──────────────────────────────────────────────────────────

let projects: Project[] = [...sampleProjects];

export function getProjects(): Project[] {
  return projects;
}

export function getProject(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug);
}

export function createProject(project: Project): Project {
  projects.push(project);
  return project;
}

export function updateProject(slug: string, updates: Partial<Project>): Project | undefined {
  const index = projects.findIndex(p => p.slug === slug);
  if (index === -1) return undefined;
  projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
  return projects[index];
}

export function deleteProject(slug: string): boolean {
  const index = projects.findIndex(p => p.slug === slug);
  if (index === -1) return false;
  projects.splice(index, 1);
  dtConfigs.delete(slug);
  dtDataStore.delete(slug);
  return true;
}

// ─── Demand Tracker Config Store ────────────────────────────────────────────

let dtConfigs: Map<string, DemandTrackerConfig> = new Map(
  sampleDemandTrackerConfigs.map(c => [c.projectSlug, c])
);

let dtDataStore: Map<string, ClientData> = new Map(
  sampleClientData.map(d => [d.clientSlug, d])
);

function migrateDTConfig(config: DemandTrackerConfig): DemandTrackerConfig {
  if ((!config.sheetSources || config.sheetSources.length === 0) && config.sheetId) {
    return {
      ...config,
      sheetSources: [{
        id: 'migrated-1',
        label: 'Sheet 1',
        sheetUrl: config.sheetUrl,
        sheetId: config.sheetId,
        lastFetchedAt: config.parsedAt,
        keywordCount: 0,
      }],
    };
  }
  if (!config.sheetSources) {
    return { ...config, sheetSources: [] };
  }
  return config;
}

export function getDTConfig(projectSlug: string): DemandTrackerConfig | undefined {
  const raw = dtConfigs.get(projectSlug);
  if (!raw) return undefined;
  return migrateDTConfig(raw);
}

export function setDTConfig(projectSlug: string, config: DemandTrackerConfig): void {
  dtConfigs.set(projectSlug, config);
}

export function updateDTConfig(projectSlug: string, updates: Partial<DemandTrackerConfig>): DemandTrackerConfig | undefined {
  const existing = dtConfigs.get(projectSlug);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates };
  dtConfigs.set(projectSlug, updated);
  return updated;
}

export function getDTData(projectSlug: string): ClientData | undefined {
  return dtDataStore.get(projectSlug);
}

export function setDTData(projectSlug: string, data: ClientData): void {
  dtDataStore.set(projectSlug, data);
}
