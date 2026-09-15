"use client";

import { useEffect, useMemo, useState } from "react";
import { Dices } from "lucide-react";
import type { BattleRoyalePlacement, BattleRoyaleStage, Team } from "@/lib/core/models";
import {
  applyBattleRoyaleResult,
  calculateBattleRoyaleStandings
} from "@/lib/core/battleRoyale";
import { createRandomBattleRoyalePlacements } from "@/lib/core/randomResults";
import { BattleRoyaleResultInput } from "@/components/tournament/BattleRoyaleResultInput";
import { BattleRoyaleStandingsTable } from "@/components/tournament/BattleRoyaleStandingsTable";

type BattleRoyaleStageViewProps = {
  stage: BattleRoyaleStage;
  teams: Team[];
  onChange?: (stage: BattleRoyaleStage) => void;
};

export function BattleRoyaleStageView({ stage, teams, onChange }: BattleRoyaleStageViewProps) {
  const [localStage, setLocalStage] = useState(stage);
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const standings = useMemo(
    () => calculateBattleRoyaleStandings(localStage, teams),
    [localStage, teams]
  );

  useEffect(() => {
    setLocalStage(stage);
  }, [stage]);

  const updateStage = (nextStage: BattleRoyaleStage) => {
    setLocalStage(nextStage);
    onChange?.(nextStage);
  };

  const updateScoringMode = (scoringMode: NonNullable<BattleRoyaleStage["options"]["scoringMode"]>) => {
    updateStage({
      ...localStage,
      options: {
        ...localStage.options,
        scoringMode
      }
    });
  };

  const saveRound = (roundId: string, placements: BattleRoyalePlacement[]) => {
    const nextStage = applyBattleRoyaleResult(localStage, roundId, placements);
    updateStage(nextStage);
  };

  const autoFillRound = (roundId: string) => {
    const round = localStage.rounds.find((item) => item.id === roundId);
    if (!round) return;
    saveRound(roundId, createRandomBattleRoyalePlacements(round.teamIds));
  };

  const autoFillAll = () => {
    const nextStage = localStage.rounds.reduce(
      (stage, round) => applyBattleRoyaleResult(stage, round.id, createRandomBattleRoyalePlacements(round.teamIds)),
      localStage
    );
    updateStage(nextStage);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-md border border-line bg-field px-4 py-3 text-sm font-semibold leading-6 text-muted">
        {localStage.options.stageMode === "qualifier"
          ? `배틀로얄 예선: 24팀, A/B/C 3개 조, 조별 8팀. 각 조는 다른 두 조와 ${localStage.options.matchesPerPair ?? localStage.options.roundCount}경기씩 만나고, 통합 순위 1-16위가 본선에 진출합니다.`
          : localStage.options.stageMode === "final"
            ? `배틀로얄 본선: 16팀 단일 로비, ${localStage.options.roundCount}경기 누적 점수로 최종 순위를 결정합니다.`
            : "배틀로얄 누적 점수로 순위를 결정합니다."}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-line bg-panel px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-cyan">점수 방식</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            순위 생존 점수는 1위 10점, 2위 6점, 3위 5점, 4위 4점, 5위 3점, 6위 2점, 7-8위 1점입니다.
          </p>
        </div>
        <label className="w-full max-w-xs space-y-1.5">
          <span className="text-sm font-bold text-ink">총점 계산</span>
          <select
            className="input"
            value={localStage.options.scoringMode ?? "combined"}
            onChange={(event) =>
              updateScoringMode(event.target.value as NonNullable<BattleRoyaleStage["options"]["scoringMode"]>)
            }
          >
            <option value="placement">순위</option>
            <option value="kills">킬</option>
            <option value="combined">순위 + 킬 합산</option>
          </select>
        </label>
      </div>

      {localStage.warnings.length ? (
        <div className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-ink">
          {localStage.warnings.join(" ")}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-cyan/45 bg-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan transition hover:bg-cyan hover:text-arena"
          onClick={autoFillAll}
        >
          <Dices className="h-4 w-4" aria-hidden="true" />
          전체 자동 결과
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {localStage.rounds.map((round) => (
          <section key={round.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase text-ink">
                {round.groupName ?? `${round.round}라운드`}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-500">
                  {round.teamIds.length}팀
                </span>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded border border-line bg-field text-muted transition hover:border-cyan hover:text-cyan"
                  onClick={() => autoFillRound(round.id)}
                  title="이 라운드 자동 결과"
                >
                  <Dices className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <BattleRoyaleResultInput
              round={round}
              teamsById={teamsById}
              onSave={(placements) => saveRound(round.id, placements)}
            />
          </section>
        ))}
      </div>

      <BattleRoyaleStandingsTable
        standings={standings}
        teamsById={teamsById}
        advanceCount={localStage.options.advanceCount}
      />
    </section>
  );
}
