"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronDown, ChevronRight, Folder, Info, Play, Printer, Settings2, Shuffle, Swords, Users } from "lucide-react";
import { PlacementSummary, type PlacementSummaryEntry } from "@/components/tournament/PlacementSummary";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { nextPowerOfTwo } from "@/lib/core/bye";
import { useUiStore, type AppLanguage } from "@/store/uiStore";
import { calculateBattleRoyaleStandings, generateBattleRoyaleRounds } from "@/lib/core/battleRoyale";
import { createGroupStage, calculateGroupStandings } from "@/lib/core/group";
import {
  createGroupTripleEliminationStage,
  getGroupTripleEliminationAdvancingTeams
} from "@/lib/core/groupElimination";
import { createGroupDoubleEliminationStage, getGroupDoubleEliminationAdvancingTeams } from "@/lib/core/groupDoubleElimination";
import { createLeagueStage } from "@/lib/core/league";
import { getStageAdvancingTeams } from "@/lib/core/advancement";
import { calculateLeagueStandings } from "@/lib/core/ranking";
import { createSwissStage, getRankedSwissRecords, getRecommendedSwissConfig } from "@/lib/core/swiss";
import { generateTripleEliminationBracket } from "@/lib/core/tripleElimination";
import {
  MAX_DOUBLE_ELIMINATION_TEAMS,
  MAX_SINGLE_ELIMINATION_TEAMS,
  MAX_TRIPLE_ELIMINATION_TEAMS
} from "@/lib/core/eliminationSizing";
import type {
  BattleRoyaleStage,
  BracketStageMatch,
  DoubleEliminationBracket,
  GroupDoubleEliminationStage,
  GroupStage,
  GroupTripleEliminationStage,
  LeagueStage,
  StepladderBracket,
  SwissStage,
  Team,
  TeamFolder,
  Tournament,
  TripleEliminationStage
} from "@/lib/core/models";
import { useTeamStore } from "@/store/teamStore";
import { useTournamentStore } from "@/store/tournamentStore";

const BattleRoyaleStageView = dynamic(
  () => import("@/components/tournament/BattleRoyaleStageView").then((mod) => mod.BattleRoyaleStageView),
  { ssr: false }
);
const BracketView = dynamic(
  () => import("@/components/bracket/BracketView").then((mod) => mod.BracketView),
  { ssr: false }
);
const DoubleEliminationView = dynamic(
  () => import("@/components/bracket/DoubleEliminationView").then((mod) => mod.DoubleEliminationView),
  { ssr: false }
);
const GroupDoubleEliminationView = dynamic(
  () => import("@/components/tournament/GroupDoubleEliminationView").then((mod) => mod.GroupDoubleEliminationView),
  { ssr: false }
);
const GroupStageView = dynamic(
  () => import("@/components/tournament/GroupStageView").then((mod) => mod.GroupStageView),
  { ssr: false }
);
const LeagueStageView = dynamic(
  () => import("@/components/tournament/LeagueStageView").then((mod) => mod.LeagueStageView),
  { ssr: false }
);
const StepladderView = dynamic(
  () => import("@/components/bracket/StepladderView").then((mod) => mod.StepladderView),
  { ssr: false }
);
const SwissStageView = dynamic(
  () => import("@/components/tournament/SwissStageView").then((mod) => mod.SwissStageView),
  { ssr: false }
);
const TripleEliminationView = dynamic(
  () => import("@/components/bracket/TripleEliminationView").then((mod) => mod.TripleEliminationView),
  { ssr: false }
);

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

type ActiveStage = {
  role: "qualifier" | "final";
  format: StageFormat;
  teamCount: number;
};

type TournamentMode = "two-stage" | "final-only";
type DrawImportSetup = {
  tournamentName?: string;
  mode?: TournamentMode;
  qualifierFormat?: StageFormat;
  finalFormat?: StageFormat;
  groupCount?: number;
};
type DrawImportPayload =
  | { type: "seed"; teamIds: string[]; setup?: DrawImportSetup }
  | { type: "group"; teamIds: string[]; groupCount: number; assignments: Record<string, number>; setup?: DrawImportSetup };
type FixedGroupPlayoffResult =
  | { ok: true; teams: Team[]; template: GroupSeedTemplateSlot[] }
  | { ok: false; error: string };
type GroupSeedTemplateSlot = {
  homeGroupIndex: number;
  homeRank: number;
  awayGroupIndex: number;
  awayRank: number;
};

const STAGE_LABELS: Record<StageFormat, { label: string; hint: string }> = {
  single: { label: "싱글 엘리미네이션", hint: "한 번 지면 탈락하는 기본 녹아웃 브래킷" },
  double: { label: "더블 엘리미네이션", hint: "상위조 / 하위조 / 그랜드 파이널" },
  triple: { label: "트리플 엘리미네이션", hint: "8팀 고정 본선, 0패 / 1패 / 2패 그룹 구조" },
  stepladder: { label: "스텝래더", hint: "낮은 시드부터 높은 시드에게 도전" },
  league: { label: "리그", hint: "라운드 로빈 순위표" },
  group: { label: "그룹 리그", hint: "조별 라운드 로빈" },
  group_double_elimination: { label: "그룹 더블 엘리미네이션", hint: "조별 4팀 더블 엘리, 상위 2팀 진출" },
  group_triple_elimination: { label: "그룹 트리플 엘리미네이션", hint: "조별 8팀 상위/하위/라스트 찬스 방식" },
  swiss: { label: "스위스", hint: "같은 전적끼리 매칭" },
  battle_royale: { label: "배틀로얄", hint: "라운드별 순위/킬 누적 점수" }
};

const QUALIFIER_STAGE_OPTIONS: StageFormat[] = [
  "league",
  "group",
  "group_double_elimination",
  "group_triple_elimination",
  "swiss",
  "battle_royale"
];

const FINAL_STAGE_OPTIONS: StageFormat[] = [
  "single",
  "double",
  "triple",
  "stepladder",
  "swiss",
  "battle_royale",
  "league"
];

const TWO_STAGE_FINAL_OPTIONS: StageFormat[] = ["single", "double", "triple", "stepladder", "battle_royale"];

const QUALIFIER_FINAL_COMPATIBILITY: Partial<Record<StageFormat, StageFormat[]>> = {
  league: ["single", "double", "triple", "stepladder"],
  group: ["single", "double", "triple"],
  group_double_elimination: ["single", "double", "triple"],
  group_triple_elimination: ["single", "double", "triple"],
  swiss: ["single", "double", "triple"],
  battle_royale: ["battle_royale"]
};

const ELIMINATION_TEAM_LIMITS: Partial<Record<StageFormat, number>> = {
  single: MAX_SINGLE_ELIMINATION_TEAMS,
  double: MAX_DOUBLE_ELIMINATION_TEAMS,
  triple: MAX_TRIPLE_ELIMINATION_TEAMS,
  group_double_elimination: 4,
  group_triple_elimination: 8
};
const DOUBLE_ELIMINATION_ALLOWED_TEAM_COUNTS = [4, 8, 16];

function isGroupFormat(format: StageFormat) {
  return (
    format === "group" ||
    format === "group_double_elimination" ||
    format === "group_triple_elimination"
  );
}

function isStageFormat(value: unknown): value is StageFormat {
  return typeof value === "string" && value in STAGE_LABELS;
}

const FIXED_GROUP_STAGE_CONFIG: Partial<Record<StageFormat, { teamsPerGroup: number; advancePerGroup: number; label: string }>> = {
  group_double_elimination: {
    teamsPerGroup: 4,
    advancePerGroup: 2,
    label: "그룹 더블 엘리미네이션"
  },
  group_triple_elimination: {
    teamsPerGroup: 8,
    advancePerGroup: 4,
    label: "그룹 트리플 엘리미네이션"
  }
};

function getFixedGroupConfig(format: StageFormat) {
  return FIXED_GROUP_STAGE_CONFIG[format];
}

function getStageLimitLabel(format: StageFormat) {
  if (format === "double") return "4/8/16팀";
  if (format === "triple") return "8팀 고정";
  if (format === "group_double_elimination") return "조당 4팀 고정";
  if (format === "group_triple_elimination") return "조당 8팀 고정";
  if (format === "single") return `2-${MAX_SINGLE_ELIMINATION_TEAMS}팀`;

  const limit = ELIMINATION_TEAM_LIMITS[format];
  if (limit) return `2-${limit}팀`;

  if (format === "group") return "조별 자유";
  if (format === "swiss") return "자유";
  if (format === "league") return "자유";
  if (format === "battle_royale") return "자유";

  return "자유";
}

function getStageDisplayLabel(format: StageFormat) {
  return `${STAGE_LABELS[format].label} (${getStageLimitLabel(format)})`;
}

function getProjectedAdvancingCount(
  qualifierFormat: StageFormat,
  selectedTeamCount: number,
  groupCount: number,
  leagueAdvanceCount: number,
  groupAdvanceCount: number,
  battleAdvanceCount: number
) {
  if (selectedTeamCount <= 0) return 0;

  if (qualifierFormat === "league" || qualifierFormat === "swiss") {
    return Math.min(selectedTeamCount, Math.max(0, leagueAdvanceCount));
  }

  if (qualifierFormat === "battle_royale") {
    return Math.min(selectedTeamCount, Math.max(0, battleAdvanceCount));
  }

  if (isGroupFormat(qualifierFormat)) {
    const fixedConfig = getFixedGroupConfig(qualifierFormat);
    const effectiveGroups = getEffectiveGroupCount(qualifierFormat, selectedTeamCount, groupCount);
    const advancePerGroup = fixedConfig?.advancePerGroup ?? groupAdvanceCount;
    return Math.min(selectedTeamCount, Math.max(0, advancePerGroup) * effectiveGroups);
  }

  return selectedTeamCount;
}

function getFinalFormatDisabledReason(format: StageFormat, teamCount: number) {
  if (teamCount < 2) return "진출팀 2팀 미만";
  if (format === "single" && teamCount > MAX_SINGLE_ELIMINATION_TEAMS) {
    return `진출팀 ${teamCount}팀, 최대 ${MAX_SINGLE_ELIMINATION_TEAMS}팀`;
  }
  if (format === "double" && !DOUBLE_ELIMINATION_ALLOWED_TEAM_COUNTS.includes(teamCount)) {
    return `진출팀 ${teamCount}팀, 4/8/16팀 필요`;
  }
  if (format === "triple" && teamCount !== MAX_TRIPLE_ELIMINATION_TEAMS) {
    return `진출팀 ${teamCount}팀, 8팀 필요`;
  }
  return undefined;
}

function getEffectiveGroupCount(format: StageFormat, teamCount: number, requestedGroupCount: number) {
  const fixedConfig = getFixedGroupConfig(format);
  if (fixedConfig) return Math.max(1, Math.ceil(Math.max(1, teamCount) / fixedConfig.teamsPerGroup));
  return Math.max(1, Math.min(Math.max(1, requestedGroupCount), Math.max(1, teamCount)));
}

