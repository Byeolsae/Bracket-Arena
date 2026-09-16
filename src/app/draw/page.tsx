"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Folder, Layers3, Play, RotateCcw, Shuffle, Trophy, Users } from "lucide-react";
import { TeamLogo } from "@/components/teams/TeamLogo";
import type { Team, TeamFolder } from "@/lib/core/models";
import { useTeamStore } from "@/store/teamStore";

type DrawType = "seed" | "group";
type AssignmentMode = "draw" | "manual";
type TournamentMode = "two-stage" | "final-only";
type StageFormat =
  | "single"
  | "double"
  | "triple"
  | "stepladder"
  | "league"
  | "group"
  | "group_double_elimination"
  | "group_triple_elimination"
  | "swiss"
  | "battle_royale";

const stageLabels: Record<StageFormat, string> = {
  single: "싱글 엘리미네이션",
  double: "더블 엘리미네이션",
  triple: "트리플 엘리미네이션",
  stepladder: "스텝래더",
  league: "리그",
  group: "그룹 리그",
  group_double_elimination: "그룹 더블 엘리미네이션",
  group_triple_elimination: "그룹 트리플 엘리미네이션",
  swiss: "스위스",
  battle_royale: "배틀로얄"
};

const qualifierStageOptions: StageFormat[] = [
  "league",
  "group",
  "group_double_elimination",
  "group_triple_elimination",
  "swiss",
  "battle_royale"
];
const finalStageOptions: StageFormat[] = ["single", "double", "triple", "stepladder", "battle_royale"];
const qualifierFinalOptions: Partial<Record<StageFormat, StageFormat[]>> = {
  league: ["single", "double", "triple", "stepladder"],
  group: ["single", "double", "triple", "stepladder"],
  group_double_elimination: ["single", "double", "triple", "stepladder"],
  group_triple_elimination: ["single", "double", "triple", "stepladder"],
  swiss: ["single", "double", "triple", "stepladder"],
  battle_royale: ["battle_royale"]
};
const doubleEliminationCounts = [4, 8, 16];
const tripleEliminationCount = 8;
const BATTLE_ROYALE_QUALIFIER_TEAM_COUNT = 24;
const BATTLE_ROYALE_FINAL_TEAM_COUNT = 16;
const BATTLE_ROYALE_GROUP_COUNT = 3;
const BATTLE_ROYALE_GROUP_SIZE = 8;

function normalizeBattleRoyaleMatchCount(value: number | undefined) {
  return value === 6 ? 6 : 5;
}

function getStageLimitLabel(format: StageFormat) {
  if (format === "triple") return "8팀";
  if (format === "group_double_elimination") return "조당 4팀";
  if (format === "group_triple_elimination") return "조당 8팀";
  if (format === "battle_royale") return "예선 24팀 / 본선 16팀";
  if (format === "single") return "0-32팀";
  if (format === "double") return "4/8/16팀";
  if (format === "group") return "조별 자유";
  return "자유";
}

type DrawResult = {
  team: Team;
  potIndex?: number;
  order: number;
  seed?: number;
  groupIndex?: number;
  slotIndex?: number;
};

function shuffleTeams(teams: Team[]) {
  const next = [...teams];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function makePotAssignments(teams: Team[], potCount: number) {
  return Object.fromEntries(teams.map((team, index) => [team.id, index % Math.max(1, potCount)]));
}

function getGroupShape(teamCount: number, teamsPerGroup: number) {
  const safeTeamCount = Math.max(0, teamCount);
  const safeTeamsPerGroup = Math.max(1, teamsPerGroup);
  if (!safeTeamCount) return { potCount: safeTeamsPerGroup, groupCount: 1 };

  return {
    potCount: Math.min(safeTeamsPerGroup, safeTeamCount),
    groupCount: Math.max(1, Math.ceil(safeTeamCount / safeTeamsPerGroup))
  };
}

function getFixedQualifierGroupShape(format: StageFormat, teamCount: number, teamsPerGroup: number) {
  if (format === "battle_royale") {
    return {
      potCount: BATTLE_ROYALE_GROUP_SIZE,
      groupCount: BATTLE_ROYALE_GROUP_COUNT
    };
  }

  return getGroupShape(teamCount, teamsPerGroup);
}

function getFixedQualifierTeamsPerGroup(format: StageFormat) {
  if (format === "battle_royale") return BATTLE_ROYALE_GROUP_SIZE;
  if (format === "group_double_elimination") return 4;
  if (format === "group_triple_elimination") return 8;
  return undefined;
}

function supportsGroupDraw(format: StageFormat) {
  return format === "group" || format === "group_double_elimination" || format === "group_triple_elimination" || format === "battle_royale";
}

function getFixedFormatError(format: StageFormat, teamCount: number, label: string) {
  if (format === "double" && !doubleEliminationCounts.includes(teamCount)) {
    return `${label} 더블 엘리미네이션은 4/8/16팀만 가능합니다. 현재 ${teamCount}팀입니다.`;
  }
  if (format === "triple" && teamCount !== tripleEliminationCount) {
    return `${label} 트리플 엘리미네이션은 8팀만 가능합니다. 현재 ${teamCount}팀입니다.`;
  }
  if (format === "group_double_elimination" && teamCount % 4 !== 0) {
    return `예선 그룹 더블 엘리미네이션은 조당 4팀 고정입니다. 현재 ${teamCount}팀이라 4의 배수가 아닙니다.`;
  }
  if (format === "group_triple_elimination" && teamCount % 8 !== 0) {
    return `예선 그룹 트리플 엘리미네이션은 조당 8팀 고정입니다. 현재 ${teamCount}팀이라 8의 배수가 아닙니다.`;
  }
  if (format === "battle_royale") {
    const expectedCount = label.includes("예선") ? BATTLE_ROYALE_QUALIFIER_TEAM_COUNT : BATTLE_ROYALE_FINAL_TEAM_COUNT;
    if (teamCount !== expectedCount) {
      return `${label} 배틀로얄은 ${expectedCount}팀 고정입니다. 현재 ${teamCount}팀입니다.`;
    }
  }
  return undefined;
}

function getGroupShapeFromGroupCount(teamCount: number, groupCount: number) {
  const safeTeamCount = Math.max(0, teamCount);
  const safeGroupCount = Math.max(1, Math.min(groupCount, Math.max(1, safeTeamCount || 1)));

  return {
    groupCount: safeGroupCount,
    potCount: Math.max(1, Math.ceil(Math.max(1, safeTeamCount || 1) / safeGroupCount))
  };
}

function normalizeIndex(value: number | undefined, count: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.max(1, count) - 1, Math.floor(value)));
}

function normalizeRank(value: number | undefined, count: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(Math.max(1, count), Math.floor(value)));
}

