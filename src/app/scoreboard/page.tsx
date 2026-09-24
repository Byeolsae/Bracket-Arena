"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Eye, MonitorPlay, Move, Plus, RadioTower, Save, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";
import { resolveStoredLogo } from "@/lib/browser/logoStorage";
import {
  createScoreboardBoard,
  createScoreboardBoardBroadcaster,
  downloadScoreboardBoard,
  downloadLatestScoreboardBoard,
  getSavedCloudSession,
  isCloudSyncConfigured,
  subscribeScoreboardBoard,
  updateScoreboardBoard,
  type CloudSession
} from "@/lib/cloud/supabaseTeams";
import { getTeamBracketAccentColor, getTeamThemeTextColor } from "@/lib/core/color";
import type { Team, TeamFolder } from "@/lib/core/models";
import { useTeamStore } from "@/store/teamStore";

type NameMode = "short" | "full";
type ScreenResolution = "fhd" | "qhd" | "uhd" | "custom";
type AccentSide = "left" | "right";
type AccentColorMode = "team" | "default" | "custom";
type ScoreSide = "left" | "right";
type SetScoreEdge = "top" | "bottom" | "left" | "right";
type XAnchor = "left" | "right";
type LabelAlign = "left" | "center" | "right";
type LogoSide = "left" | "right";
type FontFamily = "sans" | "condensed" | "mono" | "serif";
type TimerMode = "currentTime" | "countUp" | "countDown";
type OverlayTheme = "dark" | "light";
type OutputBackgroundMode = "transparent" | "green" | "black";
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

type ManagedTeamGroup = {
  id: string;
  name: string;
  teams: Team[];
};

type ScoreboardTeam = {
  id: string;
  name: string;
  shortName: string;
  linkedTeamId?: string;
  score: number;
  setScore: number;
  accentSide: AccentSide;
  accentColorMode: AccentColorMode;
  customAccentColor: string;
  scoreSide: ScoreSide;
  setScoreEdge: SetScoreEdge;
  labelAlign: LabelAlign;
  logoSide: LogoSide;
  xAnchor: XAnchor;
  x: number;
  y: number;
  teamWidth: number;
  scoreWidth: number;
  rowHeight: number;
} & Partial<
  Pick<
    Team,
    | "logoDefault"
    | "logoLight"
    | "logoDark"
    | "primaryColor"
    | "primaryColorLight"
    | "primaryColorDark"
    | "bracketAccentColor"
    | "bracketAccentColorLight"
    | "bracketAccentColorDark"
    | "textColor"
    | "textColorLight"
    | "textColorDark"
  >
>;

type GameIconBox = {
  enabled: boolean;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ScoreboardState = {
  timer: string;
  elapsedSeconds: number;
  timerRunning: boolean;
  timerFinished: boolean;
  gameIcon: GameIconBox;
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
  timerCentered: boolean;
  timerX: number;
  timerY: number;
  logoSize: number;
  fontSize: number;
  scoreFontSize: number;
  setScoreMarkerSize: number;
  accentThickness: number;
  maxSetScore: number;
  fontFamily: FontFamily;
  overlayTheme: OverlayTheme;
  outputBackgroundMode: OutputBackgroundMode;
  greenScreenColor: string;
  nameMode: NameMode;
  timerMode: TimerMode;
  timerTimeZone: string;
  timerShowHours: boolean;
  timerShowMinutes: boolean;
  timerShowSeconds: boolean;
  resolution: ScreenResolution;
  symmetricSizes: boolean;
  symmetricPositions: boolean;
  showLogo: boolean;
  showTimer: boolean;
  showSetScore: boolean;
  opacity: number;
};

type ScoreboardBoardData = {
  scoreboard: ScoreboardState;
  settings: OverlaySettings;
};

const defaultScoreboard: ScoreboardState = {
  timer: "00:00:00",
  elapsedSeconds: 0,
  timerRunning: false,
  timerFinished: false,
  gameIcon: {
    enabled: false,
    image: "",
    x: 50,
    y: 0,
    width: 58,
    height: 58
  },
  teams: [
    { id: "team-1", name: "Team 1", shortName: "TM1", score: 0, setScore: 0, accentSide: "left", accentColorMode: "default", customAccentColor: "#3b82f6", scoreSide: "right", setScoreEdge: "bottom", labelAlign: "center", logoSide: "left", xAnchor: "left", x: 0, y: 4, teamWidth: 205, scoreWidth: 54, rowHeight: 48 },
    { id: "team-2", name: "Team 2", shortName: "TM2", score: 0, setScore: 0, accentSide: "right", accentColorMode: "default", customAccentColor: "#ef4444", scoreSide: "left", setScoreEdge: "bottom", labelAlign: "center", logoSide: "right", xAnchor: "right", x: 0, y: 4, teamWidth: 205, scoreWidth: 54, rowHeight: 48 }
  ]
};

const scoreboardStorageKey = "bracket-arena-scoreboard-state";
const scoreboardLogoFields = ["logoDefault", "logoLight", "logoDark"] as const;

const defaultSettings: OverlaySettings = {
  customWidth: 1920,
  customHeight: 1080,
  teamWidth: 205,
  scoreWidth: 54,
  rowHeight: 48,
  timerWidth: 150,
  timerHeight: 30,
  timerCentered: true,
  timerX: 0,
  timerY: 0,
  logoSize: 30,
  fontSize: 30,
  scoreFontSize: 40,
  setScoreMarkerSize: 6,
  accentThickness: 4,
  maxSetScore: 3,
  fontFamily: "sans",
  overlayTheme: "dark",
  outputBackgroundMode: "transparent",
  greenScreenColor: "#00ff00",
  nameMode: "short",
  timerMode: "currentTime",
  timerTimeZone: "Asia/Seoul",
  timerShowHours: true,
  timerShowMinutes: true,
  timerShowSeconds: true,
  resolution: "fhd",
  symmetricSizes: true,
  symmetricPositions: true,
  showLogo: true,
  showTimer: true,
  showSetScore: true,
  opacity: 100
};

const resolutionOptions: Record<ScreenResolution, { label: string; width: number; height: number }> = {
  fhd: { label: "FHD", width: 1920, height: 1080 },
  qhd: { label: "QHD", width: 2560, height: 1440 },
  uhd: { label: "UHD", width: 3840, height: 2160 },
  custom: { label: "직접", width: 1920, height: 1080 }
};

const timeZoneOptions = [
  { label: "한국 서울", value: "Asia/Seoul" },
  { label: "일본 도쿄", value: "Asia/Tokyo" },
  { label: "중국 상하이", value: "Asia/Shanghai" },
  { label: "미국 LA", value: "America/Los_Angeles" },
  { label: "미국 뉴욕", value: "America/New_York" },
  { label: "영국 런던", value: "Europe/London" },
  { label: "독일 베를린", value: "Europe/Berlin" },
  { label: "UTC", value: "UTC" }
];

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

function normalizeScoreboardState(scoreboard?: Partial<ScoreboardState>): ScoreboardState {
  return {
    ...defaultScoreboard,
    ...scoreboard,
    gameIcon: {
      ...defaultScoreboard.gameIcon,
      ...scoreboard?.gameIcon
    },
    timerFinished: scoreboard?.timerFinished ?? false,
    teams: Array.isArray(scoreboard?.teams) && scoreboard.teams.length > 0 ? scoreboard.teams : defaultScoreboard.teams
  };
}

function normalizeOverlaySettings(settings?: Partial<OverlaySettings>): OverlaySettings {
  const timerMode = (settings as { timerMode?: string } | undefined)?.timerMode;
  const normalizedTimerMode: TimerMode =
    timerMode === "manual"
      ? "currentTime"
      : timerMode === "currentTime" || timerMode === "countUp" || timerMode === "countDown"
        ? timerMode
        : defaultSettings.timerMode;
  return {
    ...defaultSettings,
    ...settings,
    timerMode: normalizedTimerMode,
    timerTimeZone: settings?.timerTimeZone ?? defaultSettings.timerTimeZone
  };
}

function loadSavedScoreboardState() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(scoreboardStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScoreboardBoardData> & { cloudBoardId?: string };
    return {
      scoreboard: normalizeScoreboardState(parsed.scoreboard),
      settings: normalizeOverlaySettings(parsed.settings),
      cloudBoardId: typeof parsed.cloudBoardId === "string" ? parsed.cloudBoardId : ""
    };
  } catch {
    return null;
  }
}

function saveScoreboardState(scoreboard: ScoreboardState, settings: OverlaySettings, cloudBoardId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    scoreboardStorageKey,
    JSON.stringify({
      scoreboard,
      settings,
      cloudBoardId
    })
  );
}

function getDisplayScoreboardStorageKey(boardId: string) {
  return `${scoreboardStorageKey}:display:${boardId}`;
}

