"use client";

import { useMemo, useState } from "react";
import { Eye, ListOrdered, MonitorPlay, PanelTop, Settings2 } from "lucide-react";

type OverlayLayout = "corner" | "ranking" | "topbar";
type NameMode = "short" | "full";

type ScoreboardState = {
  leftName: string;
  leftShort: string;
  rightName: string;
  rightShort: string;
  leftScore: number;
  rightScore: number;
  timer: string;
  title: string;
};

type RankingTeam = {
  short: string;
  name: string;
  points: number;
};

const overlayLayouts: Array<{
  id: OverlayLayout;
  name: string;
  description: string;
}> = [
  {
    id: "corner",
    name: "좌상단 박스",
    description: "작은 경기 스코어를 화면 왼쪽 위에 고정하는 형태"
  },
  {
    id: "ranking",
    name: "세로 순위표",
    description: "타이머와 팀 순위를 길게 보여주는 형태"
  },
  {
    id: "topbar",
    name: "상단 전체 바",
    description: "화면 상단 전체를 쓰는 양 팀 대칭 스코어바"
  }
];

const defaultScoreboard: ScoreboardState = {
  leftName: "DRX",
  leftShort: "DRX",
  rightName: "Gen.G",
  rightShort: "GEN",
  leftScore: 0,
  rightScore: 0,
  timer: "11:38:39",
  title: "GAME"
};

const rankingTeams: RankingTeam[] = [
  { short: "DRX", name: "DRX", points: 0 },
  { short: "T1", name: "T1", points: 0 },
  { short: "BRO", name: "BRION", points: 0 },
  { short: "GEN", name: "Gen.G", points: 0 },
  { short: "KT", name: "KT Rolster", points: 0 },
  { short: "KDF", name: "Kwangdong Freecs", points: 0 },
  { short: "DWG", name: "Dplus KIA", points: 0 },
  { short: "LSB", name: "Liiv Sandbox", points: 0 },
  { short: "BFX", name: "BNK FEARX", points: 0 },
  { short: "AF", name: "Afreeca Freecs", points: 0 },
  { short: "NS", name: "Nongshim RedForce", points: 0 },
  { short: "GRF", name: "Griffin", points: 0 },
  { short: "DNF", name: "DN Freecs", points: 0 },
  { short: "DK", name: "Dplus KIA", points: 0 },
  { short: "FN", name: "Fearless Nation", points: 0 },
  { short: "HLE", name: "Hanwha Life", points: 0 }
];

