"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Eye, MonitorPlay, Move, Plus, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";

type NameMode = "short" | "full";
type ScreenResolution = "fhd" | "qhd" | "uhd" | "custom";
type AccentSide = "left" | "right";
type ScoreSide = "left" | "right";
type LabelAlign = "left" | "center" | "right";
type LogoSide = "left" | "right";
type FontFamily = "sans" | "condensed" | "mono" | "serif";
type TimerMode = "manual" | "countUp";
type ResizeHandle =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
type ScoreResizeHandle = "left" | "right";
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
  setScore: number;
  accentSide: AccentSide;
  scoreSide: ScoreSide;
  labelAlign: LabelAlign;
  logoSide: LogoSide;
  x: number;
  y: number;
  teamWidth: number;
  scoreWidth: number;
  rowHeight: number;
};

type ScoreboardState = {
  timer: string;
  elapsedSeconds: number;
  timerRunning: boolean;
  teams: ScoreboardTeam[];
};

type OverlaySettings = {
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
  fontFamily: FontFamily;
  nameMode: NameMode;
  timerMode: TimerMode;
  timerShowHours: boolean;
  timerShowMinutes: boolean;
  timerShowSeconds: boolean;
  resolution: ScreenResolution;
  symmetricSizes: boolean;
  showLogo: boolean;
  showTimer: boolean;
  opacity: number;
};

const defaultScoreboard: ScoreboardState = {
  timer: "00:00:00",
  elapsedSeconds: 0,
  timerRunning: false,
  teams: [
    { id: "team-1", name: "Team 1", shortName: "TM1", score: 0, setScore: 0, accentSide: "left", scoreSide: "right", labelAlign: "left", logoSide: "left", x: 0, y: 12, teamWidth: 205, scoreWidth: 54, rowHeight: 48 },
    { id: "team-2", name: "Team 2", shortName: "TM2", score: 0, setScore: 0, accentSide: "right", scoreSide: "left", labelAlign: "right", logoSide: "right", x: 42, y: 12, teamWidth: 205, scoreWidth: 54, rowHeight: 48 }
  ]
};

