"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { BattleRoyalePlacement, BattleRoyaleRound, Team } from "@/lib/core/models";
import { isBattleRoyaleRoundComplete } from "@/lib/core/battleRoyale";
import { TeamLogo } from "@/components/teams/TeamLogo";

type BattleRoyaleResultInputProps = {
  round: BattleRoyaleRound;
  teamsById: Map<string, Team>;
  chickenCounts?: Map<string, number>;
  onSave: (placements: BattleRoyalePlacement[]) => void;
};

export function BattleRoyaleResultInput({
  round,
  teamsById,
  chickenCounts,
  onSave
}: BattleRoyaleResultInputProps) {
  const placements = useMemo(() => getRoundPlacements(round), [round]);

  const update = (teamId: string, patch: Partial<BattleRoyalePlacement>) => {
    const nextPlacements =
      typeof patch.placement === "number"
        ? swapPlacement(placements, teamId, patch.placement)
        : placements.map((placement) => (placement.teamId === teamId ? { ...placement, ...patch } : placement));
    onSave(nextPlacements);
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
            const isMatchWinner = isBattleRoyaleRoundComplete(round) && placement.placement === 1;
            return (
              <tr key={placement.teamId} className={clsx("border-t text-ink", isMatchWinner ? "border-lime/70" : "border-line")}>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size="sm" highlighted={isMatchWinner} />
                    <span className={clsx("font-black uppercase", isMatchWinner && "text-lime")}>{team?.shortName || team?.name || "미정"}</span>
                    <ChickenBadge count={chickenCounts?.get(placement.teamId) ?? 0} />
                  </div>
                </td>
                <td className={clsx("px-3 py-3", isMatchWinner && "ring-1 ring-inset ring-lime/70")}>
                  <PlacementSelect
                    value={placement.placement}
                    max={round.teamIds.length}
                    winner={isMatchWinner}
                    onChange={(nextPlacement) => update(placement.teamId, { placement: nextPlacement })}
                  />
                </td>
                <td className={clsx("px-3 py-3", isMatchWinner && "ring-1 ring-inset ring-lime/70")}>
                  <NumberCell value={placement.kills} winner={isMatchWinner} onChange={(kills) => update(placement.teamId, { kills })} />
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

function getRoundPlacements(round: BattleRoyaleRound) {
  return round.teamIds.map((teamId, index) => {
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
  });
}

function PlacementSelect({ value, max, winner, onChange }: { value: number; max: number; winner?: boolean; onChange: (value: number) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className={clsx(
        "h-9 w-32 rounded-md border px-2 text-center font-black",
        winner ? "border-lime text-lime" : "border-line bg-field text-ink"
      )}
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((placement) => (
        <option key={placement} value={placement}>
          {placement}등 ({getPlacementPointLabel(placement)}점)
        </option>
      ))}
    </select>
  );
}

function NumberCell({ value, winner, onChange }: { value: number; winner?: boolean; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className={clsx(
        "h-9 w-20 rounded-md border px-2 text-center font-black",
        winner ? "border-lime text-lime" : "border-line bg-field text-ink"
      )}
    />
  );
}

function ChickenBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="rounded border border-gold/50 bg-gold/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-gold">
      치킨 {count}
    </span>
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

function swapPlacement(
  placements: BattleRoyalePlacement[],
  teamId: string,
  nextPlacement: number
) {
  const currentPlacement = placements.find((placement) => placement.teamId === teamId);
  if (!currentPlacement || currentPlacement.placement === nextPlacement) return placements;

  return placements.map((placement) => {
    if (placement.teamId === teamId) return { ...placement, placement: nextPlacement };
    if (placement.placement === nextPlacement) return { ...placement, placement: currentPlacement.placement };
    return placement;
  });
}
