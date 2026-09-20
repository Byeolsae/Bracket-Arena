"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { Eye, MonitorPlay, Move, Settings2, SlidersHorizontal } from "lucide-react";

type NameMode = "short" | "full";
type Direction = "horizontal" | "vertical";

type ScoreboardState = {
  title: string;
  timer: string;
  leftName: string;
  leftShort: string;
  leftScore: number;
  rightName: string;
  rightShort: string;
  rightScore: number;
};

type OverlaySettings = {
  x: number;
  y: number;
  width: number;
  teamWidth: number;
  scoreWidth: number;
  rowHeight: number;
  timerWidth: number;
  logoSize: number;
  fontSize: number;
  scoreSize: number;
  nameMode: NameMode;
  direction: Direction;
  showLogo: boolean;
  showTimer: boolean;
  showTitle: boolean;
  opacity: number;
};

const defaultScoreboard: ScoreboardState = {
  title: "GAME",
  timer: "11:38:39",
  leftName: "DRX",
  leftShort: "DRX",
  leftScore: 0,
  rightName: "Gen.G",
  rightShort: "GEN",
  rightScore: 0
};

const defaultSettings: OverlaySettings = {
  x: 0,
  y: 0,
  width: 360,
  teamWidth: 205,
  scoreWidth: 54,
  rowHeight: 48,
  timerWidth: 190,
  logoSize: 30,
  fontSize: 30,
  scoreSize: 34,
  nameMode: "short",
  direction: "vertical",
  showLogo: true,
  showTimer: true,
  showTitle: true,
  opacity: 100
};