function makeSeedAssignments(teamIds: string[], current: Record<string, number> = {}) {
  const used = new Set<number>();
  const next: Record<string, number> = {};

  for (const [index, teamId] of teamIds.entries()) {
    const wanted = normalizeRank(current[teamId] ?? index + 1, teamIds.length);
    let seed = wanted;
    while (used.has(seed)) {
      seed = seed >= teamIds.length ? 1 : seed + 1;
    }
    used.add(seed);
    next[teamId] = seed;
  }

  return next;
}

type FolderRow = {
  id: string;
  name: string;
  depth: number;
  teams: Team[];
  allTeamIds: string[];
};

function buildFolderRows(folders: TeamFolder[], teamsById: Map<string, Team>): FolderRow[] {
  if (!folders.length) {
    const teams = [...teamsById.values()];
    return [{ id: "all-teams", name: "전체 팀", depth: 0, teams, allTeamIds: teams.map((team) => team.id) }];
  }

  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const childrenByFolder = new Map<string | undefined, TeamFolder[]>();
  for (const folder of folders) {
    const parentId = folder.parentId;
    childrenByFolder.set(parentId, [...(childrenByFolder.get(parentId) ?? []), folder]);
  }

  const getDirectTeams = (folder: TeamFolder) => {
    const itemIds = folder.itemIds?.length ? folder.itemIds : (folder.teamIds ?? []).map((teamId) => `team:${teamId}`);
    return itemIds
      .filter((itemId) => itemId.startsWith("team:"))
      .map((itemId) => teamsById.get(itemId.slice("team:".length)))
      .filter(Boolean) as Team[];
  };

  const collectTeamIds = (folderId: string, visited = new Set<string>()): string[] => {
    if (visited.has(folderId)) return [];
    visited.add(folderId);
    const folder = foldersById.get(folderId);
    if (!folder) return [];

    const directTeamIds = getDirectTeams(folder).map((team) => team.id);
    const childTeamIds = (childrenByFolder.get(folderId) ?? []).flatMap((child) => collectTeamIds(child.id, visited));
    return [...new Set([...directTeamIds, ...childTeamIds])];
  };

  const rows: FolderRow[] = [];
  const visit = (folder: TeamFolder, depth: number) => {
    const teams = getDirectTeams(folder);
    rows.push({
      id: folder.id,
      name: folder.name,
      depth,
      teams,
      allTeamIds: collectTeamIds(folder.id)
    });
    for (const child of childrenByFolder.get(folder.id) ?? []) {
      visit(child, depth + 1);
    }
  };

  const roots = folders.filter((folder) => !folder.parentId);
  for (const root of roots.length ? roots : folders) visit(root, 0);
  return rows;
}

