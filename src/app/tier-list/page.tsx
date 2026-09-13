"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import Link from "next/link";
import { Grid2X2, Medal, Plus, RotateCcw, Rows3, Shield, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { getTeamThemeTextColor, getTeamVictoryTextColor, getTeamWinnerAccentColor, getTeamWinnerColor } from "@/lib/core/color";
import type { Team } from "@/lib/core/models";
import type { TierListTier } from "@/store/tierListStore";
import { useTeamStore } from "@/store/teamStore";
import { useTierListStore } from "@/store/tierListStore";

type TierTeamTone = "normal" | "victory";
type TierTeamLayout = "detail" | "logo";

export default function TierListPage() {
  const { teams } = useTeamStore();
  const { tiers, addTier, updateTier, deleteTier, moveTeamToTier, resetTiers, removeMissingTeams } =
    useTierListStore();
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [isTierSettingsOpen, setIsTierSettingsOpen] = useState(false);
  const [teamTone, setTeamTone] = useState<TierTeamTone>("normal");
  const [teamLayout, setTeamLayout] = useState<TierTeamLayout>("detail");
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const assignedTeamIds = useMemo(
    () => new Set(tiers.flatMap((tier) => tier.teamIds)),
    [tiers]
  );
  const selectedTier = useMemo(
    () => tiers.find((tier) => tier.id === selectedTierId) || tiers[0],
    [selectedTierId, tiers]
  );
  const unrankedTeams = useMemo(
    () => teams.filter((team) => !assignedTeamIds.has(team.id)),
    [assignedTeamIds, teams]
  );

  useEffect(() => {
    removeMissingTeams(teams.map((team) => team.id));
  }, [removeMissingTeams, teams]);

  useEffect(() => {
    if (!selectedTierId && tiers[0]) setSelectedTierId(tiers[0].id);
    if (selectedTierId && !tiers.some((tier) => tier.id === selectedTierId)) {
      setSelectedTierId(tiers[0]?.id ?? null);
    }
  }, [selectedTierId, tiers]);

  function handleDragStart(teamId: string) {
    setDraggedTeamId(teamId);
  }

  function allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  function dropToTier(event: DragEvent, tierId: string, beforeTeamId?: string) {
    event.preventDefault();
    if (!draggedTeamId) return;
    moveTeamToTier(draggedTeamId, tierId, beforeTeamId);
    setDraggedTeamId(null);
  }

  function dropToUnranked(event: DragEvent) {
    event.preventDefault();
    if (!draggedTeamId) return;
    moveTeamToTier(draggedTeamId, null);
    setDraggedTeamId(null);
  }

  return (
    <main className="w-full px-3 py-6 sm:px-4 2xl:px-5">
      <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Tier List</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink">티어리스트</h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            만든 팀을 드래그해서 등급에 배치합니다. 색상은 티어 설정에서 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-line bg-field p-1">
            <button
              type="button"
              className={`inline-flex h-9 items-center gap-1.5 rounded px-2.5 text-xs font-black uppercase transition ${
                teamTone === "normal" ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
              }`}
              onClick={() => setTeamTone("normal")}
              title="팀을 노멀 상태로 표시"
            >
              <Shield className="h-4 w-4" />
              노멀
            </button>
            <button
              type="button"
              className={`inline-flex h-9 items-center gap-1.5 rounded px-2.5 text-xs font-black uppercase transition ${
                teamTone === "victory" ? "bg-lime text-arena" : "text-muted hover:bg-panel hover:text-ink"
              }`}
              onClick={() => setTeamTone("victory")}
              title="모든 팀을 승리 상태로 표시"
            >
              <Medal className="h-4 w-4" />
              승리
            </button>
          </div>
          <div className="flex rounded-md border border-line bg-field p-1">
            <button
              type="button"
              className={`inline-flex h-9 items-center gap-1.5 rounded px-2.5 text-xs font-black uppercase transition ${
                teamLayout === "detail" ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
              }`}
              onClick={() => setTeamLayout("detail")}
              title="로고와 팀명을 함께 표시"
            >
              <Rows3 className="h-4 w-4" />
              상세
            </button>
            <button
              type="button"
              className={`inline-flex h-9 items-center gap-1.5 rounded px-2.5 text-xs font-black uppercase transition ${
                teamLayout === "logo" ? "bg-cyan text-arena" : "text-muted hover:bg-panel hover:text-ink"
              }`}
              onClick={() => setTeamLayout("logo")}
              title="로고만 네모 칸으로 표시"
            >
              <Grid2X2 className="h-4 w-4" />
              로고
            </button>
          </div>
          <Link href="/teams" className="button-muted">
            <Users className="h-4 w-4" />팀 관리
          </Link>
          <button
            type="button"
            className={isTierSettingsOpen ? "button-primary" : "button-muted"}
            onClick={() => setIsTierSettingsOpen((open) => !open)}
            aria-expanded={isTierSettingsOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            티어 설정
          </button>
          <button type="button" className="button-muted" onClick={addTier}>
            <Plus className="h-4 w-4" />
            등급 추가
          </button>
          <button type="button" className="button-muted" onClick={resetTiers}>
            <RotateCcw className="h-4 w-4" />
            초기화
          </button>
        </div>
      </section>

      {isTierSettingsOpen ? (
      <section className="mb-5 arena-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Tier Settings</p>
            <h2 className="mt-1 font-black uppercase tracking-wide text-ink">티어 설정</h2>
          </div>
          <select
            className="field-input tier-select w-44"
            value={selectedTier?.id ?? ""}
            onChange={(event) => setSelectedTierId(event.target.value)}
          >
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
        </div>
        {selectedTier ? (
          <TierStyleEditor tier={selectedTier} updateTier={updateTier} />
        ) : (
          <div className="rounded-md border border-dashed border-line p-4 text-sm font-semibold text-muted">
            설정할 등급이 없습니다.
          </div>
        )}
      </section>
      ) : null}

      <section className="arena-card overflow-hidden">
        <div className="divide-y divide-line">
          {tiers.map((tier) => {
            const tierTeams = tier.teamIds.map((teamId) => teamsById.get(teamId)).filter(Boolean) as Team[];
            const tierTextColor = normalizeColor(tier.textColor, "#111827");
            const tierColor = normalizeColor(tier.color, "#2fe6ff");

            return (
              <div key={tier.id} className="grid min-h-28 grid-cols-[112px_1fr] bg-card/70">
                <div
                  className="relative flex flex-col border-r border-line"
                  style={{ backgroundColor: tierColor, color: tierTextColor }}
                >
                  <button
                    type="button"
                    className="min-h-28 flex-1 px-3 text-center text-3xl font-black uppercase outline-none transition hover:bg-black/10"
                    onClick={() => setSelectedTierId(tier.id)}
                  >
                    {tier.name}
                  </button>
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded border border-black/15 bg-black/10 opacity-55 transition hover:bg-black/25 hover:opacity-100"
                    style={{ color: tierTextColor }}
                    onClick={() => deleteTier(tier.id)}
                    aria-label={`${tier.name} 등급 삭제`}
                    title="등급 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div
                  className="flex min-h-28 flex-wrap content-start gap-2 p-3"
                  onDragOver={allowDrop}
                  onDrop={(event) => dropToTier(event, tier.id)}
                >
                  {tierTeams.map((team) => (
                    <TierTeamChip
                      key={team.id}
                      team={team}
                      tone={teamTone}
                      layout={teamLayout}
                      onDragStart={() => handleDragStart(team.id)}
                      onDropBefore={(event) => dropToTier(event, tier.id, team.id)}
                    />
                  ))}
                  {!tierTeams.length ? (
                    <div className="grid min-h-16 flex-1 place-items-center rounded-md border border-dashed border-line text-sm font-semibold text-muted">
                      여기에 팀을 드래그
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 arena-card p-4" onDragOver={allowDrop} onDrop={dropToUnranked}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black uppercase tracking-wide text-ink">미배치 팀</h2>
            <p className="text-sm font-semibold text-muted">등급 밖으로 꺼내려면 이 영역에 드래그하면 됩니다.</p>
          </div>
          <span className="rounded-md border border-line px-2 py-1 text-xs font-black text-muted">
            {unrankedTeams.length}팀
          </span>
        </div>
        <div className="flex min-h-24 flex-wrap content-start gap-2 rounded-md border border-dashed border-line bg-field/60 p-3">
          {unrankedTeams.map((team) => (
            <TierTeamChip key={team.id} team={team} tone={teamTone} layout={teamLayout} onDragStart={() => handleDragStart(team.id)} />
          ))}
          {!teams.length ? (
            <div className="grid flex-1 place-items-center text-sm font-semibold text-muted">
              아직 팀이 없습니다. 팀 관리에서 먼저 추가하세요.
            </div>
          ) : null}
          {teams.length > 0 && !unrankedTeams.length ? (
            <div className="grid flex-1 place-items-center text-sm font-semibold text-muted">
              모든 팀이 등급에 배치되었습니다.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function TierStyleEditor({
  tier,
  updateTier
}: {
  tier: TierListTier;
  updateTier: (id: string, patch: Partial<Pick<TierListTier, "name" | "color" | "textColor">>) => void;
}) {
  const tierColor = normalizeColor(tier.color, "#2fe6ff");
  const tierTextColor = normalizeColor(tier.textColor, "#111827");

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
      <label className="grid gap-2 rounded-md border border-line bg-field p-3">
        <span className="text-xs font-black uppercase tracking-wide text-muted">등급 이름</span>
        <input
          className="field-input"
          value={tier.name}
          onChange={(event) => updateTier(tier.id, { name: event.target.value })}
        />
      </label>
      <ColorControl
        label="티어 색상"
        value={tierColor}
        onChange={(color) => updateTier(tier.id, { color })}
      />
      <ColorControl
        label="티어 글씨 색상"
        value={tierTextColor}
        onChange={(textColor) => updateTier(tier.id, { textColor })}
      />
      <div className="rounded-md border border-line bg-field p-3 md:col-span-3">
        <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">미리보기</span>
        <div
          className="grid h-20 place-items-center rounded-md text-4xl font-black uppercase"
          style={{ backgroundColor: tierColor, color: tierTextColor }}
        >
          {tier.name || "TIER"}
        </div>
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 rounded-md border border-line bg-field p-3">
      <span className="text-xs font-black uppercase tracking-wide text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-10 w-12 cursor-pointer rounded border border-line bg-transparent"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          className="field-input"
          value={value}
          onChange={(event) => onChange(normalizeColor(event.target.value, value))}
        />
      </div>
    </label>
  );
}

function TierTeamChip({
  team,
  tone,
  layout,
  onDragStart,
  onDropBefore
}: {
  team: Team;
  tone: TierTeamTone;
  layout: TierTeamLayout;
  onDragStart: () => void;
  onDropBefore?: (event: DragEvent) => void;
}) {
  const isVictory = tone === "victory";
  const chipStyle = getTierTeamChipStyle(team, isVictory);
  const textStyle = getTierTeamTextStyle(team, isVictory);

  if (layout === "logo") {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(event) => {
          if (onDropBefore) event.preventDefault();
        }}
        onDrop={onDropBefore}
        className="grid h-16 w-16 cursor-grab place-items-center rounded-md border border-line bg-field shadow-sm transition hover:border-cyan active:cursor-grabbing"
        style={chipStyle}
        title={team.name}
      >
        <TeamLogo team={team} size="md" highlighted={isVictory} useVictoryLogo={isVictory} />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (onDropBefore) event.preventDefault();
      }}
      onDrop={onDropBefore}
      className="flex h-16 min-w-48 cursor-grab items-center gap-2 rounded-md border border-line bg-field px-3 shadow-sm transition hover:border-cyan active:cursor-grabbing"
      style={chipStyle}
    >
      <TeamLogo team={team} size="sm" highlighted={isVictory} useVictoryLogo={isVictory} />
      <div className="min-w-0">
        <div className="truncate text-sm font-black text-ink" style={textStyle}>{team.shortName || team.name}</div>
        <div className="truncate text-xs font-semibold text-muted" style={textStyle}>{team.name}</div>
      </div>
    </div>
  );
}

function getTierTeamChipStyle(team: Team, isVictory: boolean): CSSProperties | undefined {
  if (!isVictory) return undefined;
  const primary = getTeamWinnerColor(team);
  const accent = getTeamWinnerAccentColor(team) ?? primary;
  if (!primary) return undefined;
  return {
    borderColor: accent,
    background: `linear-gradient(90deg, ${accent} 0 4px, ${primary} 4px 100%)`
  };
}

function getTierTeamTextStyle(team: Team, isVictory: boolean): CSSProperties | undefined {
  const color = isVictory ? getTeamVictoryTextColor(team) || getTeamThemeTextColor(team) : getTeamThemeTextColor(team);
  return color ? { color } : undefined;
}

function normalizeColor(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-fA-F]{6}$/.test(prefixed)) return prefixed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
    const [, r, g, b] = prefixed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}
