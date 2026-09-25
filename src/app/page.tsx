import Link from "next/link";
import { ArrowRight, Brackets, Cloud, FolderOpen, Layers3, MonitorPlay, Shuffle, Users } from "lucide-react";

const primaryEntryPoints = [
  {
    title: "브래킷 메이커",
    description: "참가팀을 고르고 예선/본선 방식으로 대진표를 만든 뒤 점수를 직접 입력합니다.",
    href: "/maker",
    icon: Brackets,
    cta: "대진표 만들기",
    accent: "cyan"
  },
  {
    title: "스코어보드",
    description: "OBS 방송 화면에 올릴 경기 점수판과 오버레이 화면을 준비합니다.",
    href: "/scoreboard",
    icon: MonitorPlay,
    cta: "스코어보드 열기",
    accent: "lime"
  },
  {
    title: "팀 관리",
    description: "팀 로고, 약칭, 전용 색상, 폴더 정리를 바탕화면처럼 관리합니다.",
    href: "/teams",
    icon: Users,
    cta: "팀 관리하기",
    accent: "gold"
  }
];

const supportEntryPoints = [
  {
    title: "추첨 및 참가팀 선택",
    description: "참가팀, 대회 설정, 포트, 시드/조 추첨을 준비합니다.",
    href: "/draw",
    icon: Shuffle,
    cta: "준비하기"
  },
  {
    title: "티어리스트",
    description: "만든 팀을 S-F 등급에 드래그해서 배치하고, 등급 이름과 색상을 커스텀합니다.",
    href: "/tier-list",
    icon: Layers3,
    cta: "정리하기"
  },
  {
    title: "저장된 대회",
    description: "저장해 둔 대회 설정과 브래킷 진행 상태를 다시 불러옵니다.",
    href: "/saved-tournaments",
    icon: FolderOpen,
    cta: "불러오기"
  },
  {
    title: "로그인 / 클라우드",
    description: "팀, 저장된 대회, 스코어보드를 다른 기기와 동기화합니다.",
    href: "/login",
    icon: Cloud,
    cta: "동기화"
  }
];

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6 2xl:px-8">
      <section className="mx-auto grid w-full max-w-7xl gap-6">
        <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">빠른 시작</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-tight tracking-wide text-ink sm:text-5xl">
              Bracket Arena
            </h1>
            <p className="mt-3 text-base leading-7 text-muted">
              팀 관리, 대진표 제작, 방송용 스코어보드를 한 곳에서 이어서 작업합니다.
            </p>
          </div>
          <Link
            href="/maker"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan bg-cyan px-4 py-3 text-sm font-black uppercase tracking-wide text-arena shadow-glow transition hover:border-lime hover:bg-lime"
          >
            바로 대진표 만들기
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {primaryEntryPoints.map((item, index) => {
            const Icon = item.icon;
            const accentClass =
              item.accent === "lime"
                ? "border-lime/60 bg-lime/10 text-lime"
                : item.accent === "gold"
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-cyan/60 bg-cyan/10 text-cyan";

            return (
              <Link key={item.title} href={item.href} className="block">
                <div className="arena-card group flex h-full min-h-48 flex-col justify-between p-5 transition hover:border-cyan hover:shadow-glow">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-md border ${accentClass}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="rounded-md border border-line bg-field px-2 py-1 text-xs font-black uppercase tracking-wide text-muted">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="mt-5">
                    <h2 className="text-2xl font-black uppercase tracking-wide text-ink">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan">
                    {item.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="arena-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">도구</p>
                <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-ink">필요할 때 여는 메뉴</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {supportEntryPoints.slice(0, 3).map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-md border border-line bg-field p-4 transition hover:border-cyan hover:bg-cyan/10"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-panel text-cyan">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black uppercase tracking-wide text-ink">{item.title}</span>
                      <span className="mt-1 block text-xs font-bold leading-5 text-muted">{item.description}</span>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted transition group-hover:text-cyan" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>

          <Link href={supportEntryPoints[3].href} className="arena-card group flex min-h-44 flex-col justify-between p-5 transition hover:border-lime hover:shadow-glow">
            <div>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-md border border-lime/60 bg-lime/10 text-lime">
                <Cloud className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="section-kicker">계정</p>
              <h2 className="mt-2 text-xl font-black uppercase tracking-wide text-ink">클라우드 동기화</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{supportEntryPoints[3].description}</p>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-lime">
              {supportEntryPoints[3].cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
