"use client";

import { useMemo, useState } from "react";
import { Eye, Layers3, MonitorPlay, Radio, Settings2 } from "lucide-react";

type BoardKind = "tile" | "center" | "compact" | "stacked" | "fighter";
type DisplayMode =
  | "logo"
  | "score"
  | "short"
  | "full"
  | "logoScore"
  | "logoShortScore"
  | "logoFullScore";

type ScoreboardState = {
  matchTitle: string;
  leftName: string;
  leftShort: string;
  rightName: string;
  rightShort: string;
  leftScore: number;
  rightScore: number;
  timer: string;
  phase: string;
};

const boardKinds: Array<{
  id: BoardKind;
  name: string;
  description: string;
}> = [
  {
    id: "tile",
    name: "1번 타일형",
    description: "시간 박스와 양 팀 컬러 타일이 붙는 구조. 로고모드와 점수모드 지원"
  },
  {
    id: "center",
    name: "2번 중앙바",
    description: "중앙 점수/시간을 기준으로 좌우 팀명이 펼쳐지는 구조. 약칭/풀네임 지원"
  },
  {
    id: "compact",
    name: "3번 컴팩트",
    description: "로고와 점수를 섞는 얇은 국제대회형 바. 세 가지 표시 모드 지원"
  },
  {
    id: "stacked",
    name: "상하 팀형",
    description: "팀 정보를 위아래로 쌓는 게임 HUD형 구조. 로고+약칭 또는 풀네임 지원"
  },
  {
    id: "fighter",
    name: "상단 대전형",
    description: "격투게임처럼 화면 위쪽에 길게 얹는 대칭형 스코어보드"
  }
];

const modeOptions: Record<BoardKind, Array<{ id: DisplayMode; label: string }>> = {
  tile: [
    { id: "logo", label: "로고모드" },
    { id: "score", label: "점수모드" }
  ],
  center: [
    { id: "short", label: "약칭모드" },
    { id: "full", label: "풀네임모드" }
  ],
  compact: [
    { id: "logoScore", label: "로고점수" },
    { id: "logoShortScore", label: "로고약칭점수" },
    { id: "logoFullScore", label: "로고풀네임점수" }
  ],
  stacked: [
    { id: "short", label: "로고약칭" },
    { id: "full", label: "로고풀네임" }
  ],
  fighter: [{ id: "full", label: "상단바" }]
};

const defaultModeByKind: Record<BoardKind, DisplayMode> = {
  tile: "score",
  center: "short",
  compact: "logoShortScore",
  stacked: "short",
  fighter: "full"
};

const defaultState: ScoreboardState = {
  matchTitle: "Grand Finals",
  leftName: "THY Chikurin",
  leftShort: "THY",
  rightName: "UYU Double",
  rightShort: "UYU",
  leftScore: 0,
  rightScore: 1,
  timer: "45:00",
  phase: "LIVE"
};