function makeGroupNames(groupCount: number) {
  return Array.from({ length: Math.max(1, groupCount) }, (_, index) => `${String.fromCharCode(65 + index)}그룹`);
}

function buildGroupAssignments(
  teamIds: string[],
  format: StageFormat,
  groupCount: number,
  current: Record<string, number>
) {
  const fixedConfig = getFixedGroupConfig(format);
  const groupLimits = Array.from(
    { length: Math.max(1, groupCount) },
    () => fixedConfig?.teamsPerGroup ?? Number.POSITIVE_INFINITY
  );
  const groupSizes = Array.from({ length: Math.max(1, groupCount) }, () => 0);
  const next: Record<string, number> = {};

  for (const teamId of teamIds) {
    const requestedIndex = current[teamId];
    if (
      typeof requestedIndex === "number" &&
      requestedIndex >= 0 &&
      requestedIndex < groupCount &&
      groupSizes[requestedIndex] < groupLimits[requestedIndex]
    ) {
      next[teamId] = requestedIndex;
      groupSizes[requestedIndex] += 1;
      continue;
    }

    let targetIndex = 0;
    while (targetIndex < groupCount - 1 && groupSizes[targetIndex] >= groupLimits[targetIndex]) targetIndex += 1;
    next[teamId] = targetIndex;
    groupSizes[targetIndex] += 1;
  }

  return next;
}

function shuffleIds(ids: string[]) {
  const next = [...ids];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function getGroupLocalSeed(teamId: string, selectedTeamIds: string[], assignments: Record<string, number>, groupCount: number) {
  const safeGroupCount = Math.max(1, groupCount);
  const groupIndex = Math.max(0, Math.min(safeGroupCount - 1, assignments[teamId] ?? 0));
  const seed =
    selectedTeamIds.filter((id) => (assignments[id] ?? 0) === groupIndex).indexOf(teamId) + 1;

  return {
    groupIndex,
    seed: Math.max(1, seed)
  };
}

function isPowerOfTwo(value: number) {
  return value > 0 && (value & (value - 1)) === 0;
}

function areGroupMatchesComplete(stage: GroupStage) {
  return stage.matches.every((match) => match.isBye || match.status === "complete");
}

function buildCyclicGroupSeedTemplate(groupCount: number, advancePerGroup: number): GroupSeedTemplateSlot[] {
  const slots: GroupSeedTemplateSlot[] = [];

  for (let rank = 1; rank <= advancePerGroup; rank += 2) {
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      slots.push({
        homeGroupIndex: groupIndex,
        homeRank: rank,
        awayGroupIndex: (groupIndex + 1) % groupCount,
        awayRank: rank + 1
      });
    }
  }

  return slots;
}

function createFixedGroupPlayoffSeeding(stage: GroupStage, teams: Team[]): FixedGroupPlayoffResult {
  if (!areGroupMatchesComplete(stage)) {
    return { ok: false, error: "조별리그가 아직 끝나지 않았습니다. 모든 조별 경기를 완료한 뒤 본선을 생성할 수 있습니다." };
  }

  const groupCount = stage.groups.length;
  const advancePerGroup = stage.options.advancePerGroup;
  const advancingCount = groupCount * advancePerGroup;

  if (groupCount < 2) return { ok: false, error: "고정 조별 대진은 최소 2개 조가 필요합니다." };
  if (advancePerGroup < 2 || advancePerGroup % 2 !== 0) {
    return { ok: false, error: "고정 조별 대진은 조별 진출팀 수가 2, 4, 6처럼 짝수여야 합니다." };
  }
  if (!isPowerOfTwo(advancingCount)) {
    return { ok: false, error: `고정 조별 대진 진출팀 ${advancingCount}팀은 토너먼트 규모에 맞지 않습니다. 2, 4, 8, 16, 32팀이어야 합니다.` };
  }

  const standingsByGroup = calculateGroupStandings(stage, teams);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const template = buildCyclicGroupSeedTemplate(groupCount, advancePerGroup);
  const bracketSize = advancingCount;
  const seededTeams: Team[] = [];
  const usedTeamIds = new Set<string>();

  for (const [matchIndex, slot] of template.entries()) {
    const homeStanding = standingsByGroup[stage.groups[slot.homeGroupIndex]?.id]?.[slot.homeRank - 1];
    const awayStanding = standingsByGroup[stage.groups[slot.awayGroupIndex]?.id]?.[slot.awayRank - 1];
    const homeTeam = homeStanding ? teamsById.get(homeStanding.teamId) : undefined;
    const awayTeam = awayStanding ? teamsById.get(awayStanding.teamId) : undefined;

    if (!homeTeam || !awayTeam) {
      const homeLabel = `${stage.groups[slot.homeGroupIndex]?.name ?? `${slot.homeGroupIndex + 1}조`} ${slot.homeRank}위`;
      const awayLabel = `${stage.groups[slot.awayGroupIndex]?.name ?? `${slot.awayGroupIndex + 1}조`} ${slot.awayRank}위`;
      return { ok: false, error: `${homeLabel} 또는 ${awayLabel} 진출팀이 확정되지 않았습니다.` };
    }

    if (usedTeamIds.has(homeTeam.id) || usedTeamIds.has(awayTeam.id)) {
      return { ok: false, error: "고정 조별 대진 생성 중 중복 진출팀이 발견되었습니다." };
    }

    usedTeamIds.add(homeTeam.id);
    usedTeamIds.add(awayTeam.id);
    seededTeams.push({ ...homeTeam, defaultSeed: matchIndex + 1 });
    seededTeams.push({ ...awayTeam, defaultSeed: bracketSize - matchIndex });
  }

  return { ok: true, teams: seededTeams, template };
}

