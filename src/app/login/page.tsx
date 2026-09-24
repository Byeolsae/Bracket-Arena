"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, Download, Eye, EyeOff, FolderOpen, LogIn, LogOut, Trophy, Upload, Users } from "lucide-react";
import {
  downloadSavedTournamentLibrary,
  downloadTeamLibrary,
  getSavedCloudSession,
  isCloudSyncConfigured,
  saveCloudSession,
  signInCloudAccount,
  signUpCloudAccount,
  uploadSavedTournamentLibrary,
  uploadTeamLibrary,
  type CloudSession
} from "@/lib/cloud/supabaseTeams";
import { useSavedTournamentStore } from "@/store/savedTournamentStore";
import { useTeamStore } from "@/store/teamStore";

export default function LoginPage() {
  const teams = useTeamStore((state) => state.teams);
  const folders = useTeamStore((state) => state.folders);
  const presets = useTeamStore((state) => state.presets);
  const setTeamLibrary = useTeamStore((state) => state.setTeamLibrary);
  const savedTournaments = useSavedTournamentStore((state) => state.savedTournaments);
  const setSavedTournaments = useSavedTournamentStore((state) => state.setSavedTournaments);
  const configured = isCloudSyncConfigured();
  const [session, setSession] = useState<CloudSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("로그인하면 팀과 저장된 대회를 클라우드에 보관할 수 있습니다.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = getSavedCloudSession();
    setSession(saved);
    if (saved?.email) setEmail(saved.email);
  }, []);

  const persistSession = (nextSession: CloudSession | null) => {
    setSession(nextSession);
    saveCloudSession(nextSession);
  };

  const authenticate = async (mode: "signin" | "signup") => {
    if (!configured || busy) return;

    setBusy(true);
    setStatus(mode === "signup" ? "계정을 만드는 중입니다..." : "로그인 중입니다...");
    try {
      const nextSession =
        mode === "signup"
          ? await signUpCloudAccount(email.trim(), password)
          : await signInCloudAccount(email.trim(), password);
      if (!nextSession) {
        setPassword("");
        setStatus("계정이 생성되었습니다. 이메일 인증 후 다시 로그인하세요.");
        return;
      }
      persistSession(nextSession);
      setPassword("");
      setStatus(`${nextSession.email ?? email} 계정으로 로그인되었습니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const uploadTeams = async () => {
    if (!session || busy) return;

    setBusy(true);
    setStatus("현재 팀 라이브러리를 클라우드에 저장하는 중입니다...");
    try {
      const uploaded = await uploadTeamLibrary(session, { teams, folders, presets });
      setStatus(`저장 완료: ${uploaded.teams.length}팀 / ${uploaded.folders.length}폴더`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const downloadTeams = async () => {
    if (!session || busy) return;

    const confirmed = window.confirm(
      "클라우드 팀 라이브러리를 이 기기에 적용할까요?\n\n현재 로컬 팀 목록과 폴더가 클라우드 데이터로 교체됩니다."
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("클라우드 팀 라이브러리를 불러오는 중입니다...");
    try {
      const library = await downloadTeamLibrary(session);
      if (!library) {
        setStatus("아직 클라우드에 저장된 팀 라이브러리가 없습니다.");
        return;
      }
      setTeamLibrary(library);
      setStatus(`불러오기 완료: ${library.teams.length}팀 / ${library.folders.length}폴더`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "불러오기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const uploadTournaments = async () => {
    if (!session || busy) return;

    setBusy(true);
    setStatus("저장된 대회 목록을 클라우드에 저장하는 중입니다...");
    try {
      const uploaded = await uploadSavedTournamentLibrary(session, savedTournaments);
      setStatus(`대회 저장 완료: ${uploaded.savedTournaments.length}개`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "저장된 대회 업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const downloadTournaments = async () => {
    if (!session || busy) return;

    const confirmed = window.confirm(
      "클라우드의 저장된 대회 목록을 이 기기에 적용할까요?\n\n현재 로컬 저장된 대회 목록이 클라우드 데이터로 교체됩니다."
    );
    if (!confirmed) return;

    setBusy(true);
    setStatus("저장된 대회 목록을 클라우드에서 불러오는 중입니다...");
    try {
      const cloudTournaments = await downloadSavedTournamentLibrary(session);
      if (!cloudTournaments) {
        setStatus("아직 클라우드에 저장된 대회 목록이 없습니다.");
        return;
      }
      setSavedTournaments(cloudTournaments);
      setStatus(`대회 불러오기 완료: ${cloudTournaments.length}개`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "저장된 대회 불러오기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    persistSession(null);
    setPassword("");
    setStatus("로그아웃했습니다. 이 기기의 로컬 팀은 그대로 유지됩니다.");
  };

  return (
    <main className="min-h-[calc(100vh-73px)] px-4 py-8 sm:px-6 2xl:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="section-kicker">계정 / 클라우드</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-ink sm:text-4xl">로그인</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            한 기기에서 만든 팀과 저장된 대회를 클라우드에 보관하고, 다른 기기에서 같은 계정으로 불러옵니다.
          </p>
        </div>

        <section className="arena-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-cyan" aria-hidden="true" />
              <h2 className="text-lg font-black uppercase tracking-wide text-ink">클라우드 저장</h2>
            </div>
            <div className="rounded border border-line bg-arena px-3 py-2 text-xs font-bold text-muted">
              {status}
            </div>
          </div>

          {!configured ? (
            <div className="mt-4 rounded border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-bold leading-6 text-gold">
              Supabase 환경변수 설정 후 개발 서버를 다시 켜야 로그인할 수 있습니다.
            </div>
          ) : session ? (
            <div className="mt-5 grid gap-3">
              <div className="rounded border border-line bg-field px-3 py-3 text-sm font-black text-ink">
                로그인됨: {session.email ?? "계정"}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="button-primary" onClick={uploadTeams} disabled={busy}>
                  <Upload className="h-4 w-4" />
                  팀 저장
                </button>
                <button type="button" className="button-muted" onClick={downloadTeams} disabled={busy}>
                  <Download className="h-4 w-4" />
                  팀 불러오기
                </button>
                <button type="button" className="button-primary" onClick={uploadTournaments} disabled={busy}>
                  <Trophy className="h-4 w-4" />
                  대회 저장
                </button>
                <button type="button" className="button-muted" onClick={downloadTournaments} disabled={busy}>
                  <Download className="h-4 w-4" />
                  대회 불러오기
                </button>
                <button type="button" className="button-muted" onClick={signOut} disabled={busy}>
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <form
              className="mt-5 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void authenticate("signin");
              }}
            >
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink">이메일</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-ink">비밀번호</span>
                <div className="relative">
                  <input
                    className="input pr-12"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded border border-transparent text-muted transition hover:border-cyan hover:text-cyan"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="button-primary" disabled={busy}>
                  <LogIn className="h-4 w-4" />
                  로그인
                </button>
                <button
                  type="button"
                  className="button-muted"
                  onClick={(event) => {
                    const form = event.currentTarget.form;
                    if (form?.reportValidity()) void authenticate("signup");
                  }}
                  disabled={busy}
                >
                  계정 만들기
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/teams" className="button-muted">
            <Users className="h-4 w-4" />
            팀 관리로 이동
          </Link>
          <Link href="/saved-tournaments" className="button-muted">
            <FolderOpen className="h-4 w-4" />
            저장된 대회
          </Link>
        </div>
      </section>
    </main>
  );
}
