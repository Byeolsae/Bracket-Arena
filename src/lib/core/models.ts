export type Team = {
  id: string;
  name: string;
  shortName?: string;
  logoDefault?: string;
  logoLight?: string;
  logoDark?: string;
  logoVictory?: string;
  logoVictoryLight?: string;
  logoVictoryDark?: string;
  logoDefaultName?: string;
  logoLightName?: string;
  logoDarkName?: string;
  logoVictoryName?: string;
  logoVictoryLightName?: string;
  logoVictoryDarkName?: string;
  logoShadowEnabled?: boolean;
  logoShadowColor?: string;
  logoShadowBlur?: number;
  logoShadowOpacity?: number;
  logoShadowOffsetY?: number;
  logoShadowVictoryLightEnabled?: boolean;
  logoShadowVictoryLightColor?: string;
  logoShadowVictoryLightBlur?: number;
  logoShadowVictoryLightOpacity?: number;
  logoShadowVictoryLightOffsetY?: number;
  logoShadowVictoryDarkEnabled?: boolean;
  logoShadowVictoryDarkColor?: string;
  logoShadowVictoryDarkBlur?: number;
  logoShadowVictoryDarkOpacity?: number;
  logoShadowVictoryDarkOffsetY?: number;
  primaryColor?: string;
  secondaryColor?: string;
  bracketAccentColor?: string;
  bracketAccentColorLight?: string;
  bracketAccentColorDark?: string;
  victoryColor?: string;
  victoryColorLight?: string;
  victoryColorDark?: string;
  victoryAccentColor?: string;
  victoryAccentColorLight?: string;
  victoryAccentColorDark?: string;
  victoryColorEnabled?: boolean;
  victoryTextColor?: string;
  victoryTextColorLight?: string;
  victoryTextColorDark?: string;
  primaryColorLight?: string;
  secondaryColorLight?: string;
  primaryColorDark?: string;
  secondaryColorDark?: string;
  textColor?: string;
  textColorLight?: string;
  textColorDark?: string;
  region?: string;
  league?: string;
  note?: string;
  defaultSeed?: number;
};

