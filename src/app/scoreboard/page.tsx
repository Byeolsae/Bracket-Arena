"use client";

import { useMemo, useState } from "react";
import { Eye, MonitorPlay, Palette, Radio, Settings2 } from "lucide-react";

type ScoreboardStyle = "esports" | "football" | "baseball" | "mini" | "lowerThird" | "lineup";

type ScoreboardState = {
  matchTitle: string;
  leftName: string;
  rightName: string;
  leftScore: number;
  rightScore: number;
  period: string;
  timer: string;
  note: string;
};

const scoreboardStyles: Array<{
  id: ScoreboardStyle;
  name: string;
  description: string;
}> = [
  {
    id: "esports",
    name: "E스포츠 중앙형",
    description: "양쪽 팀 컬러와 중앙 점수가 강하게 보이는 방송용 기본형"
  },
  {
    id: "football",
    name: "축구 상단바",
    description: "타이머와 팀명이 한 줄에 정리되는 월드컵 스타일"
  },
  {
    id: "baseball",
    name: "야구 정보형",
    description: "이닝, 아웃, 카운트, 베이스 상태까지 담는 박스형"
  },
  {
    id: "mini",
    name: "미니 바",
    description: "화면 상단에 작게 올리기 좋은 얇은 스코어바"
  },
  {
    id: "lowerThird",
    name: "하단 자막형",
    description: "하단 배너처럼 팀명과 점수를 크게 보여주는 스타일"
  },
  {
    id: "lineup",
    name: "라인업 박스형",
    description: "선수명, 상황 정보, 큰 점수판을 함께 보여주는 정보 패널형"
  }
];

const defaultState: ScoreboardState = {
  matchTitle: "Grand Final",
  leftName: "TEAM A",
  rightName: "TEAM B",
  leftScore: 5,
  rightScore: 2,
  period: "1st",
  timer: "00:00",
  note: "LIVE"
};