export default function MakerPage() {
  const teams = useTeamStore((state) => state.teams);
  const folders = useTeamStore((state) => state.folders);
  const language = useUiStore((state) => state.language);
  const {
    tournament,
    doubleElimination,
    stepladder,
    createTournament,
    createDoubleElimination,
    createStepladder,
    setMatchResult,
    setDoubleResult,
    setStepladderResult,
    clearResult
  } = useTournamentStore();

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [tournamentName, setTournamentName] = useState("새 대회");
  const [mode, setMode] = useState<TournamentMode>("two-stage");
  const [qualifierFormat, setQualifierFormat] = useState<StageFormat>("league");
  const [finalFormat, setFinalFormat] = useState<StageFormat>("single");
  const [activeStage, setActiveStage] = useState<ActiveStage | null>(null);
  const [leagueRounds, setLeagueRounds] = useState<1 | 2>(1);
  const [leagueAdvanceCount, setLeagueAdvanceCount] = useState(4);
  const [groupCount, setGroupCount] = useState(2);
  const [teamGroupAssignments, setTeamGroupAssignments] = useState<Record<string, number>>({});
  const [groupAdvanceCount, setGroupAdvanceCount] = useState(2);
  const [battleRoundCount, setBattleRoundCount] = useState(4);
  const [battleTeamsPerRound, setBattleTeamsPerRound] = useState(16);
  const [battleAdvanceCount, setBattleAdvanceCount] = useState(8);
  const [leagueStage, setLeagueStage] = useState<LeagueStage>();
  const [groupStage, setGroupStage] = useState<GroupStage>();
  const [groupDoubleStage, setGroupDoubleStage] = useState<GroupDoubleEliminationStage>();
  const [groupTripleStage, setGroupTripleStage] = useState<GroupTripleEliminationStage>();
  const [swissStage, setSwissStage] = useState<SwissStage>();
  const [battleRoyaleStage, setBattleRoyaleStage] = useState<BattleRoyaleStage>();
  const [tripleStage, setTripleStage] = useState<TripleEliminationStage>();
  const [creationNotice, setCreationNotice] = useState<string>();

  useEffect(() => {
    setSelectedTeamIds((current) => {
      return current.filter((id) => teams.some((team) => team.id === id));
    });
  }, [teams]);

  useEffect(() => {
    if (typeof window === "undefined" || !teams.length) return;
    const rawImport = window.localStorage.getItem("bracket-arena-draw-import");
    if (!rawImport) return;

    try {
      const payload = JSON.parse(rawImport) as DrawImportPayload;
      const teamIds = payload.teamIds.filter((teamId) => teams.some((team) => team.id === teamId));
      if (!teamIds.length) return;

      if (payload.setup?.tournamentName) setTournamentName(payload.setup.tournamentName);
      if (payload.setup?.mode) setMode(payload.setup.mode);
      if (isStageFormat(payload.setup?.qualifierFormat)) setQualifierFormat(payload.setup.qualifierFormat);
      if (isStageFormat(payload.setup?.finalFormat)) setFinalFormat(payload.setup.finalFormat);
      if (payload.setup?.groupCount) setGroupCount(Math.max(1, payload.setup.groupCount));

      setSelectedTeamIds(teamIds);
      if (payload.type === "group") {
        setGroupCount(Math.max(1, payload.setup?.groupCount ?? payload.groupCount));
        setTeamGroupAssignments(payload.assignments);
        setQualifierFormat((current) => (isGroupFormat(current) ? current : "group"));
      }
      setCreationNotice(payload.type === "group" ? "추첨 결과의 조 배정을 가져왔습니다." : "추첨 결과의 시드 순서를 가져왔습니다.");
    } catch {
      setCreationNotice("추첨 결과를 가져오지 못했습니다.");
    } finally {
      window.localStorage.removeItem("bracket-arena-draw-import");
    }
  }, [teams]);

  const selectedFormat = finalFormat;
  const optionFormats = mode === "two-stage" ? [qualifierFormat, finalFormat] : [finalFormat];
  const activeGroupFormat = optionFormats.find(isGroupFormat) ?? qualifierFormat;
  const effectiveGroupCount = useMemo(
    () => getEffectiveGroupCount(activeGroupFormat, selectedTeamIds.length, groupCount),
    [activeGroupFormat, groupCount, selectedTeamIds.length]
  );
  const projectedFinalTeamCount = useMemo(
    () =>
      mode === "two-stage"
        ? getProjectedAdvancingCount(
            qualifierFormat,
            selectedTeamIds.length,
            groupCount,
            leagueAdvanceCount,
            groupAdvanceCount,
            battleAdvanceCount
          )
        : selectedTeamIds.length,
    [
      battleAdvanceCount,
      groupAdvanceCount,
      groupCount,
      leagueAdvanceCount,
      mode,
      qualifierFormat,
      selectedTeamIds.length
    ]
  );

  useEffect(() => {
    setTeamGroupAssignments((current) =>
      buildGroupAssignments(selectedTeamIds, activeGroupFormat, effectiveGroupCount, current)
    );
  }, [activeGroupFormat, effectiveGroupCount, selectedTeamIds]);

  useEffect(() => {
    if (mode !== "two-stage") return;
    const allowedFinals = QUALIFIER_FINAL_COMPATIBILITY[qualifierFormat] ?? TWO_STAGE_FINAL_OPTIONS;
    const enabledFinals = allowedFinals.filter(
      (format) => !getFinalFormatDisabledReason(format, projectedFinalTeamCount)
    );
    const nextFinal = enabledFinals[0] ?? allowedFinals[0];
    const currentBlocked =
      !allowedFinals.includes(finalFormat) ||
      Boolean(getFinalFormatDisabledReason(finalFormat, projectedFinalTeamCount));

    if (currentBlocked && nextFinal && nextFinal !== finalFormat) setFinalFormat(nextFinal);
  }, [finalFormat, mode, projectedFinalTeamCount, qualifierFormat]);

  const selectedTeams = useMemo(() => {
    const teamsById = new Map(teams.map((team) => [team.id, team]));
    return selectedTeamIds
      .map((teamId, index) => {
        const team = teamsById.get(teamId);
        return team ? { ...team, defaultSeed: index + 1 } : undefined;
      })
      .filter(Boolean) as Team[];
  }, [selectedTeamIds, teams]);
  const bracketSize = nextPowerOfTwo(Math.max(selectedTeams.length, 2));
  const byeCount = Math.max(0, bracketSize - selectedTeams.length);
  const canCreate = selectedTeams.length >= 2;

  function setQualifierWithCompatibility(format: StageFormat) {
    const allowedFinals = QUALIFIER_FINAL_COMPATIBILITY[format] ?? TWO_STAGE_FINAL_OPTIONS;
    const projectedCount = getProjectedAdvancingCount(
      format,
      selectedTeamIds.length,
      groupCount,
      leagueAdvanceCount,
      groupAdvanceCount,
      battleAdvanceCount
    );
    const enabledFinals = allowedFinals.filter((option) => !getFinalFormatDisabledReason(option, projectedCount));
    const nextFinal = enabledFinals[0] ?? allowedFinals[0];

    setQualifierFormat(format);
    if (
      (!allowedFinals.includes(finalFormat) || getFinalFormatDisabledReason(finalFormat, projectedCount)) &&
      nextFinal
    ) {
      setFinalFormat(nextFinal);
    }
  }

  function setCompatibleFinalFormat(format: StageFormat) {
    if (mode === "two-stage") {
      const allowedFinals = QUALIFIER_FINAL_COMPATIBILITY[qualifierFormat] ?? TWO_STAGE_FINAL_OPTIONS;
      if (!allowedFinals.includes(format)) return;
      if (getFinalFormatDisabledReason(format, projectedFinalTeamCount)) return;
    }

    setFinalFormat(format);
  }

  function randomizeSelectedSeeds() {
    setSelectedTeamIds((current) => shuffleIds(current));
  }

  function randomizeSelectedGroups() {
    setTeamGroupAssignments(() =>
      buildGroupAssignments(shuffleIds(selectedTeamIds), activeGroupFormat, effectiveGroupCount, {})
    );
  }

  function getStageLimitMessage(format: StageFormat, stageTeams: Team[]) {
    const maxTeams = ELIMINATION_TEAM_LIMITS[format];
    if (!maxTeams) return undefined;

    if (!isGroupFormat(format)) {
      if (format === "double" && !DOUBLE_ELIMINATION_ALLOWED_TEAM_COUNTS.includes(stageTeams.length)) {
        return `${STAGE_LABELS[format].label}은 4팀, 8팀, 16팀일 때만 생성할 수 있습니다. 현재 ${stageTeams.length}팀입니다.`;
      }
      if (format === "triple" && stageTeams.length !== MAX_TRIPLE_ELIMINATION_TEAMS) {
        return `${STAGE_LABELS[format].label}은 8팀일 때만 생성할 수 있습니다. 현재 ${stageTeams.length}팀입니다.`;
      }
      return stageTeams.length > maxTeams
        ? `${STAGE_LABELS[format].label}은 최대 ${maxTeams}팀까지만 생성할 수 있습니다.`
        : undefined;
    }

    const stageGroupCount = getEffectiveGroupCount(format, stageTeams.length, groupCount);
    const stageAssignments = buildGroupAssignments(
      stageTeams.map((team) => team.id),
      format,
      stageGroupCount,
      teamGroupAssignments
    );
    const stageGroupNames = makeGroupNames(stageGroupCount);
    const sizes = Array.from({ length: Math.max(1, stageGroupCount) }, () => 0);
    stageTeams.forEach((team, index) => {
      const groupIndex = Math.max(
        0,
        Math.min(stageGroupCount - 1, stageAssignments[team.id] ?? index % Math.max(1, stageGroupCount))
      );
      sizes[groupIndex] += 1;
    });
    const tooLargeGroupIndex = sizes.findIndex((size) => size > maxTeams);
    const invalidGroupIndex = sizes.findIndex((size) => size !== maxTeams);

    if (tooLargeGroupIndex >= 0) {
      return `${STAGE_LABELS[format].label}은 조별 ${maxTeams}팀 고정입니다. ${stageGroupNames[tooLargeGroupIndex] ?? `${tooLargeGroupIndex + 1}조`}가 ${sizes[tooLargeGroupIndex]}팀입니다.`;
    }
    if (invalidGroupIndex >= 0) {
      return `${STAGE_LABELS[format].label}은 조별 ${maxTeams}팀 고정입니다. ${stageGroupNames[invalidGroupIndex] ?? `${invalidGroupIndex + 1}조`}가 ${sizes[invalidGroupIndex]}팀입니다.`;
    }
    return undefined;
  }

  function getCurrentAdvancingTeams(): Team[] {
    const rule = {
      id: "maker-auto-advance",
      mode: "overall_top_n" as const,
      count: Math.max(1, Math.min(leagueAdvanceCount, selectedTeams.length))
    };

    if (activeStage?.format === "league" && leagueStage) return getStageAdvancingTeams(leagueStage, selectedTeams, rule);
    if (activeStage?.format === "group" && groupStage) return getStageAdvancingTeams(groupStage, selectedTeams, rule);
    if (activeStage?.format === "group_double_elimination" && groupDoubleStage) {
      return getGroupDoubleEliminationAdvancingTeams(groupDoubleStage, selectedTeams).map((team, index) => ({ ...team, defaultSeed: index + 1 }));
    }
    if (activeStage?.format === "group_triple_elimination" && groupTripleStage) {
      return getGroupTripleEliminationAdvancingTeams(groupTripleStage, selectedTeams).map((team, index) => ({ ...team, defaultSeed: index + 1 }));
    }
    if (activeStage?.format === "swiss" && swissStage) return getStageAdvancingTeams(swissStage, selectedTeams, rule);
    if (activeStage?.format === "battle_royale" && battleRoyaleStage) return getStageAdvancingTeams(battleRoyaleStage, selectedTeams, rule);
    if (activeStage?.format === "single" && tournament?.championId) {
      const champion = selectedTeams.find((team) => team.id === tournament.championId);
      return champion ? [{ ...champion, defaultSeed: 1 }] : [];
    }
    if (activeStage?.format === "double" && doubleElimination?.championId) {
      const champion = selectedTeams.find((team) => team.id === doubleElimination.championId);
      return champion ? [{ ...champion, defaultSeed: 1 }] : [];
    }
    if (activeStage?.format === "triple" && tripleStage?.championId) {
      const champion = selectedTeams.find((team) => team.id === tripleStage.championId);
      return champion ? [{ ...champion, defaultSeed: 1 }] : [];
    }

    return [];
  }

  function getTeamsForStage(role: ActiveStage["role"]): Team[] {
    if (role === "qualifier") return selectedTeams;
    if (mode === "final-only") return selectedTeams;

    const advancingTeams = getCurrentAdvancingTeams();
    return activeStage?.role === "qualifier" ? advancingTeams : selectedTeams;
  }

  function createStage(format: StageFormat, role: ActiveStage["role"]) {
    let stageTeams = getTeamsForStage(role);
    if (role === "final" && mode === "two-stage" && activeStage?.format === "group" && groupStage) {
      const fixedPlayoff = createFixedGroupPlayoffSeeding(groupStage, selectedTeams);
      if (!fixedPlayoff.ok) {
        setCreationNotice(fixedPlayoff.error);
        return;
      }
      stageTeams = fixedPlayoff.teams;
    }
    const limitMessage = getStageLimitMessage(format, stageTeams);
    if (stageTeams.length < 2) {
      setCreationNotice(role === "final" && mode === "two-stage" ? "본선 진출팀이 2팀 이상 확정된 뒤 본선을 생성할 수 있습니다." : "최소 2팀을 선택해야 합니다.");
      return;
    }
    if (limitMessage) {
      setCreationNotice(limitMessage);
      return;
    }
    setCreationNotice(undefined);
    setActiveStage({ format, role, teamCount: stageTeams.length });
    const stageGroupCount = getEffectiveGroupCount(format, stageTeams.length, groupCount);
    const stageGroupNames = makeGroupNames(stageGroupCount);
    const stageGroupAssignments = buildGroupAssignments(
      stageTeams.map((team) => team.id),
      format,
      stageGroupCount,
      teamGroupAssignments
    );
    const fixedGroupConfig = getFixedGroupConfig(format);

    if (format === "single") return createTournament(stageTeams, tournamentName);
    if (format === "double") return createDoubleElimination(stageTeams);
    if (format === "stepladder") return createStepladder(stageTeams);
    if (format === "triple") return setTripleStage(generateTripleEliminationBracket(stageTeams));

    if (format === "league") {
      return setLeagueStage(
        createLeagueStage(stageTeams, {
          rounds: leagueRounds,
          advanceCount: Math.min(leagueAdvanceCount, stageTeams.length)
        })
      );
    }

    if (format === "group") {
      return setGroupStage(
        createGroupStage(stageTeams, {
          groupCount: stageGroupCount,
          groupNames: stageGroupNames,
          assignmentMode: "manual",
          manualGroupAssignments: stageGroupAssignments,
          advancePerGroup: groupAdvanceCount,
          wildcardCount: 0
        })
      );
    }

    if (format === "group_double_elimination") {
      const groupDoubleSize = fixedGroupConfig?.teamsPerGroup ?? 4;
      return setGroupDoubleStage(
        createGroupDoubleEliminationStage(stageTeams, {
          groupCount: stageGroupCount,
          groupNames: stageGroupNames,
          assignmentMode: "manual",
          manualGroupAssignments: stageGroupAssignments,
          teamsPerGroup: groupDoubleSize,
          groupSize: groupDoubleSize,
          advancePerGroup: fixedGroupConfig?.advancePerGroup ?? 2
        })
      );
    }

    if (format === "group_triple_elimination") {
      return setGroupTripleStage(
        createGroupTripleEliminationStage(stageTeams, {
          groupCount: stageGroupCount,
          groupNames: stageGroupNames,
          assignmentMode: "manual",
          manualGroupAssignments: stageGroupAssignments,
          advancePerGroup: fixedGroupConfig?.advancePerGroup ?? groupAdvanceCount
        })
      );
    }

    if (format === "swiss") {
      const recommendedSwiss = getRecommendedSwissConfig(stageTeams.length);
      return setSwissStage(
        createSwissStage(stageTeams, {
          ...recommendedSwiss,
          advanceCount: Math.min(leagueAdvanceCount, stageTeams.length)
        })
      );
    }

    return setBattleRoyaleStage(
      generateBattleRoyaleRounds(stageTeams, {
        roundCount: battleRoundCount,
        teamsPerRound: Math.max(2, battleTeamsPerRound),
        advanceCount: Math.min(battleAdvanceCount, stageTeams.length)
      })
    );
  }

  return (
    <main className="w-full px-3 py-6 sm:px-4 2xl:px-5">
      <BracketLaunchPanel
        tournamentName={tournamentName}
        mode={mode}
        qualifierFormat={qualifierFormat}
        finalFormat={finalFormat}
        teams={selectedTeams}
        groupCount={effectiveGroupCount}
        teamGroupAssignments={teamGroupAssignments}
        projectedFinalTeamCount={projectedFinalTeamCount}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {mode === "two-stage" ? (
          <button className="button-primary" disabled={!canCreate} onClick={() => createStage(qualifierFormat, "qualifier")}>
            <Play className="h-4 w-4" />
            예선 생성
          </button>
        ) : null}
        <button className="button-muted" disabled={!canCreate} onClick={() => createStage(finalFormat, "final")}>
          <Swords className="h-4 w-4" />
          {mode === "two-stage" ? "본선 생성" : "대진표 생성"}
        </button>
        {selectedTeams.length < 2 ? <span className="text-sm font-semibold text-danger">최소 2팀을 선택해야 합니다.</span> : null}
        {creationNotice ? <span className="text-sm font-semibold text-gold">{creationNotice}</span> : null}
      </div>

      <ActiveStageView
        activeStage={activeStage}
        selectedFormat={selectedFormat}
        language={language}
        teams={selectedTeams}
        tournament={tournament}
        doubleElimination={doubleElimination}
        stepladder={stepladder}
        leagueStage={leagueStage}
        groupStage={groupStage}
        groupDoubleStage={groupDoubleStage}
        groupTripleStage={groupTripleStage}
        swissStage={swissStage}
        battleRoyaleStage={battleRoyaleStage}
        tripleStage={tripleStage}
        setLeagueStage={setLeagueStage}
        setGroupStage={setGroupStage}
        setGroupDoubleStage={setGroupDoubleStage}
        setGroupTripleStage={setGroupTripleStage}
        setSwissStage={setSwissStage}
        setBattleRoyaleStage={setBattleRoyaleStage}
        setTripleStage={setTripleStage}
        setMatchResult={setMatchResult}
        setDoubleResult={setDoubleResult}
        setStepladderResult={setStepladderResult}
        clearResult={clearResult}
      />
    </main>
  );
}