const defaultSettings: OverlaySettings = {
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
  fontFamily: "condensed",
  nameMode: "short",
  timerMode: "manual",
  timerShowHours: true,
  timerShowMinutes: true,
  timerShowSeconds: true,
  resolution: "fhd",
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

const snapDistance = 24;
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

  useEffect(() => {
    if (settings.timerMode !== "countUp" || !scoreboard.timerRunning) return;

    const intervalId = window.setInterval(() => {
      setScoreboard((current) => ({
        ...current,
        elapsedSeconds: current.elapsedSeconds + 1
      }));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [scoreboard.timerRunning, settings.timerMode]);

  const displayTimer =
    settings.timerMode === "countUp"
      ? formatTimer(scoreboard.elapsedSeconds, settings)
      : scoreboard.timer;

  const updateSetting = <Key extends keyof OverlaySettings>(key: Key, value: OverlaySettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updateTimer = (timer: string) => {
    setScoreboard((current) => ({ ...current, timer }));
  };

  const updateElapsedPart = (part: "hours" | "minutes" | "seconds", value: number) => {
    setScoreboard((current) => {
      const hours = Math.floor(current.elapsedSeconds / 3600);
      const minutes = Math.floor((current.elapsedSeconds % 3600) / 60);
      const seconds = current.elapsedSeconds % 60;
      const nextHours = part === "hours" ? Math.max(0, Math.floor(value)) : hours;
      const nextMinutes = part === "minutes" ? clamp(Math.floor(value), 0, 59) : minutes;
      const nextSeconds = part === "seconds" ? clamp(Math.floor(value), 0, 59) : seconds;

      return {
        ...current,
        elapsedSeconds: nextHours * 3600 + nextMinutes * 60 + nextSeconds
      };
    });
  };

  const setTimerRunning = (timerRunning: boolean) => {
    setScoreboard((current) => ({ ...current, timerRunning }));
  };

  const resetElapsedTimer = () => {
    setScoreboard((current) => ({ ...current, elapsedSeconds: 0, timerRunning: false }));
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
            shortName: `TM${nextNumber}`,
            score: 0,
            setScore: 0,
            accentSide: nextNumber % 2 === 1 ? "left" : "right",
            scoreSide: nextNumber % 2 === 1 ? "right" : "left",
            labelAlign: nextNumber % 2 === 1 ? "left" : "right",
            logoSide: nextNumber % 2 === 1 ? "left" : "right",
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
        targetRight,
        target.left - width,
        target.left,
        targetRight - width,
        target.left + target.width / 2 - width / 2
      ];
      const yCandidates = [
        targetBottom,
        target.top - height,
        target.top,
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

  const resizeAllScoreCells = (scoreWidth: number) => {
    setSettings((current) => ({ ...current, scoreWidth }));
    setScoreboard((current) => ({
      ...current,
      teams: current.teams.map((team) => ({ ...team, scoreWidth }))
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
    const startX = targetTeam?.x ?? 0;
    const startY = targetTeam?.y ?? 0;
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

        if (teamId && (resizeFromLeft || resizeFromTop)) {
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

  const handleScoreResizeStart = (
    teamId: string,
    handle: ScoreResizeHandle,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0 || !previewRef.current) return;

    const previewRect = previewRef.current.getBoundingClientRect();
    const targetTeam = scoreboard.teams.find((team) => team.id === teamId);
    if (!targetTeam) return;

    const startScoreWidth = targetTeam.scoreWidth;
    const startX = targetTeam.x;
    const resizeFromLeft = handle === "left";

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - event.clientX;
      const widthDelta = resizeFromLeft ? -deltaX : deltaX;
      const nextScoreWidth = Math.round(clamp(startScoreWidth + widthDelta, 28, 220));
      const xShift = resizeFromLeft ? startScoreWidth - nextScoreWidth : 0;
      const nextX = Math.round(clamp(startX + (xShift / Math.max(1, previewRect.width)) * 100, 0, 100) * 10) / 10;

      if (settings.symmetricSizes) {
        resizeAllScoreCells(nextScoreWidth);

        if (resizeFromLeft) {
          setScoreboard((current) => ({
            ...current,
            teams: current.teams.map((team) =>
              team.id === teamId ? { ...team, x: nextX } : team
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
                scoreWidth: nextScoreWidth,
                x: resizeFromLeft ? nextX : team.x
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
                      <NumberField
                        label="세트점수"
                        value={team.setScore}
                        onChange={(value) => updateTeam(team.id, "setScore", value)}
                      />
                    </div>
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted">브래킷 색 위치</p>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleButton
                          active={team.accentSide === "left"}
                          onClick={() => updateTeam(team.id, "accentSide", "left")}
                        >
                          왼쪽
                        </ToggleButton>
                        <ToggleButton
                          active={team.accentSide === "right"}
                          onClick={() => updateTeam(team.id, "accentSide", "right")}
                        >
                          오른쪽
                        </ToggleButton>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted">약칭 / 팀이름 정렬</p>
                      <div className="grid grid-cols-3 gap-2">
                        <ToggleButton active={team.labelAlign === "left"} onClick={() => updateTeam(team.id, "labelAlign", "left")}>
                          좌
                        </ToggleButton>
                        <ToggleButton active={team.labelAlign === "center"} onClick={() => updateTeam(team.id, "labelAlign", "center")}>
                          중
                        </ToggleButton>
                        <ToggleButton active={team.labelAlign === "right"} onClick={() => updateTeam(team.id, "labelAlign", "right")}>
                          우
                        </ToggleButton>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted">로고 위치</p>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleButton active={team.logoSide === "left"} onClick={() => updateTeam(team.id, "logoSide", "left")}>
                          왼쪽
                        </ToggleButton>
                        <ToggleButton active={team.logoSide === "right"} onClick={() => updateTeam(team.id, "logoSide", "right")}>
                          오른쪽
                        </ToggleButton>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted">점수칸 위치</p>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleButton
                          active={team.scoreSide === "left"}
                          onClick={() => updateTeam(team.id, "scoreSide", "left")}
                        >
                          왼쪽
                        </ToggleButton>
                        <ToggleButton
                          active={team.scoreSide === "right"}
                          onClick={() => updateTeam(team.id, "scoreSide", "right")}
                        >
                          오른쪽
                        </ToggleButton>
                      </div>
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
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <CheckButton active={settings.showLogo} onClick={() => updateSetting("showLogo", !settings.showLogo)}>
                로고
              </CheckButton>
              <CheckButton active={settings.showTimer} onClick={() => updateSetting("showTimer", !settings.showTimer)}>
                타이머
              </CheckButton>
              <CheckButton active={settings.symmetricSizes} onClick={() => updateSetting("symmetricSizes", !settings.symmetricSizes)}>
                크기 대칭
              </CheckButton>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted">폰트</p>
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={settings.fontFamily === "condensed"} onClick={() => updateSetting("fontFamily", "condensed")}>
                  방송체
                </ToggleButton>
                <ToggleButton active={settings.fontFamily === "sans"} onClick={() => updateSetting("fontFamily", "sans")}>
                  기본
                </ToggleButton>
                <ToggleButton active={settings.fontFamily === "mono"} onClick={() => updateSetting("fontFamily", "mono")}>
                  숫자체
                </ToggleButton>
                <ToggleButton active={settings.fontFamily === "serif"} onClick={() => updateSetting("fontFamily", "serif")}>
                  세리프
                </ToggleButton>
              </div>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">타이머</h2>
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={settings.timerMode === "manual"} onClick={() => updateSetting("timerMode", "manual")}>
                  직접입력
                </ToggleButton>
                <ToggleButton active={settings.timerMode === "countUp"} onClick={() => updateSetting("timerMode", "countUp")}>
                  0부터 진행
                </ToggleButton>
              </div>
              {settings.timerMode === "manual" ? (
                <TextField label="타이머 표시" value={scoreboard.timer} onChange={updateTimer} />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField
                      label="시작 시"
                      value={Math.floor(scoreboard.elapsedSeconds / 3600)}
                      onChange={(value) => updateElapsedPart("hours", value)}
                    />
                    <NumberField
                      label="시작 분"
                      value={Math.floor((scoreboard.elapsedSeconds % 3600) / 60)}
                      onChange={(value) => updateElapsedPart("minutes", value)}
                    />
                    <NumberField
                      label="시작 초"
                      value={scoreboard.elapsedSeconds % 60}
                      onChange={(value) => updateElapsedPart("seconds", value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setTimerRunning(true)} className="rounded-md border border-lime bg-lime/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-lime transition hover:bg-lime hover:text-arena">
                      시작
                    </button>
                    <button type="button" onClick={() => setTimerRunning(false)} className="rounded-md border border-line bg-field px-3 py-2 text-xs font-black uppercase tracking-wide text-muted transition hover:border-cyan hover:text-cyan">
                      정지
                    </button>
                    <button type="button" onClick={resetElapsedTimer} className="rounded-md border border-line bg-field px-3 py-2 text-xs font-black uppercase tracking-wide text-muted transition hover:border-red-400 hover:text-red-300">
                      리셋
                    </button>
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-2">
                <CheckButton active={settings.timerShowHours} onClick={() => updateSetting("timerShowHours", !settings.timerShowHours)}>
                  시
                </CheckButton>
                <CheckButton active={settings.timerShowMinutes} onClick={() => updateSetting("timerShowMinutes", !settings.timerShowMinutes)}>
                  분
                </CheckButton>
                <CheckButton active={settings.timerShowSeconds} onClick={() => updateSetting("timerShowSeconds", !settings.timerShowSeconds)}>
                  초
                </CheckButton>
              </div>
              <p className="rounded-md border border-line bg-arena/70 px-3 py-3 text-xs font-bold leading-5 text-muted">
                현재 표시: {displayTimer}
              </p>
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
                  미리보기 화면에서 타이머와 각 팀 브래킷을 따로 드래그합니다.
                  서로 가까이 가져가면 자석처럼 가장자리끼리 붙습니다. 브래킷, 점수칸, 타이머 크기는 가장자리 핸들을 잡아 조절합니다.
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
              {resolutionOptions[settings.resolution].label} / {settings.nameMode === "short" ? "약칭" : "풀네임"} / 분리형
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
                displayTimer={displayTimer}
                settings={settings}
                onTeamPointerDown={handleTeamDragStart}
                onBracketResizePointerDown={handleBracketResizeStart}
                onScoreResizePointerDown={handleScoreResizeStart}
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
  displayTimer,
  settings,
  onTeamPointerDown,
  onBracketResizePointerDown,
  onScoreResizePointerDown,
  onTimerResizePointerDown,
  onTimerPointerDown
}: {
  scoreboard: ScoreboardState;
  displayTimer: string;
  settings: OverlaySettings;
  onTeamPointerDown: (teamId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onBracketResizePointerDown: (teamId: string | null, handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onScoreResizePointerDown: (teamId: string, handle: ScoreResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onTimerResizePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onTimerPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none" style={{ opacity: settings.opacity / 100 }}>
      {settings.showTimer ? (
        <TimerBlock
          timer={displayTimer}
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
          onScoreResizePointerDown={onScoreResizePointerDown}
        />
      ))}
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
        className={`grid h-full place-items-center px-2 text-center font-black tabular-nums leading-none ${getFontFamilyClass(settings.fontFamily)}`}
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
  if (!settings.symmetricSizes) {
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
  onResizePointerDown,
  onScoreResizePointerDown
}: {
  team: ScoreboardTeam;
  index: number;
  settings: OverlaySettings;
  onPointerDown: (teamId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (teamId: string | null, handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onScoreResizePointerDown: (teamId: string, handle: ScoreResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const side = index % 2 === 0 ? "left" : "right";
  const scoreSide = team.scoreSide ?? (team.accentSide === "right" ? "left" : "right");
  const teamFirst = scoreSide === "right";
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
        settings={settings}
      />
      <ResizeHandles
        onResizePointerDown={(axis, event) => onResizePointerDown(team.id, axis, event)}
      />
      <ScoreResizeHandle
        scoreFirst={!teamFirst}
        scoreWidth={size.scoreWidth}
        teamWidth={size.teamWidth}
        onResizePointerDown={(handle, event) => onScoreResizePointerDown(team.id, handle, event)}
      />
    </div>
  );
}

function ScoreResizeHandle({
  scoreFirst,
  scoreWidth,
  teamWidth,
  onResizePointerDown
}: {
  scoreFirst: boolean;
  scoreWidth: number;
  teamWidth: number;
  onResizePointerDown: (handle: ScoreResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const handle = scoreFirst ? "left" : "right";

  return (
    <div
      className="absolute bottom-1 top-1 z-40 w-2 cursor-ew-resize rounded-full bg-gold/20 opacity-0 transition hover:bg-gold/55 group-hover:opacity-100"
      style={{
        left: scoreFirst ? -5 : teamWidth + scoreWidth - 3
      }}
      onPointerDown={(event) => onResizePointerDown(handle, event)}
      title="점수칸 넓이 조절"
    />
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFontFamilyClass(fontFamily: FontFamily) {
  if (fontFamily === "mono") return "font-mono";
  if (fontFamily === "serif") return "font-serif";
  if (fontFamily === "condensed") return "font-sans tracking-wide";
  return "font-sans";
}

function formatTimer(totalSeconds: number, settings: OverlaySettings) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const showHours = settings.timerShowHours;
  const showMinutes = settings.timerShowMinutes;
  const showSeconds = settings.timerShowSeconds;
  const enabledCount = [showHours, showMinutes, showSeconds].filter(Boolean).length;

  if (enabledCount === 0) return String(safeSeconds);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = showHours ? Math.floor((safeSeconds % 3600) / 60) : Math.floor(safeSeconds / 60);
  const seconds = showHours || showMinutes ? safeSeconds % 60 : safeSeconds;
  const parts: string[] = [];

  if (showHours) parts.push(String(hours).padStart(2, "0"));
  if (showMinutes) parts.push(String(minutes).padStart(2, "0"));
  if (showSeconds) parts.push(String(seconds).padStart(2, "0"));

  return parts.join(":");
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
  settings
}: {
  team: ScoreboardTeam;
  side: "left" | "right";
  settings: OverlaySettings;
}) {
  const accentRight = team.accentSide === "right";
  const scoreSide = team.scoreSide ?? (team.accentSide === "right" ? "left" : "right");
  const scoreFirst = scoreSide === "left";
  const label = settings.nameMode === "short" ? team.shortName : team.name;
  const size = getBracketSize(team, settings);
  const accentBorder = accentRight
    ? side === "left"
      ? "border-r-blue-500"
      : "border-r-red-500"
    : side === "left"
      ? "border-l-blue-500"
      : "border-l-red-500";
  const scoreCell = (
    <ScoreCell
      key="score"
      score={team.score}
      setScore={team.setScore}
      rowHeight={size.rowHeight}
      scoreWidth={size.scoreWidth}
      fontFamily={settings.fontFamily}
    />
  );
  const labelAlignClass =
    team.labelAlign === "center"
      ? "text-center"
      : team.labelAlign === "right"
        ? "text-right"
        : "text-left";
  const justifyClass =
    team.labelAlign === "center"
      ? "justify-center"
      : team.labelAlign === "right"
        ? "justify-end"
        : "justify-start";
  const logoFirst = team.logoSide === "left";
  const teamCell = (
    <div
      key="team"
      className={[
        "flex min-w-0 items-center gap-2 bg-[#07111f] px-3 text-white",
        justifyClass,
        accentRight ? `border-r-4 ${accentBorder}` : `border-l-4 ${accentBorder}`
      ].join(" ")}
      style={{ height: size.rowHeight }}
    >
      {logoFirst && settings.showLogo && settings.logoSize > 0 ? (
        <LogoBox label={team.shortName} size={settings.logoSize} />
      ) : null}
      <span
        className={["min-w-0 flex-1 truncate font-black uppercase leading-none", labelAlignClass, getFontFamilyClass(settings.fontFamily)].join(" ")}
        style={{ fontSize: settings.fontSize }}
      >
        {label}
      </span>
      {!logoFirst && settings.showLogo && settings.logoSize > 0 ? (
        <LogoBox label={team.shortName} size={settings.logoSize} />
      ) : null}
    </div>
  );

  return <>{scoreFirst ? [scoreCell, teamCell] : [teamCell, scoreCell]}</>;
}

function ScoreCell({
  score,
  setScore,
  rowHeight,
  scoreWidth,
  fontFamily
}: {
  score: number;
  setScore: number;
  rowHeight: number;
  scoreWidth: number;
  fontFamily: FontFamily;
}) {
  const digits = String(score).length;
  const scoreFontSize = Math.max(
    12,
    Math.min(rowHeight * 0.82, (scoreWidth / Math.max(1, digits)) * 1.12)
  );

  return (
    <div
      className={`relative grid place-items-center overflow-hidden bg-white font-black leading-none text-slate-950 ${getFontFamilyClass(fontFamily)}`}
      style={{ height: rowHeight, fontSize: scoreFontSize }}
    >
      <span
        className="absolute left-1 top-1 rounded-sm bg-slate-950 px-1 font-black leading-none text-white"
        style={{ fontSize: Math.max(8, rowHeight * 0.2) }}
      >
        {setScore}
      </span>
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