export default function ScoreboardPage() {
  const [selectedStyle, setSelectedStyle] = useState<ScoreboardStyle>("esports");
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(defaultState);
  const selectedStyleName = useMemo(
    () => scoreboardStyles.find((style) => style.id === selectedStyle)?.name ?? "스코어보드",
    [selectedStyle]
  );

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
            방송 화면에 맞는 스코어보드 스타일을 고르고, 점수와 경기 정보를 미리 확인합니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-black uppercase tracking-wide text-cyan">
          <Radio className="h-4 w-4" aria-hidden="true" />
          {selectedStyleName}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <aside className="space-y-5">
          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">스타일 선택</h2>
            </div>

            <div className="grid gap-3">
              {scoreboardStyles.map((style) => {
                const active = selectedStyle === style.id;

                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`grid grid-cols-[88px_1fr] items-center gap-3 rounded-md border p-3 text-left transition ${
                      active
                        ? "border-cyan bg-cyan/10 shadow-glow"
                        : "border-line bg-field hover:border-cyan/70 hover:bg-panel"
                    }`}
                  >
                    <StyleThumbnail styleId={style.id} active={active} />
                    <span className="min-w-0">
                      <span className="block text-sm font-black uppercase tracking-wide text-ink">
                        {style.name}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">{style.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-lime" aria-hidden="true" />
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
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">왼쪽 팀</span>
                  <input
                    className="input"
                    value={scoreboard.leftName}
                    onChange={(event) => updateField("leftName", event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">오른쪽 팀</span>
                  <input
                    className="input"
                    value={scoreboard.rightName}
                    onChange={(event) => updateField("rightName", event.target.value)}
                  />
                </label>
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

              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">단계</span>
                  <input
                    className="input"
                    value={scoreboard.period}
                    onChange={(event) => updateField("period", event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">시간</span>
                  <input
                    className="input"
                    value={scoreboard.timer}
                    onChange={(event) => updateField("timer", event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">상태</span>
                  <input
                    className="input"
                    value={scoreboard.note}
                    onChange={(event) => updateField("note", event.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-gold" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">OBS 화면</h2>
            </div>
            <div className="rounded-md border border-dashed border-line bg-field p-4 text-sm leading-6 text-muted">
              현재는 스타일 선택과 미리보기 단계입니다. 다음 단계에서 오버레이 전용 URL과 투명 배경 표시를
              분리할 수 있습니다.
            </div>
          </div>
        </aside>

        <div className="arena-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-arena/80 px-5 py-4">
            <div>
              <p className="section-kicker">미리보기</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-ink">{selectedStyleName}</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs font-black uppercase tracking-wide text-muted">
              <Eye className="h-4 w-4" aria-hidden="true" />
              16:9 Preview
            </div>
          </div>

          <div className="grid min-h-[620px] place-items-center bg-[radial-gradient(circle_at_50%_28%,rgba(47,230,255,0.12),transparent_32%),hsl(var(--arena))] p-4 sm:p-6">
            <div className="relative grid aspect-video w-full max-w-6xl place-items-center overflow-hidden rounded-md border border-line bg-[#05070c] p-6 shadow-panel">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
              <ScoreboardPreview styleId={selectedStyle} scoreboard={scoreboard} />
            </div>
          </div>
        </div>
      </section>
    </main>
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

function StyleThumbnail({ styleId, active }: { styleId: ScoreboardStyle; active: boolean }) {
  return (
    <span
      className={`relative block h-14 overflow-hidden rounded border ${
        active ? "border-cyan bg-arena" : "border-line bg-arena/80"
      }`}
    >
      {styleId === "esports" ? (
        <span className="absolute inset-x-2 top-4 grid grid-cols-[1fr_34px_34px_1fr] text-[10px] font-black text-white">
          <span className="bg-lime/80 px-1 py-1">A</span>
          <span className="bg-lime py-1 text-center text-arena">5</span>
          <span className="bg-blue-500 py-1 text-center">2</span>
          <span className="bg-blue-500/80 px-1 py-1 text-right">B</span>
        </span>
      ) : null}
      {styleId === "football" ? (
        <span className="absolute inset-x-3 top-4 flex items-center justify-center rounded-full bg-white text-[10px] font-black text-slate-950">
          A&nbsp;5-2&nbsp;B
        </span>
      ) : null}
      {styleId === "baseball" ? (
        <span className="absolute inset-2 grid grid-cols-[1fr_28px] gap-1 text-[9px] font-black">
          <span className="bg-blue-600 px-1 py-1 text-white">AWAY</span>
          <span className="bg-white py-1 text-center text-slate-950">5</span>
          <span className="bg-black px-1 py-1 text-white">HOME</span>
          <span className="bg-white py-1 text-center text-slate-950">2</span>
        </span>
      ) : null}
      {styleId === "mini" ? (
        <span className="absolute inset-x-2 top-5 flex overflow-hidden rounded-sm text-[9px] font-black">
          <span className="bg-blue-700 px-2 py-1 text-white">A</span>
          <span className="bg-white px-2 py-1 text-slate-950">5-2</span>
          <span className="bg-red-600 px-2 py-1 text-white">B</span>
        </span>
      ) : null}
      {styleId === "lowerThird" ? (
        <span className="absolute inset-x-1 bottom-2 grid grid-cols-[1fr_44px_1fr] text-[9px] font-black text-white">
          <span className="bg-orange-500 px-1 py-2">A</span>
          <span className="bg-black py-2 text-center">5-2</span>
          <span className="bg-blue-700 px-1 py-2 text-right">B</span>
        </span>
      ) : null}
      {styleId === "lineup" ? (
        <span className="absolute inset-2 grid grid-rows-[1fr_1.4fr_0.8fr] gap-1 text-[8px] font-black">
          <span className="bg-zinc-800 px-2 py-1 text-white">PLAYER</span>
          <span className="grid grid-cols-[1fr_24px]">
            <span className="bg-blue-700 px-1 py-1 text-white">AWAY</span>
            <span className="bg-white text-center text-slate-950">5</span>
          </span>
          <span className="bg-zinc-200 px-2 py-1 text-slate-950">1st</span>
        </span>
      ) : null}
    </span>
  );
}

function ScoreboardPreview({
  styleId,
  scoreboard
}: {
  styleId: ScoreboardStyle;
  scoreboard: ScoreboardState;
}) {
  if (styleId === "football") return <FootballScoreboard scoreboard={scoreboard} />;
  if (styleId === "baseball") return <BaseballScoreboard scoreboard={scoreboard} />;
  if (styleId === "mini") return <MiniScoreboard scoreboard={scoreboard} />;
  if (styleId === "lowerThird") return <LowerThirdScoreboard scoreboard={scoreboard} />;
  if (styleId === "lineup") return <LineupScoreboard scoreboard={scoreboard} />;
  return <EsportsScoreboard scoreboard={scoreboard} />;
}

function EsportsScoreboard({ scoreboard }: { scoreboard: ScoreboardState }) {
  return (
    <div className="relative z-10 w-full max-w-5xl">
      <div className="mx-auto mb-[-2px] grid w-64 place-items-center bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-2 text-lg font-black uppercase tracking-wide text-white shadow-[0_12px_28px_rgba(0,0,0,0.45)] [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]">
        {scoreboard.note}
      </div>
      <div className="grid grid-cols-[1fr_120px_120px_1fr] items-stretch drop-shadow-[0_18px_24px_rgba(0,0,0,0.5)]">
        <SlantPanel color="lime" label={scoreboard.leftName} side="left" />
        <div className="grid min-h-28 place-items-center bg-gradient-to-br from-red-600 to-red-800 text-6xl font-black text-white [clip-path:polygon(0_0,90%_0,100%_100%,10%_100%)]">
          {scoreboard.leftScore}
        </div>
        <div className="grid min-h-28 place-items-center bg-gradient-to-br from-blue-500 to-blue-800 text-6xl font-black text-white [clip-path:polygon(0_0,90%_0,100%_100%,10%_100%)]">
          {scoreboard.rightScore}
        </div>
        <SlantPanel color="blue" label={scoreboard.rightName} side="right" />
      </div>
      <div className="mx-auto mt-3 w-fit rounded-full bg-black/70 px-5 py-2 text-sm font-black uppercase tracking-[0.18em] text-muted">
        {scoreboard.matchTitle} · {scoreboard.period} · {scoreboard.timer}
      </div>
    </div>
  );
}

function SlantPanel({
  color,
  label,
  side
}: {
  color: "lime" | "blue";
  label: string;
  side: "left" | "right";
}) {
  const colorClass =
    color === "lime"
      ? "from-lime to-emerald-700 text-arena"
      : "from-cyan to-blue-800 text-white";

  return (
    <div
      className={`flex min-h-24 items-center gap-4 bg-gradient-to-br ${colorClass} px-8 text-3xl font-black uppercase tracking-wide ${
        side === "left"
          ? "justify-start [clip-path:polygon(0_0,94%_0,100%_100%,5%_100%)]"
          : "justify-end [clip-path:polygon(0_0,100%_0,95%_100%,6%_100%)]"
      }`}
    >
      {side === "left" ? <LogoMark label={label} /> : null}
      <span className="truncate">{label}</span>
      {side === "right" ? <LogoMark label={label} /> : null}
    </div>
  );
}

function FootballScoreboard({ scoreboard }: { scoreboard: ScoreboardState }) {
  return (
    <div className="relative z-10 w-full max-w-3xl">
      <div className="mx-auto grid w-full grid-cols-[1fr_auto_1fr] items-center overflow-hidden rounded-full border border-white/70 bg-white text-slate-950 shadow-[0_18px_34px_rgba(0,0,0,0.38)]">
        <FootballTeam label={scoreboard.leftName} side="left" />
        <div className="grid min-w-44 grid-rows-[1fr_auto] overflow-hidden border-x border-slate-200 bg-slate-950 text-white">
          <div className="px-6 py-2 text-center text-3xl font-black tabular-nums">
            {scoreboard.leftScore} - {scoreboard.rightScore}
          </div>
          <div className="bg-cyan px-4 py-1 text-center text-sm font-black text-arena">{scoreboard.timer}</div>
        </div>
        <FootballTeam label={scoreboard.rightName} side="right" />
      </div>
      <div className="mx-auto mt-4 w-fit rounded-md bg-white/95 px-5 py-2 text-sm font-black uppercase tracking-[0.18em] text-slate-950">
        {scoreboard.matchTitle} · {scoreboard.period}
      </div>
    </div>
  );
}

function FootballTeam({ label, side }: { label: string; side: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-4 ${side === "right" ? "justify-end" : ""}`}>
      {side === "left" ? <FlagMark tone="blue" /> : null}
      <span className="truncate text-2xl font-black uppercase tracking-wide">{label}</span>
      {side === "right" ? <FlagMark tone="red" /> : null}
    </div>
  );
}

function BaseballScoreboard({ scoreboard }: { scoreboard: ScoreboardState }) {
  return (
    <div className="relative z-10 w-full max-w-4xl">
      <div className="grid grid-cols-[1.15fr_0.85fr] overflow-hidden border border-white/30 bg-zinc-950 shadow-[0_18px_34px_rgba(0,0,0,0.48)]">
        <div>
          <BaseballRow active label={scoreboard.rightName} score={scoreboard.rightScore} />
          <BaseballRow label={scoreboard.leftName} score={scoreboard.leftScore} />
          <div className="grid grid-cols-3 divide-x divide-zinc-300 bg-zinc-200 text-center text-4xl font-black text-zinc-950">
            <div className="py-5">2-1</div>
            <div className="py-5">0 Outs</div>
            <div className="py-5">{scoreboard.period}</div>
          </div>
        </div>
        <div className="grid place-items-center bg-zinc-100 p-6 text-zinc-950">
          <div>
            <div className="mb-5 text-center text-5xl font-black uppercase">{scoreboard.period}</div>
            <div className="relative mx-auto h-40 w-40 rotate-45">
              <span className="absolute left-0 top-14 h-16 w-16 border-4 border-blue-700 bg-transparent" />
              <span className="absolute left-14 top-0 h-16 w-16 bg-blue-700" />
              <span className="absolute left-28 top-14 h-16 w-16 bg-blue-700" />
            </div>
            <div className="mt-5 text-center text-2xl font-black uppercase text-zinc-600">{scoreboard.timer}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 bg-zinc-900 px-5 py-3 text-center text-lg font-black uppercase tracking-wide text-white">
        {scoreboard.matchTitle}
      </div>
    </div>
  );
}

function BaseballRow({ active, label, score }: { active?: boolean; label: string; score: number }) {
  return (
    <div className={`grid grid-cols-[1fr_120px] ${active ? "bg-blue-700" : "bg-black"}`}>
      <div className="flex items-center gap-4 px-7 py-5 text-5xl font-black uppercase text-white">
        <LogoMark label={label} />
        <span className="truncate">{label}</span>
      </div>
      <div className="grid place-items-center border-l border-zinc-300 bg-white text-6xl font-black text-zinc-950">
        {score}
      </div>
    </div>
  );
}

function MiniScoreboard({ scoreboard }: { scoreboard: ScoreboardState }) {
  return (
    <div className="relative z-10 w-full max-w-3xl">
      <div className="mx-auto flex w-fit items-center overflow-hidden rounded-md border border-white/25 bg-slate-950 text-2xl font-black uppercase text-white shadow-[0_12px_28px_rgba(0,0,0,0.42)]">
        <div className="bg-blue-700 px-7 py-3">{scoreboard.leftName}</div>
        <div className="bg-white px-7 py-3 text-3xl tabular-nums text-slate-950">
          {scoreboard.leftScore}-{scoreboard.rightScore}
        </div>
        <div className="bg-red-600 px-7 py-3">{scoreboard.rightName}</div>
        <div className="bg-slate-950 px-6 py-3 text-lg text-muted">{scoreboard.timer}</div>
      </div>
      <div className="mx-auto mt-3 w-fit rounded bg-black/70 px-4 py-1 text-xs font-black uppercase tracking-[0.18em] text-muted">
        {scoreboard.matchTitle}
      </div>
    </div>
  );
}

function LowerThirdScoreboard({ scoreboard }: { scoreboard: ScoreboardState }) {
  return (
    <div className="absolute inset-x-10 bottom-10 z-10">
      <div className="mx-auto max-w-5xl">
        <div className="ml-[34%] w-72 bg-zinc-600 px-5 py-2 text-lg font-black uppercase text-white">
          {scoreboard.period} &nbsp; {scoreboard.timer}
        </div>
        <div className="grid grid-cols-[1fr_220px_1fr] overflow-hidden border border-white/30 shadow-[0_18px_34px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-4 bg-orange-500 px-7 py-6 text-4xl font-black uppercase text-white [clip-path:polygon(0_0,86%_0,100%_100%,0_100%)]">
            <LogoMark label={scoreboard.leftName} />
            <span className="truncate">{scoreboard.leftName}</span>
          </div>
          <div className="grid place-items-center bg-black px-8 py-6 text-5xl font-black text-white">
            {scoreboard.leftScore} - {scoreboard.rightScore}
          </div>
          <div className="flex items-center justify-end gap-4 bg-blue-700 px-7 py-6 text-right text-4xl font-black uppercase text-white [clip-path:polygon(0_0,100%_0,100%_100%,14%_100%)]">
            <span className="truncate">{scoreboard.rightName}</span>
            <LogoMark label={scoreboard.rightName} />
          </div>
        </div>
        <div className="mx-auto grid w-fit grid-cols-3 overflow-hidden border-x border-b border-white/20 bg-zinc-900 text-lg font-black uppercase text-white">
          <span className="px-8 py-3">{scoreboard.matchTitle}</span>
          <span className="border-x border-white/20 px-8 py-3">Ball on 25</span>
          <span className="px-8 py-3">{scoreboard.note}</span>
        </div>
      </div>
    </div>
  );
}

function LineupScoreboard({ scoreboard }: { scoreboard: ScoreboardState }) {
  return (
    <div className="relative z-10 w-full max-w-4xl">
      <div className="mb-3 grid grid-cols-[88px_1fr] bg-zinc-900 text-white shadow-[0_12px_26px_rgba(0,0,0,0.36)]">
        <div className="grid place-items-center bg-zinc-600 p-5 text-4xl font-black">23</div>
        <div className="flex items-center px-6 text-4xl font-black">Max Mustermann</div>
        <div className="grid place-items-center border-t border-zinc-700 bg-zinc-600 p-5 text-4xl font-black">P</div>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-6 border-t border-zinc-800 px-6 text-4xl font-black">
          <span>John Doe</span>
          <span>P</span>
          <span>0</span>
        </div>
      </div>

      <div className="grid grid-cols-[1.1fr_0.85fr] overflow-hidden border border-white/50 bg-zinc-100 text-zinc-950 shadow-panel">
        <div>
          <LineupTeamRow active label={scoreboard.rightName} score={scoreboard.rightScore} />
          <LineupTeamRow label={scoreboard.leftName} score={scoreboard.leftScore} />
        </div>
        <div className="grid place-items-center border-l border-zinc-300 p-6">
          <div className="text-center">
            <div className="mb-4 text-5xl font-black uppercase">{scoreboard.period}</div>
            <div className="mx-auto grid h-36 w-36 rotate-45 grid-cols-2 grid-rows-2 gap-2">
              <span className="border-4 border-blue-700" />
              <span className="bg-blue-700" />
              <span />
              <span className="bg-blue-700" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-300 border-t border-zinc-300 text-center text-5xl font-black">
          <span className="py-7">2-1</span>
          <span className="py-7">0 Outs</span>
          <span className="py-7">{scoreboard.timer}</span>
        </div>
        <div className="border-l border-t border-zinc-300" />
      </div>
    </div>
  );
}

function LineupTeamRow({ active, label, score }: { active?: boolean; label: string; score: number }) {
  return (
    <div className={`grid grid-cols-[1fr_120px] ${active ? "bg-blue-700 text-white" : "bg-black text-white"}`}>
      <div className="px-8 py-7 text-6xl font-black uppercase">{label}</div>
      <div className="grid place-items-center text-6xl font-black">{score}</div>
    </div>
  );
}

function LogoMark({ label }: { label: string }) {
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-white/25 bg-black/25 text-base font-black uppercase text-white">
      {label.trim().slice(0, 2) || "T"}
    </span>
  );
}

function FlagMark({ tone }: { tone: "blue" | "red" }) {
  return (
    <span
      className={`h-9 w-14 rounded-sm border border-slate-300 ${
        tone === "blue"
          ? "bg-gradient-to-r from-blue-700 via-white to-red-500"
          : "bg-gradient-to-r from-red-600 via-white to-blue-700"
      }`}
      aria-hidden="true"
    />
  );
}