export type TeamFolder = {
  id: string;
  name: string;
  parentId?: string;
  teamIds: string[];
  itemIds?: string[];
  collapsed?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MatchStatus = "pending" | "ready" | "complete" | "bye";

export type MatchParticipant = {
  teamId?: string;
  seed?: number;
  sourceMatchId?: string;
  isBye?: boolean;
};

export type Match = {
  id: string;
  round: number;
  roundName: string;
  matchNumber: number;
  participantA?: MatchParticipant;
  participantB?: MatchParticipant;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  loserId?: string;
  status: MatchStatus;
  nextMatchId?: string;
  nextMatchSlot?: "A" | "B";
  loserNextMatchId?: string;
  loserNextMatchSlot?: "A" | "B";
  isBye?: boolean;
};

export type TournamentFormat =
  | "single-elimination"
  | "double-elimination"
  | "stepladder"
  | "league"
  | "swiss"
  | "group";

export type Tournament = {
  id: string;
  name: string;
  format: TournamentFormat;
  teamIds: string[];
  bracketSize: number;
  rounds: number;
  matches: Match[];
  pendingTeamIds?: Record<string, string[]>;
  championId?: string;
  runnerUpId?: string;
  thirdPlaceId?: string;
  fourthPlaceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamPreset = {
  id: string;
  name: string;
  team: Team;
  createdAt: string;
  updatedAt: string;
};

export type TeamSetPreset = {
  id: string;
  name: string;
  description?: string;
  teams: Team[];
  createdAt: string;
  updatedAt: string;
};

export type LeaguePreset = {
  id: string;
  name: string;
  description?: string;
  teams: Team[];
  createdAt: string;
  updatedAt: string;
};

export type ImportConflictStrategy = "keep" | "overwrite" | "skip" | "duplicate";

export type StageMatchStatus = "pending" | "complete" | "bye";

export type LeagueMatch = {
  id: string;
  round: number;
  matchNumber: number;
  teamAId?: string;
  teamBId?: string;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  loserId?: string;
  status: StageMatchStatus;
  isBye?: boolean;
};

export type LeagueOptions = {
  rounds: 1 | 2;
  allowDraw: boolean;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  advanceCount: number;
  tiebreakers: Array<"points" | "goalDifference" | "goalsFor" | "wins" | "seed">;
};

export type LeagueStage = {
  id: string;
  type: "league";
  teamIds: string[];
  options: LeagueOptions;
  matches: LeagueMatch[];
  warnings: string[];
};

export type LeagueStanding = {
  rank: number;
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  seed: number;
  isAdvancing?: boolean;
};

export type SwissAdvanceMode = "wins" | "standings";

export type SwissConfig = {
  maxRounds: number;
  advanceMode: SwissAdvanceMode;
  advanceWins: number;
  eliminateLosses: number;
  advanceCount: number;
  allowDraw: boolean;
  avoidRematch: boolean;
  allowBye: boolean;
  preventMultipleByes: boolean;
  byeCountsAsWin: boolean;
  winPoints?: number;
  drawPoints?: number;
  lossPoints?: number;
  sideBalancing?: boolean;
};

export type SwissTeamStatus = "active" | "advanced" | "eliminated";

export type SwissRecord = {
  teamId: string;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  seed: number;
  byeCount: number;
  hadBye?: boolean;
  sideHistory?: Array<"A" | "B">;
  status: SwissTeamStatus;
  opponents: string[];
};

export type SwissMatch = LeagueMatch;

export type SwissStage = {
  id: string;
  teamIds: string[];
  config: SwissConfig;
  currentRound: number;
  matches: SwissMatch[];
  records: SwissRecord[];
  isComplete: boolean;
  warnings?: string[];
};

export type GroupAssignmentMode = "seeded" | "random" | "manual";

export type GroupStageOptions = {
  groupCount: number;
  assignmentMode: GroupAssignmentMode;
  groupNames?: string[];
  manualGroupAssignments?: Record<string, number>;
  doubleRoundRobin: boolean;
  allowDraw: boolean;
  advancePerGroup: number;
  wildcardCount: number;
  allowUnevenGroups: boolean;
};

export type Group = {
  id: string;
  name: string;
  teamIds: string[];
};

export type GroupStage = {
  id: string;
  type: "group";
  groups: Group[];
  matches: LeagueMatch[];
  options: GroupStageOptions;
  warnings: string[];
};

export type GroupDoubleEliminationStage = {
  id: string;
  type: "group_double_elimination";
  groups: Group[];
  brackets: Array<{
    groupId: string;
    bracket: DoubleEliminationBracket;
  }>;
  teamsPerGroup?: number;
  advancePerGroup: number;
  warnings: string[];
};

export type GroupTripleEliminationStage = {
  id: string;
  type: "group_triple_elimination";
  groups: Group[];
  brackets: Array<{
    groupId: string;
    bracket: TripleEliminationStage;
  }>;
  advancePerGroup: number;
  warnings: string[];
};

export type BattleRoyalePlacement = {
  teamId: string;
  placement: number;
  kills: number;
  bonusPoints?: number;
  penaltyPoints?: number;
};

export type BattleRoyaleRound = {
  id: string;
  round: number;
  groupName?: string;
  teamIds: string[];
  placements: BattleRoyalePlacement[];
};

export type BattleRoyaleOptions = {
  roundCount: number;
  teamsPerRound: number;
  placementPoints: Record<number, number>;
  killPoint: number;
  advanceCount: number;
};

export type BattleRoyaleStanding = {
  rank: number;
  teamId: string;
  roundsPlayed: number;
  placementPoints: number;
  killPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
};

export type BattleRoyaleStage = {
  id: string;
  type: "battle_royale";
  rounds: BattleRoyaleRound[];
  options: BattleRoyaleOptions;
  warnings: string[];
};

export type TripleEliminationStage = {
  id: string;
  format: "triple-elimination";
  teamIds: string[];
  matches: BracketStageMatch[];
  lossCounts: Record<string, number>;
  pendingTeamIds?: Record<string, string[]>;
  twoLossFinalistId?: string;
  eliminatedTeamIds: string[];
  championId?: string;
  runnerUpId?: string;
  thirdPlaceId?: string;
  warnings: string[];
};

export type BracketGroup =
  | "winners"
  | "losers"
  | "grand-final"
  | "stepladder"
  | "zero-loss"
  | "one-loss"
  | "two-loss";

export type BracketStageMatch = Match & {
  bracketGroup: BracketGroup;
  loserNextMatchId?: string;
  loserNextMatchSlot?: "A" | "B";
  eliminatedTeamId?: string;
};

export type DoubleEliminationBracket = {
  id: string;
  format: "double-elimination";
  teamIds: string[];
  bracketReset: boolean;
  grandFinalBestOf: number;
  matches: BracketStageMatch[];
  lossCounts?: Record<string, number>;
  pendingTeamIds?: Record<string, string[]>;
  eliminatedTeamIds?: string[];
  championId?: string;
};

export type StepladderBracket = {
  id: string;
  format: "stepladder";
  teamIds: string[];
  matches: BracketStageMatch[];
  championId?: string;
};

export type StageType =
  | "league"
  | "group"
  | "group_double_elimination"
  | "group_triple_elimination"
  | "single_elimination"
  | "double_elimination"
  | "swiss"
  | "triple_elimination"
  | "battle_royale"
  | "stepladder";

export type AdvancementRule = {
  id: string;
  mode:
    | "overall_top_n"
    | "group_top_n"
    | "group_top_n_plus_wildcard"
    | "condition"
    | "range"
    | "manual";
  count: number;
};

export type SlotMappingRule = {
  id: string;
  mode:
    | "standing_order"
    | "seed_order"
    | "random"
    | "manual"
    | "first_vs_last"
    | "avoid_same_group"
    | "avoid_same_region";
};

export type ByeRule = {
  id: string;
  mode: "none" | "top_seed" | "bottom_seed" | "manual" | "rest_round";
};

export type AutoAdjustmentRule = {
  id: string;
  enabled: boolean;
  message?: string;
};

export type StructureStage = {
  id: string;
  name: string;
  type: StageType;
  participantCount: number;
  advancementRule: AdvancementRule;
  slotMappingRule: SlotMappingRule;
  byeRule: ByeRule;
  autoAdjustmentRule: AutoAdjustmentRule;
  sourceStageId?: string;
};

export type Phase = {
  id: string;
  name: string;
  stages: StructureStage[];
};

export type TournamentStructure = {
  id: string;
  name: string;
  phases: Phase[];
  updatedAt: string;
};
