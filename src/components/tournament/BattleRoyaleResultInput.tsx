"use client";

import { useEffect, useMemo, useState } from "react";
import type { BattleRoyalePlacement, BattleRoyaleRound, Team } from "@/lib/core/models";
import { TeamLogo } from "@/components/teams/TeamLogo";

type BattleRoyaleResultInputProps = {
  round: BattleRoyaleRound;
  teamsById: Map<string, Team>;
  onSave: (placements: BattleRoyalePlacement[]) => void;
};

export function BattleRoyaleResultInput({
  round,
  teamsById,
  onSave
}: BattleRoyaleResultInputProps) {
  const initial = useMemo(() => round.teamIds.map((teamId, index) => {
    const existing = round.placements.find((placement) => placement.teamId === teamId);
    return (
      existing ?? {
        teamId,
        placement: index + 1,
        kills: 0,
        bonusPoints: 0,
        penaltyPoints: 0
      }
    );
  }), [round.placements, round.teamIds]);
  const [placements, setPlacements] = useState<BattleRoyalePlacement[]>(initial);

  useEffect(() => {
    setPlacements(initial);
  }, [initial]);

  const update = (teamId: string, patch: Partial<BattleRoyalePlacement>) => {
    setPlacements((current) =>
      current.map((placement) => (placement.teamId === teamId ? { ...placement, ...patch } : placement))
    );
  };

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-panel">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="bg-arena text-xs uppercase text-slate-400">
          <tr>
            {["팀", "순위", "킬", "보너스", "페널티"].map((label) => (
              <th key={label} className="px-3 py-3 text-left font-black">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {placements.map((placement) => {
            const team = teamsById.get(placement.teamId);
            return (
              <tr key={placement.teamId} className="border-t border-line text-ink">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size="sm" />
                    <span className="font-black uppercase">{team?.shortName || team?.name || "미정"}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <NumberCell
                    value={placement.placement}
                    onChange={(nextPlacement) => update(placement.teamId, { placement: nextPlacement })}
                  />
                </td>
                <td className="px-3 py-3">
                  <NumberCell value={placement.kills} onChange={(kills) => update(placement.teamId, { kills })} />
                </td>
                <td className="px-3 py-3">
                  <NumberCell
                    value={placement.bonusPoints ?? 0}
                    onChange={(bonusPoints) => update(placement.teamId, { bonusPoints })}
                  />
                </td>
                <td className="px-3 py-3">
                  <NumberCell
                    value={placement.penaltyPoints ?? 0}
                    onChange={(penaltyPoints) => update(placement.teamId, { penaltyPoints })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-line p-3 text-right">
        <button type="button" className="button-primary h-9 px-4" onClick={() => onSave(placements)}>
          라운드 결과 저장
        </button>
      </div>
    </div>
  );
}

function NumberCell({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-9 w-20 rounded-md border border-line bg-field px-2 text-center font-black text-ink"
    />
  );
}
