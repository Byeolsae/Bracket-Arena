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
            {["팀", "순위", "킬"].map((label) => (
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
                  <PlacementSelect
                    value={placement.placement}
                    max={round.teamIds.length}
                    onChange={(nextPlacement) => update(placement.teamId, { placement: nextPlacement })}
                  />
                </td>
                <td className="px-3 py-3">
                  <NumberCell value={placement.kills} onChange={(kills) => update(placement.teamId, { kills })} />
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

function PlacementSelect({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-9 w-32 rounded-md border border-line bg-field px-2 text-center font-black text-ink"
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((placement) => (
        <option key={placement} value={placement}>
          {placement}등 ({getPlacementPointLabel(placement)}점)
        </option>
      ))}
    </select>
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

function getPlacementPointLabel(placement: number) {
  if (placement === 1) return 10;
  if (placement === 2) return 6;
  if (placement === 3) return 5;
  if (placement === 4) return 4;
  if (placement === 5) return 3;
  if (placement === 6) return 2;
  if (placement === 7 || placement === 8) return 1;
  return 0;
}
