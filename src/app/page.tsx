import Link from "next/link";
import { ArrowRight, Brackets, Cloud, FolderOpen, Layers3, MonitorPlay, Shuffle, Users } from "lucide-react";

const tournamentFlow = [
  {
    step: "01",
    title: "팀 관리",
    description: "대회에 쓸 팀, 로고, 약칭, 색상, 폴더를 먼저 정리합니다.",
    href: "/teams",
    icon: Users,
    cta: "팀 준비"
  },
  {
    step: "02",
    title: "추첨 및 참가팀 선택",
    description: "참가팀과 포트, 시드, 조 추첨을 정하고 브래킷으로 넘길 준비를 합니다.",
    href: "/draw",
    icon: Shuffle,
    cta: "추첨 준비"
  },
  {
    step: "03",
    title: "브래킷 메이커",
    description: "예선/본선 방식으로 대진표를 만들고 경기 결과를 입력합니다.",
    href: "/maker",
    icon: Brackets,
    cta: "대진표 제작"
  },
  {
    step: "04",
    title: "저장된 대회",
    description: "진행 중이거나 저장해 둔 대회 상태를 다시 불러옵니다.",
    href: "/saved-tournaments",
    icon: FolderOpen,
    cta: "대회 불러오기"
  }
];

const utilityLinks = [
  {
    title: "스코어보드",
    description: "OBS 방송용 점수판과 오버레이를 설정합니다.",
    href: "/scoreboard",
    icon: MonitorPlay,
    cta: "방송 화면"
  },
  {
    title: "티어리스트",
    description: "팀을 등급별로 배치하고 이미지처럼 정리합니다.",
    href: "/tier-list",
    icon: Layers3,
    cta: "등급 정리"
  },
  {
    title: "로그인 / 클라우드",
    description: "팀, 대회, 스코어보드를 다른 기기와 동기화합니다.",
    href: "/login",
    icon: Cloud,
    cta: "동기화"
  }
];

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6 2xl:px-8">
      <section className="mx-auto grid w-full max-w-7xl gap-6">
        <div className="grid gap-5 border-b border-line pb-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="section-kicker">빠른 시작</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-tight tracking-wide text-ink sm:text-5xl">
              Bracket Arena
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
              대회 제작 흐름을 먼저 정리하고, 방송용 화면과 보조 도구는 따로 관리합니다.
            </p>
          </div>
          <div className="rounded-md border border-cyan/40 bg-cyan/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan">추천 순서</p>
            <p className="mt-2 text-sm font-bold leading-6 text-ink">
              팀 관리 → 추첨 → 브래킷 제작 → 저장/불러오기
            </p>
          </div>
        </div>

        <section className="arena-card p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">대회 제작</p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-wide text-ink">메인 작업 흐름</h2>
            </div>
            <Link
              href="/maker"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan bg-cyan px-4 py-2 text-sm font-black uppercase tracking-wide text-arena shadow-glow transition hover:border-lime hover:bg-lime"
            >
              바로 브래킷
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            {tournamentFlow.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex min-h-52 flex-col rounded-md border border-line bg-field p-4 transition hover:border-cyan hover:bg-cyan/10"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-md border border-cyan/50 bg-cyan/10 text-cyan">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.22em] text-muted">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-ink">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted">{item.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan">
                    {item.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {utilityLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="arena-card group flex items-center gap-4 p-5 transition hover:border-lime hover:shadow-glow"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-lime/50 bg-lime/10 text-lime">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black uppercase tracking-[0.2em] text-lime">{item.cta}</span>
                  <span className="mt-1 block text-lg font-black uppercase tracking-wide text-ink">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{item.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:text-lime" aria-hidden="true" />
              </Link>
            );
          })}
        </section>
      </section>
    </main>
  );
}
