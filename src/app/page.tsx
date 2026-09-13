import Link from "next/link";
import { ArrowRight, Brackets, Layers3, Shuffle, Users } from "lucide-react";

const entryPoints = [
  {
    title: "브래킷 메이커",
    description: "참가팀을 고르고 예선/본선 방식으로 대진표를 만든 뒤 점수를 직접 입력합니다.",
    href: "/maker",
    icon: Brackets,
    cta: "대진표 만들기"
  },
  {
    title: "팀 관리",
    description: "팀 로고, 약칭, 전용 색상, 폴더 정리를 바탕화면처럼 관리합니다.",
    href: "/teams",
    icon: Users,
    cta: "팀 관리하기"
  },
  {
    title: "티어리스트",
    description: "만든 팀을 S-F 등급에 드래그해서 배치하고, 등급 이름과 색상을 커스텀합니다.",
    href: "/tier-list",
    icon: Layers3,
    cta: "티어 정리하기"
  },
  {
    title: "추첨 및 참가팀 선택",
    description: "참가팀, 대회 설정, 포트, 시드/조 추첨을 준비하고 브래킷으로 가져옵니다.",
    href: "/draw",
    icon: Shuffle,
    cta: "참가팀 준비하기"
  }
];

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100vh-73px)] w-full items-center px-4 py-8 sm:px-6 2xl:px-8">
      <section className="w-full">
        <div className="mb-8 max-w-2xl">
          <p className="section-kicker">Quick Start</p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-tight tracking-wide text-ink sm:text-5xl">
            Bracket Arena
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">
            팀을 만들고, 원하는 대회 구조를 고른 뒤, 브래킷과 티어리스트를 빠르게 정리합니다.
          </p>
        </div>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {entryPoints.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.title} href={item.href}>
                <div className="arena-card group flex h-full min-h-56 flex-col justify-between p-5 transition hover:border-cyan hover:shadow-glow">
                  <div>
                    <div className="mb-5 grid h-12 w-12 place-items-center rounded-md border border-cyan bg-cyan/10 text-cyan">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-wide text-ink">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                  </div>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan">
                    {item.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
