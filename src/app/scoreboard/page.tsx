"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { Fragment, useRef, useState } from "react";
import { Eye, MonitorPlay, Move, Plus, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";

type NameMode = "short" | "full";
type Direction = "horizontal" | "vertical";
type ScreenResolution = "fhd" | "qhd" | "uhd" | "custom";
type DragGuides = {
  verticalCenter: boolean;
  horizontalCenter: boolean;
  leftEdge: boolean;
  rightEdge: boolean;
  topEdge: boolean;
  bottomEdge: boolean;
};

type ScoreboardTeam = {
  id: string;
  name: string;
  shortName: string;
  score: number;
};

type ScoreboardState = {
  timer: string;
  teams: ScoreboardTeam[];
};

type OverlaySettings = {
  x: number;
  y: number;
  customWidth: number;
  customHeight: number;
  teamWidth: number;
  scoreWidth: number;
  rowHeight: number;
  timerWidth: number;
  logoSize: number;
  fontSize: number;
  nameMode: NameMode;
  direction: Direction;
  resolution: ScreenResolution;
  splitTeams: boolean;
  teamGap: number;
  symmetricBrackets: boolean;
  showLogo: boolean;
  showTimer: boolean;
  opacity: number;
};

const defaultScoreboard: ScoreboardState = {
  timer: "11:38:39",
  teams: [
    { id: "team-1", name: "DRX", shortName: "DRX", score: 0 },
    { id: "team-2", name: "Gen.G", shortName: "GEN", score: 0 }
  ]
};

const defaultSettings: OverlaySettings = {
  x: 0,
  y: 0,
  customWidth: 1920,
  customHeight: 1080,
  teamWidth: 205,
  scoreWidth: 54,
  rowHeight: 48,
  timerWidth: 190,
  logoSize: 30,
  fontSize: 30,
  nameMode: "short",
  direction: "vertical",
  resolution: "fhd",
  splitTeams: false,
  teamGap: 0,
  symmetricBrackets: true,
  showLogo: true,
  showTimer: true,
  opacity: 100
};

const resolutionOptions: Record<ScreenResolution, { label: string; width: number; height: number }> = {
  fhd: { label: "FHD", width: 1920, height: 1080 },
  qhd: { label: "QHD", width: 2560, height: 1440 },
  uhd: { label: "UHD", width: 3840, height: 2160 },
  custom: { label: "직접", width: 1920, height: 1080 }
};

const snapDistance = 10;
const hiddenDragGuides: DragGuides = {
  verticalCenter: false,
  horizontalCenter: false,
  leftEdge: false,
  rightEdge: false,
  topEdge: false,
  bottomEdge: false
};

function getScreenSize(settings: OverlaySettings) {
  if (settings.resolution === "custom") {
    return {
      width: settings.customWidth,
      height: settings.customHeight
    };
  }

  return resolutionOptions[settings.resolution];
}

export default function ScoreboardPage() {
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(defaultScoreboard);
  const [settings, setSettings] = useState<OverlaySettings>(defaultSettings);
  const [dragGuides, setDragGuides] = useState<DragGuides>(hiddenDragGuides);
  const previewRef = useRef<HTMLDivElement>(null);

  const updateSetting = <Key extends keyof OverlaySettings>(key: Key, value: OverlaySettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updateTimer = (timer: string) => {
    setScoreboard((current) => ({ ...current, timer }));
  };

  const updateTeam = <Key extends keyof ScoreboardTeam>(
    teamId: string,
    key: Key,
    value: ScoreboardTeam[Key]
  ) => {
    setScoreboard((current) => ({
      ...current,
      teams: current.teams.map((team) => (team.id === teamId ? { ...team, [key]: value } : team))
    }));
  };

  const addTeam = () => {
    setScoreboard((current) => {
      const nextNumber = current.teams.length + 1;

      return {
        ...current,
        teams: [
          ...current.teams,
          {
            id: `team-${Date.now()}`,
            name: `Team ${nextNumber}`,
            shortName: `T${nextNumber}`,
            score: 0
          }
        ]
      };
    });
  };

  const removeTeam = (teamId: string) => {
    setScoreboard((current) => {
      if (current.teams.length <= 2) return current;

      return {
        ...current,
        teams: current.teams.filter((team) => team.id !== teamId)
      };
    });
  };

  const handleScoreboardDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !previewRef.current) return;

    const previewRect = previewRef.current.getBoundingClientRect();
    const overlayRect = event.currentTarget.getBoundingClientRect();
    const grabOffsetX = event.clientX - overlayRect.left;
    const grabOffsetY = event.clientY - overlayRect.top;

    event.preventDefault();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxLeft = Math.max(0, previewRect.width - overlayRect.width);
      const maxTop = Math.max(0, previewRect.height - overlayRect.height);
      const centerLeft = maxLeft / 2;
      const centerTop = maxTop / 2;
      let nextLeft = clamp(moveEvent.clientX - previewRect.left - grabOffsetX, 0, maxLeft);
      let nextTop = clamp(moveEvent.clientY - previewRect.top - grabOffsetY, 0, maxTop);
      const nextGuides: DragGuides = { ...hiddenDragGuides };

      if (Math.abs(nextLeft - centerLeft) <= snapDistance) {
        nextLeft = centerLeft;
        nextGuides.verticalCenter = true;
      } else if (nextLeft <= snapDistance) {
        nextLeft = 0;
        nextGuides.leftEdge = true;
      } else if (Math.abs(nextLeft - maxLeft) <= snapDistance) {
        nextLeft = maxLeft;
        nextGuides.rightEdge = true;
      }

      if (Math.abs(nextTop - centerTop) <= snapDistance) {
        nextTop = centerTop;
        nextGuides.horizontalCenter = true;
      } else if (nextTop <= snapDistance) {
        nextTop = 0;
        nextGuides.topEdge = true;
      } else if (Math.abs(nextTop - maxTop) <= snapDistance) {
        nextTop = maxTop;
        nextGuides.bottomEdge = true;
      }

      setSettings((current) => ({
        ...current,
        x: Math.round((nextLeft / Math.max(1, previewRect.width)) * 1000) / 10,
        y: Math.round((nextTop / Math.max(1, previewRect.height)) * 1000) / 10
      }));
      setDragGuides(nextGuides);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setDragGuides(hiddenDragGuides);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleTeamGapDragStart = (
    direction: Direction,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return;

    const startGap = settings.teamGap;
    const startPointer = direction === "horizontal" ? event.clientX : event.clientY;

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const currentPointer = direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const nextGap = clamp(startGap + currentPointer - startPointer, 0, 160);

      setSettings((current) => ({
        ...current,
        teamGap: Math.round(nextGap)
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <main className="min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6 2xl:px-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">OBS 오버레이</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink sm:text-4xl">
            스코어보드 편집기
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            프리셋 대신 위치, 넓이, 칸 크기, 로고 크기, 표시 방식을 직접 조절합니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-black uppercase tracking-wide text-cyan">
          <MonitorPlay className="h-4 w-4" aria-hidden="true" />
          Custom Overlay
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[440px_1fr]">
        <aside className="space-y-5">
          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">기본 정보</h2>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3">
                <TextField label="타이머" value={scoreboard.timer} onChange={updateTimer} />
              </div>

              <div className="space-y-3">
                {scoreboard.teams.map((team, index) => (
                  <div key={team.id} className="rounded-md border border-line bg-arena/70 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-wide text-cyan">팀 {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeTeam(team.id)}
                        disabled={scoreboard.teams.length <= 2}
                        className="inline-grid h-8 w-8 place-items-center rounded-md border border-line bg-panel text-muted transition hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`${team.shortName} 팀 삭제`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        label="풀네임"
                        value={team.name}
                        onChange={(value) => updateTeam(team.id, "name", value)}
                      />
                      <TextField
                        label="약칭"
                        value={team.shortName}
                        onChange={(value) => updateTeam(team.id, "shortName", value.toUpperCase().slice(0, 8))}
                      />
                      <NumberField
                        label="점수"
                        value={team.score}
                        onChange={(value) => updateTeam(team.id, "score", value)}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTeam}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-cyan/40 bg-cyan/10 px-3 py-2 text-sm font-black uppercase tracking-wide text-cyan transition hover:bg-cyan/20"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  팀 추가
                </button>
              </div>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-lime" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">표시 방식</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ToggleButton active={settings.nameMode === "short"} onClick={() => updateSetting("nameMode", "short")}>
                약칭
              </ToggleButton>
              <ToggleButton active={settings.nameMode === "full"} onClick={() => updateSetting("nameMode", "full")}>
                풀네임
              </ToggleButton>
              <ToggleButton active={settings.direction === "vertical"} onClick={() => updateSetting("direction", "vertical")}>
                위아래
              </ToggleButton>
              <ToggleButton active={settings.direction === "horizontal"} onClick={() => updateSetting("direction", "horizontal")}>
                좌우
              </ToggleButton>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <CheckButton active={settings.showLogo} onClick={() => updateSetting("showLogo", !settings.showLogo)}>
                로고
              </CheckButton>
              <CheckButton active={settings.showTimer} onClick={() => updateSetting("showTimer", !settings.showTimer)}>
                타이머
              </CheckButton>
              <CheckButton active={settings.splitTeams} onClick={() => updateSetting("splitTeams", !settings.splitTeams)}>
                팀 분리
              </CheckButton>
              <CheckButton active={settings.symmetricBrackets} onClick={() => updateSetting("symmetricBrackets", !settings.symmetricBrackets)}>
                대칭
              </CheckButton>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">화면 해상도</h2>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(resolutionOptions) as ScreenResolution[]).map((resolution) => (
                <ToggleButton
                  key={resolution}
                  active={settings.resolution === resolution}
                  onClick={() => updateSetting("resolution", resolution)}
                >
                  {resolutionOptions[resolution].label}
                </ToggleButton>
              ))}
            </div>
            {settings.resolution === "custom" ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumberField
                  label="가로 해상도"
                  value={settings.customWidth}
                  onChange={(value) => updateSetting("customWidth", Math.max(320, value))}
                />
                <NumberField
                  label="세로 해상도"
                  value={settings.customHeight}
                  onChange={(value) => updateSetting("customHeight", Math.max(180, value))}
                />
              </div>
            ) : null}
            <p className="mt-3 text-xs font-bold text-muted">
              {getScreenSize(settings).width} x {getScreenSize(settings).height}
            </p>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Move className="h-5 w-5 text-gold" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">위치</h2>
            </div>
            <div className="grid gap-3">
              <div className="rounded-md border border-line bg-arena/70 px-3 py-3">
                <p className="text-xs font-bold leading-5 text-muted">
                  미리보기 화면에서 드래그합니다. 중앙과 가장자리 근처에서는 가이드가 뜨고 자동으로 붙습니다.
                  팀 분리 간격은 분리 모드에서 팀 사이 핸들을 잡아 조절합니다.
                </p>
                <p className="mt-2 text-xs font-black uppercase tracking-wide text-cyan">
                  X {settings.x}% / Y {settings.y}%
                </p>
              </div>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-magenta" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">브래킷 크기</h2>
            </div>
            <div className="grid gap-3">
              <RangeField label="팀칸 넓이" value={settings.teamWidth} min={100} max={420} onChange={(value) => updateSetting("teamWidth", value)} suffix="px" />
              <RangeField label="점수칸 넓이" value={settings.scoreWidth} min={34} max={150} onChange={(value) => updateSetting("scoreWidth", value)} suffix="px" />
              <RangeField label="칸 높이" value={settings.rowHeight} min={30} max={110} onChange={(value) => updateSetting("rowHeight", value)} suffix="px" />
              <RangeField label="로고 크기" value={settings.logoSize} min={0} max={80} onChange={(value) => updateSetting("logoSize", value)} suffix="px" />
              <RangeField label="팀명 글자" value={settings.fontSize} min={14} max={64} onChange={(value) => updateSetting("fontSize", value)} suffix="px" />
              <RangeField label="불투명도" value={settings.opacity} min={20} max={100} onChange={(value) => updateSetting("opacity", value)} suffix="%" />
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">타이머 크기</h2>
            </div>
            <div className="grid gap-3">
              <RangeField label="타이머 넓이" value={settings.timerWidth} min={90} max={360} onChange={(value) => updateSetting("timerWidth", value)} suffix="px" />
            </div>
          </div>
        </aside>

        <div className="arena-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/80 px-5 py-4">
            <div>
              <p className="section-kicker">미리보기</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-ink">직접 설정형 오버레이</h2>
            </div>
            <div className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-black uppercase tracking-wide text-muted">
              {resolutionOptions[settings.resolution].label} / {settings.nameMode === "short" ? "약칭" : "풀네임"} / {settings.direction === "vertical" ? "위아래" : "좌우"}
            </div>
          </div>

          <div className="grid min-h-[620px] place-items-center bg-[radial-gradient(circle_at_50%_28%,rgba(47,230,255,0.1),transparent_34%),hsl(var(--arena))] p-4 sm:p-6">
            <div
              ref={previewRef}
              className="relative w-full max-w-6xl overflow-hidden rounded-md border border-line bg-[#111318] shadow-panel"
              style={{
                aspectRatio: `${getScreenSize(settings).width} / ${getScreenSize(settings).height}`
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_24%,rgba(255,255,255,0.08),transparent_18%)]" />
              <AlignmentGuides guides={dragGuides} />
              <CustomScoreboardOverlay
                scoreboard={scoreboard}
                settings={settings}
                onPointerDown={handleScoreboardDragStart}
                onTeamGapPointerDown={handleTeamGapDragStart}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CustomScoreboardOverlay({
  scoreboard,
  settings,
  onPointerDown,
  onTeamGapPointerDown
}: {
  scoreboard: ScoreboardState;
  settings: OverlaySettings;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTeamGapPointerDown: (direction: Direction, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const overlayStyle: CSSProperties = {
    left: `${settings.x}%`,
    top: `${settings.y}%`,
    opacity: settings.opacity / 100
  };
  const availableTeamWidth =
    settings.direction === "vertical"
      ? settings.teamWidth
      : settings.teamWidth;

  return (
    <div
      className="absolute z-10 cursor-move touch-none select-none"
      onPointerDown={onPointerDown}
      style={overlayStyle}
      title="드래그해서 위치 조절"
    >
      {settings.showTimer ? (
        <div
          className="bg-white text-slate-950"
          style={{ width: settings.timerWidth }}
        >
          <div className="px-2 py-1 text-center font-black tabular-nums leading-none" style={{ fontSize: Math.max(12, settings.fontSize * 0.62) }}>
            {scoreboard.timer}
          </div>
        </div>
      ) : null}

      <div data-scoreboard-body>
        {settings.direction === "horizontal" ? (
          settings.splitTeams ? (
            <div className="grid" style={{ rowGap: Math.max(0, settings.teamGap * 0.4) }}>
              {chunkTeams(scoreboard.teams, 2).map((teamPair) => (
                <div key={teamPair.map((team) => team.id).join("-")} className="flex items-stretch">
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: settings.symmetricBrackets
                        ? `${settings.scoreWidth}px ${availableTeamWidth}px`
                        : `${availableTeamWidth}px ${settings.scoreWidth}px`
                    }}
                  >
                    <TeamCell
                      team={teamPair[0]}
                      side="left"
                      scoreFirst={settings.symmetricBrackets}
                      settings={settings}
                    />
                  </div>
                  {teamPair[1] ? (
                    <>
                      <TeamGapHandle
                        direction="horizontal"
                        value={settings.teamGap}
                        onPointerDown={onTeamGapPointerDown}
                      />
                      <div
                        className="grid"
                        style={{ gridTemplateColumns: `${availableTeamWidth}px ${settings.scoreWidth}px` }}
                      >
                        <TeamCell team={teamPair[1]} side="right" settings={settings} />
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid">
              {chunkTeams(scoreboard.teams, 2).map((teamPair, pairIndex) => (
                <div
                  key={teamPair.map((team) => team.id).join("-")}
                  className="grid"
                  style={{
                    gridTemplateColumns: settings.symmetricBrackets
                      ? `${settings.scoreWidth}px ${availableTeamWidth}px ${availableTeamWidth}px ${settings.scoreWidth}px`
                      : `${availableTeamWidth}px ${settings.scoreWidth}px ${availableTeamWidth}px ${settings.scoreWidth}px`,
                    marginTop: pairIndex > 0 ? -1 : 0
                  }}
                >
                  <TeamCell
                    team={teamPair[0]}
                    side="left"
                    scoreFirst={settings.symmetricBrackets}
                    settings={settings}
                  />
                  {teamPair[1] ? (
                    <TeamCell team={teamPair[1]} side="right" settings={settings} />
                  ) : (
                    <>
                      <div />
                      <div />
                    </>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          settings.splitTeams ? (
            <div className="grid">
              {scoreboard.teams.map((team, index) => (
                <Fragment key={team.id}>
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `${availableTeamWidth}px ${settings.scoreWidth}px` }}
                  >
                    <TeamCell
                      team={team}
                      side={index === 0 ? "left" : "right"}
                      settings={settings}
                    />
                  </div>
                  {index < scoreboard.teams.length - 1 ? (
                    <TeamGapHandle
                      direction="vertical"
                      value={settings.teamGap}
                      onPointerDown={onTeamGapPointerDown}
                    />
                  ) : null}
                </Fragment>
              ))}
            </div>
          ) : (
            <div
              className="grid"
              style={{ gridTemplateColumns: `${availableTeamWidth}px ${settings.scoreWidth}px` }}
            >
              {scoreboard.teams.map((team, index) => (
                <TeamCell
                  key={team.id}
                  team={team}
                  side={index === 0 ? "left" : "right"}
                  settings={settings}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function TeamGapHandle({
  direction,
  value,
  onPointerDown
}: {
  direction: Direction;
  value: number;
  onPointerDown: (direction: Direction, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const size = Math.max(12, value);

  if (direction === "horizontal") {
    return (
      <div
        className="group grid touch-none cursor-col-resize place-items-center bg-cyan/5"
        onPointerDown={(event) => onPointerDown(direction, event)}
        style={{ minWidth: size }}
        title="좌우로 드래그해서 팀 간격 조절"
      >
        <div className="h-full w-px bg-cyan/50 shadow-[0_0_12px_rgba(47,230,255,0.55)] transition group-hover:bg-cyan" />
      </div>
    );
  }

  return (
    <div
      className="group col-span-2 grid touch-none cursor-row-resize place-items-center bg-cyan/5"
      onPointerDown={(event) => onPointerDown(direction, event)}
      style={{ minHeight: size }}
      title="위아래로 드래그해서 팀 간격 조절"
    >
      <div className="h-px w-full bg-cyan/50 shadow-[0_0_12px_rgba(47,230,255,0.55)] transition group-hover:bg-cyan" />
    </div>
  );
}

function chunkTeams(teams: ScoreboardTeam[], size: number) {
  const chunks: ScoreboardTeam[][] = [];

  for (let index = 0; index < teams.length; index += size) {
    chunks.push(teams.slice(index, index + size));
  }

  return chunks;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function AlignmentGuides({ guides }: { guides: DragGuides }) {
  const showAnyGuide = Object.values(guides).some(Boolean);

  if (!showAnyGuide) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[8]">
      {guides.verticalCenter ? (
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan shadow-[0_0_18px_rgba(47,230,255,0.95)]" />
      ) : null}
      {guides.horizontalCenter ? (
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan shadow-[0_0_18px_rgba(47,230,255,0.95)]" />
      ) : null}
      {guides.leftEdge ? (
        <div className="absolute left-0 top-0 h-full w-px bg-lime shadow-[0_0_16px_rgba(163,230,53,0.9)]" />
      ) : null}
      {guides.rightEdge ? (
        <div className="absolute right-0 top-0 h-full w-px bg-lime shadow-[0_0_16px_rgba(163,230,53,0.9)]" />
      ) : null}
      {guides.topEdge ? (
        <div className="absolute left-0 top-0 h-px w-full bg-lime shadow-[0_0_16px_rgba(163,230,53,0.9)]" />
      ) : null}
      {guides.bottomEdge ? (
        <div className="absolute bottom-0 left-0 h-px w-full bg-lime shadow-[0_0_16px_rgba(163,230,53,0.9)]" />
      ) : null}
    </div>
  );
}

function TeamCell({
  team,
  side,
  scoreFirst = false,
  settings
}: {
  team: ScoreboardTeam;
  side: "left" | "right";
  scoreFirst?: boolean;
  settings: OverlaySettings;
}) {
  const mirrored = settings.direction === "horizontal" && settings.symmetricBrackets && side === "right";
  const label = settings.nameMode === "short" ? team.shortName : team.name;
  const scoreCell = (
    <ScoreCell
      key="score"
      score={team.score}
      rowHeight={settings.rowHeight}
      scoreWidth={settings.scoreWidth}
    />
  );
  const teamCell = (
    <div
      key="team"
      className={[
        "flex min-w-0 items-center gap-2 bg-[#07111f] px-3 text-white",
        mirrored ? "justify-end border-r-4 border-r-red-500" : side === "left" ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-red-500"
      ].join(" ")}
      style={{ height: settings.rowHeight }}
    >
      {!mirrored && settings.showLogo && settings.logoSize > 0 ? (
        <LogoBox label={team.shortName} size={settings.logoSize} />
      ) : null}
      <span
        className={["truncate font-black uppercase leading-none", mirrored ? "text-right" : ""].join(" ")}
        style={{ fontSize: settings.fontSize }}
      >
        {label}
      </span>
      {mirrored && settings.showLogo && settings.logoSize > 0 ? (
        <LogoBox label={team.shortName} size={settings.logoSize} />
      ) : null}
    </div>
  );

  return <>{scoreFirst ? [scoreCell, teamCell] : [teamCell, scoreCell]}</>;
}

function ScoreCell({
  score,
  rowHeight,
  scoreWidth
}: {
  score: number;
  rowHeight: number;
  scoreWidth: number;
}) {
  const digits = String(score).length;
  const scoreFontSize = Math.max(
    12,
    Math.min(rowHeight * 0.82, (scoreWidth / Math.max(1, digits)) * 1.12)
  );

  return (
    <div
      className="grid place-items-center overflow-hidden bg-white font-black leading-none text-slate-950"
      style={{ height: rowHeight, fontSize: scoreFontSize }}
    >
      {score}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">{label}</span>
      <input
        className="input"
        inputMode="numeric"
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value.replace(/[^0-9]/g, ""));
          onChange(Number.isFinite(nextValue) ? nextValue : 0);
        }}
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wide text-muted">
        <span>{label}</span>
        <span className="text-cyan">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan"
      />
    </label>
  );
}

function ToggleButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-black uppercase tracking-wide transition ${
        active ? "border-cyan bg-cyan text-arena" : "border-line bg-field text-muted hover:border-cyan hover:text-cyan"
      }`}
    >
      {children}
    </button>
  );
}

function CheckButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
        active ? "border-lime bg-lime text-arena" : "border-line bg-field text-muted hover:border-lime hover:text-lime"
      }`}
    >
      {children}
    </button>
  );
}

function LogoBox({ label, size }: { label: string; size: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-sm border border-white/20 bg-white/10 font-black uppercase text-white"
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.34) }}
    >
      {label.slice(0, 2)}
    </span>
  );
}