function TournamentSetup({
  tournamentName,
  setTournamentName,
  mode,
  setMode,
  qualifierFormat,
  setQualifierFormat,
  finalFormat,
  setFinalFormat,
  projectedFinalTeamCount,
  getFinalDisabledReason
}: {
  tournamentName: string;
  setTournamentName: (value: string) => void;
  mode: TournamentMode;
  setMode: (value: TournamentMode) => void;
  qualifierFormat: StageFormat;
  setQualifierFormat: (value: StageFormat) => void;
  finalFormat: StageFormat;
  setFinalFormat: (value: StageFormat) => void;
  projectedFinalTeamCount: number;
  getFinalDisabledReason: (format: StageFormat) => string | undefined;
}) {
  const finalOptions = mode === "two-stage" ? TWO_STAGE_FINAL_OPTIONS : FINAL_STAGE_OPTIONS;
  const disabledFinalOptions =
    mode === "two-stage" ? finalOptions.filter((option) => Boolean(getFinalDisabledReason(option))) : [];

  return (
    <div className="arena-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-cyan" />
        <h2 className="font-black uppercase tracking-wide text-ink">대회 설정</h2>
      </div>
      <div className="space-y-4">
        <label className="space-y-1.5">
          <span className="text-sm font-bold text-ink">대회 이름</span>
          <input className="input" value={tournamentName} onChange={(event) => setTournamentName(event.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <ModeButton active={mode === "two-stage"} onClick={() => setMode("two-stage")} title="예선 + 본선" description="예선 결과를 본선으로 연결" />
          <ModeButton active={mode === "final-only"} onClick={() => setMode("final-only")} title="본선" description="선택 팀으로 바로 생성" />
        </div>
        {mode === "two-stage" ? (
          <StageSelect label="예선 방식" value={qualifierFormat} options={QUALIFIER_STAGE_OPTIONS} onChange={setQualifierFormat} />
        ) : null}
        <StageSelect
          label="본선 방식"
          value={finalFormat}
          options={finalOptions}
          disabledOptions={disabledFinalOptions}
          getDisabledReason={mode === "two-stage" ? getFinalDisabledReason : undefined}
          onChange={setFinalFormat}
        />
        {mode === "two-stage" ? (
          <p className="rounded-md border border-line bg-field px-3 py-2 text-xs font-semibold leading-5 text-muted">
            예상 본선 진출팀은 {projectedFinalTeamCount}팀입니다. 이 팀 수로 생성할 수 없는 본선 방식은 자동으로 비활성화됩니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  description
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className={`rounded-md border px-3 py-2 text-left transition ${
        active ? "border-cyan bg-cyan/15 text-ink shadow-[0_0_24px_rgba(34,211,238,0.16)]" : "border-line bg-field text-muted hover:border-cyan/60 hover:text-ink"
      }`}
      onClick={onClick}
    >
      <span className="block text-sm font-black uppercase tracking-wide">{title}</span>
      <span className="mt-1 block text-xs font-semibold">{description}</span>
    </button>
  );
}

function BracketLaunchPanel({
  tournamentName,
  mode,
  qualifierFormat,
  finalFormat,
  teams,
  groupCount,
  teamGroupAssignments,
  projectedFinalTeamCount
}: {
  tournamentName: string;
  mode: TournamentMode;
  qualifierFormat: StageFormat;
  finalFormat: StageFormat;
  teams: Team[];
  groupCount: number;
  teamGroupAssignments: Record<string, number>;
  projectedFinalTeamCount: number;
}) {
  const groups = Array.from({ length: Math.max(1, groupCount) }, (_, groupIndex) => ({
    groupIndex,
    name: `${String.fromCharCode(65 + groupIndex)}그룹`,
    teams: teams.filter((team, index) => (teamGroupAssignments[team.id] ?? index % Math.max(1, groupCount)) === groupIndex)
  }));
  const showGroupSummary = mode === "two-stage" && Object.keys(teamGroupAssignments).length > 0;

  return (
    <section className="arena-card mb-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/85 px-5 py-4">
        <div>
          <p className="section-kicker">Bracket Launch</p>
          <h1 className="text-2xl font-black uppercase tracking-wide text-ink">{tournamentName}</h1>
          <p className="mt-1 text-sm text-muted">
            참가팀 선택과 대회 설정은 추첨 및 참가팀 선택 화면에서 관리합니다.
          </p>
        </div>
        <Link className="button-primary" href="/draw">
          <Shuffle className="h-4 w-4" />
          추첨 및 참가팀 선택
        </Link>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(320px,0.55fr)_minmax(0,1.45fr)]">
        <div className="rounded-md border border-line bg-field p-3">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-cyan">설정 요약</p>
          <div className="space-y-2 text-sm font-semibold text-ink">
            <div className="flex justify-between gap-3">
              <span className="text-muted">진행 방식</span>
              <span>{mode === "two-stage" ? "예선 + 본선" : "본선만"}</span>
            </div>
            {mode === "two-stage" ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted">예선</span>
                <span>{getStageDisplayLabel(qualifierFormat)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-muted">본선</span>
              <span>{getStageDisplayLabel(finalFormat)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">참가팀</span>
              <span>{teams.length}팀</span>
            </div>
            {mode === "two-stage" ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted">예상 본선 진출</span>
                <span>{projectedFinalTeamCount}팀</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-line bg-field p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan">참가팀</p>
            <span className="text-xs font-semibold text-muted">{teams.length}팀</span>
          </div>
          {teams.length ? (
            showGroupSummary ? (
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                {groups.map((group) => (
                  <section key={group.groupIndex} className="rounded-md border border-line bg-panel/70 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase text-ink">{group.name}</h3>
                      <span className="text-xs font-semibold text-muted">{group.teams.length}팀</span>
                    </div>
                    <div className="space-y-2">
                      {group.teams.map((team, index) => (
                        <div key={team.id} className="flex items-center gap-2 rounded-md border border-line bg-field px-2 py-1.5">
                          <span className="text-[10px] font-black text-cyan">#{index + 1}</span>
                          <TeamLogo team={team} size="sm" />
                          <span className="min-w-0 truncate text-xs font-black uppercase text-ink">{team.shortName || team.name}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                {teams.map((team, index) => (
                  <div key={team.id} className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan text-xs font-black text-arena">
                      {index + 1}
                    </span>
                    <TeamLogo team={team} size="sm" />
                    <span className="min-w-0 truncate text-sm font-black uppercase text-ink">{team.shortName || team.name}</span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-md border border-dashed border-line p-4 text-sm font-semibold text-muted">
              추첨 및 참가팀 선택에서 팀을 선택한 뒤 브래킷으로 가져오세요.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FilteredStageOptionsPanel({
  formats,
  selectedTeamCount,
  leagueRounds,
  setLeagueRounds,
  leagueAdvanceCount,
  setLeagueAdvanceCount,
  groupCount,
  setGroupCount,
  groupAdvanceCount,
  setGroupAdvanceCount,
  battleRoundCount,
  setBattleRoundCount,
  battleTeamsPerRound,
  setBattleTeamsPerRound,
  battleAdvanceCount,
  setBattleAdvanceCount
}: {
  formats: StageFormat[];
  selectedTeamCount: number;
  leagueRounds: 1 | 2;
  setLeagueRounds: (value: 1 | 2) => void;
  leagueAdvanceCount: number;
  setLeagueAdvanceCount: (value: number) => void;
  groupCount: number;
  setGroupCount: (value: number) => void;
  groupAdvanceCount: number;
  setGroupAdvanceCount: (value: number) => void;
  battleRoundCount: number;
  setBattleRoundCount: (value: number) => void;
  battleTeamsPerRound: number;
  setBattleTeamsPerRound: (value: number) => void;
  battleAdvanceCount: number;
  setBattleAdvanceCount: (value: number) => void;
}) {
  const needsLeague = formats.includes("league");
  const needsSwiss = formats.includes("swiss");
  const needsGroup =
    formats.includes("group") ||
    formats.includes("group_double_elimination") ||
    formats.includes("group_triple_elimination");
  const needsBattleRoyale = formats.includes("battle_royale");
  const safeSelectedTeamCount = Math.max(0, selectedTeamCount);
  const groupCountMax = Math.max(1, safeSelectedTeamCount);
  const normalizedGroupCount = Math.max(1, Math.min(groupCount, groupCountMax));
  const fixedGroupFormat = formats.find((format) => Boolean(getFixedGroupConfig(format)));
  const fixedGroupConfig = fixedGroupFormat ? getFixedGroupConfig(fixedGroupFormat) : undefined;
  const fixedGroupCount = fixedGroupFormat
    ? getEffectiveGroupCount(fixedGroupFormat, safeSelectedTeamCount, groupCount)
    : normalizedGroupCount;
  const maxGroupAdvanceCount = Math.max(
    1,
    Math.ceil(Math.max(1, safeSelectedTeamCount) / normalizedGroupCount)
  );

  if (!needsLeague && !needsSwiss && !needsGroup && !needsBattleRoyale) return null;

  return (
    <div className="arena-card p-4">
      <div className="mb-3 flex items-center gap-2 font-bold text-cyan">
        <Info className="h-4 w-4" />
        Stage 옵션
      </div>
      <div className="space-y-5">
        {needsLeague ? (
          <section>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="진출팀 수" value={leagueAdvanceCount} onChange={setLeagueAdvanceCount} min={1} />
              <label className="space-y-1.5">
                <span className="text-sm font-bold text-ink">리그 방식</span>
                <select className="input" value={leagueRounds} onChange={(event) => setLeagueRounds(Number(event.target.value) as 1 | 2)}>
                  <option value={1}>싱글 라운드 로빈</option>
                  <option value={2}>더블 라운드 로빈</option>
                </select>
              </label>
            </div>
          </section>
        ) : null}

        {needsSwiss ? (
          <section className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-ink">스위스 설정</h3>
            <div className="rounded-md border border-line bg-field px-3 py-2 text-xs font-semibold leading-5 text-muted">
              팀 수에 따라 권장 승/패 기준과 라운드를 자동 적용합니다. 기본은 승수 달성 진출 / 패수 달성 탈락 방식입니다.
            </div>
          </section>
        ) : null}

        {needsGroup ? (
          <section className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-ink">그룹 설정</h3>
            {fixedGroupConfig ? (
              <div className="rounded-md border border-line bg-field px-3 py-2 text-xs font-semibold leading-5 text-muted">
                {fixedGroupConfig.label}은 조별 {fixedGroupConfig.teamsPerGroup}팀 고정, 조별 {fixedGroupConfig.advancePerGroup}팀
                진출입니다. 현재 선택 기준 {fixedGroupCount}개 조가 생성되며, 모든 조가 정확히 {fixedGroupConfig.teamsPerGroup}팀이어야 생성할 수 있습니다.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="조 개수" value={groupCount} onChange={setGroupCount} min={1} max={groupCountMax} />
                  <NumberField
                    label="조별 진출팀"
                    value={groupAdvanceCount}
                    onChange={setGroupAdvanceCount}
                    min={1}
                    max={maxGroupAdvanceCount}
                  />
                </div>
                <p className="text-xs font-semibold leading-5 text-muted">
                  현재 참가팀 기준 조는 최대 {groupCountMax}개, 조별 진출은 최대 {maxGroupAdvanceCount}팀까지 가능합니다.
                </p>
              </>
            )}
          </section>
        ) : null}

        {needsBattleRoyale ? (
          <section className="space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-ink">배틀로얄 설정</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="라운드 수" value={battleRoundCount} onChange={setBattleRoundCount} min={1} />
              <NumberField label="라운드 참가팀" value={battleTeamsPerRound} onChange={setBattleTeamsPerRound} min={2} />
              <NumberField label="진출팀 수" value={battleAdvanceCount} onChange={setBattleAdvanceCount} min={1} />
            </div>
          </section>
        ) : null}

      </div>
    </div>
  );
}

function TeamPicker({
  teams,
  folders,
  selectedTeamIds,
  setSelectedTeamIds,
  selectedCount,
  bracketSize,
  byeCount,
  showGroupSelect,
  groupCount,
  teamGroupAssignments,
  onGroupChange,
  onSeedChange,
  onRandomizeSeed,
  onSeedDistributeGroups,
  onRandomizeGroups
}: {
  teams: Team[];
  folders: TeamFolder[];
  selectedTeamIds: string[];
  setSelectedTeamIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCount: number;
  bracketSize: number;
  byeCount: number;
  showGroupSelect: boolean;
  groupCount: number;
  teamGroupAssignments: Record<string, number>;
  onGroupChange: (teamId: string, groupIndex: number) => void;
  onSeedChange: (teamId: string, seed: number) => void;
  onRandomizeSeed: () => void;
  onSeedDistributeGroups: () => void;
  onRandomizeGroups: () => void;
}) {
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(() => new Set(["folder-default"]));
  const [draggedGroupTeamId, setDraggedGroupTeamId] = useState<string | null>(null);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const folderTree = useMemo(() => buildFolderPickerTree(folders, teams), [folders, teams]);
  const selectedTeams = useMemo(
    () => selectedTeamIds.map((teamId) => teamsById.get(teamId)).filter(Boolean) as Team[],
    [selectedTeamIds, teamsById]
  );

  function toggleFolder(folderId: string) {
    setOpenFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function setFolderTeams(folderTeamIds: string[], checked: boolean) {
    setSelectedTeamIds((current) => {
      const next = new Set(current);
      for (const teamId of folderTeamIds) {
        if (checked) next.add(teamId);
        else next.delete(teamId);
      }
      return teams.filter((team) => next.has(team.id)).map((team) => team.id);
    });
  }

  function toggleFolderTeams(folderTeamIds: string[]) {
    const selectedInFolder = folderTeamIds.filter((teamId) => selectedTeamIds.includes(teamId)).length;
    setFolderTeams(folderTeamIds, selectedInFolder !== folderTeamIds.length);
  }

  return (
    <div className="arena-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md border border-cyan bg-cyan/10 text-cyan">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-black uppercase tracking-wide text-ink">참가팀 선택</h2>
            <p className="text-sm text-muted">
              {selectedCount}/{teams.length}팀 참가 · 기준 브래킷 {bracketSize}강 · 부전승 {byeCount}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="button-muted px-3 py-1 text-sm" onClick={() => setSelectedTeamIds(teams.map((team) => team.id))}>
            전체
          </button>
          <button type="button" className="button-muted px-3 py-1 text-sm" onClick={() => setSelectedTeamIds([])}>
            해제
          </button>
          <button type="button" className="button-muted px-3 py-1 text-sm" onClick={onRandomizeSeed} disabled={!selectedTeamIds.length}>
            <Shuffle className="h-3.5 w-3.5" />
            시드 랜덤
          </button>
          {showGroupSelect ? (
            <>
              <button type="button" className="button-muted px-3 py-1 text-sm" onClick={onSeedDistributeGroups} disabled={!selectedTeamIds.length}>
                시드 배분
              </button>
              <button type="button" className="button-muted px-3 py-1 text-sm" onClick={onRandomizeGroups} disabled={!selectedTeamIds.length}>
                <Shuffle className="h-3.5 w-3.5" />
                그룹 랜덤
              </button>
            </>
          ) : null}
        </div>
      </div>
      {showGroupSelect && selectedTeams.length ? (
        <GroupAssignmentBoard
          teams={selectedTeams}
          groupCount={groupCount}
          teamGroupAssignments={teamGroupAssignments}
          draggedTeamId={draggedGroupTeamId}
          onDragStart={setDraggedGroupTeamId}
          onDragEnd={() => setDraggedGroupTeamId(null)}
          onDropTeam={(teamId, groupIndex) => {
            onGroupChange(teamId, groupIndex);
            setDraggedGroupTeamId(null);
          }}
        />
      ) : null}
      <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
        {folderTree.map((folder) => (
          <FolderSelectSection
            key={folder.id}
            folder={folder}
            teamsById={teamsById}
            selectedTeamIds={selectedTeamIds}
            selectedCount={selectedCount}
            openFolderIds={openFolderIds}
            showGroupSelect={showGroupSelect}
            groupCount={groupCount}
            teamGroupAssignments={teamGroupAssignments}
            onToggleFolder={toggleFolder}
            onToggleFolderTeams={toggleFolderTeams}
            onGroupChange={onGroupChange}
            onSeedChange={onSeedChange}
            onToggleTeam={(teamId) =>
              setSelectedTeamIds((current) =>
                current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]
              )
            }
          />
        ))}
        {!teams.length ? (
          <div className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
            팀이 없습니다. 먼저 팀 관리에서 팀을 만들어주세요.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GroupAssignmentBoard({
  teams,
  groupCount,
  teamGroupAssignments,
  draggedTeamId,
  onDragStart,
  onDragEnd,
  onDropTeam
}: {
  teams: Team[];
  groupCount: number;
  teamGroupAssignments: Record<string, number>;
  draggedTeamId: string | null;
  onDragStart: (teamId: string) => void;
  onDragEnd: () => void;
  onDropTeam: (teamId: string, groupIndex: number) => void;
}) {
  const safeGroupCount = Math.max(1, groupCount);
  const groups = Array.from({ length: safeGroupCount }, (_, groupIndex) => ({
    groupIndex,
    name: `${String.fromCharCode(65 + groupIndex)}그룹`,
    teams: teams.filter((team, index) => (teamGroupAssignments[team.id] ?? index % safeGroupCount) === groupIndex)
  }));

  return (
    <div className="mb-4 rounded-md border border-line bg-field/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan">조 편성</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {groups.map((group) => (
          <div
            key={group.groupIndex}
            className={`min-h-28 rounded-md border border-dashed p-2 transition ${
              draggedTeamId ? "border-cyan bg-cyan/10" : "border-line bg-panel/70"
            }`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const teamId = event.dataTransfer.getData("text/team-id") || draggedTeamId;
              if (teamId) onDropTeam(teamId, group.groupIndex);
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wide text-ink">{group.name}</span>
              <span className="text-xs font-semibold text-muted">{group.teams.length}팀</span>
            </div>
            <div className="flex min-h-14 flex-wrap content-start gap-2">
              {group.teams.map((team, groupSeedIndex) => {
                const groupSeed = groupSeedIndex + 1;
                return (
                <div
                  key={team.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/team-id", team.id);
                    onDragStart(team.id);
                  }}
                  onDragEnd={onDragEnd}
                  className="relative grid h-12 w-12 cursor-grab place-items-center rounded-md border border-line bg-arena p-1 shadow-sm transition hover:border-cyan hover:bg-cyan/10 active:cursor-grabbing"
                  title={`${group.name} #${groupSeed} · ${team.shortName || team.name}`}
                  aria-label={`${group.name} ${groupSeed}번 시드 ${team.shortName || team.name} 배정`}
                >
                  <span className="absolute right-0.5 top-0.5 rounded bg-cyan px-1 text-[9px] font-black leading-3 text-black shadow-sm">
                    #{groupSeed}
                  </span>
                  <TeamLogo team={team} size="sm" />
                </div>
                );
              })}
              {!group.teams.length ? (
                <div className="grid h-12 min-w-24 place-items-center rounded border border-dashed border-line px-2 text-center text-xs font-semibold text-muted">
                  여기에 드롭
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type FolderPickerNode = {
  id: string;
  name: string;
  teamIds: string[];
  children: FolderPickerNode[];
};

function buildFolderPickerTree(folders: TeamFolder[], teams: Team[]): FolderPickerNode[] {
  const defaultFolderId = "folder-default";
  const teamsById = new Set(teams.map((team) => team.id));
  const folderMap = new Map(
    (Array.isArray(folders) ? folders : []).map((folder) => [
      folder.id,
      {
        ...folder,
        teamIds: (folder.teamIds ?? []).filter((teamId) => teamsById.has(teamId)),
        itemIds: folder.itemIds ?? []
      }
    ])
  );
  const root = folderMap.get(defaultFolderId) ?? {
    id: defaultFolderId,
    name: "\uBC14\uD0D5\uD654\uBA74",
    teamIds: teams.map((team) => team.id),
    itemIds: teams.map((team) => `team:${team.id}`)
  };

  function build(folderId: string): FolderPickerNode {
    const folder = folderMap.get(folderId) ?? root;
    const children = (folder.itemIds ?? [])
      .filter((itemId) => itemId.startsWith("folder:"))
      .map((itemId) => itemId.slice("folder:".length))
      .filter((childId) => folderMap.has(childId))
      .map(build);
    const orderedTeamIds = (folder.itemIds ?? [])
      .filter((itemId) => itemId.startsWith("team:"))
      .map((itemId) => itemId.slice("team:".length))
      .filter((teamId) => folder.teamIds.includes(teamId) && teamsById.has(teamId));
    for (const teamId of folder.teamIds) {
      if (!orderedTeamIds.includes(teamId)) orderedTeamIds.push(teamId);
    }
    return { id: folder.id, name: folder.name, teamIds: orderedTeamIds, children };
  }

  return [build(root.id)];
}

function getNestedTeamIds(folder: FolderPickerNode): string[] {
  return [...folder.teamIds, ...folder.children.flatMap(getNestedTeamIds)];
}

function FolderSelectSection({
  folder,
  teamsById,
  selectedTeamIds,
  selectedCount,
  openFolderIds,
  showGroupSelect,
  groupCount,
  teamGroupAssignments,
  onToggleFolder,
  onToggleFolderTeams,
  onGroupChange,
  onSeedChange,
  onToggleTeam,
  depth = 0
}: {
  folder: FolderPickerNode;
  teamsById: Map<string, Team>;
  selectedTeamIds: string[];
  selectedCount: number;
  openFolderIds: Set<string>;
  showGroupSelect: boolean;
  groupCount: number;
  teamGroupAssignments: Record<string, number>;
  onToggleFolder: (folderId: string) => void;
  onToggleFolderTeams: (teamIds: string[]) => void;
  onGroupChange: (teamId: string, groupIndex: number) => void;
  onSeedChange: (teamId: string, seed: number) => void;
  onToggleTeam: (teamId: string) => void;
  depth?: number;
}) {
  const isOpen = openFolderIds.has(folder.id);
  const nestedTeamIds = getNestedTeamIds(folder);
  const selectedInFolder = nestedTeamIds.filter((teamId) => selectedTeamIds.includes(teamId)).length;
  const hasContents = nestedTeamIds.length > 0 || folder.children.length > 0;
  const isFullySelected = nestedTeamIds.length > 0 && selectedInFolder === nestedTeamIds.length;

  return (
    <div className="rounded-md border border-line bg-panel/70">
      <div className="flex items-center gap-2 px-3 py-2" style={{ paddingLeft: `${12 + depth * 16}px` }}>
        <button type="button" className="grid h-7 w-7 place-items-center rounded border border-line bg-field text-muted" onClick={() => onToggleFolder(folder.id)}>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Folder className="h-4 w-4 text-cyan" />
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onToggleFolder(folder.id)}>
          <span className="block truncate text-sm font-black uppercase text-ink">{folder.name}</span>
          <span className="block text-xs font-semibold text-muted">
            {selectedInFolder}/{nestedTeamIds.length}팀 선택
          </span>
        </button>
        {nestedTeamIds.length ? (
          <button
            type="button"
            className={`shrink-0 rounded border px-3 py-1 text-xs font-black uppercase transition ${
              isFullySelected
                ? "border-cyan bg-cyan text-arena"
                : "border-line bg-field text-muted hover:border-cyan hover:text-cyan"
            }`}
            onClick={() => onToggleFolderTeams(nestedTeamIds)}
            title={isFullySelected ? "폴더 전체 선택 해제" : "폴더 전체 선택"}
            aria-label={`${folder.name} ${isFullySelected ? "전체 선택 해제" : "전체 선택"}`}
          >
            {isFullySelected ? "선택됨" : "전체선택"}
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <div className="space-y-2 border-t border-line p-2">
          {folder.children.map((child) => (
            <FolderSelectSection
              key={child.id}
              folder={child}
              teamsById={teamsById}
              selectedTeamIds={selectedTeamIds}
              selectedCount={selectedCount}
              openFolderIds={openFolderIds}
              showGroupSelect={showGroupSelect}
              groupCount={groupCount}
              teamGroupAssignments={teamGroupAssignments}
              onToggleFolder={onToggleFolder}
              onToggleFolderTeams={onToggleFolderTeams}
              onGroupChange={onGroupChange}
              onSeedChange={onSeedChange}
              onToggleTeam={onToggleTeam}
              depth={depth + 1}
            />
          ))}
          <div className="grid gap-2 md:grid-cols-2">
            {folder.teamIds.map((teamId) => {
              const team = teamsById.get(teamId);
              if (!team) return null;
              const groupLocalSeed =
                showGroupSelect && selectedTeamIds.includes(team.id)
                  ? getGroupLocalSeed(team.id, selectedTeamIds, teamGroupAssignments, groupCount)
                  : undefined;
              return (
                <TeamSelectRow
                  key={team.id}
                  team={team}
                  checked={selectedTeamIds.includes(team.id)}
                  seed={selectedTeamIds.indexOf(team.id) + 1}
                  selectedCount={selectedCount}
                  showGroupSelect={showGroupSelect}
                  groupCount={groupCount}
                  groupIndex={teamGroupAssignments[team.id] ?? 0}
                  groupSeedLabel={
                    groupLocalSeed
                      ? `${String.fromCharCode(65 + groupLocalSeed.groupIndex)}#${groupLocalSeed.seed}`
                      : undefined
                  }
                  onGroupChange={(groupIndex) => onGroupChange(team.id, groupIndex)}
                  onSeedChange={(seed) => onSeedChange(team.id, seed)}
                  onToggle={() => onToggleTeam(team.id)}
                />
              );
            })}
          </div>
          {!hasContents ? <div className="rounded-md border border-dashed border-line p-3 text-sm text-muted">비어 있는 폴더입니다.</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max?: number;
}) {
  function handleChange(nextValue: number) {
    if (!Number.isFinite(nextValue)) {
      onChange(min);
      return;
    }
    onChange(Math.max(min, Math.min(max ?? nextValue, Math.floor(nextValue))));
  }

  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className="input"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => handleChange(Number(event.target.value))}
      />
    </label>
  );
}

function StageSelect({
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
  getDisabledReason?: (value: StageFormat) => string | undefined;
  onChange: (value: StageFormat) => void;
}) {
  const selected = STAGE_LABELS[value];
  const selectedDisabledReason = getDisabledReason?.(value) ?? (disabledOptions.includes(value) ? "비활성" : undefined);

  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-ink">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value as StageFormat)}>
        {options.map((option) => {
          const disabledReason =
            getDisabledReason?.(option) ?? (disabledOptions.includes(option) ? "비활성" : undefined);

          return (
            <option key={option} value={option} disabled={Boolean(disabledReason)}>
              {getStageDisplayLabel(option)}
              {disabledReason ? ` (${disabledReason})` : ""}
            </option>
          );
        })}
      </select>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        <span className="rounded border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-cyan">{getStageLimitLabel(value)}</span>
        {selectedDisabledReason ? (
          <span className="rounded border border-danger/40 bg-danger/10 px-2 py-0.5 text-danger">
            {selectedDisabledReason}
          </span>
        ) : (
          <span>{selected.hint}</span>
        )}
      </div>
    </label>
  );
}

function TeamSelectRow({
  team,
  checked,
  seed,
  selectedCount,
  showGroupSelect,
  groupCount,
  groupIndex,
  groupSeedLabel,
  onGroupChange,
  onSeedChange,
  onToggle
}: {
  team: Team;
  checked: boolean;
  seed: number;
  selectedCount: number;
  showGroupSelect: boolean;
  groupCount: number;
  groupIndex: number;
  groupSeedLabel?: string;
  onGroupChange: (groupIndex: number) => void;
  onSeedChange: (seed: number) => void;
  onToggle: () => void;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 ${checked ? "border-cyan bg-cyan/10" : "border-line bg-field"}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <TeamLogo team={team} size="sm" />
      <div className="min-w-0">
        <div className="truncate text-sm font-black uppercase text-ink">{team.shortName || team.name}</div>
        <div className="truncate text-xs font-semibold text-muted">{team.name}</div>
      </div>
      {checked ? (
        <div className="ml-auto flex shrink-0 gap-1.5">
          {groupSeedLabel ? (
            <span className="grid h-8 place-items-center rounded-md border border-cyan/40 bg-cyan/10 px-2 text-xs font-black text-cyan">
              {groupSeedLabel}
            </span>
          ) : null}
          {showGroupSelect ? (
            <select
              className="h-8 rounded-md border border-line bg-panel px-2 text-xs font-black text-ink"
              value={Math.max(0, Math.min(groupCount - 1, groupIndex))}
              onChange={(event) => onGroupChange(Number(event.target.value))}
              onClick={(event) => event.stopPropagation()}
              title="조 선택"
            >
              {Array.from({ length: groupCount }, (_, index) => (
                <option key={index} value={index}>
                  {String.fromCharCode(65 + index)}그룹
                </option>
              ))}
            </select>
          ) : null}
          <select
            className="h-8 rounded-md border border-line bg-panel px-2 text-xs font-black text-ink"
            value={seed}
            onChange={(event) => onSeedChange(Number(event.target.value))}
            onClick={(event) => event.stopPropagation()}
          >
            {Array.from({ length: selectedCount }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}번 시드
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </label>
  );
}

function ActiveStageView({
  activeStage,
  selectedFormat,
  language,
  teams,
  tournament,
  doubleElimination,
  stepladder,
  leagueStage,
  groupStage,
  groupDoubleStage,
  groupTripleStage,
  swissStage,
  battleRoyaleStage,
  tripleStage,
  setLeagueStage,
  setGroupStage,
  setGroupDoubleStage,
  setGroupTripleStage,
  setSwissStage,
  setBattleRoyaleStage,
  setTripleStage,
  setMatchResult,
  setDoubleResult,
  setStepladderResult,
  clearResult
}: {
  activeStage: ActiveStage | null;
  selectedFormat: StageFormat;
  language: AppLanguage;
  teams: Team[];
  tournament?: Tournament | null;
  doubleElimination?: DoubleEliminationBracket | null;
  stepladder?: StepladderBracket | null;
  leagueStage?: LeagueStage;
  groupStage?: GroupStage;
  groupDoubleStage?: GroupDoubleEliminationStage;
  groupTripleStage?: GroupTripleEliminationStage;
  swissStage?: SwissStage;
  battleRoyaleStage?: BattleRoyaleStage;
  tripleStage?: TripleEliminationStage;
  setLeagueStage: (stage: LeagueStage) => void;
  setGroupStage: (stage: GroupStage) => void;
  setGroupDoubleStage: (stage: GroupDoubleEliminationStage) => void;
  setGroupTripleStage: (stage: GroupTripleEliminationStage) => void;
  setSwissStage: (stage: SwissStage) => void;
  setBattleRoyaleStage: (stage: BattleRoyaleStage) => void;
  setTripleStage: (stage: TripleEliminationStage) => void;
  setMatchResult: (matchId: string, result: { scoreA?: number; scoreB?: number; winnerId: string }) => void;
  setDoubleResult: (matchId: string, result: { scoreA?: number; scoreB?: number; winnerId: string }) => void;
  setStepladderResult: (matchId: string, result: { scoreA?: number; scoreB?: number; winnerId: string }) => void;
  clearResult: (matchId: string) => void;
}) {
  if (!activeStage) return null;

  const format = activeStage?.format ?? selectedFormat;
  let view: ReactNode = null;

  if (format === "single" && tournament) {
    view = (
      <BracketView
        tournament={tournament}
        teams={teams}
        onSaveResult={(matchId, result) => setMatchResult(matchId, result)}
        onClearResult={clearResult}
      />
    );
  } else if (format === "double" && doubleElimination) {
    view = (
      <DoubleEliminationView
        bracket={doubleElimination}
        teams={teams}
        onSaveResult={(matchId, result) => setDoubleResult(matchId, result)}
        onClearResult={() => undefined}
      />
    );
  } else if (format === "triple" && tripleStage) {
    view = <TripleEliminationView stage={tripleStage} teams={teams} onChange={setTripleStage} />;
  } else if (format === "stepladder" && stepladder) {
    view = (
      <StepladderView
        bracket={stepladder}
        teams={teams}
        onSaveResult={(matchId, result) => setStepladderResult(matchId, result)}
        onClearResult={() => undefined}
      />
    );
  } else if (format === "league" && leagueStage) {
    view = <LeagueStageView stage={leagueStage} teams={teams} onChange={setLeagueStage} />;
  } else if (format === "group" && groupStage) {
    view = <GroupStageView stage={groupStage} teams={teams} onChange={setGroupStage} />;
  } else if (format === "group_double_elimination" && groupDoubleStage) {
    view = <GroupDoubleEliminationView stage={groupDoubleStage} teams={teams} onChange={(stage) => setGroupDoubleStage(stage as GroupDoubleEliminationStage)} />;
  } else if (format === "group_triple_elimination" && groupTripleStage) {
    view = <GroupDoubleEliminationView stage={groupTripleStage} teams={teams} onChange={(stage) => setGroupTripleStage(stage as GroupTripleEliminationStage)} />;
  } else if (format === "swiss" && swissStage) {
    view = <SwissStageView stage={swissStage} teams={teams} onChange={setSwissStage} />;
  } else if (format === "battle_royale" && battleRoyaleStage) {
    view = <BattleRoyaleStageView stage={battleRoyaleStage} teams={teams} onChange={setBattleRoyaleStage} />;
  }

  if (!view) {
    return (
      <section className="arena-card border-dashed p-8 text-center text-muted">
        팀과 방식을 선택한 뒤 생성 버튼을 누르면 여기에 Stage가 표시됩니다.
      </section>
    );
  }

  const summary = buildPlacementSummary({
    activeStage,
    format,
    language,
    teams,
    tournament,
    doubleElimination,
    stepladder,
    leagueStage,
    groupStage,
    groupDoubleStage,
    groupTripleStage,
    swissStage,
    battleRoyaleStage,
    tripleStage
  });

  return (
    <div className="space-y-4">
      <div className="no-print flex justify-end">
        <button type="button" className="button-muted" onClick={printBracketAsPdf}>
          <Printer className="h-4 w-4" />
          PDF 출력
        </button>
      </div>
      <div data-print-bracket-root="true" className="space-y-4">
        {summary ? (
          <PlacementSummary
            eyebrow={summary.eyebrow}
            title={summary.title}
            subtitle={summary.subtitle}
            entries={summary.entries}
            variant={summary.variant}
          />
        ) : null}
        {view}
      </div>
    </div>
  );
}

function printBracketAsPdf() {
  if (typeof window === "undefined") return;

  const { body } = document;
  body.dataset.printingBracket = "true";

  let cleanupTimer: number | undefined;
  const cleanup = () => {
    if (cleanupTimer) window.clearTimeout(cleanupTimer);
    delete body.dataset.printingBracket;
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.requestAnimationFrame(() => {
    window.print();
    cleanupTimer = window.setTimeout(cleanup, 3000);
  });
}

type PlacementSummaryModel = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  entries: PlacementSummaryEntry[];
  variant: "seed" | "final";
};

type SeedSummaryItem = {
  team: Team;
  label?: string;
  description?: string;
};

type PlacementSummarySource = {
  activeStage: ActiveStage;
  format: StageFormat;
  language: AppLanguage;
  teams: Team[];
  tournament?: Tournament | null;
  doubleElimination?: DoubleEliminationBracket | null;
  stepladder?: StepladderBracket | null;
  leagueStage?: LeagueStage;
  groupStage?: GroupStage;
  groupDoubleStage?: GroupDoubleEliminationStage;
  groupTripleStage?: GroupTripleEliminationStage;
  swissStage?: SwissStage;
  battleRoyaleStage?: BattleRoyaleStage;
  tripleStage?: TripleEliminationStage;
};

function buildPlacementSummary(source: PlacementSummarySource): PlacementSummaryModel | null {
  if (source.format === "swiss") return null;

  const seedMode = source.activeStage.role === "qualifier";
  const isKorean = source.language === "ko";
  const seedItems = seedMode ? getSeedSummaryItems(source) : [];
  const rankedTeams = seedMode ? seedItems.map((item) => item.team) : getFinalRankedTeams(source);
  if (rankedTeams.length === 0) return null;

  const limitedTeams = seedMode ? rankedTeams : rankedTeams.slice(0, 3);
  const entries = limitedTeams.map((team, index): PlacementSummaryEntry => {
    const seedItem = seedMode ? seedItems[index] : undefined;
    const finalLabels = isKorean ? ["1위", "2위", "3위"] : ["Champion", "Runner Up", "Third Place"];
    const finalTones: PlacementSummaryEntry["tone"][] = ["gold", "silver", "bronze"];
    return {
      label: seedMode
        ? seedItem?.label ?? (isKorean ? `${index + 1}시드` : `Seed ${index + 1}`)
        : finalLabels[index] ?? `${index + 1}`,
      team,
      tone: seedMode ? "seed" : finalTones[index] ?? "rank",
      description: seedMode ? seedItem?.description ?? (isKorean ? "본선 시드" : "Main stage seed") : team.name
    };
  });

  return {
    eyebrow: seedMode ? (isKorean ? "시드" : "SEEDING") : isKorean ? "결과" : "RESULT",
    title: seedMode ? (isKorean ? "시드 순위" : "Seed Ranking") : isKorean ? "최종 순위" : "Final Ranking",
    subtitle: seedMode
      ? isKorean
        ? "다음 Stage 배정 기준"
        : "Used for next stage seeding"
      : isKorean
        ? "결과 입력 후 자동 정리"
        : "Updated from entered results",
    entries,
    variant: seedMode ? "seed" : "final"
  };
}

function getSeedSummaryItems(source: PlacementSummarySource): SeedSummaryItem[] {
  const isKorean = source.language === "ko";
  const groupSeedLabel = (groupName: string, seed: number) =>
    isKorean ? `${groupName} ${seed}시드` : `${groupName} Seed ${seed}`;
  const groupSeedDescription = (groupName: string) =>
    isKorean ? `${groupName} 본선 배정 기준` : `${groupName} main stage seed`;

  if (source.format === "group" && source.groupStage) {
    if (!hasAnyLeagueResult(source.groupStage.matches)) return [];
    const standingsByGroup = calculateGroupStandings(source.groupStage, source.teams);
    const baseItems = source.groupStage.groups.flatMap((group) =>
      (standingsByGroup[group.id] ?? [])
        .slice(0, source.groupStage?.options.advancePerGroup ?? 0)
        .map((standing): SeedSummaryItem | undefined => {
          const team = findTeam(source.teams, standing.teamId);
          return team
            ? {
                team,
                label: groupSeedLabel(group.name, standing.rank),
                description: groupSeedDescription(group.name)
              }
            : undefined;
        })
        .filter(Boolean) as SeedSummaryItem[]
    );

    if (source.groupStage.options.wildcardCount <= 0) return baseItems;

    const directTeamIds = new Set(baseItems.map((item) => item.team.id));
    const wildcardItems = Object.values(standingsByGroup)
      .flat()
      .filter((standing) => !directTeamIds.has(standing.teamId))
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        return a.seed - b.seed;
      })
      .slice(0, source.groupStage.options.wildcardCount)
      .map((standing, index): SeedSummaryItem | undefined => {
        const team = findTeam(source.teams, standing.teamId);
        return team
          ? {
              team,
              label: isKorean ? `와일드카드 ${index + 1}시드` : `Wildcard Seed ${index + 1}`,
              description: isKorean ? "와일드카드 본선 배정 기준" : "Wildcard main stage seed"
            }
          : undefined;
      })
      .filter(Boolean) as SeedSummaryItem[];

    return [...baseItems, ...wildcardItems];
  }

  if (source.format === "group_double_elimination" && source.groupDoubleStage) {
    if (!hasAnyBracketResult(source.groupDoubleStage.brackets.flatMap((entry) => entry.bracket.matches))) return [];
    const teamsById = new Map(source.teams.map((team) => [team.id, team]));

    return source.groupDoubleStage.brackets.flatMap((entry) => {
      const groupName = source.groupDoubleStage?.groups.find((group) => group.id === entry.groupId)?.name ?? entry.groupId;
      const seedTeamIds = [
        entry.bracket.matches.find((match) => match.roundName === "Winners Match")?.winnerId,
        entry.bracket.matches.find((match) => match.roundName === "Decider Match")?.winnerId
      ].filter(Boolean) as string[];

      return seedTeamIds
        .slice(0, source.groupDoubleStage?.advancePerGroup ?? 0)
        .map((teamId, index): SeedSummaryItem | undefined => {
          const team = teamsById.get(teamId);
          return team
            ? {
                team,
                label: groupSeedLabel(groupName, index + 1),
                description: groupSeedDescription(groupName)
              }
            : undefined;
        })
        .filter(Boolean) as SeedSummaryItem[];
    });
  }

  if (source.format === "group_triple_elimination" && source.groupTripleStage) {
    if (!hasAnyBracketResult(source.groupTripleStage.brackets.flatMap((entry) => entry.bracket.matches))) return [];
    const teamsById = new Map(source.teams.map((team) => [team.id, team]));

    return source.groupTripleStage.brackets.flatMap((entry) => {
      const groupName = source.groupTripleStage?.groups.find((group) => group.id === entry.groupId)?.name ?? entry.groupId;
      const matches = entry.bracket.matches;
      const upperFinal = matches.find((match) => match.roundName === "Upper Final");
      const middleFinal = matches.find((match) => match.roundName === "Middle Final");
      const lowerFinal = matches.find((match) => match.roundName === "Lower Final");
      const seedTeamIds = [
        upperFinal?.winnerId,
        upperFinal?.loserId,
        middleFinal?.winnerId,
        lowerFinal?.winnerId
      ].filter(Boolean) as string[];

      return Array.from(new Set(seedTeamIds))
        .slice(0, source.groupTripleStage?.advancePerGroup ?? 0)
        .map((teamId, index): SeedSummaryItem | undefined => {
          const team = teamsById.get(teamId);
          return team
            ? {
                team,
                label: groupSeedLabel(groupName, index + 1),
                description: groupSeedDescription(groupName)
              }
            : undefined;
        })
        .filter(Boolean) as SeedSummaryItem[];
    });
  }

  return getSeedRankedTeams(source).map((team, index) => ({
    team,
    label: isKorean ? `${index + 1}시드` : `Seed ${index + 1}`,
    description: isKorean ? "본선 시드" : "Main stage seed"
  }));
}

function getSeedRankedTeams(source: PlacementSummarySource): Team[] {
  const { format, teams } = source;

  if (format === "league" && source.leagueStage) {
    if (!hasAnyLeagueResult(source.leagueStage.matches)) return [];
    return calculateLeagueStandings(source.leagueStage.matches, teams)
      .slice(0, source.leagueStage.options.advanceCount || teams.length)
      .map((standing) => findTeam(teams, standing.teamId))
      .filter(Boolean) as Team[];
  }

  if (format === "group" && source.groupStage) {
    if (!hasAnyLeagueResult(source.groupStage.matches)) return [];
    const standings = Object.values(calculateGroupStandings(source.groupStage, teams)).flat();
    return standings
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        return a.seed - b.seed;
      })
      .slice(0, Math.max(1, (source.groupStage.options.advancePerGroup * source.groupStage.groups.length) + source.groupStage.options.wildcardCount))
      .map((standing) => findTeam(teams, standing.teamId))
      .filter(Boolean) as Team[];
  }

  if (format === "group_double_elimination" && source.groupDoubleStage) {
    const advancers = getGroupDoubleEliminationAdvancingTeams(source.groupDoubleStage, teams);
    return hasAnyBracketResult(source.groupDoubleStage.brackets.flatMap((entry) => entry.bracket.matches)) ? advancers : [];
  }

  if (format === "group_triple_elimination" && source.groupTripleStage) {
    const advancers = getGroupTripleEliminationAdvancingTeams(source.groupTripleStage, teams);
    return hasAnyBracketResult(source.groupTripleStage.brackets.flatMap((entry) => entry.bracket.matches)) ? advancers : [];
  }

  if (format === "swiss" && source.swissStage) {
    const ranked = getRankedSwissRecords(source.swissStage).filter((record) => record.played > 0 || record.status !== "active");
    return ranked
      .slice(0, Math.max(3, source.swissStage.config.advanceCount || 0))
      .map((record) => findTeam(teams, record.teamId))
      .filter(Boolean) as Team[];
  }

  if (format === "battle_royale" && source.battleRoyaleStage) {
    const standings = calculateBattleRoyaleStandings(source.battleRoyaleStage, teams).filter((standing) => standing.roundsPlayed > 0);
    return standings
      .slice(0, source.battleRoyaleStage.options.advanceCount || teams.length)
      .map((standing) => findTeam(teams, standing.teamId))
      .filter(Boolean) as Team[];
  }

  return getFinalRankedTeams(source);
}

function getFinalRankedTeams(source: PlacementSummarySource): Team[] {
  const { format, teams } = source;

  if (format === "single" && source.tournament) {
    return teamsFromIds(teams, inferTournamentPlacements(source.tournament.matches, [
      source.tournament.championId,
      source.tournament.runnerUpId,
      source.tournament.thirdPlaceId
    ]));
  }

  if (format === "double" && source.doubleElimination) {
    return teamsFromIds(teams, inferTournamentPlacements(source.doubleElimination.matches, [
      source.doubleElimination.championId,
      inferRunnerUp(source.doubleElimination.matches, source.doubleElimination.championId),
      inferThirdPlace(source.doubleElimination.matches, source.doubleElimination.championId)
    ]));
  }

  if (format === "triple" && source.tripleStage) {
    return teamsFromIds(teams, inferTournamentPlacements(source.tripleStage.matches, [
      source.tripleStage.championId,
      source.tripleStage.runnerUpId ?? inferRunnerUp(source.tripleStage.matches, source.tripleStage.championId),
      source.tripleStage.thirdPlaceId ?? inferThirdPlace(source.tripleStage.matches, source.tripleStage.championId)
    ]));
  }

  if (format === "stepladder" && source.stepladder) {
    return teamsFromIds(teams, inferTournamentPlacements(source.stepladder.matches, [
      source.stepladder.championId,
      inferRunnerUp(source.stepladder.matches, source.stepladder.championId),
      inferPreviousLoser(source.stepladder.matches, source.stepladder.championId)
    ]));
  }

  if (format === "league" && source.leagueStage && hasAnyLeagueResult(source.leagueStage.matches)) {
    return calculateLeagueStandings(source.leagueStage.matches, teams)
      .slice(0, 3)
      .map((standing) => findTeam(teams, standing.teamId))
      .filter(Boolean) as Team[];
  }

  if (format === "group" && source.groupStage && hasAnyLeagueResult(source.groupStage.matches)) {
    const standings = Object.values(calculateGroupStandings(source.groupStage, teams)).flat();
    return standings
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        return a.seed - b.seed;
      })
      .slice(0, 3)
      .map((standing) => findTeam(teams, standing.teamId))
      .filter(Boolean) as Team[];
  }

  if (format === "battle_royale" && source.battleRoyaleStage) {
    return calculateBattleRoyaleStandings(source.battleRoyaleStage, teams)
      .filter((standing) => standing.roundsPlayed > 0)
      .slice(0, 3)
      .map((standing) => findTeam(teams, standing.teamId))
      .filter(Boolean) as Team[];
  }

  return [];
}

function inferTournamentPlacements(matches: BracketStageMatch[] | Tournament["matches"], ids: Array<string | undefined>) {
  const resolved = uniqueIds(ids);
  if (resolved.length === 0) return [];
  return resolved;
}

function inferRunnerUp(matches: BracketStageMatch[] | Tournament["matches"], championId?: string) {
  if (!championId) return undefined;
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    if (match.status !== "complete" || match.winnerId !== championId) continue;
    return match.loserId ?? getOpponentId(match, championId);
  }
  return undefined;
}

function inferThirdPlace(matches: BracketStageMatch[] | Tournament["matches"], championId?: string) {
  const runnerUpId = inferRunnerUp(matches, championId);
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    if (match.status !== "complete") continue;
    const loserId = match.loserId ?? (match.winnerId ? getOpponentId(match, match.winnerId) : undefined);
    if (loserId && loserId !== championId && loserId !== runnerUpId) return loserId;
  }
  return undefined;
}

function inferPreviousLoser(matches: BracketStageMatch[] | Tournament["matches"], championId?: string) {
  const runnerUpId = inferRunnerUp(matches, championId);
  for (let index = matches.length - 2; index >= 0; index -= 1) {
    const match = matches[index];
    if (match.status !== "complete") continue;
    const loserId = match.loserId ?? (match.winnerId ? getOpponentId(match, match.winnerId) : undefined);
    if (loserId && loserId !== championId && loserId !== runnerUpId) return loserId;
  }
  return undefined;
}

function getOpponentId(match: BracketStageMatch | Tournament["matches"][number], teamId: string) {
  const teamAId = match.participantA?.teamId;
  const teamBId = match.participantB?.teamId;
  if (teamAId === teamId) return teamBId;
  if (teamBId === teamId) return teamAId;
  return undefined;
}

function teamsFromIds(teams: Team[], ids: string[]) {
  return ids.map((id) => findTeam(teams, id)).filter(Boolean) as Team[];
}

function uniqueIds(ids: Array<string | undefined>) {
  const seen = new Set<string>();
  return ids.filter((id): id is string => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function findTeam(teams: Team[], teamId?: string) {
  return teamId ? teams.find((team) => team.id === teamId) : undefined;
}

function hasAnyLeagueResult(matches: Array<{ status: string; isBye?: boolean; winnerId?: string; scoreA?: number; scoreB?: number }>) {
  return matches.some((match) => !match.isBye && match.status === "complete" && (match.winnerId || (match.scoreA !== undefined && match.scoreB !== undefined)));
}

function hasAnyBracketResult(matches: Array<{ status: string; isBye?: boolean; winnerId?: string }>) {
  return matches.some((match) => !match.isBye && match.status === "complete" && Boolean(match.winnerId));
}




