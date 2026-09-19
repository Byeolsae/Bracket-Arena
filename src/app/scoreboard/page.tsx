import { MonitorPlay, Radio, Settings2, Trophy } from "lucide-react";

const previewTeams = [
  { name: "HOME", score: 0, tone: "border-cyan bg-cyan/10 text-cyan" },
  { name: "AWAY", score: 0, tone: "border-magenta bg-magenta/10 text-magenta" }
];

export default function ScoreboardPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6 2xl:px-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">방송 오버레이</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink sm:text-4xl">
            스코어보드
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            OBS 브라우저 소스로 연결할 점수판을 준비하는 공간입니다. 다음 단계에서 팀 연동, 점수 입력,
            투명 오버레이 URL을 붙이면 실시간 방송용으로 확장할 수 있습니다.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-black uppercase tracking-wide text-cyan">
          <Radio className="h-4 w-4" aria-hidden="true" />
          준비 중
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-5">
          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">컨트롤</h2>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">경기명</span>
                <input className="input" placeholder="Grand Final" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">왼쪽 팀</span>
                  <input className="input" placeholder="HOME" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">오른쪽 팀</span>
                  <input className="input" placeholder="AWAY" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">왼쪽 점수</span>
                  <input className="input" inputMode="numeric" placeholder="0" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-muted">오른쪽 점수</span>
                  <input className="input" inputMode="numeric" placeholder="0" />
                </label>
              </div>
            </div>
          </div>

          <div className="arena-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MonitorPlay className="h-5 w-5 text-lime" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">OBS 화면</h2>
            </div>
            <div className="rounded-md border border-dashed border-line bg-field p-4 text-sm leading-6 text-muted">
              오버레이 전용 주소와 투명 배경 설정은 다음 단계에서 추가합니다.
            </div>
          </div>
        </aside>

        <div className="arena-card overflow-hidden">
          <div className="border-b border-line bg-arena/80 px-5 py-4">
            <p className="section-kicker">미리보기</p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-ink">방송용 스코어바</h2>
          </div>

          <div className="grid min-h-[520px] place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(47,230,255,0.12),transparent_32%),hsl(var(--arena))] p-6">
            <div className="w-full max-w-5xl">
              <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-md border border-gold/60 bg-gold/15 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-gold">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Grand Final
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-md border border-line bg-panel/95 shadow-panel">
                <ScorePanel team={previewTeams[0]} side="left" />
                <div className="grid min-w-24 place-items-center border-x border-line bg-arena px-5 text-sm font-black uppercase tracking-[0.2em] text-muted">
                  VS
                </div>
                <ScorePanel team={previewTeams[1]} side="right" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ScorePanel({
  team,
  side
}: {
  team: { name: string; score: number; tone: string };
  side: "left" | "right";
}) {
  return (
    <div
      className={`flex min-h-24 items-center gap-4 border-y px-6 ${team.tone} ${
        side === "left" ? "justify-start border-l" : "justify-end border-r"
      }`}
    >
      {side === "left" ? <TeamBadge label={team.name} /> : null}
      <span className="text-5xl font-black tabular-nums text-ink">{team.score}</span>
      {side === "right" ? <TeamBadge label={team.name} /> : null}
    </div>
  );
}

function TeamBadge({ label }: { label: string }) {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-md border border-line bg-field text-sm font-black uppercase text-ink">
      {label.slice(0, 2)}
    </div>
  );
}