function loadSavedDisplayScoreboardState(boardId: string) {
  if (typeof window === "undefined" || !boardId) return null;

  try {
    const raw = window.localStorage.getItem(getDisplayScoreboardStorageKey(boardId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScoreboardBoardData> & { updatedAt?: string };
    return {
      scoreboard: normalizeScoreboardState(parsed.scoreboard),
      settings: normalizeOverlaySettings(parsed.settings),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : ""
    };
  } catch {
    return null;
  }
}

function saveDisplayScoreboardState(boardId: string, scoreboard: ScoreboardState, settings: OverlaySettings, updatedAt: string) {
  if (typeof window === "undefined" || !boardId) return;

  window.localStorage.setItem(
    getDisplayScoreboardStorageKey(boardId),
    JSON.stringify({
      scoreboard,
      settings,
      updatedAt
    })
  );
}

async function resolveScoreboardLogosForOutput(scoreboard: ScoreboardState) {
  const teams = await Promise.all(
    scoreboard.teams.map(async (team) => {
      const nextTeam = { ...team };

      await Promise.all(
        scoreboardLogoFields.map(async (field) => {
          const logo = nextTeam[field];
          if (!logo) return;
          const resolvedLogo = await resolveStoredLogo(logo);
          if (resolvedLogo) nextTeam[field] = resolvedLogo;
        })
      );

      return nextTeam;
    })
  );

  return {
    ...scoreboard,
    gameIcon: {
      ...scoreboard.gameIcon,
      image: scoreboard.gameIcon.image ? (await resolveStoredLogo(scoreboard.gameIcon.image)) || scoreboard.gameIcon.image : ""
    },
    teams
  };
}

function getOutputBackgroundStyle(settings: OverlaySettings) {
  if (settings.outputBackgroundMode === "green") {
    return {
      backgroundColor: isValidHexColor(settings.greenScreenColor) ? settings.greenScreenColor : "#00ff00"
    };
  }

  if (settings.outputBackgroundMode === "black") {
    return { backgroundColor: "#000000" };
  }

  return { backgroundColor: "transparent" };
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function normalizeShortName(team: Team) {
  return (team.shortName?.trim() || team.name.slice(0, 3) || "TM").toUpperCase().slice(0, 8);
}

function pickScoreboardTeamVisuals(team: Team) {
  return {
    logoDefault: team.logoDefault,
    logoLight: team.logoLight,
    logoDark: team.logoDark,
    primaryColor: team.primaryColor,
    primaryColorLight: team.primaryColorLight,
    primaryColorDark: team.primaryColorDark,
    bracketAccentColor: team.bracketAccentColor,
    bracketAccentColorLight: team.bracketAccentColorLight,
    bracketAccentColorDark: team.bracketAccentColorDark,
    textColor: team.textColor,
    textColorLight: team.textColorLight,
    textColorDark: team.textColorDark
  };
}

function buildManagedTeamGroups(folders: TeamFolder[], teams: Team[]): ManagedTeamGroup[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const usedTeamIds = new Set<string>();
  const groups = folders
    .map((folder) => {
      const ids = (folder.itemIds?.length ? folder.itemIds : folder.teamIds.map((teamId) => `team:${teamId}`))
        .filter((itemId) => itemId.startsWith("team:"))
        .map((itemId) => itemId.slice("team:".length));
      const folderTeams = ids
        .map((teamId) => teamsById.get(teamId))
        .filter((team): team is Team => Boolean(team));

      folderTeams.forEach((team) => usedTeamIds.add(team.id));

      return {
        id: folder.id,
        name: folder.name,
        teams: folderTeams
      };
    })
    .filter((group) => group.teams.length > 0);

  const ungroupedTeams = teams.filter((team) => !usedTeamIds.has(team.id));
  if (ungroupedTeams.length) {
    groups.push({ id: "ungrouped", name: "미분류", teams: ungroupedTeams });
  }

  if (!groups.length && teams.length) {
    return [{ id: "all", name: "전체 팀", teams }];
  }

  return groups;
}

export default function ScoreboardPage() {
  const managedTeams = useTeamStore((state) => state.teams);
  const managedFolders = useTeamStore((state) => state.folders);
  const [displayBoardId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("display") ?? "";
  });
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(defaultScoreboard);
  const [settings, setSettings] = useState<OverlaySettings>(defaultSettings);
  const [dragGuides, setDragGuides] = useState<DragGuides>(hiddenDragGuides);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [cloudSession, setCloudSession] = useState<CloudSession | null>(null);
  const [cloudBoardId, setCloudBoardId] = useState("");
  const [cloudStatus, setCloudStatus] = useState("OBS 출력용 보드를 만들면 변경사항이 자동 저장됩니다.");
  const [localStateReady, setLocalStateReady] = useState(false);
  const [cloudStateReady, setCloudStateReady] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const previewRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const pendingCloudSaveRef = useRef<ScoreboardBoardData | null>(null);
  const cloudSaveTimerRef = useRef<number | null>(null);
  const cloudSaveInFlightRef = useRef(false);
  const cloudBootstrapUserRef = useRef("");
  const liveBroadcasterRef = useRef<ReturnType<typeof createScoreboardBoardBroadcaster<ScoreboardBoardData>> | null>(null);
  const displayLastUpdatedAtRef = useRef("");
  const displayStateUpdatedAtRef = useRef("");
  const screenSize = getScreenSize(settings);
  const previewScale = previewSize.width > 0 ? previewSize.width / screenSize.width : 1;
  const displayScale = displaySize.width > 0
    ? Math.min(displaySize.width / screenSize.width, displaySize.height / screenSize.height)
    : 1;
  const isDisplayMode = Boolean(displayBoardId);
  const configured = isCloudSyncConfigured();
  const managedTeamGroups = useMemo(
    () => buildManagedTeamGroups(managedFolders, managedTeams),
    [managedFolders, managedTeams]
  );

  useEffect(() => {
    if (isDisplayMode) {
      const savedDisplayState = loadSavedDisplayScoreboardState(displayBoardId);
      if (savedDisplayState) {
        setScoreboard(savedDisplayState.scoreboard);
        setSettings(savedDisplayState.settings);
        displayLastUpdatedAtRef.current = savedDisplayState.updatedAt;
        displayStateUpdatedAtRef.current = savedDisplayState.updatedAt;
      }
      return;
    }

    if (!isDisplayMode) {
      const savedScoreboardState = loadSavedScoreboardState();
      if (savedScoreboardState) {
        setScoreboard(savedScoreboardState.scoreboard);
        setSettings(savedScoreboardState.settings);
        if (savedScoreboardState.cloudBoardId) {
          setCloudBoardId(savedScoreboardState.cloudBoardId);
          window.localStorage.setItem("bracket-arena-scoreboard-board-id", savedScoreboardState.cloudBoardId);
        }
      }
      setLocalStateReady(true);
    }

    const saved = getSavedCloudSession();
    setCloudSession(saved);
    if (!saved) setCloudStateReady(true);
    if (typeof window !== "undefined") {
      setCloudBoardId((current) => current || window.localStorage.getItem("bracket-arena-scoreboard-board-id") || "");
    }
  }, [displayBoardId, isDisplayMode]);

  useEffect(() => {
    if (isDisplayMode || !localStateReady) return;

    if (!cloudSession) {
      setCloudStateReady(true);
      return;
    }

    if (cloudBootstrapUserRef.current === cloudSession.userId) return;

    let cancelled = false;
    cloudBootstrapUserRef.current = cloudSession.userId;
    setCloudStateReady(false);
    setCloudStatus("계정에 저장된 스코어보드를 불러오는 중...");

    const loadAccountScoreboard = async () => {
      try {
        const savedBoardId = typeof window !== "undefined"
          ? window.localStorage.getItem("bracket-arena-scoreboard-board-id") || ""
          : "";
        const savedBoard = savedBoardId
          ? await downloadScoreboardBoard<ScoreboardBoardData>(savedBoardId, cloudSession).catch(() => null)
          : null;
        const board = savedBoard?.ownerId === cloudSession.userId
          ? savedBoard
          : await downloadLatestScoreboardBoard<ScoreboardBoardData>(cloudSession);

        if (cancelled) return;

        if (board?.data) {
          const nextScoreboard = normalizeScoreboardState(board.data.scoreboard);
          const nextSettings = normalizeOverlaySettings(board.data.settings);
          setScoreboard(nextScoreboard);
          setSettings(nextSettings);
          setCloudBoardId(board.id);
          window.localStorage.setItem("bracket-arena-scoreboard-board-id", board.id);
          saveScoreboardState(nextScoreboard, nextSettings, board.id);
          setCloudStatus("계정에 저장된 스코어보드를 불러왔습니다.");
          return;
        }

        const resolvedScoreboard = await resolveScoreboardLogosForOutput(scoreboard);
        if (cancelled) return;
        const createdBoard = await createScoreboardBoard<ScoreboardBoardData>(
          cloudSession,
          "Scoreboard",
          { scoreboard: resolvedScoreboard, settings }
        );
        setCloudBoardId(createdBoard.id);
        window.localStorage.setItem("bracket-arena-scoreboard-board-id", createdBoard.id);
        saveScoreboardState(scoreboard, settings, createdBoard.id);
        setCloudStatus("계정용 스코어보드를 새로 만들었습니다. 이제 다른 기기에서도 불러옵니다.");
      } catch (error) {
        if (!cancelled) {
          setCloudStatus(error instanceof Error ? error.message : "계정 스코어보드를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setCloudStateReady(true);
      }
    };

    void loadAccountScoreboard();
    return () => {
      cancelled = true;
    };
  }, [cloudSession, isDisplayMode, localStateReady, scoreboard, settings]);

  useEffect(() => {
    if (isDisplayMode || !localStateReady) return;
    saveScoreboardState(scoreboard, settings, cloudBoardId);
  }, [cloudBoardId, isDisplayMode, localStateReady, scoreboard, settings]);

  useEffect(() => {
    if (!isDisplayMode) return;
    saveDisplayScoreboardState(displayBoardId, scoreboard, settings, displayStateUpdatedAtRef.current);
  }, [displayBoardId, isDisplayMode, scoreboard, settings]);

  useEffect(() => {
    if (!isDisplayMode) return;
    document.body.classList.add("scoreboard-display-mode");
    return () => document.body.classList.remove("scoreboard-display-mode");
  }, [isDisplayMode]);

  useEffect(() => {
    if (!isDisplayMode) return;

    let cancelled = false;
    const applyBoardData = (data: ScoreboardBoardData, updatedAt = "") => {
      if (updatedAt && displayLastUpdatedAtRef.current === updatedAt) return;
      if (updatedAt) displayLastUpdatedAtRef.current = updatedAt;
      const nextScoreboard = normalizeScoreboardState(data.scoreboard);
      const nextSettings = normalizeOverlaySettings(data.settings);
      setScoreboard(nextScoreboard);
      setSettings((current) => ({ ...current, ...nextSettings }));
      saveDisplayScoreboardState(displayBoardId, nextScoreboard, nextSettings, updatedAt);
      displayStateUpdatedAtRef.current = updatedAt;
    };
    const loadBoard = async () => {
      try {
        const board = await downloadScoreboardBoard<ScoreboardBoardData>(displayBoardId);
        if (cancelled || !board?.data) return;
        applyBoardData(board.data, board.updatedAt);
      } catch {
        if (!cancelled) setCloudStatus("스코어보드 보드를 불러오지 못했습니다.");
      }
    };

    void loadBoard();
    const unsubscribe = subscribeScoreboardBoard<ScoreboardBoardData>(
      displayBoardId,
      (data, updatedAt) => {
        if (cancelled) return;
        applyBoardData(data, updatedAt);
      },
      (status) => {
        if (!cancelled) setCloudStatus(status);
      }
    );
    const intervalId = window.setInterval(loadBoard, 500);
    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [displayBoardId, isDisplayMode]);

  useEffect(() => {
    const previewElement = previewRef.current;
    if (!previewElement) return;

    const updatePreviewSize = () => {
      const rect = previewElement.getBoundingClientRect();
      setPreviewSize({ width: rect.width, height: rect.height });
    };
    updatePreviewSize();

    const observer = new ResizeObserver(updatePreviewSize);
    observer.observe(previewElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isDisplayMode) return;
    const displayElement = displayRef.current;
    if (!displayElement) return;

    const updateDisplaySize = () => {
      const rect = displayElement.getBoundingClientRect();
      setDisplaySize({ width: rect.width, height: rect.height });
    };
    updateDisplaySize();

    const observer = new ResizeObserver(updateDisplaySize);
    observer.observe(displayElement);
    return () => observer.disconnect();
  }, [isDisplayMode]);

  useEffect(() => {
    if (isDisplayMode || !cloudSession || !cloudBoardId || !cloudStateReady) return;

    const flushCloudSave = () => {
      cloudSaveTimerRef.current = null;
      if (cloudSaveInFlightRef.current) return;

      const payload = pendingCloudSaveRef.current;
      if (!payload) return;

      pendingCloudSaveRef.current = null;
      cloudSaveInFlightRef.current = true;
      setCloudStatus("스코어보드 실시간 저장 중...");

      updateScoreboardBoard<ScoreboardBoardData>(cloudSession, cloudBoardId, payload)
        .then(() => setCloudStatus("스코어보드 실시간 자동 저장 완료"))
        .catch((error) => setCloudStatus(error instanceof Error ? error.message : "스코어보드 저장 실패"))
        .finally(() => {
          cloudSaveInFlightRef.current = false;
          if (pendingCloudSaveRef.current && !cloudSaveTimerRef.current) {
            cloudSaveTimerRef.current = window.setTimeout(flushCloudSave, 120);
          }
        });
    };

    if (!cloudSaveTimerRef.current && !cloudSaveInFlightRef.current) {
      cloudSaveTimerRef.current = window.setTimeout(flushCloudSave, 120);
    }

    let cancelled = false;
    void resolveScoreboardLogosForOutput(scoreboard).then((resolvedScoreboard) => {
      if (cancelled) return;
      const payload = { scoreboard: resolvedScoreboard, settings };
      liveBroadcasterRef.current?.send(payload);
      pendingCloudSaveRef.current = payload;

      if (!cloudSaveTimerRef.current && !cloudSaveInFlightRef.current) {
        cloudSaveTimerRef.current = window.setTimeout(flushCloudSave, 120);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cloudBoardId, cloudSession, cloudStateReady, isDisplayMode, scoreboard, settings]);

  useEffect(() => {
    return () => {
      if (cloudSaveTimerRef.current) window.clearTimeout(cloudSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isDisplayMode || !cloudBoardId) return;

    const broadcaster = createScoreboardBoardBroadcaster<ScoreboardBoardData>(cloudBoardId, setCloudStatus);
    liveBroadcasterRef.current = broadcaster;
    return () => {
      broadcaster.close();
      if (liveBroadcasterRef.current === broadcaster) liveBroadcasterRef.current = null;
    };
  }, [cloudBoardId, isDisplayMode]);

  const displayUrl = cloudBoardId && typeof window !== "undefined"
    ? `${window.location.origin}/scoreboard?display=${encodeURIComponent(cloudBoardId)}`
    : "";

  const createCloudBoard = async () => {
    if (!cloudSession) {
      setCloudStatus("먼저 로그인해야 OBS 보드를 만들 수 있습니다.");
      return;
    }

    if (cloudBoardId) {
      setCloudStatus("고정 출력 코드에 현재 설정을 저장하는 중...");
      try {
        const resolvedScoreboard = await resolveScoreboardLogosForOutput(scoreboard);
        await updateScoreboardBoard<ScoreboardBoardData>(cloudSession, cloudBoardId, { scoreboard: resolvedScoreboard, settings });
        setCloudStatus("고정 출력 코드가 준비됐습니다. OBS 링크는 그대로 두고 편집만 계속하면 됩니다.");
      } catch (error) {
        setCloudStatus(error instanceof Error ? error.message : "고정 출력 코드를 갱신하지 못했습니다.");
      }
      return;
    }

    setCloudStatus("고정 출력 코드를 만드는 중...");
    try {
      const resolvedScoreboard = await resolveScoreboardLogosForOutput(scoreboard);
      const board = await createScoreboardBoard<ScoreboardBoardData>(cloudSession, "Scoreboard", { scoreboard: resolvedScoreboard, settings });
      setCloudBoardId(board.id);
      window.localStorage.setItem("bracket-arena-scoreboard-board-id", board.id);
      setCloudStatus("고정 출력 코드를 만들었습니다. 이 링크를 OBS 브라우저 소스에 한 번만 넣으면 됩니다.");
    } catch (error) {
      setCloudStatus(error instanceof Error ? error.message : "고정 출력 코드를 만들지 못했습니다.");
    }
  };

  const copyDisplayUrl = async () => {
    if (!displayUrl) {
      setCloudStatus("먼저 OBS 보드를 만들어야 합니다.");
      return;
    }

    await navigator.clipboard.writeText(displayUrl);
    setCloudStatus("OBS 출력 링크를 복사했습니다.");
  };

  useEffect(() => {
    if ((settings.timerMode !== "countUp" && settings.timerMode !== "countDown") || !scoreboard.timerRunning) return;

    const intervalId = window.setInterval(() => {
      setScoreboard((current) => {
        if (settings.timerMode === "countDown") {
          const nextSeconds = Math.max(0, current.elapsedSeconds - 1);
          return {
            ...current,
            elapsedSeconds: nextSeconds,
            timerRunning: nextSeconds > 0,
            timerFinished: nextSeconds === 0
          };
        }

        return {
          ...current,
          elapsedSeconds: current.elapsedSeconds + 1,
          timerFinished: false
        };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [scoreboard.timerRunning, settings.timerMode]);

  useEffect(() => {
    if (settings.timerMode !== "currentTime") return;

    const intervalId = window.setInterval(() => setNowTimestamp(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [settings.timerMode]);

  const displayTimer =
    settings.timerMode === "countUp" || settings.timerMode === "countDown"
      ? formatTimer(scoreboard.elapsedSeconds, settings)
      : formatCurrentTime(nowTimestamp, settings);

  const updateSetting = <Key extends keyof OverlaySettings>(key: Key, value: OverlaySettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
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
        elapsedSeconds: nextHours * 3600 + nextMinutes * 60 + nextSeconds,
        timerFinished: false
      };
    });
  };

  const setTimerRunning = (timerRunning: boolean) => {
    setScoreboard((current) => ({ ...current, timerRunning, timerFinished: timerRunning ? false : current.timerFinished }));
  };

  const resetElapsedTimer = () => {
    setScoreboard((current) => ({ ...current, elapsedSeconds: 0, timerRunning: false, timerFinished: false }));
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

  const updateGameIcon = <Key extends keyof GameIconBox>(key: Key, value: GameIconBox[Key]) => {
    setScoreboard((current) => ({
      ...current,
      gameIcon: {
        ...current.gameIcon,
        [key]: value
      }
    }));
  };

  const handleGameIconFileChange = async (file: File | undefined) => {
    if (!file) return;

    try {
      const image = await readImageFileAsDataUrl(file);
      setScoreboard((current) => ({
        ...current,
        gameIcon: {
          ...current.gameIcon,
          enabled: true,
          image
        }
      }));
    } catch {
      setCloudStatus("게임 아이콘 이미지를 불러오지 못했습니다.");
    }
  };

  const applyManagedTeam = (scoreboardTeamId: string, managedTeamId: string) => {
    if (!managedTeamId) {
      setScoreboard((current) => ({
        ...current,
        teams: current.teams.map((team) =>
          team.id === scoreboardTeamId ? { ...team, linkedTeamId: undefined } : team
        )
      }));
      return;
    }

    const managedTeam = managedTeams.find((team) => team.id === managedTeamId);
    if (!managedTeam) return;

    setScoreboard((current) => ({
      ...current,
      teams: current.teams.map((team) =>
        team.id === scoreboardTeamId
          ? {
              ...team,
              ...pickScoreboardTeamVisuals(managedTeam),
              linkedTeamId: managedTeam.id,
              name: managedTeam.name,
              shortName: normalizeShortName(managedTeam),
              accentColorMode: "team"
            }
          : team
      )
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
            accentColorMode: "default",
            customAccentColor: nextNumber % 2 === 1 ? "#3b82f6" : "#ef4444",
            scoreSide: nextNumber % 2 === 1 ? "right" : "left",
            setScoreEdge: "top",
            labelAlign: "center",
            logoSide: nextNumber % 2 === 1 ? "left" : "right",
            xAnchor: "left",
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

  const getPreviewMetrics = () => {
    const previewRect = previewRef.current?.getBoundingClientRect();
    if (!previewRect) return null;

    return {
      rect: previewRect,
      width: screenSize.width,
      height: screenSize.height,
      scaleX: previewRect.width / screenSize.width,
      scaleY: previewRect.height / screenSize.height
    };
  };

  const getTeamSnapRect = (team: ScoreboardTeam): SnapRect => {
    const size = getBracketSize(team, settings);
    const width = size.teamWidth + size.scoreWidth;
    const left = getAnchoredLeft(team, width, screenSize.width);

    return {
      id: team.id,
      left,
      top: (team.y / 100) * screenSize.height,
      width,
      height: size.rowHeight
    };
  };

  const getTimerSnapRect = (): SnapRect => {
    return {
      id: "timer",
      left: settings.timerCentered ? (screenSize.width - settings.timerWidth) / 2 : settings.timerX,
      top: settings.timerY,
      width: settings.timerWidth,
      height: settings.timerHeight
    };
  };

  const getGameIconSnapRect = (): SnapRect => ({
    id: "game-icon",
    left: scoreboard.gameIcon.x,
    top: scoreboard.gameIcon.y,
    width: scoreboard.gameIcon.width,
    height: scoreboard.gameIcon.height
  });

  const getAttachmentSnapRects = ({
    excludedTeamId,
    includeTimer,
    includeGameIcon = true
  }: {
    excludedTeamId?: string;
    includeTimer: boolean;
    includeGameIcon?: boolean;
  }) => [
    ...scoreboard.teams
      .filter((team) => team.id !== excludedTeamId)
      .map((team) => getTeamSnapRect(team)),
    ...(includeTimer && settings.showTimer ? [getTimerSnapRect()] : []),
    ...(includeGameIcon && scoreboard.gameIcon.enabled ? [getGameIconSnapRect()] : [])
  ];

  const resetOverlayLayout = () => {
    setSettings((current) => ({
      ...current,
      timerCentered: defaultSettings.timerCentered,
      timerX: defaultSettings.timerX,
      timerY: defaultSettings.timerY,
      timerWidth: defaultSettings.timerWidth,
      timerHeight: defaultSettings.timerHeight
    }));
    setScoreboard((current) => ({
      ...current,
      gameIcon: {
        ...current.gameIcon,
        x: defaultScoreboard.gameIcon.x,
        y: defaultScoreboard.gameIcon.y,
        width: defaultScoreboard.gameIcon.width,
        height: defaultScoreboard.gameIcon.height
      },
      teams: current.teams.map((team, index) => {
        const defaultTeam = defaultScoreboard.teams[index];

        if (!defaultTeam) {
          return {
            ...team,
            xAnchor: "left" as const,
            x: (index - 1) * 8,
            y: 12 + (index - 1) * 8
          };
        }

        return {
          ...team,
          xAnchor: defaultTeam.xAnchor,
          x: defaultTeam.x,
          y: defaultTeam.y,
          teamWidth: defaultTeam.teamWidth,
          scoreWidth: defaultTeam.scoreWidth,
          rowHeight: defaultTeam.rowHeight
        };
      })
    }));
  };

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
    const metrics = getPreviewMetrics();
    if (event.button !== 0 || !metrics) return;

    const teamRect = event.currentTarget.getBoundingClientRect();
    const teamSize = getBracketSize(scoreboard.teams.find((team) => team.id === teamId) ?? defaultScoreboard.teams[0], settings);
    const teamWidth = teamSize.teamWidth + teamSize.scoreWidth;
    const teamHeight = teamSize.rowHeight;
    const grabOffsetX = (event.clientX - teamRect.left) / metrics.scaleX;
    const grabOffsetY = (event.clientY - teamRect.top) / metrics.scaleY;

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxLeft = Math.max(0, metrics.width - teamWidth);
      const maxTop = Math.max(0, metrics.height - teamHeight);
      const centerLeft = maxLeft / 2;
      const centerTop = maxTop / 2;
      let nextLeft = clamp((moveEvent.clientX - metrics.rect.left) / metrics.scaleX - grabOffsetX, 0, maxLeft);
      let nextTop = clamp((moveEvent.clientY - metrics.rect.top) / metrics.scaleY - grabOffsetY, 0, maxTop);
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
        teamWidth,
        teamHeight,
        getAttachmentSnapRects({ excludedTeamId: teamId, includeTimer: true })
      );
      nextLeft = clamp(attachmentSnap.left, 0, maxLeft);
      nextTop = clamp(attachmentSnap.top, 0, maxTop);
      nextGuides.verticalCenter = nextGuides.verticalCenter || attachmentSnap.guides.verticalCenter;
      nextGuides.horizontalCenter = nextGuides.horizontalCenter || attachmentSnap.guides.horizontalCenter;

      setScoreboard((current) => ({
        ...current,
        teams: updateSymmetricTeamPositions(
          current.teams,
          teamId,
          nextLeft,
          nextTop,
          metrics.width,
          metrics.height,
          settings,
          settings.symmetricPositions
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
    const metrics = getPreviewMetrics();
    if (event.button !== 0 || !metrics) return;

    const targetTeam = teamId ? scoreboard.teams.find((team) => team.id === teamId) : null;
    const startTeamWidth = targetTeam?.teamWidth ?? settings.teamWidth;
    const startScoreWidth = targetTeam?.scoreWidth ?? settings.scoreWidth;
    const startRowHeight = targetTeam?.rowHeight ?? settings.rowHeight;
    const startWidth = startTeamWidth + startScoreWidth;
    const startLeft = targetTeam
      ? getAnchoredLeft(targetTeam, startWidth, metrics.width)
      : 0;
    const startTop = targetTeam ? (targetTeam.y / 100) * metrics.height : 0;
    const resizeFromLeft = handle.includes("left");
    const resizeFromRight = handle.includes("right");
    const resizeFromTop = handle.includes("top");
    const resizeFromBottom = handle.includes("bottom");

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - event.clientX) / metrics.scaleX;
      const deltaY = (moveEvent.clientY - event.clientY) / metrics.scaleY;
      const widthDelta = resizeFromLeft ? -deltaX : resizeFromRight ? deltaX : 0;
      const heightDelta = resizeFromTop ? -deltaY : resizeFromBottom ? deltaY : 0;
      const nextTeamWidth = Math.round(clamp(startTeamWidth + widthDelta, 1, 10000));
      const nextRowHeight = Math.round(clamp(startRowHeight + heightDelta, 1, 10000));
      const nextWidth = nextTeamWidth + startScoreWidth;
      const xShift = resizeFromLeft ? startTeamWidth - nextTeamWidth : 0;
      const yShift = resizeFromTop ? startRowHeight - nextRowHeight : 0;
      const nextLeft = clamp(startLeft + xShift, 0, Math.max(0, metrics.width - nextWidth));
      const nextTop = clamp(startTop + yShift, 0, Math.max(0, metrics.height - nextRowHeight));
      const nextX = Math.round((nextLeft / Math.max(1, metrics.width)) * 1000) / 10;
      const nextY = Math.round((nextTop / Math.max(1, metrics.height)) * 1000) / 10;

      if (!teamId || settings.symmetricSizes) {
        resizeAllTeams(nextTeamWidth, nextRowHeight);

        if (teamId && (resizeFromLeft || resizeFromTop)) {
          setScoreboard((current) => ({
            ...current,
            teams: current.teams.map((team) =>
              team.id === teamId
                ? {
                    ...team,
                    xAnchor: "left" as const,
                    x: nextX,
                    y: nextY
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
                xAnchor: "left" as const,
                x: nextX,
                y: nextY
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
    const metrics = getPreviewMetrics();
    if (event.button !== 0 || !metrics) return;

    const targetTeam = scoreboard.teams.find((team) => team.id === teamId);
    if (!targetTeam) return;

    const startScoreWidth = targetTeam.scoreWidth;
    const startWidth = targetTeam.teamWidth + targetTeam.scoreWidth;
    const startLeft = getAnchoredLeft(targetTeam, startWidth, metrics.width);
    const resizeFromLeft = handle === "left";

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - event.clientX) / metrics.scaleX;
      const widthDelta = resizeFromLeft ? -deltaX : deltaX;
      const nextScoreWidth = Math.round(clamp(startScoreWidth + widthDelta, 1, 10000));
      const nextWidth = targetTeam.teamWidth + nextScoreWidth;
      const xShift = resizeFromLeft ? startScoreWidth - nextScoreWidth : 0;
      const nextLeft = clamp(startLeft + xShift, 0, Math.max(0, metrics.width - nextWidth));
      const nextX = Math.round((nextLeft / Math.max(1, metrics.width)) * 1000) / 10;

      if (settings.symmetricSizes) {
        resizeAllScoreCells(nextScoreWidth);

        if (resizeFromLeft) {
          setScoreboard((current) => ({
            ...current,
            teams: current.teams.map((team) =>
              team.id === teamId ? { ...team, xAnchor: "left" as const, x: nextX } : team
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
                xAnchor: "left" as const,
                x: nextX
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
    const metrics = getPreviewMetrics();
    if (event.button !== 0 || !metrics) return;

    const startTimerWidth = settings.timerWidth;
    const startTimerHeight = settings.timerHeight;
    const startTimerX = settings.timerCentered
      ? Math.max(0, (metrics.width - settings.timerWidth) / 2)
      : settings.timerX;
    const startTimerY = settings.timerY;
    const resizeFromLeft = handle.includes("left");
    const resizeFromRight = handle.includes("right");
    const resizeFromTop = handle.includes("top");
    const resizeFromBottom = handle.includes("bottom");

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - event.clientX) / metrics.scaleX;
      const deltaY = (moveEvent.clientY - event.clientY) / metrics.scaleY;
      const widthDelta = resizeFromLeft ? -deltaX : resizeFromRight ? deltaX : 0;
      const heightDelta = resizeFromTop ? -deltaY : resizeFromBottom ? deltaY : 0;
      const nextTimerWidth = Math.round(clamp(startTimerWidth + widthDelta, 70, 520));
      const nextTimerHeight = Math.round(clamp(startTimerHeight + heightDelta, 20, 120));
      const nextTimerX = clamp(
        resizeFromLeft ? startTimerX + startTimerWidth - nextTimerWidth : startTimerX,
        0,
        Math.max(0, metrics.width - nextTimerWidth)
      );
      const nextTimerY = clamp(
        resizeFromTop ? startTimerY + startTimerHeight - nextTimerHeight : startTimerY,
        0,
        Math.max(0, metrics.height - nextTimerHeight)
      );

      setSettings((current) => ({
        ...current,
        timerCentered: false,
        timerWidth: nextTimerWidth,
        timerHeight: nextTimerHeight,
        timerX: Math.round(nextTimerX),
        timerY: Math.round(nextTimerY)
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
    const metrics = getPreviewMetrics();
    if (event.button !== 0 || !metrics) return;

    const timerRect = event.currentTarget.getBoundingClientRect();
    const grabOffsetX = (event.clientX - timerRect.left) / metrics.scaleX;
    const grabOffsetY = (event.clientY - timerRect.top) / metrics.scaleY;

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxLeft = Math.max(0, metrics.width - settings.timerWidth);
      const maxTop = Math.max(0, metrics.height - settings.timerHeight);
      const centerLeft = maxLeft / 2;
      const centerTop = maxTop / 2;
      let nextLeft = clamp((moveEvent.clientX - metrics.rect.left) / metrics.scaleX - grabOffsetX, 0, maxLeft);
      let nextTop = clamp((moveEvent.clientY - metrics.rect.top) / metrics.scaleY - grabOffsetY, 0, maxTop);
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
        settings.timerWidth,
        settings.timerHeight,
        getAttachmentSnapRects({ includeTimer: false })
      );
      nextLeft = clamp(attachmentSnap.left, 0, maxLeft);
      nextTop = clamp(attachmentSnap.top, 0, maxTop);
      nextGuides.verticalCenter = nextGuides.verticalCenter || attachmentSnap.guides.verticalCenter;
      nextGuides.horizontalCenter = nextGuides.horizontalCenter || attachmentSnap.guides.horizontalCenter;

      setSettings((current) => ({
        ...current,
        timerCentered: false,
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

  const handleGameIconDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const metrics = getPreviewMetrics();
    if (event.button !== 0 || !metrics) return;

    const iconRect = event.currentTarget.getBoundingClientRect();
    const startIconWidth = scoreboard.gameIcon.width;
    const startIconHeight = scoreboard.gameIcon.height;
    const grabOffsetX = (event.clientX - iconRect.left) / metrics.scaleX;
    const grabOffsetY = (event.clientY - iconRect.top) / metrics.scaleY;

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxLeft = Math.max(0, metrics.width - startIconWidth);
      const maxTop = Math.max(0, metrics.height - startIconHeight);
      const centerLeft = maxLeft / 2;
      const centerTop = maxTop / 2;
      let nextLeft = clamp((moveEvent.clientX - metrics.rect.left) / metrics.scaleX - grabOffsetX, 0, maxLeft);
      let nextTop = clamp((moveEvent.clientY - metrics.rect.top) / metrics.scaleY - grabOffsetY, 0, maxTop);
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
        startIconWidth,
        startIconHeight,
        getAttachmentSnapRects({ includeTimer: true, includeGameIcon: false })
      );
      nextLeft = clamp(attachmentSnap.left, 0, maxLeft);
      nextTop = clamp(attachmentSnap.top, 0, maxTop);
      nextGuides.verticalCenter = nextGuides.verticalCenter || attachmentSnap.guides.verticalCenter;
      nextGuides.horizontalCenter = nextGuides.horizontalCenter || attachmentSnap.guides.horizontalCenter;

      setScoreboard((current) => ({
        ...current,
        gameIcon: {
          ...current.gameIcon,
          x: Math.round(nextLeft),
          y: Math.round(nextTop)
        }
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

  const handleGameIconResizeStart = (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => {
    const metrics = getPreviewMetrics();
    if (event.button !== 0 || !metrics) return;

    const startWidth = scoreboard.gameIcon.width;
    const startHeight = scoreboard.gameIcon.height;
    const startLeft = scoreboard.gameIcon.x;
    const startTop = scoreboard.gameIcon.y;
    const resizeFromLeft = handle.includes("left");
    const resizeFromRight = handle.includes("right");
    const resizeFromTop = handle.includes("top");
    const resizeFromBottom = handle.includes("bottom");

    event.preventDefault();
    event.stopPropagation();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - event.clientX) / metrics.scaleX;
      const deltaY = (moveEvent.clientY - event.clientY) / metrics.scaleY;
      const widthDelta = resizeFromLeft ? -deltaX : resizeFromRight ? deltaX : 0;
      const heightDelta = resizeFromTop ? -deltaY : resizeFromBottom ? deltaY : 0;
      const nextWidth = Math.round(clamp(startWidth + widthDelta, 12, metrics.width));
      const nextHeight = Math.round(clamp(startHeight + heightDelta, 12, metrics.height));
      const nextLeft = clamp(
        resizeFromLeft ? startLeft + startWidth - nextWidth : startLeft,
        0,
        Math.max(0, metrics.width - nextWidth)
      );
      const nextTop = clamp(
        resizeFromTop ? startTop + startHeight - nextHeight : startTop,
        0,
        Math.max(0, metrics.height - nextHeight)
      );

      setScoreboard((current) => ({
        ...current,
        gameIcon: {
          ...current.gameIcon,
          x: Math.round(nextLeft),
          y: Math.round(nextTop),
          width: nextWidth,
          height: nextHeight
        }
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  if (isDisplayMode) {
    return (
      <main ref={displayRef} className="fixed inset-0 z-[9999] overflow-hidden" style={getOutputBackgroundStyle(settings)}>
        <div
          className="absolute left-0 top-0"
          style={{
            width: screenSize.width,
            height: screenSize.height,
            transform: `scale(${displayScale})`,
            transformOrigin: "top left"
          }}
        >
          <CustomScoreboardOverlay
            scoreboard={scoreboard}
            displayTimer={displayTimer}
            settings={settings}
            onTeamPointerDown={() => undefined}
            onBracketResizePointerDown={() => undefined}
            onScoreResizePointerDown={() => undefined}
            onTimerResizePointerDown={() => undefined}
            onTimerPointerDown={() => undefined}
            onGameIconPointerDown={() => undefined}
            onGameIconResizePointerDown={() => undefined}
          />
        </div>
      </main>
    );
  }

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-black uppercase tracking-wide text-cyan">
            <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            Custom Overlay
          </div>
          <button type="button" className="button-primary" onClick={createCloudBoard} disabled={!configured}>
            <RadioTower className="h-4 w-4" />
            {cloudBoardId ? "고정 출력 갱신" : "고정 출력 코드 만들기"}
          </button>
          <button type="button" className="button-muted" onClick={copyDisplayUrl} disabled={!cloudBoardId}>
            <Copy className="h-4 w-4" />
            출력 링크 복사
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[480px_1fr]">
        <aside className="space-y-6">
          <details className="arena-card p-5" open>
            <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 marker:hidden">
              <Save className="h-5 w-5 text-lime" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">OBS 실시간 출력</h2>
              <span className="ml-auto text-xs font-black uppercase tracking-wide text-muted">접기/열기</span>
            </summary>
            <div className="grid gap-3 text-sm font-bold leading-6 text-muted">
              <p>{cloudStatus}</p>
              {!configured ? (
                <p className="rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-gold">
                  Vercel에 Supabase 환경변수를 넣고 재배포해야 OBS 보드를 만들 수 있습니다.
                </p>
              ) : null}
              {!cloudSession ? (
                <p className="rounded-md border border-line bg-field px-3 py-2">
                  로그인 페이지에서 먼저 로그인하세요. 로그인 후 이 페이지로 돌아오면 보드를 만들 수 있습니다.
                </p>
              ) : null}
              {displayUrl ? (
                <>
                  <div className="rounded-md border border-lime/40 bg-lime/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-lime">
                    고정 출력 코드: {cloudBoardId}
                  </div>
                  <div className="rounded-md border border-line bg-arena px-3 py-2 font-mono text-xs text-cyan break-all">
                    {displayUrl}
                  </div>
                </>
              ) : null}
              <div className="rounded-md border border-cyan/35 bg-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan">
                OBS 브라우저 소스 크기: {screenSize.width} x {screenSize.height}
              </div>
              <p className="text-xs leading-5 text-muted">
                OBS 브라우저 소스의 너비와 높이를 위 해상도와 똑같이 설정하세요.
              </p>
            </div>
          </details>

          <details className="arena-card p-5" open>
            <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 marker:hidden">
              <Settings2 className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">기본 정보</h2>
              <span className="ml-auto text-xs font-black uppercase tracking-wide text-muted">접기/열기</span>
            </summary>

            <div className="space-y-4">
              <div className="space-y-3">
                {scoreboard.teams.map((team, index) => (
                  <div key={team.id} className="rounded-md border border-line bg-panel/80 p-4 shadow-[0_10px_26px_rgba(0,0,0,0.18)]">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-line/80 pb-3">
                      <div>
                        <p className="text-sm font-black uppercase tracking-wide text-ink">팀 {index + 1}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-cyan">{team.shortName || "TEAM"}</p>
                      </div>
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
                    <div className="rounded-md border border-line/80 bg-arena/60 p-3">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-gold">팀 정보</p>
                      <label className="mb-3 block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink">
                          팀 관리에서 불러오기
                        </span>
                        <select
                          className="input"
                          value={team.linkedTeamId ?? ""}
                          onChange={(event) => applyManagedTeam(team.id, event.target.value)}
                        >
                          <option value="">{managedTeams.length ? "직접 입력" : "저장된 팀 없음"}</option>
                          {managedTeamGroups.map((group) => (
                            <optgroup key={group.id} label={group.name}>
                              {group.teams.map((managedTeam) => (
                                <option key={managedTeam.id} value={managedTeam.id}>
                                  {normalizeShortName(managedTeam)} · {managedTeam.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
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
                        onChange={(value) => updateTeam(team.id, "setScore", clamp(value, 0, settings.maxSetScore))}
                      />
                      </div>
                    </div>
                    <div className="mt-3 rounded-md border border-line/80 bg-arena/60 p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink">브래킷 색 위치</p>
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
                      <p className="mb-2 mt-4 text-xs font-black uppercase tracking-wide text-ink">브래킷 색상</p>
                      <div className="grid grid-cols-3 gap-2">
                        <ToggleButton
                          active={team.accentColorMode === "team"}
                          onClick={() => updateTeam(team.id, "accentColorMode", "team")}
                        >
                          팀 색
                        </ToggleButton>
                        <ToggleButton
                          active={team.accentColorMode === "default"}
                          onClick={() => updateTeam(team.id, "accentColorMode", "default")}
                        >
                          기본
                        </ToggleButton>
                        <ToggleButton
                          active={team.accentColorMode === "custom"}
                          onClick={() => updateTeam(team.id, "accentColorMode", "custom")}
                        >
                          커스텀
                        </ToggleButton>
                      </div>
                      {team.accentColorMode === "custom" ? (
                        <ColorField
                          label="커스텀 색상"
                          value={team.customAccentColor}
                          onChange={(value) => updateTeam(team.id, "customAccentColor", value)}
                        />
                      ) : null}
                    </div>
                    <div className="mt-3 rounded-md border border-line/80 bg-arena/60 p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink">약칭 / 팀이름 정렬</p>
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
                    <div className="mt-3 rounded-md border border-line/80 bg-arena/60 p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink">로고 위치</p>
                      <div className="grid grid-cols-2 gap-2">
                        <ToggleButton active={team.logoSide === "left"} onClick={() => updateTeam(team.id, "logoSide", "left")}>
                          왼쪽
                        </ToggleButton>
                        <ToggleButton active={team.logoSide === "right"} onClick={() => updateTeam(team.id, "logoSide", "right")}>
                          오른쪽
                        </ToggleButton>
                      </div>
                    </div>
                    <div className="mt-3 rounded-md border border-line/80 bg-arena/60 p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink">점수칸 위치</p>
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
                    <div className="mt-3 rounded-md border border-line/80 bg-arena/60 p-3">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink">세트점수 위치</p>
                      <div className="grid grid-cols-4 gap-2">
                        <ToggleButton
                          active={team.setScoreEdge === "top"}
                          onClick={() => updateTeam(team.id, "setScoreEdge", "top")}
                        >
                          위
                        </ToggleButton>
                        <ToggleButton
                          active={team.setScoreEdge === "bottom"}
                          onClick={() => updateTeam(team.id, "setScoreEdge", "bottom")}
                        >
                          아래
                        </ToggleButton>
                        <ToggleButton
                          active={team.setScoreEdge === "left"}
                          onClick={() => updateTeam(team.id, "setScoreEdge", "left")}
                        >
                          좌
                        </ToggleButton>
                        <ToggleButton
                          active={team.setScoreEdge === "right"}
                          onClick={() => updateTeam(team.id, "setScoreEdge", "right")}
                        >
                          우
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
          </details>

          <details className="arena-card p-5" open>
            <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 marker:hidden">
              <Eye className="h-5 w-5 text-lime" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">표시 방식</h2>
              <span className="ml-auto text-xs font-black uppercase tracking-wide text-muted">접기/열기</span>
            </summary>

            <div className="grid grid-cols-2 gap-2">
              <ToggleButton active={settings.nameMode === "short"} onClick={() => updateSetting("nameMode", "short")}>
                약칭
              </ToggleButton>
              <ToggleButton active={settings.nameMode === "full"} onClick={() => updateSetting("nameMode", "full")}>
                풀네임
              </ToggleButton>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink">브래킷 / 타이머 모드</p>
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton active={settings.overlayTheme === "dark"} onClick={() => updateSetting("overlayTheme", "dark")}>
                  다크
                </ToggleButton>
                <ToggleButton active={settings.overlayTheme === "light"} onClick={() => updateSetting("overlayTheme", "light")}>
                  라이트
                </ToggleButton>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink">OBS 출력 배경</p>
              <div className="grid grid-cols-3 gap-2">
                <ToggleButton
                  active={settings.outputBackgroundMode === "transparent"}
                  onClick={() => updateSetting("outputBackgroundMode", "transparent")}
                >
                  투명
                </ToggleButton>
                <ToggleButton
                  active={settings.outputBackgroundMode === "green"}
                  onClick={() => updateSetting("outputBackgroundMode", "green")}
                >
                  그린
                </ToggleButton>
                <ToggleButton
                  active={settings.outputBackgroundMode === "black"}
                  onClick={() => updateSetting("outputBackgroundMode", "black")}
                >
                  검정
                </ToggleButton>
              </div>
              {settings.outputBackgroundMode === "green" ? (
                <ColorField
                  label="그린스크린 색상"
                  value={settings.greenScreenColor}
                  onChange={(value) => updateSetting("greenScreenColor", value)}
                  fallback="#00ff00"
                />
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <CheckButton active={settings.showLogo} onClick={() => updateSetting("showLogo", !settings.showLogo)}>
                로고
              </CheckButton>
              <CheckButton active={settings.showTimer} onClick={() => updateSetting("showTimer", !settings.showTimer)}>
                타이머
              </CheckButton>
              <CheckButton active={settings.showSetScore} onClick={() => updateSetting("showSetScore", !settings.showSetScore)}>
                세트점수
              </CheckButton>
              <CheckButton active={settings.symmetricSizes} onClick={() => updateSetting("symmetricSizes", !settings.symmetricSizes)}>
                크기 대칭
              </CheckButton>
              <CheckButton active={settings.symmetricPositions} onClick={() => updateSetting("symmetricPositions", !settings.symmetricPositions)}>
                위치 대칭
              </CheckButton>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-ink">폰트</p>
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
          </details>

          <details className="arena-card p-5" open>
            <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 marker:hidden">
              <SlidersHorizontal className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">타이머</h2>
              <span className="ml-auto text-xs font-black uppercase tracking-wide text-muted">접기/열기</span>
            </summary>
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                <ToggleButton active={settings.timerMode === "currentTime"} onClick={() => updateSetting("timerMode", "currentTime")}>
                  현재 시간
                </ToggleButton>
                <ToggleButton active={settings.timerMode === "countUp"} onClick={() => updateSetting("timerMode", "countUp")}>
                  0부터 진행
                </ToggleButton>
                <ToggleButton active={settings.timerMode === "countDown"} onClick={() => updateSetting("timerMode", "countDown")}>
                  카운트다운
                </ToggleButton>
              </div>
              {settings.timerMode === "currentTime" ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink">지역</span>
                  <select
                    className="input"
                    value={settings.timerTimeZone}
                    onChange={(event) => updateSetting("timerTimeZone", event.target.value)}
                  >
                    {timeZoneOptions.map((timeZone) => (
                      <option key={timeZone.value} value={timeZone.value}>
                        {timeZone.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField
                      label={settings.timerMode === "countDown" ? "남은 시" : "시작 시"}
                      value={Math.floor(scoreboard.elapsedSeconds / 3600)}
                      onChange={(value) => updateElapsedPart("hours", value)}
                    />
                    <NumberField
                      label={settings.timerMode === "countDown" ? "남은 분" : "시작 분"}
                      value={Math.floor((scoreboard.elapsedSeconds % 3600) / 60)}
                      onChange={(value) => updateElapsedPart("minutes", value)}
                    />
                    <NumberField
                      label={settings.timerMode === "countDown" ? "남은 초" : "시작 초"}
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
                {settings.timerMode === "countDown" && scoreboard.timerFinished ? <span className="ml-2 text-red-300">종료</span> : null}
              </p>
            </div>
          </details>

          <details className="arena-card p-5" open>
            <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 marker:hidden">
              <MonitorPlay className="h-5 w-5 text-lime" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">게임 아이콘 브래킷</h2>
              <span className="ml-auto text-xs font-black uppercase tracking-wide text-muted">접기/열기</span>
            </summary>
            <div className="grid gap-3">
              <CheckButton active={scoreboard.gameIcon.enabled} onClick={() => updateGameIcon("enabled", !scoreboard.gameIcon.enabled)}>
                표시
              </CheckButton>
              <label className="block rounded-md border border-line bg-field px-3 py-3">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink">아이콘 이미지</span>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs font-bold text-muted file:mr-3 file:rounded-md file:border-0 file:bg-cyan/15 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-wide file:text-cyan"
                  onChange={(event) => {
                    void handleGameIconFileChange(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateGameIcon("image", "")}
                  className="rounded-md border border-line bg-field px-3 py-2 text-xs font-black uppercase tracking-wide text-muted transition hover:border-red-400 hover:text-red-300"
                >
                  이미지 제거
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setScoreboard((current) => ({
                      ...current,
                      gameIcon: {
                        ...current.gameIcon,
                        x: defaultScoreboard.gameIcon.x,
                        y: defaultScoreboard.gameIcon.y,
                        width: defaultScoreboard.gameIcon.width,
                        height: defaultScoreboard.gameIcon.height
                      }
                    }))
                  }
                  className="rounded-md border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-gold transition hover:bg-gold hover:text-arena"
                >
                  위치 리셋
                </button>
              </div>
              <p className="rounded-md border border-line bg-arena/70 px-3 py-3 text-xs font-bold leading-5 text-muted">
                미리보기에서 사각형을 드래그하고 모서리를 잡아 크기를 조절합니다.
              </p>
            </div>
          </details>

          <details className="arena-card p-5" open>
            <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 marker:hidden">
              <MonitorPlay className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">화면 해상도</h2>
              <span className="ml-auto text-xs font-black uppercase tracking-wide text-muted">접기/열기</span>
            </summary>
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
          </details>

          <details className="arena-card p-5" open>
            <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 marker:hidden">
              <Move className="h-5 w-5 text-gold" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">위치</h2>
              <span className="ml-auto text-xs font-black uppercase tracking-wide text-muted">접기/열기</span>
            </summary>
            <div className="grid gap-3">
              <div className="rounded-md border border-line bg-arena/70 px-3 py-3">
                <p className="text-xs font-bold leading-5 text-muted">
                  미리보기 화면에서 타이머와 각 팀 브래킷을 따로 드래그합니다.
                  서로 가까이 가져가면 자석처럼 가장자리끼리 붙습니다. 브래킷, 점수칸, 타이머 크기는 가장자리 핸들을 잡아 조절합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={resetOverlayLayout}
                className="rounded-md border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-gold transition hover:bg-gold hover:text-arena"
              >
                위치 / 크기 리셋
              </button>
            </div>
          </details>

          <details className="arena-card p-5" open>
            <summary className="mb-4 flex cursor-pointer list-none items-center gap-2 marker:hidden">
              <SlidersHorizontal className="h-5 w-5 text-magenta" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">브래킷 크기</h2>
              <span className="ml-auto text-xs font-black uppercase tracking-wide text-muted">접기/열기</span>
            </summary>
            <div className="grid gap-3">
              <RangeField label="로고 크기" value={settings.logoSize} min={0} max={80} onChange={(value) => updateSetting("logoSize", value)} suffix="px" />
              <NumberField
                label="팀명 글자(px)"
                value={settings.fontSize}
                onChange={(value) => updateSetting("fontSize", Math.max(1, Math.floor(value)))}
              />
              <NumberField
                label="점수 숫자(px)"
                value={settings.scoreFontSize}
                onChange={(value) => updateSetting("scoreFontSize", Math.max(1, Math.floor(value)))}
              />
              <NumberField
                label="브래킷 색 두께(px)"
                value={settings.accentThickness ?? defaultSettings.accentThickness}
                onChange={(value) => updateSetting("accentThickness", Math.max(0, Math.floor(value)))}
              />
              <NumberField
                label="최대 세트"
                value={settings.maxSetScore}
                onChange={(value) => updateSetting("maxSetScore", Math.max(1, Math.floor(value)))}
              />
              <RangeField label="불투명도" value={settings.opacity} min={20} max={100} onChange={(value) => updateSetting("opacity", value)} suffix="%" />
              <p className="rounded-md border border-line bg-arena/70 px-3 py-3 text-xs font-bold leading-5 text-muted">
                브래킷 오른쪽 가장자리를 드래그하면 넓이가, 아래쪽 가장자리를 드래그하면 높이가 바뀝니다.
              </p>
            </div>
          </details>
        </aside>

        <div className="arena-card overflow-hidden xl:sticky xl:top-5 xl:self-start">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/80 px-5 py-4">
            <div>
              <p className="section-kicker">미리보기</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-ink">직접 설정형 오버레이</h2>
            </div>
            <div className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-black uppercase tracking-wide text-muted">
              {resolutionOptions[settings.resolution].label} / {settings.nameMode === "short" ? "약칭" : "풀네임"} / 분리형
            </div>
          </div>

          <div className="grid min-h-[520px] place-items-center bg-[radial-gradient(circle_at_50%_28%,rgba(47,230,255,0.1),transparent_34%),hsl(var(--arena))] p-4 sm:min-h-[620px] sm:p-6 xl:min-h-[calc(100vh-170px)]">
            <div
              ref={previewRef}
              className="relative w-full max-w-6xl overflow-hidden rounded-md border border-line shadow-panel"
              style={{
                aspectRatio: `${screenSize.width} / ${screenSize.height}`,
                ...getOutputBackgroundStyle(settings)
              }}
            >
              {settings.outputBackgroundMode === "transparent" ? (
                <>
                  <div className="absolute inset-0 bg-[#111318]" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_24%,rgba(255,255,255,0.08),transparent_18%)]" />
                </>
              ) : null}
              <div
                className="absolute left-0 top-0"
                style={{
                  width: screenSize.width,
                  height: screenSize.height,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left"
                }}
              >
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
                  onGameIconPointerDown={handleGameIconDragStart}
                  onGameIconResizePointerDown={handleGameIconResizeStart}
                />
              </div>
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
  onTimerPointerDown,
  onGameIconPointerDown,
  onGameIconResizePointerDown
}: {
  scoreboard: ScoreboardState;
  displayTimer: string;
  settings: OverlaySettings;
  onTeamPointerDown: (teamId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onBracketResizePointerDown: (teamId: string | null, handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onScoreResizePointerDown: (teamId: string, handle: ScoreResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onTimerResizePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onTimerPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onGameIconPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onGameIconResizePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none" style={{ opacity: settings.opacity / 100 }}>
      {scoreboard.gameIcon.enabled ? (
        <GameIconBoxView
          gameIcon={scoreboard.gameIcon}
          settings={settings}
          onPointerDown={onGameIconPointerDown}
          onResizePointerDown={onGameIconResizePointerDown}
        />
      ) : null}
      {settings.showTimer ? (
        <TimerBlock
          timer={displayTimer}
          settings={settings}
          finished={settings.timerMode === "countDown" && scoreboard.timerFinished}
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

function GameIconBoxView({
  gameIcon,
  settings,
  onPointerDown,
  onResizePointerDown
}: {
  gameIcon: GameIconBox;
  settings: OverlaySettings;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const themeClass = settings.overlayTheme === "light"
    ? "border-slate-300 bg-white text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
    : "border-white/15 bg-[#07111f] text-white shadow-[0_8px_20px_rgba(0,0,0,0.45)]";

  return (
    <div
      className={`group pointer-events-auto absolute z-20 grid cursor-move touch-none select-none place-items-center overflow-hidden border ${themeClass}`}
      onPointerDown={onPointerDown}
      style={{
        left: gameIcon.x,
        top: gameIcon.y,
        width: gameIcon.width,
        height: gameIcon.height
      }}
      title="게임 아이콘 브래킷 드래그"
    >
      {gameIcon.image ? (
        <span
          className="h-full w-full bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${gameIcon.image}")` }}
          aria-hidden="true"
        />
      ) : (
        <span className={`text-[10px] font-black uppercase tracking-wide text-muted ${getFontFamilyClass(settings.fontFamily)}`}>
          GAME
        </span>
      )}
      <ResizeHandles onResizePointerDown={onResizePointerDown} />
    </div>
  );
}

function TimerBlock({
  timer,
  settings,
  finished,
  className = "",
  onResizePointerDown,
  onPointerDown
}: {
  timer: string;
  settings: OverlaySettings;
  finished: boolean;
  className?: string;
  onResizePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const timerThemeClass = settings.overlayTheme === "light"
    ? "border border-slate-300 bg-white text-slate-950 shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
    : "border border-white/10 bg-[#07111f] text-white shadow-[0_8px_20px_rgba(0,0,0,0.45)]";
  const timerFinishedClass = finished
    ? "border-red-400 bg-red-600 text-white shadow-[0_0_26px_rgba(248,113,113,0.75)]"
    : timerThemeClass;

  return (
    <div
      className={`group relative cursor-move touch-none select-none ${timerFinishedClass} ${className}`}
      onPointerDown={onPointerDown}
      style={{
        left: settings.timerCentered ? "50%" : 0,
        width: settings.timerWidth,
        height: settings.timerHeight,
        transform: settings.timerCentered
          ? `translate(-50%, ${settings.timerY}px)`
          : `translate(${settings.timerX}px, ${settings.timerY}px)`
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

function getAnchoredLeft(team: ScoreboardTeam, width: number, previewWidth: number) {
  const left = team.xAnchor === "right"
    ? previewWidth - width - (team.x / 100) * previewWidth
    : (team.x / 100) * previewWidth;

  return clamp(left, 0, Math.max(0, previewWidth - width));
}

function updateSymmetricTeamPositions(
  teams: ScoreboardTeam[],
  movedTeamId: string,
  nextLeft: number,
  nextTop: number,
  previewWidth: number,
  previewHeight: number,
  settings: OverlaySettings,
  symmetricPositions: boolean
) {
  const movedIndex = teams.findIndex((team) => team.id === movedTeamId);
  const movedX = Math.round((nextLeft / Math.max(1, previewWidth)) * 1000) / 10;
  const movedY = Math.round((nextTop / Math.max(1, previewHeight)) * 1000) / 10;

  if (movedIndex < 0) return teams;

  const pairIndex = movedIndex % 2 === 0 ? movedIndex + 1 : movedIndex - 1;

  return teams.map((team, index) => {
    if (index === movedIndex) {
      return { ...team, xAnchor: "left" as const, x: movedX, y: movedY };
    }

    if (!symmetricPositions || index !== pairIndex || !teams[pairIndex]) {
      return team;
    }

    const pairSize = getBracketSize(team, settings);
    const pairWidth = pairSize.teamWidth + pairSize.scoreWidth;
    const mirroredLeft = clamp(previewWidth - nextLeft - pairWidth, 0, Math.max(0, previewWidth - pairWidth));

    return {
      ...team,
      xAnchor: "left" as const,
      x: Math.round((mirroredLeft / Math.max(1, previewWidth)) * 1000) / 10,
      y: movedY
    };
  });
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
  const accentRight = team.accentSide === "right";
  const fallbackAccentColor = side === "left" ? "#3b82f6" : "#ef4444";
  const accentColor = getScoreboardAccentColor(team, fallbackAccentColor);
  const accentThickness = settings.accentThickness ?? defaultSettings.accentThickness;
  const visibleScoreFontSize = getVisibleScoreFontSize(
    team.score,
    size.rowHeight,
    size.scoreWidth,
    settings.scoreFontSize
  );
  const setScoreMarkerSize = Math.max(2, Math.round(visibleScoreFontSize * 0.22));
  const scoreColumnLeft = teamFirst ? size.teamWidth : 0;
  const gridTemplateColumns = teamFirst
    ? `${size.teamWidth}px ${size.scoreWidth}px`
    : `${size.scoreWidth}px ${size.teamWidth}px`;

  return (
    <div
      className="group pointer-events-auto absolute z-10 grid cursor-move touch-none select-none overflow-visible"
      onPointerDown={(event) => onPointerDown(team.id, event)}
      style={{
        left: team.xAnchor === "left" ? `${team.x}%` : "auto",
        right: team.xAnchor === "right" ? `${team.x}%` : "auto",
        top: `${team.y}%`,
        gridTemplateColumns
      }}
      title="팀 브래킷 드래그"
    >
      {accentThickness > 0 ? (
        <span
          className="pointer-events-none absolute bottom-0 top-0 z-30"
          style={{
            [accentRight ? "right" : "left"]: 0,
            width: accentThickness,
            backgroundColor: accentColor
          }}
          aria-hidden="true"
        />
      ) : null}
      <TeamCell
        team={team}
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
      {settings.showSetScore ? (
        <SetScoreMarkers
          setScore={team.setScore}
          maxSetScore={settings.maxSetScore}
          markerSize={setScoreMarkerSize}
          scoreColumnLeft={scoreColumnLeft}
          scoreColumnWidth={size.scoreWidth}
          rowHeight={size.rowHeight}
          edge={team.setScoreEdge}
        />
      ) : null}
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

function formatCurrentTime(timestamp: number, settings: OverlaySettings) {
  const options: Intl.DateTimeFormatOptions = {
    hour12: false,
    timeZone: settings.timerTimeZone
  };

  if (settings.timerShowHours) options.hour = "2-digit";
  if (settings.timerShowMinutes) options.minute = "2-digit";
  if (settings.timerShowSeconds) options.second = "2-digit";

  if (!settings.timerShowHours && !settings.timerShowMinutes && !settings.timerShowSeconds) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.second = "2-digit";
  }

  try {
    return new Intl.DateTimeFormat("ko-KR", options).format(new Date(timestamp));
  } catch {
    return new Intl.DateTimeFormat("ko-KR", { ...options, timeZone: defaultSettings.timerTimeZone }).format(new Date(timestamp));
  }
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
  settings
}: {
  team: ScoreboardTeam;
  settings: OverlaySettings;
}) {
  const accentRight = team.accentSide === "right";
  const scoreSide = team.scoreSide ?? (team.accentSide === "right" ? "left" : "right");
  const scoreFirst = scoreSide === "left";
  const label = settings.nameMode === "short" ? team.shortName : team.name;
  const size = getBracketSize(team, settings);
  const textColor = getTeamThemeTextColor(team, settings.overlayTheme === "light" ? "#ffffff" : "#07111f");
  const scoreCell = (
    <ScoreCell
      key="score"
      score={team.score}
      rowHeight={size.rowHeight}
      scoreWidth={size.scoreWidth}
      scoreFontSize={settings.scoreFontSize}
      fontFamily={settings.fontFamily}
      overlayTheme={settings.overlayTheme}
    />
  );
  const teamThemeClass = settings.overlayTheme === "light"
    ? "bg-white text-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
    : "bg-[#07111f] text-white";
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
  const logoSize = Math.min(settings.logoSize, Math.max(0, size.rowHeight - 8));
  const accentThickness = settings.accentThickness ?? defaultSettings.accentThickness;
  const accentPadding = accentThickness > 0 ? Math.min(accentThickness, 24) + 8 : 12;
  const teamCell = (
    <div
      key="team"
      className={[
        "relative flex min-w-0 items-center gap-2 overflow-visible px-3",
        teamThemeClass,
        justifyClass
      ].join(" ")}
      style={{
        height: size.rowHeight,
        paddingLeft: accentRight ? undefined : accentPadding,
        paddingRight: accentRight ? accentPadding : undefined,
        color: textColor
      }}
    >
      {logoFirst && settings.showLogo && logoSize > 0 ? (
        <LogoBox label={team.shortName} size={logoSize} team={team} theme={settings.overlayTheme} />
      ) : null}
      <span
        className={["relative z-10 min-w-0 flex-1 truncate font-black uppercase leading-none", labelAlignClass, getFontFamilyClass(settings.fontFamily)].join(" ")}
        style={{ fontSize: settings.fontSize }}
      >
        {label}
      </span>
      {!logoFirst && settings.showLogo && logoSize > 0 ? (
        <LogoBox label={team.shortName} size={logoSize} team={team} theme={settings.overlayTheme} />
      ) : null}
    </div>
  );

  return <>{scoreFirst ? [scoreCell, teamCell] : [teamCell, scoreCell]}</>;
}

function ScoreCell({
  score,
  rowHeight,
  scoreWidth,
  scoreFontSize,
  fontFamily,
  overlayTheme
}: {
  score: number;
  rowHeight: number;
  scoreWidth: number;
  scoreFontSize: number;
  fontFamily: FontFamily;
  overlayTheme: OverlayTheme;
}) {
  const visibleScoreFontSize = getVisibleScoreFontSize(score, rowHeight, scoreWidth, scoreFontSize);
  const scoreThemeClass = overlayTheme === "light"
    ? "bg-slate-100 text-slate-950 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.22)]"
    : "bg-[#020617] text-white";

  return (
    <div
      className={`grid place-items-center overflow-hidden font-black leading-none ${scoreThemeClass} ${getFontFamilyClass(fontFamily)}`}
      style={{ height: rowHeight, fontSize: visibleScoreFontSize }}
    >
      {score}
    </div>
  );
}

function getVisibleScoreFontSize(score: number, rowHeight: number, scoreWidth: number, scoreFontSize: number) {
  const digits = String(score).length;
  const autoFitFontSize = Math.max(
    12,
    Math.min(rowHeight * 0.82, (scoreWidth / Math.max(1, digits)) * 1.12)
  );

  return Math.max(12, Math.min(scoreFontSize, autoFitFontSize));
}

function SetScoreMarkers({
  setScore,
  maxSetScore,
  markerSize,
  scoreColumnLeft,
  scoreColumnWidth,
  rowHeight,
  edge,
}: {
  setScore: number;
  maxSetScore: number;
  markerSize: number;
  scoreColumnLeft: number;
  scoreColumnWidth: number;
  rowHeight: number;
  edge: SetScoreEdge;
}) {
  const markerCount = Math.max(1, Math.floor(maxSetScore));
  const filledCount = clamp(Math.floor(setScore), 0, markerCount);
  const size = Math.max(0, markerSize);
  const isSideEdge = edge === "left" || edge === "right";
  const markerWidth = Math.max(8, Math.round(size * 2.4));
  const markerHeight = Math.max(3, Math.round(size * 0.55));
  const sideGap = 4;
  const availableCircleHeight = Math.max(4, rowHeight - sideGap * Math.max(0, markerCount - 1));
  const circleSize = Math.max(4, Math.floor(availableCircleHeight / markerCount));
  const offset = (isSideEdge ? circleSize : markerHeight) + 6;

  return (
    <div
      className={[
        "pointer-events-none absolute z-20 flex gap-1",
        isSideEdge ? "flex-col items-center justify-center" : "items-center"
      ].join(" ")}
      style={{
        width: isSideEdge ? circleSize : scoreColumnWidth,
        height: isSideEdge ? rowHeight : markerHeight,
        top: edge === "top" ? -offset : undefined,
        right: edge === "right" ? -offset : undefined,
        bottom: edge === "bottom" ? -offset : undefined,
        left: isSideEdge
          ? edge === "left" ? -offset : undefined
          : scoreColumnLeft
      }}
      aria-label={`세트점수 ${filledCount}`}
    >
      {Array.from({ length: markerCount }).map((_, index) => (
        <span
          key={index}
          className={[
            isSideEdge ? "rounded-full" : "rounded-[2px]",
            "border border-white/70 shadow-[0_0_5px_rgba(255,255,255,0.35)]",
            index < filledCount ? "bg-gold" : "bg-slate-950/80"
          ].join(" ")}
          style={{
            width: isSideEdge ? circleSize : markerWidth,
            height: isSideEdge ? circleSize : markerHeight,
            flex: isSideEdge ? undefined : 1
          }}
        />
      ))}
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
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink">{label}</span>
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
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink">{label}</span>
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

function ColorField({
  label,
  value,
  onChange,
  fallback = "#3b82f6"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fallback?: string;
}) {
  return (
    <label className="mt-3 block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValidHexColor(value) ? value : fallback}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line bg-field p-1"
        />
        <input
          className="input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#3b82f6"
        />
      </div>
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
      <span className="mb-2 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wide text-ink">
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
        active ? "border-cyan bg-cyan text-arena" : "border-line bg-field text-ink hover:border-cyan hover:text-cyan"
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
        active ? "border-lime bg-lime text-arena" : "border-line bg-field text-ink hover:border-lime hover:text-lime"
      }`}
    >
      {children}
    </button>
  );
}

function LogoBox({
  label,
  size,
  team,
  theme
}: {
  label: string;
  size: number;
  team: ScoreboardTeam;
  theme: OverlayTheme;
}) {
  const [resolvedLogo, setResolvedLogo] = useState("");
  const logoCandidates = useMemo(() => getScoreboardLogoCandidates(team, theme), [team, theme]);

  useEffect(() => {
    let cancelled = false;

    if (!logoCandidates.length) {
      setResolvedLogo("");
      return;
    }

    setResolvedLogo("");
    Promise.all(logoCandidates.map((candidate) => resolveStoredLogo(candidate)))
      .then((logos) => {
        if (!cancelled) setResolvedLogo(logos.find(Boolean) ?? "");
      })
      .catch(() => {
        if (!cancelled) setResolvedLogo("");
      });

    return () => {
      cancelled = true;
    };
  }, [logoCandidates]);

  return (
    <span
      className="relative z-10 grid shrink-0 place-items-center overflow-hidden font-black uppercase text-white"
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.34) }}
    >
      {resolvedLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolvedLogo} alt={`${team.name} 로고`} className="max-h-full max-w-full object-contain" />
      ) : (
        label.slice(0, 2)
      )}
    </span>
  );
}

function getScoreboardLogoCandidates(team: ScoreboardTeam, theme: OverlayTheme) {
  const candidates =
    theme === "light"
      ? [team.logoLight, team.logoDefault, team.logoDark]
      : [team.logoDark, team.logoDefault, team.logoLight];

  return candidates.filter((candidate): candidate is string => Boolean(candidate));
}

function getScoreboardAccentColor(team: ScoreboardTeam, fallbackAccentColor: string) {
  if (team.accentColorMode === "custom") {
    return isValidHexColor(team.customAccentColor) ? team.customAccentColor : fallbackAccentColor;
  }

  if (team.accentColorMode === "team") {
    return getTeamBracketAccentColor(team) ?? fallbackAccentColor;
  }

  return fallbackAccentColor;
}

function isValidHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}
