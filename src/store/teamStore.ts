"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { requestPersistentStorage } from "@/lib/browser/persistentStorage";
import type { Team, TeamFolder, TeamSetPreset } from "@/lib/core/models";

type TeamInput = Omit<Team, "id"> & { id?: string };

const defaultFolderId = "folder-default";
const outsideFolderName = "\uBC14\uD0D5\uD654\uBA74";

type TeamStore = {
  teams: Team[];
  folders: TeamFolder[];
  presets: TeamSetPreset[];
  setTeams: (teams: Team[]) => void;
  addTeam: (input: TeamInput, folderId?: string) => void;
  updateTeam: (id: string, input: TeamInput) => void;
  deleteTeam: (id: string) => void;
  addFolder: (name: string, parentId?: string) => string;
  updateFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  toggleFolderCollapsed: (id: string) => void;
  moveTeamToFolder: (teamId: string, folderId: string, beforeItemId?: string) => void;
  moveFolderToFolder: (folderId: string, targetFolderId: string, beforeItemId?: string) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
};

const now = () => new Date().toISOString();
const createId = (prefix: string) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const teamItem = (teamId: string) => `team:${teamId}`;
const folderItem = (folderId: string) => `folder:${folderId}`;
const maxPersistedLogoLength = 5_000_000;
const teamStorageName = "bracket-arena-teams";
const teamStorageDbName = "bracket-arena-storage";
const teamStorageStoreName = "zustand";

const starterTeams: Team[] = [];

