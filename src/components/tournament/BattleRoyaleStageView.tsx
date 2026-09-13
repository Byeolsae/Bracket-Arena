"use client";

import { useMemo, useState } from "react";
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

  const saveRound = (roundId: string, placements: BattleRoyalePlacement[]) => {
    const nextStage = applyBattleRoyaleResult(localStage, roundId, placements);
    setLocalStage(nextStage);
    onChange?.(nextStage);
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
    setLocalStage(nextStage);
    onChange?.(nextStage);
  };

  return (
    <section className="space-y-6">
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
                Round {round.round} {round.groupName ? `/ ${round.groupName}` : ""}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-500">
                  {round.teamIds.length} teams
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
