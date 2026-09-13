import type { ImportConflictStrategy, LeaguePreset, Team, TeamPreset, TeamSetPreset } from "./models";
import { hasTeamIdentityConflict } from "./team";

export type PresetExportPayload = {
  version: 1;
  exportedAt: string;
  teamPresets: TeamPreset[];
  teamSetPresets: TeamSetPreset[];
  leaguePresets: LeaguePreset[];
};

export function stripTeamDefaultSeed(team: Team): Team {
  const rest: Team & { defaultRating?: unknown } = { ...team };
  delete rest.defaultSeed;
  delete rest.defaultRating;
  return rest;
}

export function normalizeTeamPreset(preset: TeamPreset): TeamPreset {
  return {
    ...preset,
    team: stripTeamDefaultSeed(preset.team)
  };
}

export function normalizeTeamSetPreset(preset: TeamSetPreset): TeamSetPreset {
  return {
    ...preset,
    teams: preset.teams.map(stripTeamDefaultSeed)
  };
}

export function normalizeLeaguePreset(preset: LeaguePreset): LeaguePreset {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    teams: Array.isArray(preset.teams) ? preset.teams.map(stripTeamDefaultSeed) : [],
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt
  };
}

export function createTeamPreset(team: Team, name = team.name): TeamPreset {
  const now = new Date().toISOString();
  return {
    id: `team-preset-${crypto.randomUUID()}`,
    name,
    team: stripTeamDefaultSeed(team),
    createdAt: now,
    updatedAt: now
  };
}

export function createTeamSetPreset(
  teams: Team[],
  name: string,
  description?: string
): TeamSetPreset {
  const now = new Date().toISOString();
  return {
    id: `team-set-${crypto.randomUUID()}`,
    name,
    description,
    teams: teams.map(stripTeamDefaultSeed),
    createdAt: now,
    updatedAt: now
  };
}

export function createLeaguePreset(
  name: string,
  teams: Team[],
  description?: string
): LeaguePreset {
  const now = new Date().toISOString();
  return {
    id: `league-preset-${crypto.randomUUID()}`,
    name,
    description,
    teams: teams.map(stripTeamDefaultSeed),
    createdAt: now,
    updatedAt: now
  };
}

export function mergeTeams(
  currentTeams: Team[],
  incomingTeams: Team[],
  strategy: ImportConflictStrategy
): Team[] {
  const nextTeams = [...currentTeams];

  incomingTeams.forEach((incoming) => {
    const conflictIndex = nextTeams.findIndex((team) => hasTeamIdentityConflict(team, incoming));

    if (conflictIndex < 0 || strategy === "duplicate") {
      const normalizedIncoming = stripTeamDefaultSeed(incoming);
      nextTeams.push({
        ...normalizedIncoming,
        id: strategy === "duplicate" ? `team-${crypto.randomUUID()}` : normalizedIncoming.id
      });
      return;
    }

    if (strategy === "overwrite") {
      nextTeams[conflictIndex] = stripTeamDefaultSeed({
        ...nextTeams[conflictIndex],
        ...stripTeamDefaultSeed(incoming),
        id: nextTeams[conflictIndex].id
      });
    }
  });

  return nextTeams.map(stripTeamDefaultSeed);
}

export function exportPresets(
  teamPresets: TeamPreset[],
  teamSetPresets: TeamSetPreset[],
  leaguePresets: LeaguePreset[] = []
): string {
  const payload: PresetExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    teamPresets: teamPresets.map(normalizeTeamPreset),
    teamSetPresets: teamSetPresets.map(normalizeTeamSetPreset),
    leaguePresets: leaguePresets.map(normalizeLeaguePreset)
  };

  return JSON.stringify(payload, null, 2);
}

export function parsePresetImport(json: string): PresetExportPayload {
  const payload = JSON.parse(json) as Partial<PresetExportPayload>;

  if (payload.version !== 1 || !Array.isArray(payload.teamPresets) || !Array.isArray(payload.teamSetPresets)) {
    throw new Error("Unsupported preset JSON format.");
  }

  return {
    version: 1,
    exportedAt: payload.exportedAt ?? new Date().toISOString(),
    teamPresets: payload.teamPresets.map(normalizeTeamPreset),
    teamSetPresets: payload.teamSetPresets.map(normalizeTeamSetPreset),
    leaguePresets: Array.isArray(payload.leaguePresets) ? payload.leaguePresets.map(normalizeLeaguePreset) : []
  };
}