export default function DrawPage() {
  const teams = useTeamStore((state) => state.teams);
  const folders = useTeamStore((state) => state.folders);
  const [tournamentName, setTournamentName] = useState("새 대회");
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>("two-stage");
  const [qualifierFormat, setQualifierFormat] = useState<StageFormat>("group");
  const [finalFormat, setFinalFormat] = useState<StageFormat>("single");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [randomPickCount, setRandomPickCount] = useState(8);
  const [potCount, setPotCount] = useState(4);
  const [groupCount, setGroupCount] = useState(4);
  const [battleRoundCount, setBattleRoundCount] = useState(5);
  const [drawType, setDrawType] = useState<DrawType>("group");
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("draw");
  const [manualSeedAssignments, setManualSeedAssignments] = useState<Record<string, number>>({});
  const [manualGroupAssignments, setManualGroupAssignments] = useState<Record<string, number>>({});
  const [potAssignments, setPotAssignments] = useState<Record<string, number>>({});
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(() => new Set(["folder-default"]));
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [skipDrawAnimation, setSkipDrawAnimation] = useState(false);
  const [drawQueue, setDrawQueue] = useState<DrawResult[]>([]);
  const [revealedResults, setRevealedResults] = useState<DrawResult[]>([]);
  const [currentResult, setCurrentResult] = useState<DrawResult>();
  const timersRef = useRef<number[]>([]);

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const selectedTeams = useMemo(
    () => selectedTeamIds.map((teamId) => teamsById.get(teamId)).filter(Boolean) as Team[],
    [selectedTeamIds, teamsById]
  );
  const folderRows = useMemo(() => buildFolderRows(folders, teamsById), [folders, teamsById]);
  const canUseGroupDraw = tournamentMode === "two-stage" && supportsGroupDraw(qualifierFormat);
  const fixedQualifierTeamsPerGroup = canUseGroupDraw ? getFixedQualifierTeamsPerGroup(qualifierFormat) : undefined;
  const usesFixedQualifierGroups = drawType === "group" && canUseGroupDraw && Boolean(fixedQualifierTeamsPerGroup);
  const usesRegularGroupCount = drawType === "group" && canUseGroupDraw && !fixedQualifierTeamsPerGroup;
  const usesBattleRoyaleGroupDraw = drawType === "group" && tournamentMode === "two-stage" && qualifierFormat === "battle_royale";
  const safePotCount = usesBattleRoyaleGroupDraw
    ? BATTLE_ROYALE_GROUP_SIZE
    : Math.max(1, Math.min(potCount, Math.max(1, selectedTeams.length || 1)));
  const safeGroupCount = usesBattleRoyaleGroupDraw
    ? BATTLE_ROYALE_GROUP_COUNT
    : Math.max(1, Math.min(groupCount, Math.max(1, selectedTeams.length || 1)));
  const estimatedTeamsPerGroup = Math.max(1, Math.ceil(Math.max(1, selectedTeams.length || teams.length || 1) / safeGroupCount));
  const safeTeamsPerGroup = Math.max(
    1,
    Math.min(fixedQualifierTeamsPerGroup ?? estimatedTeamsPerGroup, Math.max(1, selectedTeams.length || teams.length || 1))
  );
  const pots = Array.from({ length: safePotCount }, (_, potIndex) => ({
    potIndex,
    teams: selectedTeams.filter((team) => normalizePotIndex(potAssignments[team.id], safePotCount) === potIndex)
  }));
  const groupResults = Array.from({ length: safeGroupCount }, (_, groupIndex) => ({
    groupIndex,
    name: `${String.fromCharCode(65 + groupIndex)}조`,
    slots: revealedResults
      .filter((result) => result.groupIndex === groupIndex)
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
  }));
  const seedResults = [...revealedResults].sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
  const availableFinalStageOptions =
    tournamentMode === "two-stage"
      ? finalStageOptions
      : finalStageOptions;
  const disabledFinalOptions =
    tournamentMode === "two-stage"
      ? finalStageOptions.filter((option) => !(qualifierFinalOptions[qualifierFormat] ?? finalStageOptions).includes(option))
      : [];
  const projectedFinalTeamCount =
    tournamentMode === "final-only"
      ? selectedTeams.length
      : qualifierFormat === "battle_royale"
        ? Math.min(selectedTeams.length, BATTLE_ROYALE_FINAL_TEAM_COUNT)
        : qualifierFormat === "group_double_elimination"
        ? safeGroupCount * 2
        : qualifierFormat === "group_triple_elimination"
          ? safeGroupCount * 4
          : undefined;
  const importBlockReason = getImportBlockReason();
  const usesBattleRoyaleSetup =
    tournamentMode === "final-only"
      ? finalFormat === "battle_royale"
      : qualifierFormat === "battle_royale" || finalFormat === "battle_royale";

  useEffect(() => {
    setSelectedTeamIds((current) => current.filter((teamId) => teams.some((team) => team.id === teamId)));
  }, [teams]);

  useEffect(() => {
    if (drawType !== "group" || canUseGroupDraw) return;
    resetDraw();
    setDrawType("seed");
  }, [canUseGroupDraw, drawType]);

  useEffect(() => {
    if (tournamentMode !== "two-stage") return;
    const allowedFinals = qualifierFinalOptions[qualifierFormat] ?? finalStageOptions;
    if (!allowedFinals.includes(finalFormat)) {
      setFinalFormat(allowedFinals[0]);
      resetDraw();
    }
  }, [finalFormat, qualifierFormat, tournamentMode]);

  useEffect(() => {
    if (tournamentMode !== "two-stage" || qualifierFormat !== "battle_royale") return;
    if (drawType !== "group") {
      resetDraw();
      setDrawType("group");
    }
    setGroupCount(BATTLE_ROYALE_GROUP_COUNT);
    setPotCount(BATTLE_ROYALE_GROUP_SIZE);
  }, [drawType, qualifierFormat, tournamentMode]);

  useEffect(() => {
    if (drawType !== "group" || !canUseGroupDraw) return;
    const shape = fixedQualifierTeamsPerGroup
      ? getFixedQualifierGroupShape(qualifierFormat, selectedTeams.length, fixedQualifierTeamsPerGroup)
      : getGroupShapeFromGroupCount(selectedTeams.length, groupCount);
    setPotCount(shape.potCount);
    setGroupCount(shape.groupCount);
    setPotAssignments(makePotAssignments(selectedTeams, shape.potCount));
  }, [canUseGroupDraw, drawType, fixedQualifierTeamsPerGroup, groupCount, qualifierFormat, selectedTeams]);

  useEffect(() => {
    setManualSeedAssignments((current) => makeSeedAssignments(selectedTeamIds, current));
  }, [selectedTeamIds]);

  useEffect(() => {
    setManualGroupAssignments((current) =>
      Object.fromEntries(selectedTeamIds.map((teamId, index) => [teamId, normalizeIndex(current[teamId] ?? index % safeGroupCount, safeGroupCount)]))
    );
  }, [safeGroupCount, selectedTeamIds]);

  useEffect(() => {
    setPotAssignments((current) => {
      const next = { ...current };
      for (const team of selectedTeams) {
        if (typeof next[team.id] !== "number") next[team.id] = selectedTeams.indexOf(team) % safePotCount;
        next[team.id] = normalizePotIndex(next[team.id], safePotCount);
      }
      return next;
    });
  }, [safePotCount, selectedTeams]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function resetDraw() {
    clearTimers();
    setIsDrawing(false);
    setDrawQueue([]);
    setRevealedResults([]);
    setCurrentResult(undefined);
  }

  function selectAll() {
    resetDraw();
    setSelectedTeamIds(teams.map((team) => team.id));
    setPotAssignments(makePotAssignments(teams, safePotCount));
  }

  function clearSelection() {
    resetDraw();
    setSelectedTeamIds([]);
    setPotAssignments({});
  }

  function selectRandomTeams() {
    resetDraw();
    const pickedTeams = shuffleTeams(teams).slice(0, Math.max(1, Math.min(randomPickCount, teams.length)));
    setSelectedTeamIds(pickedTeams.map((team) => team.id));
    setPotAssignments(makePotAssignments(pickedTeams, safePotCount));
  }

  function toggleTeam(teamId: string) {
    resetDraw();
    setSelectedTeamIds((current) => {
      if (current.includes(teamId)) return current.filter((id) => id !== teamId);
      return [...current, teamId];
    });
    setPotAssignments((current) => ({ ...current, [teamId]: normalizePotIndex(current[teamId], safePotCount) }));
  }

  function selectFolderTeams(teamIds: string[]) {
    resetDraw();
    const teamIdSet = new Set(teamIds);
    const nextTeams = teams.filter((team) => selectedTeamIds.includes(team.id) || teamIdSet.has(team.id));
    setSelectedTeamIds(nextTeams.map((team) => team.id));
    setPotAssignments(makePotAssignments(nextTeams, safePotCount));
  }

  function clearFolderTeams(teamIds: string[]) {
    resetDraw();
    const teamIdSet = new Set(teamIds);
    const nextTeams = teams.filter((team) => selectedTeamIds.includes(team.id) && !teamIdSet.has(team.id));
    setSelectedTeamIds(nextTeams.map((team) => team.id));
    setPotAssignments(makePotAssignments(nextTeams, safePotCount));
  }

  function toggleFolderOpen(folderId: string) {
    setOpenFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function toggleFolderSelection(teamIds: string[], selectedCount: number) {
    if (selectedCount === teamIds.length) clearFolderTeams(teamIds);
    else selectFolderTeams(teamIds);
  }

  function moveTeamToPot(teamId: string, potIndex: number) {
    resetDraw();
    setPotAssignments((current) => ({ ...current, [teamId]: potIndex }));
  }

  function autoArrangePots() {
    resetDraw();
    setPotAssignments(makePotAssignments(selectedTeams, safePotCount));
  }

  function assignManualSeed(teamId: string, seed: number) {
    resetDraw();
    const nextSeed = normalizeRank(seed, selectedTeams.length);
    setManualSeedAssignments((current) => {
      const previousSeed = normalizeRank(current[teamId] ?? selectedTeamIds.indexOf(teamId) + 1, selectedTeams.length);
      const occupyingTeamId = selectedTeamIds.find(
        (selectedTeamId, index) => selectedTeamId !== teamId && normalizeRank(current[selectedTeamId] ?? index + 1, selectedTeams.length) === nextSeed
      );
      const next = makeSeedAssignments(selectedTeamIds, current);
      next[teamId] = nextSeed;
      if (occupyingTeamId) next[occupyingTeamId] = previousSeed;
      return makeSeedAssignments(selectedTeamIds, next);
    });
  }

  function assignManualGroup(teamId: string, groupIndex: number) {
    resetDraw();
    setManualGroupAssignments((current) => ({
      ...current,
      [teamId]: normalizeIndex(groupIndex, safeGroupCount)
    }));
  }

  function applyManualAssignments() {
    if (!selectedTeams.length) return;
    clearTimers();
    const results =
      drawType === "seed"
        ? buildManualSeedResults(selectedTeams, manualSeedAssignments)
        : buildManualGroupResults(selectedTeams, manualGroupAssignments, potAssignments, safeGroupCount, safePotCount);
    setDrawQueue(results);
    setRevealedResults(results);
    setCurrentResult(results.at(-1));
    setIsDrawing(false);
  }

  function startDraw() {
    if (assignmentMode === "manual") {
      applyManualAssignments();
      return;
    }
    if (!selectedTeams.length || isDrawing) return;
    clearTimers();

    const queue = drawType === "seed" ? buildSeedDrawQueue(selectedTeams) : buildGroupDrawQueue(pots, safeGroupCount);
    setDrawQueue(queue);
    setRevealedResults([]);
    setCurrentResult(undefined);

    if (skipDrawAnimation) {
      setRevealedResults(queue);
      setCurrentResult(queue.at(-1));
      setIsDrawing(false);
      return;
    }

    setIsDrawing(true);

    queue.forEach((result, index) => {
      const timer = window.setTimeout(() => {
        setCurrentResult(result);
        setRevealedResults((current) => [...current, result]);

        if (index === queue.length - 1) {
          const finishTimer = window.setTimeout(() => setIsDrawing(false), 850);
          timersRef.current.push(finishTimer);
        }
      }, 700 + index * 900);
      timersRef.current.push(timer);
    });
  }

  function importToBracket() {
    if (importBlockReason) return;
    if (!revealedResults.length || typeof window === "undefined") return;
    const orderedResults = [...revealedResults].sort((a, b) => a.order - b.order);
    const payload =
      drawType === "seed"
        ? {
            type: "seed",
            teamIds: seedResults.map((result) => result.team.id),
            setup: {
              tournamentName,
              mode: tournamentMode,
              qualifierFormat,
              finalFormat,
              groupCount: safeGroupCount,
              battleRoundCount: normalizeBattleRoyaleMatchCount(battleRoundCount)
            }
          }
        : {
            type: "group",
            teamIds: orderedResults.map((result) => result.team.id),
            groupCount: safeGroupCount,
            setup: {
              tournamentName,
              mode: tournamentMode,
              qualifierFormat,
              finalFormat,
              groupCount: safeGroupCount,
              battleRoundCount: normalizeBattleRoyaleMatchCount(battleRoundCount)
            },
            assignments: Object.fromEntries(
              orderedResults.map((result) => [result.team.id, result.groupIndex ?? 0])
            )
          };

    window.localStorage.setItem("bracket-arena-draw-import", JSON.stringify(payload));
    window.location.href = "/maker";
  }

  function getImportBlockReason() {
    if (selectedTeams.length < 2) return "최소 2팀을 선택해야 브래킷으로 가져올 수 있습니다.";
    if (tournamentMode === "two-stage") {
      return (
        getFixedFormatError(qualifierFormat, selectedTeams.length, "예선") ??
        (typeof projectedFinalTeamCount === "number"
          ? getFixedFormatError(finalFormat, projectedFinalTeamCount, "본선 진출")
          : undefined)
      );
    }
    return getFixedFormatError(finalFormat, selectedTeams.length, "본선");
  }

  return (
    <main className="w-full px-3 py-6 sm:px-4 2xl:px-5">
      <section className="mb-5 grid gap-4 2xl:grid-cols-[minmax(720px,0.95fr)_minmax(720px,1.35fr)]">
        <div className="grid content-start gap-4 xl:grid-cols-2 2xl:grid-cols-2">
          <section className="arena-card p-4 xl:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-cyan bg-cyan/10 text-cyan">
                <Shuffle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="section-kicker">추첨 및 참가팀</p>
                <h1 className="text-xl font-black uppercase tracking-wide text-ink">추첨 및 참가팀 선택</h1>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-field p-1">
                <button
                  type="button"
                  disabled={!canUseGroupDraw}
                  className={`rounded px-3 py-2 text-sm font-black transition ${
                    drawType === "group"
                      ? "bg-cyan text-arena"
                      : canUseGroupDraw
                        ? "text-muted hover:bg-panel hover:text-ink"
                        : "cursor-not-allowed text-muted opacity-45"
                  }`}
                  onClick={() => {
                    if (!canUseGroupDraw) return;
                    resetDraw();
                    setDrawType("group");
                  }}
                >
                  조 추첨
                </button>
                <button
                  type="button"
                  className={`rounded px-3 py-2 text-sm font-black transition ${
                    drawType === "seed" ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
                  }`}
                  onClick={() => {
                    resetDraw();
                    setDrawType("seed");
                  }}
                >
                  시드 추첨
                </button>
              </div>
              {!canUseGroupDraw ? (
                <div className="rounded-md border border-line bg-field px-3 py-2 text-xs font-semibold leading-5 text-muted">
                  조 추첨 및 조 배정은 예선 방식이 그룹 리그, 그룹 더블 엘리미네이션, 그룹 트리플 엘리미네이션일 때만 사용할 수 있습니다.
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-field p-1">
                <button
                  type="button"
                  className={`rounded px-3 py-2 text-sm font-black transition ${
                    assignmentMode === "draw" ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
                  }`}
                  onClick={() => {
                    resetDraw();
                    setAssignmentMode("draw");
                  }}
                >
                  자동 추첨
                </button>
                <button
                  type="button"
                  className={`rounded px-3 py-2 text-sm font-black transition ${
                    assignmentMode === "manual" ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
                  }`}
                  onClick={() => {
                    resetDraw();
                    setAssignmentMode("manual");
                  }}
                >
                  수동 부여
                </button>
              </div>

              {drawType === "group" ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {usesFixedQualifierGroups ? (
                    <MetricBox label="조별 팀수" value={safeTeamsPerGroup} />
                  ) : (
                    <NumberControl
                      label="조 개수"
                      value={safeGroupCount}
                      min={1}
                      max={Math.max(1, selectedTeams.length || teams.length || 1)}
                      onChange={setGroupCount}
                      onBeforeChange={resetDraw}
                    />
                  )}
                  <MetricBox label="포트 수" value={safePotCount} />
                  <MetricBox
                    label={usesRegularGroupCount ? "예상 조별 팀수" : "조 개수"}
                    value={usesRegularGroupCount ? estimatedTeamsPerGroup : safeGroupCount}
                  />
                </div>
              ) : (
                <div className="rounded-md border border-line bg-field px-3 py-2 text-xs font-semibold leading-5 text-muted">
                  {assignmentMode === "manual"
                    ? "시드 수동 부여는 포트를 사용하지 않고 팀별 시드 번호를 직접 지정합니다."
                    : "시드 추첨은 포트를 사용하지 않고 선택된 팀 전체를 완전 랜덤으로 섞습니다."}
                </div>
              )}

              {assignmentMode === "draw" && drawType === "group" ? (
                <button type="button" className="button-muted w-full justify-center" onClick={autoArrangePots} disabled={!selectedTeams.length}>
                  <Layers3 className="h-4 w-4" />
                  선택 순서대로 포트 자동 배분
                </button>
              ) : null}

              <div className="rounded-md border border-line bg-field px-3 py-2 text-xs font-semibold leading-5 text-muted">
                {assignmentMode === "manual"
                  ? "수동 결과를 적용한 뒤 브래킷으로 가져오면 지정한 시드와 조 배정이 그대로 채워집니다."
                  : "추첨 결과를 브래킷으로 가져오면 참가팀 선택 순서와 조 배정이 자동으로 채워집니다."}
              </div>
            </div>
          </section>

          <section className="arena-card p-4">
            <div className="mb-3">
              <p className="section-kicker">대회 설정</p>
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">브래킷 시작 설정</h2>
            </div>
            <div className="space-y-3">
              <label className="space-y-1.5">
                <span className="text-sm font-bold text-ink">대회 이름</span>
                <input className="input" value={tournamentName} onChange={(event) => setTournamentName(event.target.value)} />
              </label>

              <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-field p-1">
                <button
                  type="button"
                  className={`rounded px-3 py-2 text-sm font-black transition ${
                    tournamentMode === "two-stage" ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
                  }`}
                  onClick={() => setTournamentMode("two-stage")}
                >
                  예선 + 본선
                </button>
                <button
                  type="button"
                  className={`rounded px-3 py-2 text-sm font-black transition ${
                    tournamentMode === "final-only" ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
                  }`}
                  onClick={() => setTournamentMode("final-only")}
                >
                  본선만
                </button>
              </div>

              {tournamentMode === "two-stage" ? (
                <DrawStageSelect label="예선 방식" value={qualifierFormat} options={qualifierStageOptions} onChange={setQualifierFormat} />
              ) : null}
              <DrawStageSelect
                label="본선 방식"
                value={finalFormat}
                options={availableFinalStageOptions}
                disabledOptions={disabledFinalOptions}
                getDisabledReason={(option) =>
                  qualifierFormat === "battle_royale" && option !== "battle_royale"
                    ? "배틀로얄 예선은 배틀로얄 본선으로만 연결됩니다."
                    : qualifierFormat !== "battle_royale" && option === "battle_royale"
                      ? "배틀로얄 본선은 배틀로얄 예선에서만 연결됩니다."
                    : undefined
                }
                onChange={setFinalFormat}
              />
              {usesBattleRoyaleSetup ? (
                <div className="space-y-3 rounded-md border border-line bg-field px-3 py-3">
                  <p className="text-xs font-semibold leading-5 text-muted">
                    배틀로얄 예선은 24팀 고정, A/B/C 3개 조, 조당 8팀입니다. A조 vs B조, A조 vs C조, B조 vs C조 로비가 같은 횟수로 생성되고, 통합 순위 1-16위가 배틀로얄 본선에 진출합니다.
                  </p>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold text-ink">경기 수</span>
                    <select
                      className="input"
                      value={normalizeBattleRoyaleMatchCount(battleRoundCount)}
                      onChange={(event) => setBattleRoundCount(normalizeBattleRoyaleMatchCount(Number(event.target.value)))}
                    >
                      <option value={5}>5경기</option>
                      <option value={6}>6경기</option>
                    </select>
                  </label>
                </div>
              ) : null}
              {importBlockReason ? (
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-bold leading-5 text-danger">
                  {importBlockReason}
                </div>
              ) : null}
            </div>
          </section>

          <section className="arena-card p-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-ink">팀 선택</h2>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {selectedTeams.length}/{teams.length}팀 선택
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="w-36 space-y-1.5">
                  <span className="text-xs font-bold text-ink">무작위 선택 수</span>
                  <input
                    className="input h-9"
                    type="number"
                    min={1}
                    max={Math.max(1, teams.length)}
                    value={Math.max(1, Math.min(randomPickCount, Math.max(1, teams.length || 1)))}
                    onChange={(event) =>
                      setRandomPickCount(Math.max(1, Math.min(Math.max(1, teams.length), Math.floor(Number(event.target.value) || 1))))
                    }
                  />
                </label>
                <button type="button" className="button-primary h-9 justify-center px-3" onClick={selectRandomTeams} disabled={!teams.length}>
                  <Shuffle className="h-4 w-4" />
                  랜덤
                </button>
                <button type="button" className="button-muted h-9 justify-center px-3" onClick={selectAll}>
                  <Users className="h-4 w-4" />
                  전체
                </button>
                <button type="button" className="button-muted h-9 justify-center px-3" onClick={clearSelection}>
                  해제
                </button>
              </div>
            </div>
            <div className="max-h-[560px] space-y-3 overflow-auto pr-1">
              {folderRows.map((folder) => {
                const selectedInFolder = folder.allTeamIds.filter((teamId) => selectedTeamIds.includes(teamId)).length;
                const isOpen = openFolderIds.has(folder.id);
                const isFullySelected = folder.allTeamIds.length > 0 && selectedInFolder === folder.allTeamIds.length;
                return (
                  <section key={folder.id} className="rounded-md border border-line bg-field/70">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2" style={{ paddingLeft: folder.depth * 12 }}>
                        <button
                          type="button"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line bg-panel text-muted transition hover:border-cyan hover:text-cyan"
                          onClick={() => toggleFolderOpen(folder.id)}
                          aria-label={`${folder.name} ${isOpen ? "접기" : "펼치기"}`}
                          title={isOpen ? "폴더 접기" : "폴더 펼치기"}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <Folder className="h-4 w-4 shrink-0 text-cyan" />
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => toggleFolderOpen(folder.id)}>
                          <h3 className="truncate text-sm font-black uppercase tracking-wide text-ink">{folder.name}</h3>
                          <p className="text-xs font-semibold text-muted">
                            {selectedInFolder}/{folder.allTeamIds.length}팀 선택
                          </p>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className={`inline-flex h-8 items-center justify-center rounded border px-3 text-xs font-black uppercase transition ${
                            isFullySelected
                              ? "border-cyan bg-cyan text-arena"
                              : "border-line bg-panel text-muted hover:border-cyan hover:text-cyan"
                          }`}
                          onClick={() => toggleFolderSelection(folder.allTeamIds, selectedInFolder)}
                          disabled={!folder.allTeamIds.length}
                          title={isFullySelected ? "폴더 전체 선택 해제" : "폴더 전체 선택"}
                          aria-label={`${folder.name} ${isFullySelected ? "전체 선택 해제" : "전체 선택"}`}
                        >
                          {isFullySelected ? "선택됨" : "전체선택"}
                        </button>
                      </div>
                    </div>
                    {isOpen ? <div className="grid gap-2 p-2 md:grid-cols-2 2xl:grid-cols-3">
                      {folder.teams.map((team) => {
                        const checked = selectedTeamIds.includes(team.id);
                        const potIndex = normalizePotIndex(potAssignments[team.id], safePotCount);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition ${
                              checked ? "border-cyan bg-cyan/10" : "border-line bg-panel hover:border-cyan/50"
                            }`}
                            onClick={() => toggleTeam(team.id)}
                          >
                            <TeamLogo team={team} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-black uppercase text-ink">{team.shortName || team.name}</div>
                              <div className="truncate text-xs font-semibold text-muted">{team.name}</div>
                            </div>
                            {checked && assignmentMode === "draw" && drawType === "group" ? (
                              <span className="rounded bg-cyan/15 px-2 py-1 text-[10px] font-black uppercase text-cyan">
                                포트 {potIndex + 1}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                      {!folder.teams.length ? (
                        <div className="rounded-md border border-dashed border-line p-3 text-sm font-semibold text-muted">
                          이 폴더에는 직접 들어있는 팀이 없습니다.
                        </div>
                      ) : null}
                    </div> : null}
                  </section>
                );
              })}
              {!teams.length ? (
                <div className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
                  팀 관리에서 팀을 먼저 만들어주세요.
                </div>
              ) : null}
            </div>
          </section>

        </div>

        <div className="space-y-4">
          {assignmentMode === "manual" ? (
            <ManualAssignmentPanel
              drawType={drawType}
              selectedTeams={selectedTeams}
              seedAssignments={manualSeedAssignments}
              groupAssignments={manualGroupAssignments}
              groupCount={safeGroupCount}
              revealedCount={revealedResults.length}
              isBusy={isDrawing}
              onSeedChange={assignManualSeed}
              onGroupChange={assignManualGroup}
              onApply={applyManualAssignments}
              onImport={importToBracket}
              importBlockReason={importBlockReason}
            />
          ) : (
            <section className="arena-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/85 px-5 py-4">
                <div>
                  <p className="section-kicker">실시간 추첨</p>
                  <h2 className="text-3xl font-black uppercase tracking-wide text-ink">
                    {drawType === "seed" ? "시드 추첨 머신" : "조 추첨 머신"}
                  </h2>
                </div>
                <div className="rounded-md border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm font-black text-cyan">
                  {revealedResults.length}/{drawQueue.length || selectedTeams.length} 공개
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-field px-2.5 text-xs font-black uppercase tracking-wide text-muted transition hover:border-cyan hover:text-cyan"
                  onClick={() => setSkipDrawAnimation((current) => !current)}
                  title="켜면 추첨 애니메이션 없이 결과를 즉시 공개합니다"
                  aria-pressed={skipDrawAnimation}
                >
                  <span>스킵</span>
                  <span className={skipDrawAnimation ? "text-muted" : "text-cyan"}>OFF</span>
                  <span
                    className={`relative h-6 w-11 rounded-full border transition ${
                      skipDrawAnimation ? "border-lime bg-lime" : "border-line bg-panel"
                    }`}
                  >
                    <span
                      className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink shadow transition ${
                        skipDrawAnimation ? "left-6 bg-arena" : "left-1"
                      }`}
                    />
                  </span>
                  <span className={skipDrawAnimation ? "text-lime" : "text-muted"}>ON</span>
                </button>
                <button type="button" className="button-primary" onClick={importToBracket} disabled={!revealedResults.length || isDrawing || Boolean(importBlockReason)}>
                  <ArrowRight className="h-4 w-4" />
                  브래킷으로 가져오기
                </button>
              </div>
              {importBlockReason ? (
                <div className="border-b border-danger/30 bg-danger/10 px-5 py-3 text-sm font-bold text-danger">
                  {importBlockReason}
                </div>
              ) : null}

              <div className="grid gap-5 p-5 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
                <DrawMachine
                  currentResult={currentResult}
                  active={isDrawing}
                  drawType={drawType}
                  canStart={Boolean(selectedTeams.length) && !isDrawing}
                  onStart={startDraw}
                  onReset={resetDraw}
                />
                <DrawResultBoard drawType={drawType} seedResults={seedResults} groupResults={groupResults} />
              </div>
            </section>
          )}

          {assignmentMode === "draw" && drawType === "group" ? (
          <section className="arena-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="section-kicker">포트</p>
                <h2 className="text-lg font-black uppercase tracking-wide text-ink">포트 설정</h2>
              </div>
              <span className="text-xs font-semibold text-muted">팀을 드래그해서 포트에 넣으세요.</span>
            </div>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
              {pots.map((pot) => (
                <section
                  key={pot.potIndex}
                  className={`min-h-36 rounded-md border border-dashed p-3 transition ${
                    draggedTeamId ? "border-cyan bg-cyan/10" : "border-line bg-field/70"
                  }`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const teamId = event.dataTransfer.getData("text/team-id") || draggedTeamId;
                    if (teamId) {
                      moveTeamToPot(teamId, pot.potIndex);
                      setDraggedTeamId(null);
                    }
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wide text-ink">포트 {pot.potIndex + 1}</h3>
                    <span className="text-xs font-semibold text-muted">{pot.teams.length}팀</span>
                  </div>
                  <div className="space-y-2">
                    {pot.teams.map((team) => (
                      <div
                        key={team.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/team-id", team.id);
                          setDraggedTeamId(team.id);
                        }}
                        onDragEnd={() => setDraggedTeamId(null)}
                        className="flex cursor-grab items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 transition hover:border-cyan active:cursor-grabbing"
                      >
                        <TeamLogo team={team} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black uppercase text-ink">{team.shortName || team.name}</div>
                          <div className="truncate text-[11px] font-semibold text-muted">{team.name}</div>
                        </div>
                      </div>
                    ))}
                    {!pot.teams.length ? (
                      <div className="rounded-md border border-dashed border-line p-3 text-sm font-semibold text-muted">
                        여기에 드롭
                      </div>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ManualAssignmentPanel({
  drawType,
  selectedTeams,
  seedAssignments,
  groupAssignments,
  groupCount,
  revealedCount,
  isBusy,
  onSeedChange,
  onGroupChange,
  onApply,
  onImport,
  importBlockReason
}: {
  drawType: DrawType;
  selectedTeams: Team[];
  seedAssignments: Record<string, number>;
  groupAssignments: Record<string, number>;
  groupCount: number;
  revealedCount: number;
  isBusy: boolean;
  onSeedChange: (teamId: string, seed: number) => void;
  onGroupChange: (teamId: string, groupIndex: number) => void;
  onApply: () => void;
  onImport: () => void;
  importBlockReason?: string;
}) {
  const title = drawType === "seed" ? "시드 수동 부여" : "조 수동 부여";
  const groupColumns = Array.from({ length: Math.max(1, groupCount) }, (_, groupIndex) => ({
    groupIndex,
    name: `${String.fromCharCode(65 + groupIndex)}조`,
    teams: selectedTeams.filter(
      (team, index) => normalizeIndex(groupAssignments[team.id] ?? index % Math.max(1, groupCount), groupCount) === groupIndex
    )
  }));
  const sortedSeedTeams = [...selectedTeams].sort(
    (left, right) =>
      normalizeRank(seedAssignments[left.id] ?? selectedTeams.indexOf(left) + 1, selectedTeams.length) -
      normalizeRank(seedAssignments[right.id] ?? selectedTeams.indexOf(right) + 1, selectedTeams.length)
  );

  return (
    <section className="arena-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/85 px-5 py-4">
        <div>
          <p className="section-kicker">수동 배정</p>
          <h2 className="text-3xl font-black uppercase tracking-wide text-ink">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="rounded-md border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm font-black text-cyan">
            {revealedCount}/{selectedTeams.length} 적용
          </div>
          <button type="button" className="button-primary" onClick={onApply} disabled={!selectedTeams.length || isBusy}>
            <Play className="h-4 w-4" />
            수동 결과 적용
          </button>
          <button type="button" className="button-muted" onClick={onImport} disabled={!revealedCount || isBusy || Boolean(importBlockReason)}>
            <ArrowRight className="h-4 w-4" />
            브래킷으로 가져오기
          </button>
        </div>
      </div>

      <div className="p-5">
        {importBlockReason ? (
          <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-bold text-danger">
            {importBlockReason}
          </div>
        ) : null}
        <div className="mb-4 rounded-md border border-line bg-field px-3 py-2 text-xs font-semibold leading-5 text-muted">
          {drawType === "seed" ? "중복 시드는 자동으로 서로 교체됩니다." : "팀 카드를 원하는 조 칸으로 드래그해서 배정하세요."}
        </div>

        {drawType === "seed" ? (
          <div className="grid max-h-[560px] gap-2 overflow-auto pr-1 md:grid-cols-2">
            {sortedSeedTeams.map((team, index) => (
              <div key={team.id} className="flex items-center gap-3 rounded-md border border-line bg-field px-3 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-md border border-cyan/40 bg-cyan/10 text-xs font-black text-cyan">
                  #{normalizeRank(seedAssignments[team.id] ?? index + 1, selectedTeams.length)}
                </span>
                <TeamLogo team={team} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black uppercase text-ink">{team.shortName || team.name}</div>
                  <div className="truncate text-xs font-semibold text-muted">{team.name}</div>
                </div>
              <select
                className="input h-9 w-28"
                value={normalizeRank(seedAssignments[team.id] ?? index + 1, selectedTeams.length)}
                onChange={(event) => onSeedChange(team.id, Number(event.target.value))}
              >
                {selectedTeams.map((_, seedIndex) => (
                  <option key={seedIndex + 1} value={seedIndex + 1}>
                    #{seedIndex + 1}
                  </option>
                ))}
              </select>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid max-h-[620px] gap-3 overflow-auto pr-1 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {groupColumns.map((group) => (
              <section
                key={group.groupIndex}
                className="min-h-44 rounded-md border border-dashed border-line bg-field/70 p-3 transition hover:border-cyan"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const teamId = event.dataTransfer.getData("text/team-id");
                  if (teamId) onGroupChange(teamId, group.groupIndex);
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black uppercase tracking-wide text-ink">{group.name}</h3>
                  <span className="text-xs font-semibold text-muted">{group.teams.length}팀</span>
                </div>
                <div className="space-y-2">
                  {group.teams.map((team) => (
                    <TeamDragCard key={team.id} team={team} />
                  ))}
                  {!group.teams.length ? (
                    <div className="rounded-md border border-dashed border-line p-3 text-sm font-semibold text-muted">
                      여기에 드롭
                    </div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        )}

        {!selectedTeams.length ? (
          <div className="rounded-md border border-dashed border-line p-4 text-sm font-semibold text-muted">
            먼저 참가팀을 선택하세요.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TeamDragCard({ team }: { team: Team }) {
  return (
    <div
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/team-id", team.id)}
      className="flex cursor-grab items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 transition hover:border-cyan active:cursor-grabbing"
    >
      <TeamLogo team={team} size="sm" />
      <div className="min-w-0">
        <div className="truncate text-sm font-black uppercase text-ink">{team.shortName || team.name}</div>
        <div className="truncate text-[11px] font-semibold text-muted">{team.name}</div>
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="grid min-h-[88px] content-between rounded-md border border-line bg-field px-3 py-2">
      <div className="text-sm font-bold text-ink">{label}</div>
      <div className="text-2xl font-black leading-none text-cyan">{value}</div>
    </div>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
  onBeforeChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  onBeforeChange: () => void;
}) {
  return (
    <label className="grid min-h-[88px] content-between rounded-md border border-line bg-field px-3 py-2">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className="input h-9 disabled:cursor-not-allowed disabled:opacity-45"
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onBeforeChange();
          onChange(Math.max(min, Math.min(max, Math.floor(Number(event.target.value) || min))));
        }}
      />
    </label>
  );
}

function DrawStageSelect({
  label,
  value,
  options,
  disabledOptions = [],
  getDisabledReason,
  onChange
}: {
  label: string;
  value: StageFormat;
  options: StageFormat[];
  disabledOptions?: StageFormat[];
  getDisabledReason?: (format: StageFormat) => string | undefined;
  onChange: (format: StageFormat) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-ink">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value as StageFormat)}>
        {options.map((option) => {
          const disabled = disabledOptions.includes(option);
          const reason = getDisabledReason?.(option);
          return (
            <option key={option} value={option} disabled={disabled} title={reason}>
              {stageLabels[option]} ({getStageLimitLabel(option)}){disabled ? " - 비활성화" : ""}
            </option>
          );
        })}
      </select>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        <span className="rounded border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-cyan">
          {getStageLimitLabel(value)}
        </span>
        <span>{stageLabels[value]}</span>
      </div>
    </label>
  );
}

function DrawMachine({
  currentResult,
  active,
  drawType,
  canStart,
  onStart,
  onReset
}: {
  currentResult?: DrawResult;
  active: boolean;
  drawType: DrawType;
  canStart: boolean;
  onStart: () => void;
  onReset: () => void;
}) {
  const destination =
    currentResult && drawType === "seed"
      ? `Seed #${currentResult.seed}`
      : currentResult
        ? `${String.fromCharCode(65 + (currentResult.groupIndex ?? 0))}조 #${(currentResult.slotIndex ?? 0) + 1}`
        : "준비 완료";

  return (
    <div className="relative min-h-[450px] overflow-hidden rounded-md border border-line bg-[radial-gradient(circle_at_50%_42%,rgba(47,230,255,0.16),transparent_36%),hsl(var(--field))]">
      <button
        type="button"
        className="absolute right-3 top-3 z-10 inline-flex h-8 items-center gap-1 rounded border border-line bg-arena/85 px-2 text-[11px] font-black uppercase tracking-wide text-muted transition hover:border-cyan hover:text-cyan"
        onClick={onReset}
        title="초기화"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        초기화
      </button>
      <button
        type="button"
        className="absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full border-4 border-cyan/35 bg-panel/80 shadow-[inset_0_0_60px_rgba(47,230,255,0.18),0_0_42px_rgba(47,230,255,0.16)] transition hover:border-lime/70 hover:shadow-[inset_0_0_60px_rgba(47,230,255,0.18),0_0_42px_rgba(130,255,49,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
        onClick={onStart}
        disabled={!canStart}
        title={canStart ? "클릭해서 추첨 시작" : active ? "추첨 진행 중" : "팀을 먼저 선택하세요"}
        aria-label="추첨 시작"
      />
      <button
        type="button"
        className="absolute left-1/2 top-20 grid h-48 w-48 -translate-x-1/2 place-items-center rounded-full border border-line bg-arena/90 transition hover:border-lime disabled:cursor-not-allowed"
        onClick={onStart}
        disabled={!canStart}
        title={canStart ? "클릭해서 추첨 시작" : active ? "추첨 진행 중" : "팀을 먼저 선택하세요"}
      >
        {currentResult ? (
          <div key={`${currentResult.team.id}-${currentResult.order}`} className="draw-reveal text-center">
            <TeamLogo team={currentResult.team} size="lg" />
            <div className="mt-3 text-2xl font-black uppercase text-ink">
              {currentResult.team.shortName || currentResult.team.name}
            </div>
            <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-cyan">{destination}</div>
            {typeof currentResult.potIndex === "number" ? (
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                포트 {currentResult.potIndex + 1}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-center">
            <Trophy className="mx-auto h-10 w-10 text-cyan" />
            <div className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-muted">준비 완료</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan">
              클릭해서 추첨
            </div>
          </div>
        )}
      </button>
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-arena/90 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-muted">
        {active ? "추첨 중..." : currentResult ? "추첨 완료" : "추첨 대기"}
      </div>
    </div>
  );
}

function DrawResultBoard({
  drawType,
  seedResults,
  groupResults
}: {
  drawType: DrawType;
  seedResults: DrawResult[];
  groupResults: Array<{ groupIndex: number; name: string; slots: DrawResult[] }>;
}) {
  if (drawType === "seed") {
    return (
      <div className="grid content-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {seedResults.map((result) => (
          <ResultRow key={`${result.team.id}-${result.seed}`} result={result} label={`#${result.seed}`} />
        ))}
        {!seedResults.length ? <EmptyResult label="시드 추첨을 시작하면 결과가 표시됩니다." /> : null}
      </div>
    );
  }

  return (
    <div className="grid content-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      {groupResults.map((group) => (
        <section key={group.groupIndex} className="rounded-md border border-line bg-field/80 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wide text-ink">{group.name}</h3>
            <span className="text-xs font-semibold text-muted">{group.slots.length}팀</span>
          </div>
          <div className="space-y-2">
            {group.slots.map((result) => (
              <ResultRow key={`${result.team.id}-${result.slotIndex}`} result={result} label={`#${(result.slotIndex ?? 0) + 1}`} />
            ))}
            {!group.slots.length ? <EmptyResult label="아직 배정 전" /> : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function ResultRow({ result, label }: { result: DrawResult; label: string }) {
  return (
    <div className="draw-reveal flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan text-xs font-black text-arena">{label}</span>
      <TeamLogo team={result.team} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black uppercase text-ink">{result.team.shortName || result.team.name}</div>
        <div className="truncate text-[11px] font-semibold text-muted">{result.team.name}</div>
      </div>
      {typeof result.potIndex === "number" ? (
        <span className="rounded bg-field px-2 py-1 text-[10px] font-black uppercase text-muted">P{result.potIndex + 1}</span>
      ) : null}
    </div>
  );
}

function EmptyResult({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed border-line p-3 text-sm font-semibold text-muted">{label}</div>;
}

function buildSeedDrawQueue(teams: Team[]): DrawResult[] {
  return shuffleTeams(teams).map((team, index) => ({
    team,
    order: index + 1,
    seed: index + 1
  }));
}

function buildGroupDrawQueue(pots: Array<{ potIndex: number; teams: Team[] }>, groupCount: number): DrawResult[] {
  let order = 1;
  const groupSizes = Array.from({ length: groupCount }, () => 0);

  return pots.flatMap((pot) =>
    shuffleTeams(pot.teams).map((team, index) => {
      const groupIndex = index % groupCount;
      const slotIndex = groupSizes[groupIndex]++;
      return {
        team,
        potIndex: pot.potIndex,
        groupIndex,
        slotIndex,
        order: order++
      };
    })
  );
}

function buildManualSeedResults(teams: Team[], seedAssignments: Record<string, number>): DrawResult[] {
  return teams
    .map((team, index) => ({
      team,
      order: normalizeRank(seedAssignments[team.id] ?? index + 1, teams.length),
      seed: normalizeRank(seedAssignments[team.id] ?? index + 1, teams.length)
    }))
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
}

function buildManualGroupResults(
  teams: Team[],
  groupAssignments: Record<string, number>,
  potAssignments: Record<string, number>,
  groupCount: number,
  potCount: number
): DrawResult[] {
  const groupSizes = Array.from({ length: groupCount }, () => 0);

  return teams.map((team, index) => {
    const groupIndex = normalizeIndex(groupAssignments[team.id] ?? index % groupCount, groupCount);
    const slotIndex = groupSizes[groupIndex]++;
    return {
      team,
      potIndex: normalizePotIndex(potAssignments[team.id], potCount),
      groupIndex,
      slotIndex,
      order: index + 1
    };
  });
}

function normalizePotIndex(value: number | undefined, potCount: number) {
  return normalizeIndex(value, potCount);
}