export default function ScoreboardPage() {
  const [boardKind, setBoardKind] = useState<BoardKind>("tile");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(defaultModeByKind.tile);
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(defaultState);
  const selectedBoard = useMemo(
    () => boardKinds.find((board) => board.id === boardKind) ?? boardKinds[0],
    [boardKind]
  );
  const modes = modeOptions[boardKind];

  const selectBoard = (nextKind: BoardKind) => {
    setBoardKind(nextKind);
    setDisplayMode(defaultModeByKind[nextKind]);
  };

  const updateField = <Key extends keyof ScoreboardState>(key: Key, value: ScoreboardState[Key]) => {
    setScoreboard((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6 2xl:px-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">방송 오버레이</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink sm:text-4xl">
            스코어보드
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            사진의 원본을 그대로 복제하지 않고, 방송 스코어보드의 구조만 가져와 선택형으로 정리했습니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-black uppercase tracking-wide text-cyan">
          <Radio className="h-4 w-4" aria-hidden="true" />
          {selectedBoard.name}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[430px_1fr]">
        <aside className="space-y-5">
          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">스코어보드 종류</h2>
            </div>

            <div className="grid gap-3">
              {boardKinds.map((board) => {
                const active = boardKind === board.id;

                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => selectBoard(board.id)}
                    className={`grid grid-cols-[92px_1fr] items-center gap-3 rounded-md border p-3 text-left transition ${
                      active
                        ? "border-cyan bg-cyan/10 shadow-glow"
                        : "border-line bg-field hover:border-cyan/70 hover:bg-panel"
                    }`}
                  >
                    <BoardThumb kind={board.id} active={active} />
                    <span className="min-w-0">
                      <span className="block text-sm font-black uppercase tracking-wide text-ink">
                        {board.name}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">{board.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-lime" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">표시 모드</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setDisplayMode(mode.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-black uppercase tracking-wide transition ${
                    displayMode === mode.id
                      ? "border-cyan bg-cyan text-arena"
                      : "border-line bg-field text-muted hover:border-cyan hover:text-cyan"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-gold" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">컨트롤</h2>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">경기명</span>
                <input
                  className="input"
                  value={scoreboard.matchTitle}
                  onChange={(event) => updateField("matchTitle", event.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="왼쪽 풀네임"
                  value={scoreboard.leftName}
                  onChange={(value) => updateField("leftName", value)}
                />
                <TextField
                  label="오른쪽 풀네임"
                  value={scoreboard.rightName}
                  onChange={(value) => updateField("rightName", value)}
                />
                <TextField
                  label="왼쪽 약칭"
                  value={scoreboard.leftShort}
                  onChange={(value) => updateField("leftShort", value.toUpperCase().slice(0, 5))}
                />
                <TextField
                  label="오른쪽 약칭"
                  value={scoreboard.rightShort}
                  onChange={(value) => updateField("rightShort", value.toUpperCase().slice(0, 5))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="왼쪽 점수"
                  value={scoreboard.leftScore}
                  onChange={(value) => updateField("leftScore", value)}
                />
                <NumberField
                  label="오른쪽 점수"
                  value={scoreboard.rightScore}
                  onChange={(value) => updateField("rightScore", value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="시간"
                  value={scoreboard.timer}
                  onChange={(value) => updateField("timer", value)}
                />
                <TextField
                  label="상태"
                  value={scoreboard.phase}
                  onChange={(value) => updateField("phase", value)}
                />
              </div>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">OBS 화면</h2>
            </div>
            <div className="rounded-md border border-dashed border-line bg-field p-4 text-sm leading-6 text-muted">
              지금은 구조와 모드 선택 단계입니다. 이후 오버레이 전용 URL을 만들면 OBS 브라우저 소스로 바로
              분리할 수 있습니다.
            </div>
          </div>
        </aside>

        <div className="arena-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/80 px-5 py-4">
            <div>
              <p className="section-kicker">미리보기</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-ink">{selectedBoard.name}</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs font-black uppercase tracking-wide text-muted">
              <Eye className="h-4 w-4" aria-hidden="true" />
              {modes.find((mode) => mode.id === displayMode)?.label}
            </div>
          </div>

          <div className="grid min-h-[620px] place-items-center bg-[radial-gradient(circle_at_50%_28%,rgba(47,230,255,0.12),transparent_32%),hsl(var(--arena))] p-4 sm:p-6">
            <div className="relative grid aspect-video w-full max-w-6xl place-items-center overflow-hidden rounded-md border border-line bg-[#06110f] p-6 shadow-panel">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(130,255,49,0.12),transparent_38%),linear-gradient(315deg,rgba(47,230,255,0.1),transparent_32%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-70" />
              <ScoreboardPreview kind={boardKind} mode={displayMode} scoreboard={scoreboard} />
            </div>
          </div>
        </div>
      </section>
    </main>
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

function BoardThumb({ kind, active }: { kind: BoardKind; active: boolean }) {
  return (
    <span
      className={`relative block h-14 overflow-hidden rounded border ${
        active ? "border-cyan bg-arena" : "border-line bg-arena/80"
      }`}
    >
      {kind === "tile" ? (
        <span className="absolute inset-2 grid grid-cols-[28px_1fr_1fr] text-[9px] font-black">
          <span className="grid place-items-center bg-zinc-200 text-zinc-900">45</span>
          <span className="grid place-items-center bg-blue-600 text-white">A</span>
          <span className="grid place-items-center bg-red-600 text-white">B</span>
        </span>
      ) : null}
      {kind === "center" ? (
        <span className="absolute inset-x-1 top-4 grid grid-cols-[1fr_42px_1fr] text-[9px] font-black">
          <span className="bg-purple-950 px-1 py-1 text-white">AAA</span>
          <span className="bg-lime px-1 py-1 text-center text-purple-950">0-1</span>
          <span className="bg-purple-950 px-1 py-1 text-right text-white">BBB</span>
        </span>
      ) : null}
      {kind === "compact" ? (
        <span className="absolute inset-x-2 top-5 flex overflow-hidden text-[9px] font-black">
          <span className="bg-black px-2 py-1 text-white">A</span>
          <span className="bg-gold px-2 py-1 text-arena">7:1</span>
          <span className="bg-black px-2 py-1 text-white">B</span>
        </span>
      ) : null}
      {kind === "stacked" ? (
        <span className="absolute inset-2 grid grid-rows-2 overflow-hidden rounded-sm text-[9px] font-black">
          <span className="grid grid-cols-[22px_1fr_24px] bg-cyan/25 text-white">
            <b className="bg-cyan" />
            <b className="px-1 py-1">A</b>
            <b className="py-1 text-center">1</b>
          </span>
          <span className="grid grid-cols-[22px_1fr_24px] bg-red-500/25 text-white">
            <b className="bg-red-500" />
            <b className="px-1 py-1">B</b>
            <b className="py-1 text-center">3</b>
          </span>
        </span>
      ) : null}
      {kind === "fighter" ? (
        <span className="absolute inset-x-2 top-3 grid grid-cols-[1fr_36px_1fr] text-[9px] font-black">
          <span className="bg-red-600 px-1 py-2 text-white">P1</span>
          <span className="bg-white py-2 text-center text-slate-950">25</span>
          <span className="bg-blue-600 px-1 py-2 text-right text-white">P2</span>
        </span>
      ) : null}
    </span>
  );
}

function ScoreboardPreview({
  kind,
  mode,
  scoreboard
}: {
  kind: BoardKind;
  mode: DisplayMode;
  scoreboard: ScoreboardState;
}) {
  if (kind === "center") return <CenterBarBoard mode={mode} scoreboard={scoreboard} />;
  if (kind === "compact") return <CompactBoard mode={mode} scoreboard={scoreboard} />;
  if (kind === "stacked") return <StackedBoard mode={mode} scoreboard={scoreboard} />;
  if (kind === "fighter") return <FighterBoard scoreboard={scoreboard} />;
  return <TileBoard mode={mode} scoreboard={scoreboard} />;
}

function TileBoard({ mode, scoreboard }: { mode: DisplayMode; scoreboard: ScoreboardState }) {
  const scoreMode = mode === "score";

  return (
    <div className="relative z-10 flex items-start drop-shadow-[0_18px_22px_rgba(0,0,0,0.38)]">
      <div className="grid grid-rows-[54px_94px]">
        <div className="grid place-items-center bg-zinc-900 px-5 text-3xl font-black tabular-nums text-white">
          {scoreboard.timer}
        </div>
        <div className="grid place-items-center bg-zinc-100 px-5">
          <PlayerSilhouette />
        </div>
      </div>
      <TileTeam
        color="bg-blue-700"
        accent="bg-cyan"
        label={scoreMode ? scoreboard.leftShort : scoreboard.leftName}
        score={scoreboard.leftScore}
        showScore={scoreMode}
      />
      <TileTeam
        color="bg-red-600"
        accent="bg-lime"
        label={scoreMode ? scoreboard.rightShort : scoreboard.rightName}
        score={scoreboard.rightScore}
        showScore={scoreMode}
      />
    </div>
  );
}

function TileTeam({
  color,
  accent,
  label,
  score,
  showScore
}: {
  color: string;
  accent: string;
  label: string;
  score: number;
  showScore: boolean;
}) {
  return (
    <div className={`grid w-36 grid-rows-[54px_94px_12px] ${color}`}>
      <div className="grid place-items-center px-3 text-2xl font-black uppercase text-white">{label}</div>
      <div className="grid place-items-center px-3">
        {showScore ? (
          <span className="text-7xl font-black text-white">{score}</span>
        ) : (
          <LogoDisc label={label} />
        )}
      </div>
      <div className={accent} />
    </div>
  );
}

function CenterBarBoard({ mode, scoreboard }: { mode: DisplayMode; scoreboard: ScoreboardState }) {
  const leftLabel = mode === "full" ? scoreboard.leftName : scoreboard.leftShort;
  const rightLabel = mode === "full" ? scoreboard.rightName : scoreboard.rightShort;

  return (
    <div className="relative z-10 w-full max-w-4xl">
      <div className="mx-auto mb-[-22px] grid h-28 w-28 place-items-center rounded-full border-4 border-white/15 bg-black/40 text-3xl font-black text-white">
        BA
      </div>
      <div className="grid grid-cols-[1fr_240px_1fr] items-stretch shadow-[0_18px_28px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-end border-l-[12px] border-red-600 bg-purple-950 px-10 text-5xl font-black uppercase text-white">
          {leftLabel}
        </div>
        <div>
          <div className="grid min-h-28 place-items-center bg-lime text-6xl font-black text-purple-950">
            {scoreboard.leftScore} - {scoreboard.rightScore}
          </div>
          <div className="grid place-items-center bg-white px-6 py-4 text-5xl font-black text-purple-950">
            {scoreboard.timer}
          </div>
        </div>
        <div className="flex items-center border-r-[12px] border-gold bg-purple-950 px-10 text-5xl font-black uppercase text-white">
          {rightLabel}
        </div>
      </div>
    </div>
  );
}

function CompactBoard({ mode, scoreboard }: { mode: DisplayMode; scoreboard: ScoreboardState }) {
  const leftText = mode === "logoScore" ? "" : mode === "logoFullScore" ? scoreboard.leftName : scoreboard.leftShort;
  const rightText = mode === "logoScore" ? "" : mode === "logoFullScore" ? scoreboard.rightName : scoreboard.rightShort;

  return (
    <div className="relative z-10 w-full max-w-4xl">
      <div className="mx-auto grid w-full grid-cols-[1fr_170px_1fr] items-center overflow-hidden rounded-md border border-white/30 bg-black text-white shadow-[0_18px_30px_rgba(0,0,0,0.45)]">
        <CompactTeam side="left" label={leftText} short={scoreboard.leftShort} />
        <div className="grid grid-rows-[auto_auto] bg-zinc-100 text-zinc-950">
          <div className="grid place-items-center bg-gold px-4 py-3 text-4xl font-black">
            {scoreboard.leftScore}:{scoreboard.rightScore}
          </div>
          <div className="grid place-items-center bg-zinc-950 px-4 py-2 text-xl font-black text-white">
            {scoreboard.timer}
          </div>
        </div>
        <CompactTeam side="right" label={rightText} short={scoreboard.rightShort} />
      </div>
      <div className="mx-auto mt-3 w-fit rounded-full bg-black px-4 py-1 text-xs font-black uppercase tracking-[0.18em] text-white">
        {scoreboard.matchTitle}
      </div>
    </div>
  );
}

function CompactTeam({
  side,
  label,
  short
}: {
  side: "left" | "right";
  label: string;
  short: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-4 px-5 py-4 ${side === "right" ? "justify-end" : ""}`}>
      {side === "left" ? <FlagPill label={short} /> : null}
      {label ? <span className="truncate text-3xl font-black uppercase">{label}</span> : null}
      {side === "right" ? <FlagPill label={short} /> : null}
    </div>
  );
}

function StackedBoard({ mode, scoreboard }: { mode: DisplayMode; scoreboard: ScoreboardState }) {
  return (
    <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-md border border-white/10 bg-black/75 shadow-[0_22px_42px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="grid grid-cols-[150px_1fr_120px_150px] border-b border-white/10 bg-black/60 text-center text-2xl font-black text-white">
        <div className="grid place-items-center bg-orange-600">BA</div>
        <div className="grid place-items-center">{scoreboard.timer}</div>
        <div className="grid place-items-center">K</div>
        <div className="grid place-items-center">NET</div>
      </div>
      <StackedTeam
        color="cyan"
        label={mode === "full" ? scoreboard.leftName : scoreboard.leftShort}
        subLabel={mode === "full" ? scoreboard.leftShort : scoreboard.leftName}
        score={scoreboard.leftScore}
      />
      <StackedTeam
        color="red"
        label={mode === "full" ? scoreboard.rightName : scoreboard.rightShort}
        subLabel={mode === "full" ? scoreboard.rightShort : scoreboard.rightName}
        score={scoreboard.rightScore}
      />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-black/65 px-8 py-5">
        <DotTrack side="left" />
        <div className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-zinc-900 text-3xl font-black text-white">
          BA
        </div>
        <DotTrack side="right" />
      </div>
    </div>
  );
}

function StackedTeam({
  color,
  label,
  subLabel,
  score
}: {
  color: "cyan" | "red";
  label: string;
  subLabel: string;
  score: number;
}) {
  const colorClass =
    color === "cyan"
      ? "border-cyan bg-cyan/15 text-cyan"
      : "border-red-500 bg-red-500/15 text-red-200";

  return (
    <div className={`grid grid-cols-[110px_1fr_110px_110px] items-center border-l-8 ${colorClass}`}>
      <div className="grid place-items-center px-4 py-5">
        <LogoDisc label={label} />
      </div>
      <div className="min-w-0 px-4 py-5">
        <div className="truncate text-5xl font-black uppercase text-white">{label}</div>
        <div className="mt-1 truncate text-xl font-black uppercase text-current">{subLabel}</div>
      </div>
      <div className="grid place-items-center border-l border-white/10 py-5 text-5xl font-black text-white">
        {score}
      </div>
      <div className="grid place-items-center border-l border-white/10 py-5 text-3xl font-black text-white/80">
        {score * 13 || 13}
      </div>
    </div>
  );
}

function FighterBoard({ scoreboard }: { scoreboard: ScoreboardState }) {
  return (
    <div className="absolute left-10 right-10 top-8 z-10">
      <div className="grid grid-cols-[1fr_130px_1fr] items-start">
        <FighterSide side="left" name={scoreboard.leftName} short={scoreboard.leftShort} score={scoreboard.leftScore} />
        <div className="grid place-items-center">
          <div className="grid h-28 w-36 place-items-center bg-white/95 text-7xl font-black italic text-zinc-950 [clip-path:polygon(15%_0,85%_0,100%_100%,0_100%)]">
            25
          </div>
          <div className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-white">{scoreboard.matchTitle}</div>
        </div>
        <FighterSide side="right" name={scoreboard.rightName} short={scoreboard.rightShort} score={scoreboard.rightScore} />
      </div>
    </div>
  );
}

function FighterSide({
  side,
  name,
  short,
  score
}: {
  side: "left" | "right";
  name: string;
  short: string;
  score: number;
}) {
  return (
    <div className={`relative ${side === "right" ? "text-right" : ""}`}>
      <div
        className={`grid grid-cols-[90px_1fr_70px] items-center bg-gradient-to-r ${
          side === "left" ? "from-red-700 to-zinc-950" : "from-zinc-950 to-blue-700"
        } px-4 py-3 text-white shadow-[0_12px_22px_rgba(0,0,0,0.45)]`}
      >
        {side === "left" ? <LogoDisc label={short} /> : <div className="text-4xl font-black">{score}</div>}
        <div className="min-w-0">
          <div className="truncate text-xl font-black uppercase tracking-wide">{name}</div>
          <div className="mt-1 h-2 bg-gradient-to-r from-fuchsia-500 via-cyan to-transparent" />
        </div>
        {side === "left" ? <div className="text-4xl font-black">{score}</div> : <LogoDisc label={short} />}
      </div>
      <div className={`mt-2 text-sm font-black uppercase tracking-[0.22em] text-white/80 ${side === "right" ? "pr-4" : "pl-4"}`}>
        {short}
      </div>
    </div>
  );
}

function PlayerSilhouette() {
  return (
    <div className="relative h-14 w-16 text-zinc-900">
      <div className="absolute left-5 top-1 h-4 w-4 rounded-full bg-current" />
      <div className="absolute left-6 top-5 h-7 w-3 rotate-12 bg-current" />
      <div className="absolute left-1 top-7 h-3 w-9 -rotate-12 bg-current" />
      <div className="absolute left-7 top-11 h-3 w-10 rotate-12 bg-current" />
      <div className="absolute right-0 top-8 h-3 w-3 rounded-full bg-current" />
    </div>
  );
}

function LogoDisc({ label }: { label: string }) {
  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-white bg-black/40 text-lg font-black uppercase text-white shadow-[inset_0_0_0_3px_rgba(255,255,255,0.15)]">
      {label.trim().slice(0, 2) || "T"}
    </span>
  );
}

function FlagPill({ label }: { label: string }) {
  return (
    <span className="grid min-h-12 min-w-20 place-items-center rounded-sm bg-gradient-to-r from-red-600 via-white to-green-600 px-3 text-lg font-black uppercase text-zinc-950">
      {label}
    </span>
  );
}

function DotTrack({ side }: { side: "left" | "right" }) {
  return (
    <div className={`flex gap-3 ${side === "right" ? "justify-start" : "justify-end"}`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`h-12 w-12 rounded-full border border-white/10 ${
            index === 2 ? "bg-lime" : "bg-black"
          }`}
        />
      ))}
    </div>
  );
}
