"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import { Eye, MonitorPlay, Move, Plus, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";

type NameMode = "short" | "full";
type Direction = "horizontal" | "vertical";
type ScreenResolution = "fhd" | "qhd" | "uhd" | "custom";
type ResizeHandle =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
type DragGuides = {
  verticalCenter: boolean;
  horizontalCenter: boolean;
  leftEdge: boolean;
  rightEdge: boolean;
  topEdge: boolean;
  bottomEdge: boolean;
};
type SnapRect = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type ScoreboardTeam = {
  id: string;
  name: string;
  shortName: string;
  score: number;
  x: number;
  y: number;
  teamWidth: number;
  scoreWidth: number;
  rowHeight: number;
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
  timerHeight: number;
  timerX: number;
  timerY: number;
  logoSize: number;
  fontSize: number;
  nameMode: NameMode;
  direction: Direction;
  resolution: ScreenResolution;
  splitTeams: boolean;
  symmetricBrackets: boolean;
  symmetricSizes: boolean;
  showLogo: boolean;
  showTimer: boolean;
  opacity: number;
};

const defaultScoreboard: ScoreboardState = {
  timer: "11:38:39",
  teams: [
    { id: "team-1", name: "DRX", shortName: "DRX", score: 0, x: 0, y: 12, teamWidth: 205, scoreWidth: 54, rowHeight: 48 },
    { id: "team-2", name: "Gen.G", shortName: "GEN", score: 0, x: 42, y: 12, teamWidth: 205, scoreWidth: 54, rowHeight: 48 }
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
  timerHeight: 30,
  timerX: 0,
  timerY: 0,
  logoSize: 30,
  fontSize: 30,
  nameMode: "short",
  direction: "vertical",
  resolution: "fhd",
  splitTeams: false,
  symmetricBrackets: true,
  symmetricSizes: true,
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
            score: 0,
            x: (nextNumber - 1) * 8,
            y: 12 + (nextNumber - 1) * 8,
            teamWidth: current.teams[0]?.teamWidth ?? defaultSettings.teamWidth,
            scoreWidth: current.teams[0]?.scoreWidth ?? defaultSettings.scoreWidth,
            rowHeight: current.teams[0]?.rowHeight ?? defaultSettings.rowHeight
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

  const getTeamSnapRect = (team: ScoreboardTeam): SnapRect => {
    const size = getBracketSize(team, settings);
    const previewRect = previewRef.current?.getBoundingClientRect();
    const previewWidth = previewRect?.width ?? 1;
    const previewHeight = previewRect?.height ?? 1;

    return {
      id: team.id,
      left: (team.x / 100) * previewWidth,
      top: (team.y / 100) * previewHeight,
      width: size.teamWidth + size.scoreWidth,
      height: size.rowHeight
    };
  };

  const getTimerSnapRect = (): SnapRect => ({
    id: "timer",
    left: settings.timerX,
    top: settings.timerY,
    width: settings.timerWidth,
    height: settings.timerHeight
  });

  const getAttachmentSnapRects = ({
    excludedTeamId,
    includeTimer
  }: {
    excludedTeamId?: string;
    includeTimer: boolean;
  }) => [
    ...scoreboard.teams
      .filter((team) => team.id !== excludedTeamId)
      .map((team) => getTeamSnapRect(team)),
    ...(includeTimer && settings.showTimer ? [getTimerSnapRect()] : [])
  ];

  const snapToAttachmentRects = (
    left: number,
    top: number,
    width: number,
    height: number,
    targets: SnapRect[]
  ) => {
    let nextLeft = left;
    let nextTop = top;
    const nextGuides: DragGuides = { ...hiddenDragGuides };
    const rangesAreClose = (startA: number, endA: number, startB: number, endB: number) =>
      Math.max(startA, startB) <= Math.min(endA, endB) + snapDistance;

    for (const target of targets) {
      const targetRight = target.left + target.width;
      const targetBottom = target.top + target.height;
      const movingRight = nextLeft + width;
      const movingBottom = nextTop + height;
      const horizontalRangesClose = rangesAreClose(nextLeft, movingRight, target.left, targetRight);
      const verticalRangesClose = rangesAreClose(nextTop, movingBottom, target.top, targetBottom);
      const xCandidates = [
        target.left,
        targetRight,
        target.left - width,
        targetRight - width,
        target.left + target.width / 2 - width / 2
      ];
      const yCandidates = [
        target.top,
        targetBottom,
        target.top - height,
        targetBottom - height,
        target.top + target.height / 2 - height / 2
      ];

      if (verticalRangesClose) {
        for (const candidate of xCandidates) {
          if (Math.abs(nextLeft - candidate) <= snapDistance) {
            nextLeft = candidate;
            nextGuides.verticalCenter = true;
            break;
          }
        }
      }

      if (horizontalRangesClose) {
        for (const candidate of yCandidates) {
          if (Math.abs(nextTop - candidate) <= snapDistance) {
            nextTop = candidate;
            nextGuides.horizontalCenter = true;
            break;
          }
        }
      }
    }

    return {
      left: nextLeft,
      top: nextTop,
      guides: nextGuides
    };
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

  const handleTeamDragStart = (teamId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !previewRef.current) return;

    const previewRect = previewRef.current.getBoundingClientRect();
    const teamRect = event.currentTarget.getBoundingClientRect();
    const grabOffsetX = event.clientX - teamRect.left;
    const grabOffsetY = event.clientY - teamRect.top;

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxLeft = Math.max(0, previewRect.width - teamRect.width);
      const maxTop = Math.max(0, previewRect.height - teamRect.height);
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

      if (settings.splitTeams) {
        const attachmentSnap = snapToAttachmentRects(
          nextLeft,
          nextTop,
          teamRect.width,
          teamRect.height,
          getAttachmentSnapRects({ excludedTeamId: teamId, includeTimer: true })
        );
        nextLeft = clamp(attachmentSnap.left, 0, maxLeft);
        nextTop = clamp(attachmentSnap.top, 0, maxTop);
        nextGuides.verticalCenter = nextGuides.verticalCenter || attachmentSnap.guides.verticalCenter;
        nextGuides.horizontalCenter = nextGuides.horizontalCenter || attachmentSnap.guides.horizontalCenter;
      }

      setScoreboard((current) => ({
        ...current,
        teams: current.teams.map((team) =>
          team.id === teamId
            ? {
                ...team,
                x: Math.round((nextLeft / Math.max(1, previewRect.width)) * 1000) / 10,
                y: Math.round((nextTop / Math.max(1, previewRect.height)) * 1000) / 10
              }
            : team
        )
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

  const resizeAllTeams = (teamWidth: number, rowHeight: number) => {
    setSettings((current) => ({ ...current, teamWidth, rowHeight }));
    setScoreboard((current) => ({
      ...current,
      teams: current.teams.map((team) => ({ ...team, teamWidth, rowHeight }))
    }));
  };

  const handleBracketResizeStart = (
    teamId: string | null,
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0 || !previewRef.current) return;

    const previewRect = previewRef.current.getBoundingClientRect();
    const targetTeam = teamId ? scoreboard.teams.find((team) => team.id === teamId) : null;
    const startTeamWidth = targetTeam?.teamWidth ?? settings.teamWidth;
    const startRowHeight = targetTeam?.rowHeight ?? settings.rowHeight;
    const startX = targetTeam?.x ?? settings.x;
    const startY = targetTeam?.y ?? settings.y;
    const resizeFromLeft = handle.includes("left");
    const resizeFromRight = handle.includes("right");
    const resizeFromTop = handle.includes("top");
    const resizeFromBottom = handle.includes("bottom");

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - event.clientX;
      const deltaY = moveEvent.clientY - event.clientY;
      const widthDelta = resizeFromLeft ? -deltaX : resizeFromRight ? deltaX : 0;
      const heightDelta = resizeFromTop ? -deltaY : resizeFromBottom ? deltaY : 0;
      const nextTeamWidth = Math.round(clamp(startTeamWidth + widthDelta, 80, 620));
      const nextRowHeight = Math.round(clamp(startRowHeight + heightDelta, 24, 160));
      const xShift = resizeFromLeft ? startTeamWidth - nextTeamWidth : 0;
      const yShift = resizeFromTop ? startRowHeight - nextRowHeight : 0;
      const nextX = Math.round(clamp(startX + (xShift / Math.max(1, previewRect.width)) * 100, 0, 100) * 10) / 10;
      const nextY = Math.round(clamp(startY + (yShift / Math.max(1, previewRect.height)) * 100, 0, 100) * 10) / 10;

      if (!teamId || settings.symmetricSizes) {
        resizeAllTeams(nextTeamWidth, nextRowHeight);

        if (!teamId) {
          setSettings((current) => ({
            ...current,
            x: resizeFromLeft ? nextX : current.x,
            y: resizeFromTop ? nextY : current.y
          }));
        } else if (resizeFromLeft || resizeFromTop) {
          setScoreboard((current) => ({
            ...current,
            teams: current.teams.map((team) =>
              team.id === teamId
                ? {
                    ...team,
                    x: resizeFromLeft ? nextX : team.x,
                    y: resizeFromTop ? nextY : team.y
                  }
                : team
            )
          }));
        }

        return;
      }

      setScoreboard((current) => ({
        ...current,
        teams: current.teams.map((team) =>
          team.id === teamId
            ? {
                ...team,
                teamWidth: nextTeamWidth,
                rowHeight: nextRowHeight,
                x: resizeFromLeft ? nextX : team.x,
                y: resizeFromTop ? nextY : team.y
              }
            : team
        )
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleTimerResizeStart = (
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return;

    const startTimerWidth = settings.timerWidth;
    const startTimerHeight = settings.timerHeight;
    const startTimerX = settings.timerX;
    const startTimerY = settings.timerY;
    const resizeFromLeft = handle.includes("left");
    const resizeFromRight = handle.includes("right");
    const resizeFromTop = handle.includes("top");
    const resizeFromBottom = handle.includes("bottom");

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - event.clientX;
      const deltaY = moveEvent.clientY - event.clientY;
      const widthDelta = resizeFromLeft ? -deltaX : resizeFromRight ? deltaX : 0;
      const heightDelta = resizeFromTop ? -deltaY : resizeFromBottom ? deltaY : 0;
      const nextTimerWidth = Math.round(clamp(startTimerWidth + widthDelta, 70, 520));
      const nextTimerHeight = Math.round(clamp(startTimerHeight + heightDelta, 20, 120));

      setSettings((current) => ({
        ...current,
        timerWidth: nextTimerWidth,
        timerHeight: nextTimerHeight,
        timerX: resizeFromLeft ? startTimerX + startTimerWidth - nextTimerWidth : current.timerX,
        timerY: resizeFromTop ? startTimerY + startTimerHeight - nextTimerHeight : current.timerY
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleTimerDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !previewRef.current) return;

    const previewRect = previewRef.current.getBoundingClientRect();
    const timerRect = event.currentTarget.getBoundingClientRect();
    const grabOffsetX = event.clientX - timerRect.left;
    const grabOffsetY = event.clientY - timerRect.top;

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxLeft = Math.max(0, previewRect.width - timerRect.width);
      const maxTop = Math.max(0, previewRect.height - timerRect.height);
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

      if (settings.splitTeams) {
        const attachmentSnap = snapToAttachmentRects(
          nextLeft,
          nextTop,
          timerRect.width,
          timerRect.height,
          getAttachmentSnapRects({ includeTimer: false })
        );
        nextLeft = clamp(attachmentSnap.left, 0, maxLeft);
        nextTop = clamp(attachmentSnap.top, 0, maxTop);
        nextGuides.verticalCenter = nextGuides.verticalCenter || attachmentSnap.guides.verticalCenter;
        nextGuides.horizontalCenter = nextGuides.horizontalCenter || attachmentSnap.guides.horizontalCenter;
      }

      setSettings((current) => ({
        ...current,
        timerX: Math.round(nextLeft),
        timerY: Math.round(nextTop)
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
              <CheckButton active={settings.symmetricSizes} onClick={() => updateSetting("symmetricSizes", !settings.symmetricSizes)}>
                크기 대칭
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
                  팀 분리 모드에서는 각 팀 브래킷을 따로 드래그할 수 있습니다.
                  분리된 타이머와 브래킷도 서로 가까워지면 붙습니다. 브래킷과 타이머 크기는 가장자리 핸들을 잡아 조절합니다.
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
              <RangeField label="로고 크기" value={settings.logoSize} min={0} max={80} onChange={(value) => updateSetting("logoSize", value)} suffix="px" />
              <RangeField label="팀명 글자" value={settings.fontSize} min={14} max={64} onChange={(value) => updateSetting("fontSize", value)} suffix="px" />
              <RangeField label="불투명도" value={settings.opacity} min={20} max={100} onChange={(value) => updateSetting("opacity", value)} suffix="%" />
              <p className="rounded-md border border-line bg-arena/70 px-3 py-3 text-xs font-bold leading-5 text-muted">
                브래킷 오른쪽 가장자리를 드래그하면 넓이가, 아래쪽 가장자리를 드래그하면 높이가 바뀝니다.
              </p>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">타이머 크기</h2>
            </div>
            <div className="grid gap-3">
              <p className="rounded-md border border-line bg-arena/70 px-3 py-3 text-xs font-bold leading-5 text-muted">
                타이머 오른쪽 가장자리로 넓이, 아래쪽 가장자리로 두께를 조절합니다.
              </p>
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
                onTeamPointerDown={handleTeamDragStart}
                onBracketResizePointerDown={handleBracketResizeStart}
                onTimerResizePointerDown={handleTimerResizeStart}
                onTimerPointerDown={handleTimerDragStart}
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
  onTeamPointerDown,
  onBracketResizePointerDown,
  onTimerResizePointerDown,
  onTimerPointerDown
}: {
  scoreboard: ScoreboardState;
  settings: OverlaySettings;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTeamPointerDown: (teamId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onBracketResizePointerDown: (teamId: string | null, handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onTimerResizePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onTimerPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
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

  if (settings.splitTeams) {
    return (
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ opacity: settings.opacity / 100 }}>
        {settings.showTimer ? (
          <TimerBlock
            timer={scoreboard.timer}
            settings={settings}
            className="pointer-events-auto absolute left-0 top-0"
            onResizePointerDown={onTimerResizePointerDown}
            onPointerDown={onTimerPointerDown}
          />
        ) : null}
        {scoreboard.teams.map((team, index) => (
          <SplitTeamBracket
            key={team.id}
            team={team}
            index={index}
            settings={settings}
            onPointerDown={onTeamPointerDown}
            onResizePointerDown={onBracketResizePointerDown}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="absolute z-10 cursor-move touch-none select-none"
      onPointerDown={onPointerDown}
      style={overlayStyle}
      title="드래그해서 위치 조절"
    >
      {settings.showTimer ? (
        <TimerBlock
          timer={scoreboard.timer}
          settings={settings}
          onResizePointerDown={onTimerResizePointerDown}
          onPointerDown={onTimerPointerDown}
        />
      ) : null}

      <div data-scoreboard-body className="group relative inline-block">
        {settings.direction === "horizontal" ? (
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
        )}
        <ResizeHandles
          onResizePointerDown={(axis, event) => onBracketResizePointerDown(null, axis, event)}
        />
      </div>
    </div>
  );
}

function TimerBlock({
  timer,
  settings,
  className = "",
  onResizePointerDown,
  onPointerDown
}: {
  timer: string;
  settings: OverlaySettings;
  className?: string;
  onResizePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`group relative cursor-move touch-none select-none bg-white text-slate-950 ${className}`}
      onPointerDown={onPointerDown}
      style={{
        width: settings.timerWidth,
        height: settings.timerHeight,
        transform: `translate(${settings.timerX}px, ${settings.timerY}px)`
      }}
      title="타이머 드래그"
    >
      <div
        className="grid h-full place-items-center px-2 text-center font-black tabular-nums leading-none"
        style={{ fontSize: Math.max(12, settings.timerHeight * 0.62) }}
      >
        {timer}
      </div>
      <ResizeHandles onResizePointerDown={onResizePointerDown} />
    </div>
  );
}

function ResizeHandles({
  onResizePointerDown
}: {
  onResizePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const edgeClass =
    "absolute z-20 rounded-full bg-white/10 opacity-0 transition hover:bg-white/35 group-hover:opacity-100";
  const cornerClass =
    "absolute z-30 h-3 w-3 rounded-sm border border-white/35 bg-white/15 opacity-0 transition hover:bg-white/45 group-hover:opacity-100";

  return (
    <>
      <div
        className={`${edgeClass} bottom-2 left-[-5px] top-2 w-2 cursor-ew-resize`}
        onPointerDown={(event) => onResizePointerDown("left", event)}
        title="왼쪽 넓이 조절"
      />
      <div
        className={`${edgeClass} bottom-2 right-[-5px] top-2 w-2 cursor-ew-resize`}
        onPointerDown={(event) => onResizePointerDown("right", event)}
        title="오른쪽 넓이 조절"
      />
      <div
        className={`${edgeClass} left-2 right-2 top-[-5px] h-2 cursor-ns-resize`}
        onPointerDown={(event) => onResizePointerDown("top", event)}
        title="위쪽 높이 조절"
      />
      <div
        className={`${edgeClass} bottom-[-5px] left-2 right-2 h-2 cursor-ns-resize`}
        onPointerDown={(event) => onResizePointerDown("bottom", event)}
        title="아래쪽 높이 조절"
      />
      <div
        className={`${cornerClass} left-[-6px] top-[-6px] cursor-nwse-resize`}
        onPointerDown={(event) => onResizePointerDown("top-left", event)}
        title="좌상단 크기 조절"
      />
      <div
        className={`${cornerClass} right-[-6px] top-[-6px] cursor-nesw-resize`}
        onPointerDown={(event) => onResizePointerDown("top-right", event)}
        title="우상단 크기 조절"
      />
      <div
        className={`${cornerClass} bottom-[-6px] left-[-6px] cursor-nesw-resize`}
        onPointerDown={(event) => onResizePointerDown("bottom-left", event)}
        title="좌하단 크기 조절"
      />
      <div
        className={`${cornerClass} bottom-[-6px] right-[-6px] cursor-nwse-resize`}
        onPointerDown={(event) => onResizePointerDown("bottom-right", event)}
        title="우하단 크기 조절"
      />
    </>
  );
}

function getBracketSize(team: ScoreboardTeam, settings: OverlaySettings) {
  if (settings.splitTeams && !settings.symmetricSizes) {
    return {
      teamWidth: team.teamWidth,
      scoreWidth: team.scoreWidth,
      rowHeight: team.rowHeight
    };
  }

  return {
    teamWidth: settings.teamWidth,
    scoreWidth: settings.scoreWidth,
    rowHeight: settings.rowHeight
  };
}

function SplitTeamBracket({
  team,
  index,
  settings,
  onPointerDown,
  onResizePointerDown
}: {
  team: ScoreboardTeam;
  index: number;
  settings: OverlaySettings;
  onPointerDown: (teamId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (teamId: string | null, handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const side = index % 2 === 0 ? "left" : "right";
  const scoreFirst = settings.direction === "horizontal" && settings.symmetricBrackets && side === "left";
  const teamFirst = settings.direction !== "horizontal" || !scoreFirst;
  const size = getBracketSize(team, settings);
  const gridTemplateColumns = teamFirst
    ? `${size.teamWidth}px ${size.scoreWidth}px`
    : `${size.scoreWidth}px ${size.teamWidth}px`;

  return (
    <div
      className="group pointer-events-auto absolute z-10 grid cursor-move touch-none select-none"
      onPointerDown={(event) => onPointerDown(team.id, event)}
      style={{
        left: `${team.x}%`,
        top: `${team.y}%`,
        gridTemplateColumns
      }}
      title="팀 브래킷 드래그"
    >
      <TeamCell
        team={team}
        side={side}
        scoreFirst={scoreFirst}
        settings={settings}
      />
      <ResizeHandles
        onResizePointerDown={(axis, event) => onResizePointerDown(team.id, axis, event)}
      />
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
  const size = getBracketSize(team, settings);
  const scoreCell = (
    <ScoreCell
      key="score"
      score={team.score}
      rowHeight={size.rowHeight}
      scoreWidth={size.scoreWidth}
    />
  );
  const teamCell = (
    <div
      key="team"
      className={[
        "flex min-w-0 items-center gap-2 bg-[#07111f] px-3 text-white",
        mirrored ? "justify-end border-r-4 border-r-red-500" : side === "left" ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-red-500"
      ].join(" ")}
      style={{ height: size.rowHeight }}
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