export default function ScoreboardPage() {
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(defaultScoreboard);
  const [settings, setSettings] = useState<OverlaySettings>(defaultSettings);

  const updateScoreboard = <Key extends keyof ScoreboardState>(key: Key, value: ScoreboardState[Key]) => {
    setScoreboard((current) => ({ ...current, [key]: value }));
  };

  const updateSetting = <Key extends keyof OverlaySettings>(key: Key, value: OverlaySettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
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
              <div className="grid grid-cols-2 gap-3">
                <TextField label="제목" value={scoreboard.title} onChange={(value) => updateScoreboard("title", value)} />
                <TextField label="타이머" value={scoreboard.timer} onChange={(value) => updateScoreboard("timer", value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="왼쪽 풀네임"
                  value={scoreboard.leftName}
                  onChange={(value) => updateScoreboard("leftName", value)}
                />
                <TextField
                  label="오른쪽 풀네임"
                  value={scoreboard.rightName}
                  onChange={(value) => updateScoreboard("rightName", value)}
                />
                <TextField
                  label="왼쪽 약칭"
                  value={scoreboard.leftShort}
                  onChange={(value) => updateScoreboard("leftShort", value.toUpperCase().slice(0, 8))}
                />
                <TextField
                  label="오른쪽 약칭"
                  value={scoreboard.rightShort}
                  onChange={(value) => updateScoreboard("rightShort", value.toUpperCase().slice(0, 8))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="왼쪽 점수"
                  value={scoreboard.leftScore}
                  onChange={(value) => updateScoreboard("leftScore", value)}
                />
                <NumberField
                  label="오른쪽 점수"
                  value={scoreboard.rightScore}
                  onChange={(value) => updateScoreboard("rightScore", value)}
                />
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

            <div className="mt-4 grid grid-cols-3 gap-2">
              <CheckButton active={settings.showLogo} onClick={() => updateSetting("showLogo", !settings.showLogo)}>
                로고
              </CheckButton>
              <CheckButton active={settings.showTimer} onClick={() => updateSetting("showTimer", !settings.showTimer)}>
                타이머
              </CheckButton>
              <CheckButton active={settings.showTitle} onClick={() => updateSetting("showTitle", !settings.showTitle)}>
                제목
              </CheckButton>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Move className="h-5 w-5 text-gold" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">위치</h2>
            </div>
            <div className="grid gap-3">
              <RangeField label="가로 위치" value={settings.x} min={0} max={100} onChange={(value) => updateSetting("x", value)} suffix="%" />
              <RangeField label="세로 위치" value={settings.y} min={0} max={100} onChange={(value) => updateSetting("y", value)} suffix="%" />
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-magenta" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">크기</h2>
            </div>
            <div className="grid gap-3">
              <RangeField label="전체 넓이" value={settings.width} min={220} max={1000} onChange={(value) => updateSetting("width", value)} suffix="px" />
              <RangeField label="팀칸 넓이" value={settings.teamWidth} min={100} max={420} onChange={(value) => updateSetting("teamWidth", value)} suffix="px" />
              <RangeField label="점수칸 넓이" value={settings.scoreWidth} min={34} max={150} onChange={(value) => updateSetting("scoreWidth", value)} suffix="px" />
              <RangeField label="칸 높이" value={settings.rowHeight} min={30} max={110} onChange={(value) => updateSetting("rowHeight", value)} suffix="px" />
              <RangeField label="타이머 넓이" value={settings.timerWidth} min={90} max={360} onChange={(value) => updateSetting("timerWidth", value)} suffix="px" />
              <RangeField label="로고 크기" value={settings.logoSize} min={0} max={80} onChange={(value) => updateSetting("logoSize", value)} suffix="px" />
              <RangeField label="팀명 글자" value={settings.fontSize} min={14} max={64} onChange={(value) => updateSetting("fontSize", value)} suffix="px" />
              <RangeField label="점수 글자" value={settings.scoreSize} min={18} max={80} onChange={(value) => updateSetting("scoreSize", value)} suffix="px" />
              <RangeField label="불투명도" value={settings.opacity} min={20} max={100} onChange={(value) => updateSetting("opacity", value)} suffix="%" />
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
              {settings.nameMode === "short" ? "약칭" : "풀네임"} / {settings.direction === "vertical" ? "위아래" : "좌우"}
            </div>
          </div>

          <div className="grid min-h-[620px] place-items-center bg-[radial-gradient(circle_at_50%_28%,rgba(47,230,255,0.1),transparent_34%),hsl(var(--arena))] p-4 sm:p-6">
            <div className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-md border border-line bg-[#111318] shadow-panel">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_24%,rgba(255,255,255,0.08),transparent_18%)]" />
              <CustomScoreboardOverlay scoreboard={scoreboard} settings={settings} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CustomScoreboardOverlay({
  scoreboard,
  settings
}: {
  scoreboard: ScoreboardState;
  settings: OverlaySettings;
}) {
  const labelA = settings.nameMode === "short" ? scoreboard.leftShort : scoreboard.leftName;
  const labelB = settings.nameMode === "short" ? scoreboard.rightShort : scoreboard.rightName;
  const overlayStyle: CSSProperties = {
    left: `${settings.x}%`,
    top: `${settings.y}%`,
    width: settings.width,
    opacity: settings.opacity / 100
  };
  const availableTeamWidth =
    settings.direction === "vertical"
      ? Math.max(80, settings.width - settings.scoreWidth)
      : settings.teamWidth;

  return (
    <div className="absolute z-10" style={overlayStyle}>
      {settings.showTimer ? (
        <div
          className="grid grid-cols-[1fr_auto] bg-white text-slate-950"
          style={{ width: settings.timerWidth }}
        >
          <div className="px-2 py-1 text-center font-black tabular-nums leading-none" style={{ fontSize: Math.max(12, settings.fontSize * 0.62) }}>
            {scoreboard.timer}
          </div>
          {settings.showTitle ? (
            <div className="border-l border-slate-300 px-2 py-1 text-center font-black uppercase leading-none" style={{ fontSize: Math.max(10, settings.fontSize * 0.42) }}>
              {scoreboard.title}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={settings.direction === "horizontal" ? "grid" : "grid"}
        style={
          settings.direction === "horizontal"
            ? {
                gridTemplateColumns: `${availableTeamWidth}px ${settings.scoreWidth}px ${availableTeamWidth}px ${settings.scoreWidth}px`
              }
            : {
                gridTemplateColumns: `${availableTeamWidth}px ${settings.scoreWidth}px`
              }
        }
      >
        <TeamCell
          label={labelA}
          logoLabel={scoreboard.leftShort}
          score={scoreboard.leftScore}
          accent="border-l-blue-500"
          settings={settings}
        />
        <TeamCell
          label={labelB}
          logoLabel={scoreboard.rightShort}
          score={scoreboard.rightScore}
          accent="border-l-red-500"
          settings={settings}
        />
      </div>
    </div>
  );
}

function TeamCell({
  label,
  logoLabel,
  score,
  accent,
  settings
}: {
  label: string;
  logoLabel: string;
  score: number;
  accent: string;
  settings: OverlaySettings;
}) {
  return (
    <>
      <div
        className={`flex min-w-0 items-center gap-2 border-l-4 bg-[#07111f] px-3 text-white ${accent}`}
        style={{ height: settings.rowHeight }}
      >
        {settings.showLogo && settings.logoSize > 0 ? (
          <LogoBox label={logoLabel} size={settings.logoSize} />
        ) : null}
        <span
          className="truncate font-black uppercase leading-none"
          style={{ fontSize: settings.fontSize }}
        >
          {label}
        </span>
      </div>
      <div
        className="grid place-items-center bg-white font-black leading-none text-slate-950"
        style={{ height: settings.rowHeight, fontSize: settings.scoreSize }}
      >
        {score}
      </div>
    </>
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
