import type { Phase, StageType, StructureStage, Team, TournamentStructure } from "./models";
import { nextPowerOfTwo } from "./bye";
import { getStageAdvancingTeams, type StageWithResults } from "./advancement";
import { mapTeamsToNextStage } from "./slotMapping";
import { createLeagueStage } from "./league";
import { createGroupStage } from "./group";
import { createSwissStage } from "./swiss";
import { createSingleEliminationTournament } from "./singleElimination";
import { createDoubleEliminationBracket } from "./doubleElimination";
import { generateTripleEliminationBracket } from "./tripleElimination";
import { createStepladderBracket } from "./stepladder";

export function createDefaultStructure(): TournamentStructure {
  return {
    id: `structure-${Date.now()}`,
    name: "Custom Tournament",
    updatedAt: new Date().toISOString(),
    phases: [
      {
        id: createId("phase"),
        name: "예선",
        stages: [createStage("리그 예선", "league", 12, 6)]
      },
      {
        id: createId("phase"),
        name: "본선",
        stages: [createStage("싱글 엘리미네이션 본선", "single_elimination", 6, 1)]
      }
    ]
  };
}

export function createPhase(name = "새 Phase"): Phase {
  return {
    id: createId("phase"),
    name,
    stages: []
  };
}

export function createStage(
  name = "새 Stage",
  type: StructureStage["type"] = "single_elimination",
  participantCount = 8,
  advancementCount = 4
): StructureStage {
  return {
    id: createId("stage"),
    name,
    type,
    participantCount,
    advancementRule: {
      id: createId("adv"),
      mode: "overall_top_n",
      count: advancementCount
    },
    slotMappingRule: {
      id: createId("slot"),
      mode: "seed_order"
    },
    byeRule: {
      id: createId("bye"),
      mode: "top_seed"
    },
    autoAdjustmentRule: {
      id: createId("auto"),
      enabled: true
    }
  };
}

export function validateTournamentStructure(structure: TournamentStructure): string[] {
  const warnings: string[] = [];

  if (!structure.phases.length) {
    warnings.push("Phase가 없습니다.");
  }

  structure.phases.forEach((phase) => {
    if (!phase.stages.length) {
      warnings.push(`${phase.name}에 Stage가 없습니다.`);
    }

    phase.stages.forEach((stage) => {
      if (stage.participantCount < 2) {
        warnings.push(`${stage.name}: 참가팀은 2팀 이상이어야 합니다.`);
      }

      const preview = previewAutoAdjustment(stage);
      if (preview) {
        warnings.push(preview);
      }
    });
  });

  return warnings;
}

export function previewAutoAdjustment(stage: StructureStage): string | undefined {
  if (!stage.autoAdjustmentRule.enabled) return undefined;

  if (stage.type === "single_elimination" || stage.type === "double_elimination") {
    const bracketSize = nextPowerOfTwo(stage.participantCount);
    const byeCount = bracketSize - stage.participantCount;

    if (byeCount > 0) {
      return `${stage.name}: 진출팀이 ${stage.participantCount}팀입니다. ${bracketSize}강 브래킷으로 자동 보정하고 상위 시드 ${byeCount}팀에게 부전승을 부여합니다.`;
    }
  }

  if ((stage.type === "league" || stage.type === "swiss") && stage.participantCount % 2 === 1) {
    return `${stage.name}: 홀수 팀이므로 Stage 규칙에 따라 부전승 또는 휴식 라운드가 발생합니다.`;
  }

  return undefined;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNextStageFromAdvancement(
  previousStage: StageWithResults,
  nextStageConfig: StructureStage,
  teams: Team[] = []
) {
  const advancingTeams = getStageAdvancingTeams(previousStage, teams, nextStageConfig.advancementRule);
  const mappedTeams = mapTeamsToNextStage(advancingTeams, nextStageConfig.slotMappingRule);

  return createStageInstance(nextStageConfig.type, mappedTeams, nextStageConfig.name);
}

export function validateStageConnection(fromStage: StructureStage, toStage: StructureStage): string[] {
  const warnings: string[] = [];

  if (fromStage.advancementRule.count <= 0) {
    warnings.push(`${fromStage.name}: 다음 Stage로 넘길 진출 팀 수가 없습니다.`);
  }

  if (toStage.participantCount < fromStage.advancementRule.count) {
    warnings.push(
      `${toStage.name}: 참가 슬롯(${toStage.participantCount})이 진출 팀 수(${fromStage.advancementRule.count})보다 적습니다.`
    );
  }

  const previewStage = {
    ...toStage,
    participantCount: fromStage.advancementRule.count
  };
  const adjustment = previewAutoAdjustment(previewStage);
  if (adjustment) warnings.push(adjustment);

  return warnings;
}

function createStageInstance(type: StageType, teams: Team[], name: string) {
  if (type === "league") return createLeagueStage(teams);
  if (type === "group") return createGroupStage(teams);
  if (type === "swiss") return createSwissStage(teams);
  if (type === "single_elimination") return createSingleEliminationTournament(teams, name);
  if (type === "double_elimination") return createDoubleEliminationBracket(teams);
  if (type === "triple_elimination") return generateTripleEliminationBracket(teams);
  return createStepladderBracket(teams);
}
