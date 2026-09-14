"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Folder, Grid2X2, Medal, Plus, Printer, RotateCcw, Rows3, Shield, SlidersHorizontal, Trash2, Users } from "lucide-react";
import { TeamDisplaySizeControl } from "@/components/settings/TeamDisplaySizeControl";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { getTeamThemeTextColor, getTeamVictoryTextColor, getTeamWinnerColor } from "@/lib/core/color";
import type { Team, TeamFolder } from "@/lib/core/models";
import type { TierListTier } from "@/store/tierListStore";
import { useTeamStore } from "@/store/teamStore";
import { useTierListStore } from "@/store/tierListStore";
import { useUiStore, type TeamDisplaySize } from "@/store/uiStore";

type TierTeamTone = "normal" | "victory";
type TierTeamLayout = "detail" | "logo";
type TierStylePatch = Partial<Pick<TierListTier, "name" | "color" | "textColor">>;

export default function TierListPage() {
  const { teams, folders } = useTeamStore();
  const { tiers, addTier, updateTier, deleteTier, moveTeamToTier, resetTiers, removeMissingTeams } =
    useTierListStore();
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [isTierSettingsOpen, setIsTierSettingsOpen] = useState(false);
  const [teamTone, setTeamTone] = useState<TierTeamTone>("normal");
  const [teamLayout, setTeamLayout] = useState<TierTeamLayout>("detail");
  const [tierOverrides, setTierOverrides] = useState<Record<string, TierStylePatch>>({});
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(() => new Set(["folder-default"]));
  const teamDisplaySize = useUiStore((state) => state.teamDisplaySize);
  const tierSize = tierListSizeClass[teamDisplaySize];
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const visibleTiers = useMemo(
    () => tiers.map((tier) => (tierOverrides[tier.id] ? { ...tier, ...tierOverrides[tier.id] } : tier)),
    [tierOverrides, tiers]
  );
  const assignedTeamIds = useMemo(
    () => new Set(visibleTiers.flatMap((tier) => tier.teamIds)),
    [visibleTiers]
  );
  const selectedTier = useMemo(
    () => visibleTiers.find((tier) => tier.id === selectedTierId) || visibleTiers[0],
    [selectedTierId, visibleTiers]
  );
  const unrankedTeams = useMemo(
    () => teams.filter((team) => !assignedTeamIds.has(team.id)),
    [assignedTeamIds, teams]
  );
  const unrankedFolderTree = useMemo(
    () => buildTierFolderTree(folders, unrankedTeams),
    [folders, unrankedTeams]
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

  useEffect(() => {
    setTierOverrides((current) => {
      let changed = false;
      const next = { ...current };

      for (const [tierId, patch] of Object.entries(current)) {
        const syncedTier = tiers.find((tier) => tier.id === tierId);
        const isSynced =
          !syncedTier ||
          ((patch.name === undefined || patch.name === syncedTier.name) &&
            (patch.color === undefined || patch.color === syncedTier.color) &&
            (patch.textColor === undefined || patch.textColor === syncedTier.textColor));

        if (isSynced) {
          delete next[tierId];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [tiers]);

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

  function toggleFolder(folderId: string) {
    setOpenFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function handleAddTier() {
    const tierId = addTier();
    setSelectedTierId(tierId);
    setIsTierSettingsOpen(true);
  }

  function applyTierPatch(id: string, patch: TierStylePatch) {
    setTierOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...patch }
    }));
    updateTier(id, patch);
  }

  function handleDeleteTier(id: string) {
    setTierOverrides((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    deleteTier(id);
  }

  function handleResetTiers() {
    setTierOverrides({});
    resetTiers();
  }

  function printTierListAsPdf() {
    if (typeof window === "undefined") return;

    const { body } = document;
    body.dataset.printingTier = "true";

    let cleanupTimer: number | undefined;
    const cleanup = () => {
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      delete body.dataset.printingTier;
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.requestAnimationFrame(() => {
      window.print();
      cleanupTimer = window.setTimeout(cleanup, 3000);
    });
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
          <TeamDisplaySizeControl />
          <Link href="/teams" className="button-muted">
            <Users className="h-4 w-4" />팀 관리
          </Link>
          <button type="button" className="button-muted" onClick={printTierListAsPdf}>
            <Printer className="h-4 w-4" />
            PDF 저장
          </button>
          <button
            type="button"
            className={isTierSettingsOpen ? "button-primary" : "button-muted"}
            onClick={() => setIsTierSettingsOpen((open) => !open)}
            aria-expanded={isTierSettingsOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            티어 설정
          </button>
          <button type="button" className="button-muted" onClick={handleAddTier}>
            <Plus className="h-4 w-4" />
            등급 추가
          </button>
          <button type="button" className="button-muted" onClick={handleResetTiers}>
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
            {visibleTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
        </div>
        {selectedTier ? (
          <TierStyleEditor key={selectedTier.id} tier={selectedTier} updateTier={applyTierPatch} />
        ) : (
          <div className="rounded-md border border-dashed border-line p-4 text-sm font-semibold text-muted">
            설정할 등급이 없습니다.
          </div>
        )}
      </section>
      ) : null}

      <div className="space-y-5">
        <section data-print-tier-root="true" className="arena-card overflow-hidden">
          <div className="print-only border-b border-line bg-panel px-4 py-3">
            <p className="section-kicker">Tier List</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink">티어리스트</h1>
          </div>
          <div className="divide-y divide-line">
            {visibleTiers.map((tier) => {
              const tierTeams = tier.teamIds.map((teamId) => teamsById.get(teamId)).filter(Boolean) as Team[];
              const tierTextColor = normalizeColor(tier.textColor, "#111827");
              const tierColor = normalizeColor(tier.color, "#2fe6ff");

              return (
                <div key={tier.id} className={clsx("grid bg-card/70", tierSize.row, tierSize.columns)}>
                  <div
                    className="relative flex flex-col border-r border-line"
                    style={{ backgroundColor: tierColor, color: tierTextColor }}
                  >
                    <button
                      type="button"
                      className={clsx("flex-1 text-center font-black uppercase outline-none transition hover:bg-black/10", tierSize.label)}
                      onClick={() => setSelectedTierId(tier.id)}
                    >
                      {tier.name}
                    </button>
                    <button
                      type="button"
                      className="no-print absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded border border-black/15 bg-black/10 opacity-55 transition hover:bg-black/25 hover:opacity-100"
                      style={{ color: tierTextColor }}
                      onClick={() => handleDeleteTier(tier.id)}
                      aria-label={`${tier.name} 등급 삭제`}
                      title="등급 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div
                    className={clsx("flex flex-wrap content-start", tierSize.content)}
                    onDragOver={allowDrop}
                    onDrop={(event) => dropToTier(event, tier.id)}
                  >
                    {tierTeams.map((team) => (
                      <TierTeamChip
                        key={team.id}
                        team={team}
                        tone={teamTone}
                        layout={teamLayout}
                        sizeLevel={teamDisplaySize}
                        onDragStart={() => handleDragStart(team.id)}
                        onDropBefore={(event) => dropToTier(event, tier.id, team.id)}
                      />
                    ))}
                    {!tierTeams.length ? (
                      <div className={clsx("grid flex-1 place-items-center rounded-md border border-dashed border-line font-semibold text-muted", tierSize.empty)}>
                        여기에 팀을 드래그
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="arena-card p-4" onDragOver={allowDrop} onDrop={dropToUnranked}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black uppercase tracking-wide text-ink">미배치 팀</h2>
              <p className="text-sm font-semibold text-muted">등급 밖으로 꺼내려면 이 영역에 드래그하면 됩니다.</p>
            </div>
            <span className="rounded-md border border-line px-2 py-1 text-xs font-black text-muted">
              {unrankedTeams.length}팀
            </span>
          </div>
          <div className="min-h-28 space-y-2 rounded-md border border-dashed border-line bg-field/60 p-3">
            {unrankedTeams.length
              ? unrankedFolderTree.map((folder) => (
                  <TierFolderSection
                    key={folder.id}
                    folder={folder}
                    teamsById={teamsById}
                    openFolderIds={openFolderIds}
                    teamTone={teamTone}
                    teamLayout={teamLayout}
                    teamDisplaySize={teamDisplaySize}
                    onToggleFolder={toggleFolder}
                    onDragStart={handleDragStart}
                  />
                ))
              : null}
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
      </div>
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

type TierFolderNode = {
  id: string;
  name: string;
  teamIds: string[];
  children: TierFolderNode[];
};

function buildTierFolderTree(folders: TeamFolder[], teams: Team[]): TierFolderNode[] {
  const defaultFolderId = "folder-default";
  const visibleTeamIds = new Set(teams.map((team) => team.id));
  const folderMap = new Map(
    (Array.isArray(folders) ? folders : []).map((folder) => [
      folder.id,
      {
        ...folder,
        teamIds: (folder.teamIds ?? []).filter((teamId) => visibleTeamIds.has(teamId)),
        itemIds: folder.itemIds ?? []
      }
    ])
  );
  const root = folderMap.get(defaultFolderId) ?? {
    id: defaultFolderId,
    name: "바탕화면",
    teamIds: teams.map((team) => team.id),
    itemIds: teams.map((team) => `team:${team.id}`)
  };

  function build(folderId: string): TierFolderNode {
    const folder = folderMap.get(folderId) ?? root;
    const children = (folder.itemIds ?? [])
      .filter((itemId) => itemId.startsWith("folder:"))
      .map((itemId) => itemId.slice("folder:".length))
      .filter((childId) => folderMap.has(childId))
      .map(build)
      .filter((child) => getNestedTierTeamIds(child).length > 0);
    const orderedTeamIds = (folder.itemIds ?? [])
      .filter((itemId) => itemId.startsWith("team:"))
      .map((itemId) => itemId.slice("team:".length))
      .filter((teamId) => folder.teamIds.includes(teamId) && visibleTeamIds.has(teamId));

    for (const teamId of folder.teamIds) {
      if (!orderedTeamIds.includes(teamId)) orderedTeamIds.push(teamId);
    }

    return { id: folder.id, name: folder.name, teamIds: orderedTeamIds, children };
  }

  return [build(root.id)];
}

function getNestedTierTeamIds(folder: TierFolderNode): string[] {
  return [...folder.teamIds, ...folder.children.flatMap(getNestedTierTeamIds)];
}

function TierFolderSection({
  folder,
  teamsById,
  openFolderIds,
  teamTone,
  teamLayout,
  teamDisplaySize,
  onToggleFolder,
  onDragStart,
  depth = 0
}: {
  folder: TierFolderNode;
  teamsById: Map<string, Team>;
  openFolderIds: Set<string>;
  teamTone: TierTeamTone;
  teamLayout: TierTeamLayout;
  teamDisplaySize: TeamDisplaySize;
  onToggleFolder: (folderId: string) => void;
  onDragStart: (teamId: string) => void;
  depth?: number;
}) {
  const isOpen = openFolderIds.has(folder.id);
  const nestedTeamIds = getNestedTierTeamIds(folder);
  const hasContents = nestedTeamIds.length > 0;

  return (
    <div className="rounded-md border border-line bg-panel/70">
      <div className="flex items-center gap-2 px-3 py-2" style={{ paddingLeft: `${12 + depth * 16}px` }}>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded border border-line bg-field text-muted"
          onClick={() => onToggleFolder(folder.id)}
          disabled={!hasContents}
          title={isOpen ? "폴더 접기" : "폴더 펼치기"}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Folder className="h-4 w-4 shrink-0 text-cyan" />
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onToggleFolder(folder.id)} disabled={!hasContents}>
          <span className="block truncate text-sm font-black uppercase text-ink">{folder.name}</span>
          <span className="block text-xs font-semibold text-muted">{nestedTeamIds.length}팀 미배치</span>
        </button>
      </div>
      {isOpen ? (
        <div className="space-y-2 border-t border-line p-2">
          {folder.children.map((child) => (
            <TierFolderSection
              key={child.id}
              folder={child}
              teamsById={teamsById}
              openFolderIds={openFolderIds}
              teamTone={teamTone}
              teamLayout={teamLayout}
              teamDisplaySize={teamDisplaySize}
              onToggleFolder={onToggleFolder}
              onDragStart={onDragStart}
              depth={depth + 1}
            />
          ))}
          {folder.teamIds.length ? (
            <div className="flex flex-wrap content-start gap-3">
              {folder.teamIds.map((teamId) => {
                const team = teamsById.get(teamId);
                if (!team) return null;
                return (
                  <TierTeamChip
                    key={team.id}
                    team={team}
                    tone={teamTone}
                    layout={teamLayout}
                    sizeLevel={teamDisplaySize}
                    onDragStart={() => onDragStart(team.id)}
                  />
                );
              })}
            </div>
          ) : null}
          {!hasContents ? <div className="rounded-md border border-dashed border-line p-3 text-sm font-semibold text-muted">비어 있는 폴더입니다.</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function TierTeamChip({
  team,
  tone,
  layout,
  sizeLevel,
  onDragStart,
  onDropBefore
}: {
  team: Team;
  tone: TierTeamTone;
  layout: TierTeamLayout;
  sizeLevel: TeamDisplaySize;
  onDragStart: () => void;
  onDropBefore?: (event: DragEvent) => void;
}) {
  const isVictory = tone === "victory";
  const chipStyle = getTierTeamChipStyle(team, isVictory, layout);
  const textStyle = getTierTeamTextStyle(team, isVictory);
  const size = tierTeamSizeClass[sizeLevel];

  if (layout === "logo") {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(event) => {
          if (onDropBefore) event.preventDefault();
        }}
        onDrop={onDropBefore}
        className={clsx(
          "grid cursor-grab place-items-center rounded-md border border-line bg-field shadow-sm transition hover:border-cyan active:cursor-grabbing",
          size.logoTile
        )}
        style={chipStyle}
        title={team.name}
      >
        <TeamLogo team={team} size={size.logoOnlyLogo} highlighted={isVictory} useVictoryLogo={isVictory} />
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
      className={clsx(
        "flex cursor-grab items-center rounded-md border border-line bg-field shadow-sm transition hover:border-cyan active:cursor-grabbing",
        size.detailCard
      )}
      style={chipStyle}
    >
      <TeamLogo team={team} size={size.detailLogo} highlighted={isVictory} useVictoryLogo={isVictory} />
      <div className="min-w-0">
        <div className={clsx("truncate font-black text-ink", size.primaryText)} style={textStyle}>{team.shortName || team.name}</div>
        <div className={clsx("truncate font-semibold text-muted", size.secondaryText)} style={textStyle}>{team.name}</div>
      </div>
    </div>
  );
}

const tierTeamSizeClass: Record<
  TeamDisplaySize,
  {
    logoTile: string;
    logoOnlyLogo: "xs" | "sm" | "md" | "lg" | "xl";
    detailCard: string;
    detailLogo: "xs" | "sm" | "md" | "lg" | "xl";
    primaryText: string;
    secondaryText: string;
  }
> = {
  1: {
    logoTile: "h-12 w-12",
    logoOnlyLogo: "sm",
    detailCard: "h-12 min-w-40 gap-2 px-2",
    detailLogo: "xs",
    primaryText: "text-xs",
    secondaryText: "text-[10px]"
  },
  2: {
    logoTile: "h-14 w-14",
    logoOnlyLogo: "md",
    detailCard: "h-14 min-w-44 gap-2 px-3",
    detailLogo: "sm",
    primaryText: "text-sm",
    secondaryText: "text-xs"
  },
  3: {
    logoTile: "h-16 w-16",
    logoOnlyLogo: "md",
    detailCard: "h-16 min-w-48 gap-2 px-3",
    detailLogo: "sm",
    primaryText: "text-sm",
    secondaryText: "text-xs"
  },
  4: {
    logoTile: "h-20 w-20",
    logoOnlyLogo: "lg",
    detailCard: "h-20 min-w-56 gap-3 px-4",
    detailLogo: "md",
    primaryText: "text-base",
    secondaryText: "text-sm"
  },
  5: {
    logoTile: "h-24 w-24",
    logoOnlyLogo: "xl",
    detailCard: "h-24 min-w-64 gap-3 px-4",
    detailLogo: "lg",
    primaryText: "text-lg",
    secondaryText: "text-base"
  }
};

const tierListSizeClass: Record<
  TeamDisplaySize,
  {
    row: string;
    columns: string;
    label: string;
    content: string;
    empty: string;
  }
> = {
  1: {
    row: "min-h-14",
    columns: "grid-cols-[76px_1fr]",
    label: "min-h-14 px-2 text-xl",
    content: "min-h-14 gap-2 p-2",
    empty: "min-h-10 text-xs"
  },
  2: {
    row: "min-h-16",
    columns: "grid-cols-[88px_1fr]",
    label: "min-h-16 px-2 text-2xl",
    content: "min-h-16 gap-2 p-2",
    empty: "min-h-12 text-xs"
  },
  3: {
    row: "min-h-20",
    columns: "grid-cols-[108px_1fr]",
    label: "min-h-20 px-3 text-3xl",
    content: "min-h-20 gap-2.5 p-2.5",
    empty: "min-h-16 text-sm"
  },
  4: {
    row: "min-h-24",
    columns: "grid-cols-[132px_1fr]",
    label: "min-h-24 px-4 text-4xl",
    content: "min-h-24 gap-3 p-3",
    empty: "min-h-20 text-sm"
  },
  5: {
    row: "min-h-28",
    columns: "grid-cols-[156px_1fr]",
    label: "min-h-28 px-5 text-5xl",
    content: "min-h-28 gap-3 p-3",
    empty: "min-h-24 text-base"
  }
};

function getTierTeamChipStyle(team: Team, isVictory: boolean, layout: TierTeamLayout): CSSProperties | undefined {
  if (!isVictory) return undefined;
  const primary = getTeamWinnerColor(team);
  if (!primary) return undefined;
  if (layout === "logo") return { backgroundColor: primary };

  return {
    borderColor: primary,
    backgroundColor: primary
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