function createDefaultFolder(teams: Team[]): TeamFolder {
  const timestamp = now();

  return {
    id: defaultFolderId,
    name: outsideFolderName,
    teamIds: teams.map((team) => team.id),
    itemIds: teams.map((team) => teamItem(team.id)),
    collapsed: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function stripTeamDefaultSeed(team: Team): Team {
  const rest: Team & { defaultRating?: unknown } = { ...team };
  delete rest.defaultSeed;
  delete rest.defaultRating;
  sanitizeLogoFields(rest);
  return rest;
}

function sanitizeLogoFields(team: Team) {
  const logoFields: Array<"logoDefault" | "logoLight" | "logoDark" | "logoVictory" | "logoVictoryLight" | "logoVictoryDark"> = [
    "logoDefault",
    "logoLight",
    "logoDark",
    "logoVictory",
    "logoVictoryLight",
    "logoVictoryDark"
  ];
  for (const field of logoFields) {
    const value = team[field];
    if (typeof value === "string" && value.startsWith("data:image/") && value.length > maxPersistedLogoLength) {
      delete team[field];
    }
  }
}

function safeTeams(teams: Team[] | undefined): Team[] {
  return Array.isArray(teams) ? teams.map(stripTeamDefaultSeed) : [];
}

function withoutMovedItems(folders: TeamFolder[], itemIds: string[]) {
  const moving = new Set(itemIds);
  return folders.map((folder) => ({
    ...folder,
    itemIds: (folder.itemIds ?? []).filter((itemId) => !moving.has(itemId)),
    teamIds: (folder.teamIds ?? []).filter((teamId) => !moving.has(teamItem(teamId)))
  }));
}

function isDescendant(folders: TeamFolder[], folderId: string, possibleAncestorId: string): boolean {
  let current = folders.find((folder) => folder.id === folderId);
  while (current?.parentId) {
    if (current.parentId === possibleAncestorId) return true;
    current = folders.find((folder) => folder.id === current?.parentId);
  }
  return false;
}

function collectFolderContents(folders: TeamFolder[], rootFolderId: string) {
  const folderIds = new Set<string>();
  const teamIds = new Set<string>();

  const visit = (folderId: string) => {
    if (folderIds.has(folderId)) return;
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;

    folderIds.add(folderId);
    for (const teamId of folder.teamIds ?? []) {
      teamIds.add(teamId);
    }
    for (const itemId of folder.itemIds ?? []) {
      if (itemId.startsWith("team:")) {
        teamIds.add(itemId.slice("team:".length));
      }
      if (itemId.startsWith("folder:")) {
        visit(itemId.slice("folder:".length));
      }
    }
    for (const child of folders) {
      if (child.parentId === folderId) visit(child.id);
    }
  };

  visit(rootFolderId);
  return { folderIds, teamIds };
}

function normalizeFolders(folders: TeamFolder[] | undefined, teams: Team[] = []): TeamFolder[] {
  const normalizedTeams = safeTeams(teams);
  const sourceFolders = Array.isArray(folders)
    ? folders.filter((folder): folder is TeamFolder => Boolean(folder && folder.id))
    : [];
  const teamIds = new Set(normalizedTeams.map((team) => team.id));
  const timestamp = now();
  let normalized: TeamFolder[] = sourceFolders.length
    ? sourceFolders.map((folder) => ({
        ...folder,
        teamIds: Array.isArray(folder.teamIds) ? folder.teamIds : [],
        itemIds: Array.isArray(folder.itemIds) ? folder.itemIds : []
      }))
    : [createDefaultFolder(normalizedTeams)];

  if (!normalized.some((folder) => folder.id === defaultFolderId)) {
    normalized.unshift(createDefaultFolder([]));
  }

  const folderIds = new Set(normalized.map((folder) => folder.id));
  normalized = normalized.map((folder) => ({
    ...folder,
    name: folder.id === defaultFolderId ? outsideFolderName : folder.name,
    parentId:
      folder.id === defaultFolderId
        ? undefined
        : folder.parentId && folderIds.has(folder.parentId)
          ? folder.parentId
          : defaultFolderId,
    teamIds: (folder.teamIds ?? []).filter((teamId) => teamIds.has(teamId)),
    itemIds: folder.itemIds ?? [],
    collapsed: folder.id === defaultFolderId ? false : Boolean(folder.collapsed),
    updatedAt: folder.updatedAt ?? timestamp
  }));

  const ownerByTeam = new Map<string, string>();
  for (const folder of normalized) {
    const uniqueTeamIds: string[] = [];
    for (const teamId of folder.teamIds ?? []) {
      if (!ownerByTeam.has(teamId)) {
        ownerByTeam.set(teamId, folder.id);
        uniqueTeamIds.push(teamId);
      }
    }
    folder.teamIds = uniqueTeamIds;
  }

  for (const team of normalizedTeams) {
    if (!ownerByTeam.has(team.id)) {
      const root = normalized.find((folder) => folder.id === defaultFolderId);
      root?.teamIds.push(team.id);
      ownerByTeam.set(team.id, defaultFolderId);
    }
  }

  const childrenByFolder = new Map<string, string[]>();
  for (const folder of normalized) {
    if (folder.id === defaultFolderId) continue;
    const parentId = folder.parentId ?? defaultFolderId;
    childrenByFolder.set(parentId, [...(childrenByFolder.get(parentId) ?? []), folder.id]);
  }

  normalized = normalized.map((folder) => {
    const validItems = new Set([
      ...(childrenByFolder.get(folder.id) ?? []).map(folderItem),
      ...(folder.teamIds ?? []).map(teamItem)
    ]);
    const orderedItems = (folder.itemIds ?? []).filter((itemId) => validItems.has(itemId));
    for (const itemId of validItems) {
      if (!orderedItems.includes(itemId)) orderedItems.push(itemId);
    }
    return { ...folder, itemIds: orderedItems };
  });

  return normalized.sort((a, b) => (a.id === defaultFolderId ? -1 : b.id === defaultFolderId ? 1 : 0));
}

function insertItem(itemIds: string[], itemId: string, beforeItemId?: string) {
  const next = itemIds.filter((current) => current !== itemId);
  const index = beforeItemId ? next.indexOf(beforeItemId) : -1;
  if (index >= 0) {
    next.splice(index, 0, itemId);
  } else {
    next.push(itemId);
  }
  return next;
}

function insertTeamId(teamIds: string[], teamId: string, beforeItemId?: string) {
  const next = teamIds.filter((current) => current !== teamId);
  const beforeTeamId = beforeItemId?.startsWith("team:") ? beforeItemId.slice("team:".length) : undefined;
  const index = beforeTeamId ? next.indexOf(beforeTeamId) : -1;
  if (index >= 0) {
    next.splice(index, 0, teamId);
  } else {
    next.push(teamId);
  }
  return next;
}

function openTeamStorageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(teamStorageDbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(teamStorageStoreName)) {
        db.createObjectStore(teamStorageStoreName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function withTeamStorage<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openTeamStorageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(teamStorageStoreName, mode);
    const request = action(transaction.objectStore(teamStorageStoreName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}

const indexedDbStorage: StateStorage<Promise<void>> = {
  async getItem(name) {
    if (typeof indexedDB === "undefined") return null;
    try {
      const stored = await withTeamStorage<string | undefined>("readonly", (store) => store.get(name));
      if (stored) return stored;
    } catch {
      // Fall through to localStorage migration.
    }
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  async setItem(name, value) {
    requestPersistentStorage();
    await withTeamStorage("readwrite", (store) => store.put(value, name));
    try {
      window.localStorage.removeItem(name);
    } catch {
      // IndexedDB is the source of truth; localStorage cleanup is best effort.
    }
  },
  async removeItem(name) {
    await withTeamStorage("readwrite", (store) => store.delete(name));
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore localStorage cleanup failures.
    }
  }
};

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      teams: starterTeams,
      folders: [createDefaultFolder(starterTeams)],
      presets: [],
      setTeams: (teams) => {
        const nextTeams = safeTeams(teams);
        set({ teams: nextTeams, folders: [createDefaultFolder(nextTeams)] });
      },
      addTeam: (input, folderId = defaultFolderId) =>
        set((state) => {
          const teams = safeTeams(state.teams);
          const safeInput = input ?? ({ name: "\uC0C8 \uD300" } as TeamInput);
          const team = {
            ...stripTeamDefaultSeed(safeInput as Team),
            id: safeInput.id ?? createId("team"),
            name: safeInput.name?.trim() || "\uC0C8 \uD300"
          };
          const folders = normalizeFolders(state.folders, teams);
          const targetFolderId = folders.some((folder) => folder.id === folderId) ? folderId : defaultFolderId;

          return {
            teams: [...teams, team],
            folders: folders.map((folder) =>
              folder.id === targetFolderId
                ? {
                    ...folder,
                    teamIds: [...(folder.teamIds ?? []), team.id],
                    itemIds: [...(folder.itemIds ?? []), teamItem(team.id)],
                    updatedAt: now()
                  }
                : folder
            )
          };
        }),
      updateTeam: (id, input) =>
        set((state) => ({
          teams: safeTeams(state.teams).map((team) => (team.id === id ? stripTeamDefaultSeed({ ...team, ...input, id }) : team))
        })),
      deleteTeam: (id) =>
        set((state) => {
          const teams = safeTeams(state.teams);
          return {
            teams: teams.filter((team) => team.id !== id),
            folders: withoutMovedItems(normalizeFolders(state.folders, teams), [teamItem(id)])
          };
        }),
      addFolder: (name, parentId = defaultFolderId) => {
        const folderId = createId("folder");
        set((state) => {
          const timestamp = now();
          const folders = normalizeFolders(state.folders, safeTeams(state.teams));
          const targetId = folders.some((folder) => folder.id === parentId) ? parentId : defaultFolderId;

          return {
            folders: [
              ...folders.map((folder) =>
                folder.id === targetId
                  ? { ...folder, itemIds: [...(folder.itemIds ?? []), folderItem(folderId)], updatedAt: timestamp }
                  : folder
              ),
              {
                id: folderId,
                name: name.trim() || "\uC0C8 \uD3F4\uB354",
                parentId: targetId,
                teamIds: [],
                itemIds: [],
                collapsed: false,
                createdAt: timestamp,
                updatedAt: timestamp
              }
            ]
          };
        });
        return folderId;
      },
      updateFolder: (id, name) =>
        set((state) => ({
          folders: normalizeFolders(state.folders, safeTeams(state.teams)).map((folder) =>
            folder.id === id ? { ...folder, name: name.trim() || folder.name, updatedAt: now() } : folder
          )
        })),
      deleteFolder: (id) =>
        set((state) => {
          if (id === defaultFolderId) return state;
          const teams = safeTeams(state.teams);
          const folders = normalizeFolders(state.folders, teams);
          if (!folders.some((folder) => folder.id === id)) return state;

          const { folderIds, teamIds } = collectFolderContents(folders, id);
          const removedFolderItems = new Set([...folderIds].map(folderItem));
          const remainingTeams = teams.filter((team) => !teamIds.has(team.id));

          return {
            teams: remainingTeams,
            folders: normalizeFolders(
              folders
                .filter((folder) => !folderIds.has(folder.id))
                .map((folder) => ({
                  ...folder,
                  teamIds: (folder.teamIds ?? []).filter((teamId) => !teamIds.has(teamId)),
                  itemIds: (folder.itemIds ?? []).filter((itemId) => {
                    if (removedFolderItems.has(itemId)) return false;
                    return !itemId.startsWith("team:") || !teamIds.has(itemId.slice("team:".length));
                  }),
                  updatedAt: now()
                })),
              remainingTeams
            )
          };
        }),
      toggleFolderCollapsed: (id) =>
        set((state) => ({
          folders: normalizeFolders(state.folders, safeTeams(state.teams)).map((folder) =>
            folder.id === id && folder.id !== defaultFolderId
              ? { ...folder, collapsed: !folder.collapsed, updatedAt: now() }
              : folder
          )
        })),
      moveTeamToFolder: (teamId, folderId, beforeItemId) =>
        set((state) => {
          const folders = withoutMovedItems(normalizeFolders(state.folders, safeTeams(state.teams)), [teamItem(teamId)]);
          return {
            folders: folders.map((folder) =>
              folder.id === folderId
                ? {
                    ...folder,
                    teamIds: insertTeamId(folder.teamIds ?? [], teamId, beforeItemId),
                    itemIds: insertItem(folder.itemIds ?? [], teamItem(teamId), beforeItemId),
                    updatedAt: now()
                  }
                : folder
            )
          };
        }),
      moveFolderToFolder: (folderId, targetFolderId, beforeItemId) =>
        set((state) => {
          if (folderId === defaultFolderId || folderId === targetFolderId) return state;
          const folders = normalizeFolders(state.folders, safeTeams(state.teams));
          if (isDescendant(folders, targetFolderId, folderId)) return state;
          const movedItem = folderItem(folderId);
          const cleaned = withoutMovedItems(folders, [movedItem]);

          return {
            folders: cleaned.map((folder) => {
              if (folder.id === folderId) {
                return { ...folder, parentId: targetFolderId, updatedAt: now() };
              }
              if (folder.id === targetFolderId) {
                return { ...folder, itemIds: insertItem(folder.itemIds ?? [], movedItem, beforeItemId), updatedAt: now() };
              }
              return folder;
            })
          };
        }),
      savePreset: (name) => {
        const timestamp = now();
        const preset: TeamSetPreset = {
          id: createId("preset"),
          name,
          description: "Saved from Team Manager",
          teams: safeTeams(get().teams),
          createdAt: timestamp,
          updatedAt: timestamp
        };

        set((state) => ({ presets: [preset, ...(Array.isArray(state.presets) ? state.presets : [])] }));
      },
      loadPreset: (id) => {
        const preset = (Array.isArray(get().presets) ? get().presets : []).find((item) => item.id === id);
        if (!preset) return;
        set({ teams: safeTeams(preset.teams) });
      }
    }),
    {
      name: teamStorageName,
      storage: createJSONStorage(() => indexedDbStorage),
      version: 2,
      migrate: () => ({
        teams: [],
        folders: [createDefaultFolder([])],
        presets: []
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<TeamStore> | undefined;
        const teams = safeTeams(persistedState?.teams ?? current.teams);
        const presets = Array.isArray(persistedState?.presets) ? persistedState.presets : current.presets;
        return {
          ...current,
          ...persistedState,
          teams,
          folders: normalizeFolders(persistedState?.folders, teams),
          presets: presets.map((preset) => ({
            ...preset,
            teams: safeTeams(preset.teams)
          }))
        };
      },
      partialize: (state) => ({
        teams: safeTeams(state.teams),
        folders: normalizeFolders(state.folders, safeTeams(state.teams)),
        presets: (Array.isArray(state.presets) ? state.presets : []).map((preset) => ({
          ...preset,
          teams: safeTeams(preset.teams)
        }))
      })
    }
  )
);