export default function ScoreboardPage() {
  const [layout, setLayout] = useState<OverlayLayout>("corner");
  const [nameMode, setNameMode] = useState<NameMode>("short");
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(defaultScoreboard);
  const selectedLayout = useMemo(
    () => overlayLayouts.find((item) => item.id === layout) ?? overlayLayouts[0],
    [layout]
  );

  const updateField = <Key extends keyof ScoreboardState>(key: Key, value: ScoreboardState[Key]) => {
    setScoreboard((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6 2xl:px-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">OBS 오버레이</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink sm:text-4xl">
            스코어보드
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            OBS 위에 얹는 실전형 오버레이입니다. 타이머, 점수, 약칭/풀네임 표시를 바로 바꿀 수 있습니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-black uppercase tracking-wide text-cyan">
          <MonitorPlay className="h-4 w-4" aria-hidden="true" />
          {selectedLayout.name}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <aside className="space-y-5">
          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <PanelTop className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">형태</h2>
            </div>

            <div className="grid gap-3">
              {overlayLayouts.map((item) => {
                const active = layout === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLayout(item.id)}
                    className={`grid grid-cols-[92px_1fr] items-center gap-3 rounded-md border p-3 text-left transition ${
                      active
                        ? "border-cyan bg-cyan/10 shadow-glow"
                        : "border-line bg-field hover:border-cyan/70 hover:bg-panel"
                    }`}
                  >
                    <LayoutThumb layout={item.id} active={active} />
                    <span className="min-w-0">
                      <span className="block text-sm font-black uppercase tracking-wide text-ink">
                        {item.name}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-lime" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">팀명 표시</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "short" as const, label: "약칭" },
                { id: "full" as const, label: "풀네임" }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setNameMode(mode.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-black uppercase tracking-wide transition ${
                    nameMode === mode.id
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
              <TextField label="상단 제목" value={scoreboard.title} onChange={(value) => updateField("title", value)} />

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

              <TextField label="타이머" value={scoreboard.timer} onChange={(value) => updateField("timer", value)} />
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">순위표 안내</h2>
            </div>
            <div className="rounded-md border border-dashed border-line bg-field p-4 text-sm leading-6 text-muted">
              세로 순위표는 현재 예시 팀 리스트로 표시됩니다. 이후 팀 관리 데이터와 연결해서 실제 팀 목록을
              불러오면 됩니다.
            </div>
          </div>
        </aside>

        <div className="arena-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/80 px-5 py-4">
            <div>
              <p className="section-kicker">미리보기</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-ink">{selectedLayout.name}</h2>
            </div>
            <div className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-black uppercase tracking-wide text-muted">
              {nameMode === "short" ? "약칭" : "풀네임"}
            </div>
          </div>

          <div className="grid min-h-[620px] place-items-center bg-[radial-gradient(circle_at_50%_28%,rgba(47,230,255,0.1),transparent_34%),hsl(var(--arena))] p-4 sm:p-6">
            <div className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-md border border-line bg-[#111318] shadow-panel">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_24%,rgba(255,255,255,0.08),transparent_18%)]" />
              <ScoreboardOverlay
                layout={layout}
                nameMode={nameMode}
                scoreboard={scoreboard}
                rankingTeams={rankingTeams}
              />
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

function LayoutThumb({ layout, active }: { layout: OverlayLayout; active: boolean }) {
  return (
    <span
      className={`relative block h-14 overflow-hidden rounded border ${
        active ? "border-cyan bg-arena" : "border-line bg-arena/80"
      }`}
    >
      {layout === "corner" ? (
        <span className="absolute left-1 top-1 grid w-20 grid-cols-[1fr_20px] text-[9px] font-black">
          <span className="col-span-2 bg-white text-center text-slate-950">11:38</span>
          <span className="bg-slate-950 px-1 py-1 text-white">DRX</span>
          <span className="bg-white py-1 text-center text-slate-950">0</span>
          <span className="bg-slate-950 px-1 py-1 text-white">GEN</span>
          <span className="bg-white py-1 text-center text-slate-950">0</span>
        </span>
      ) : null}
      {layout === "ranking" ? (
        <span className="absolute inset-1 grid grid-rows-[12px_1fr] text-[8px] font-black">
          <span className="bg-white text-center text-slate-950">01:37</span>
          <span className="grid grid-cols-[16px_1fr_16px] bg-slate-950 text-white">
            <b className="bg-white text-center text-slate-950">1</b>
            <b className="px-1">DRX</b>
            <b className="bg-white text-center text-slate-950">0</b>
          </span>
        </span>
      ) : null}
      {layout === "topbar" ? (
        <span className="absolute inset-x-1 top-2 grid grid-cols-[20px_1fr_42px_1fr_20px] text-[8px] font-black">
          <span className="bg-white text-center text-slate-950">0</span>
          <span className="bg-slate-950 px-1 text-white">DRX</span>
          <span className="bg-white text-center text-slate-950">11:38</span>
          <span className="bg-slate-950 px-1 text-right text-white">GEN</span>
          <span className="bg-white text-center text-slate-950">0</span>
        </span>
      ) : null}
    </span>
  );
}

function ScoreboardOverlay({
  layout,
  nameMode,
  scoreboard,
  rankingTeams
}: {
  layout: OverlayLayout;
  nameMode: NameMode;
  scoreboard: ScoreboardState;
  rankingTeams: RankingTeam[];
}) {
  if (layout === "ranking") {
    return <RankingOverlay nameMode={nameMode} scoreboard={scoreboard} teams={rankingTeams} />;
  }
  if (layout === "topbar") {
    return <TopBarOverlay nameMode={nameMode} scoreboard={scoreboard} />;
  }
  return <CornerOverlay nameMode={nameMode} scoreboard={scoreboard} />;
}

function CornerOverlay({ nameMode, scoreboard }: { nameMode: NameMode; scoreboard: ScoreboardState }) {
  return (
    <div className="absolute left-0 top-0 w-[285px] border-l-4 border-blue-600 bg-[#07111f] shadow-[0_12px_24px_rgba(0,0,0,0.45)]">
      <div className="grid grid-cols-[1fr_74px] bg-white text-slate-950">
        <div className="px-2 py-1 text-2xl font-black tabular-nums leading-none">{scoreboard.timer}</div>
        <div className="border-l border-slate-300 px-2 py-1 text-right text-lg font-black uppercase leading-none">
          {scoreboard.title}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_42px]">
        <CornerTeamRow
          color="border-l-blue-500"
          label={teamLabel(scoreboard.leftName, scoreboard.leftShort, nameMode)}
          logoLabel={scoreboard.leftShort}
          score={scoreboard.leftScore}
        />
        <CornerTeamRow
          color="border-l-red-500"
          label={teamLabel(scoreboard.rightName, scoreboard.rightShort, nameMode)}
          logoLabel={scoreboard.rightShort}
          score={scoreboard.rightScore}
        />
      </div>
    </div>
  );
}

function CornerTeamRow({
  color,
  label,
  logoLabel,
  score
}: {
  color: string;
  label: string;
  logoLabel: string;
  score: number;
}) {
  return (
    <>
      <div className={`flex min-w-0 items-center gap-2 border-l-4 ${color} bg-[#07111f] px-3 py-2`}>
        <LogoBox label={logoLabel} size="sm" />
        <span className="truncate text-3xl font-black uppercase leading-none text-white">{label}</span>
      </div>
      <div className="grid place-items-center bg-white text-3xl font-black leading-none text-slate-950">
        {score}
      </div>
    </>
  );
}

function RankingOverlay({
  nameMode,
  scoreboard,
  teams
}: {
  nameMode: NameMode;
  scoreboard: ScoreboardState;
  teams: RankingTeam[];
}) {
  return (
    <div className="absolute left-0 top-0 w-[230px] bg-[#07111f] shadow-[0_12px_24px_rgba(0,0,0,0.45)]">
      <div className="bg-[#07111f] px-3 py-2 text-center text-4xl font-black tabular-nums text-white">
        {scoreboard.timer}
      </div>
      <div className="grid grid-cols-[38px_1fr_42px] bg-white text-sm font-black uppercase tracking-wide text-slate-950">
        <span className="px-1 py-1">Pl.</span>
        <span className="px-1 py-1">Team</span>
        <span className="px-1 py-1 text-center">Pts.</span>
      </div>
      <div>
        {teams.map((team, index) => (
          <div key={`${team.short}-${index}`} className="grid grid-cols-[38px_1fr_42px] text-white">
            <div
              className="grid place-items-center border-l-4 bg-[#07111f] text-2xl font-black"
              style={{ borderColor: rankingAccent(index) }}
            >
              {index + 1}
            </div>
            <div className="flex min-w-0 items-center gap-2 px-2 py-1.5">
              <LogoBox label={team.short} size="xs" />
              <span className="truncate text-2xl font-black uppercase leading-none">
                {nameMode === "short" ? team.short : team.name}
              </span>
            </div>
            <div className="grid place-items-center bg-white text-2xl font-black text-slate-950">
              {team.points}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopBarOverlay({ nameMode, scoreboard }: { nameMode: NameMode; scoreboard: ScoreboardState }) {
  const leftLabel = teamLabel(scoreboard.leftName, scoreboard.leftShort, nameMode);
  const rightLabel = teamLabel(scoreboard.rightName, scoreboard.rightShort, nameMode);

  return (
    <div className="absolute left-0 right-0 top-0 grid h-12 grid-cols-[72px_1fr_112px_1fr_72px] items-stretch bg-[#07111f] shadow-[0_12px_22px_rgba(0,0,0,0.42)]">
      <ScoreBox score={scoreboard.leftScore} accent="border-l-blue-500" />
      <div className="flex min-w-0 items-center gap-3 border-l border-white/35 px-5">
        <LogoBox label={scoreboard.leftShort} size="sm" />
        <span className="truncate text-3xl font-black uppercase leading-none text-white">{leftLabel}</span>
      </div>
      <div className="grid place-items-center bg-white text-2xl font-black tabular-nums text-slate-950">
        {scoreboard.timer}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-3 border-r border-white/35 px-5">
        <span className="truncate text-3xl font-black uppercase leading-none text-white">{rightLabel}</span>
        <LogoBox label={scoreboard.rightShort} size="sm" />
      </div>
      <ScoreBox score={scoreboard.rightScore} accent="border-r-red-500" />
    </div>
  );
}

function ScoreBox({ score, accent }: { score: number; accent: string }) {
  return (
    <div className={`grid place-items-center border-4 border-y-0 border-white bg-white text-4xl font-black text-slate-950 ${accent}`}>
      {score}
    </div>
  );
}

function LogoBox({ label, size }: { label: string; size: "xs" | "sm" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-sm border border-white/20 bg-white/10 font-black uppercase text-white ${
        size === "xs" ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-xs"
      }`}
    >
      {label.slice(0, 2)}
    </span>
  );
}

function teamLabel(fullName: string, shortName: string, mode: NameMode) {
  return mode === "short" ? shortName : fullName;
}

function rankingAccent(index: number) {
  const colors = [
    "#ffffff",
    "#ef4444",
    "#22c55e",
    "#facc15",
    "#e879f9",
    "#2dd4bf",
    "#fb923c",
    "#94a3b8"
  ];
  return colors[index % colors.length];
}
