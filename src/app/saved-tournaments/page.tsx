"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, FolderOpen, Plus, Trash2, Trophy } from "lucide-react";
import { useSavedTournamentStore } from "@/store/savedTournamentStore";

export default function SavedTournamentsPage() {
  const router = useRouter();
  const savedTournaments = useSavedTournamentStore((state) => state.savedTournaments);
  const deleteTournament = useSavedTournamentStore((state) => state.deleteTournament);

  const openTournament = (id: string) => {
    const saved = savedTournaments.find((item) => item.id === id);
    if (!saved) return;

    window.localStorage.setItem("bracket-arena-load-tournament", JSON.stringify(saved.snapshot));
    router.push("/maker");
  };

  return (
    <main className="min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6 2xl:px-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">대회 저장소</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink sm:text-4xl">
            저장된 대회
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            메이커에서 저장한 대회 설정과 진행 상태를 다시 불러옵니다.
          </p>
        </div>
        <Link href="/maker" className="button-primary">
          <Plus className="h-4 w-4" />
          새 대회 / 메이커
        </Link>
      </section>

      {savedTournaments.length ? (
        <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {savedTournaments.map((saved) => (
            <article key={saved.id} className="arena-card flex min-h-64 flex-col justify-between p-5">
              <div>
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-md border border-gold bg-gold/10 text-gold">
                  <Trophy className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wide text-ink">{saved.name}</h2>
                <div className="mt-3 space-y-2 text-sm font-semibold text-muted">
                  <p>진행 방식: {saved.snapshot.mode === "two-stage" ? "예선 + 본선" : "본선만"}</p>
                  <p>예선: {saved.snapshot.qualifierFormat}</p>
                  <p>본선: {saved.snapshot.finalFormat}</p>
                  <p>참가팀: {saved.snapshot.selectedTeamIds.length}팀</p>
                  <p className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    {formatDate(saved.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className="button-primary" onClick={() => openTournament(saved.id)}>
                  <FolderOpen className="h-4 w-4" />
                  열기
                </button>
                <button
                  type="button"
                  className="button-muted"
                  onClick={() => {
                    const confirmed = window.confirm(`"${saved.name}" 대회를 삭제할까요?`);
                    if (confirmed) deleteTournament(saved.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="arena-card grid min-h-80 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-md border border-line bg-field text-muted">
              <Trophy className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wide text-ink">아직 저장된 대회가 없습니다</h2>
            <p className="mt-2 text-sm font-semibold text-muted">브래킷 메이커에서 현재 대회를 저장하면 여기에 표시됩니다.</p>
            <Link href="/maker" className="button-primary mt-5">
              <Plus className="h-4 w-4" />
              메이커로 이동
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
