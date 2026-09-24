import type { Team, TeamFolder, TeamSetPreset } from "@/lib/core/models";
import type { SavedTournament } from "@/store/savedTournamentStore";

export type CloudTeamLibrary = {
  teams: Team[];
  folders: TeamFolder[];
  presets: TeamSetPreset[];
  updatedAt: string;
};

export type CloudSession = {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  email?: string;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  id?: string;
  email?: string;
  user?: {
    id?: string;
    email?: string;
  };
  error?: string;
  error_description?: string;
  msg?: string;
};

type LibraryRow = {
  data?: Partial<CloudTeamLibrary>;
  updated_at?: string;
};

const sessionStorageKey = "bracket-arena-cloud-session";
const tableName = "team_libraries";
const tournamentTableName = "saved_tournament_libraries";

export function isCloudSyncConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function getSavedCloudSession(): CloudSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(sessionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CloudSession>;
    if (!parsed.accessToken || !parsed.userId) return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      userId: parsed.userId,
      email: parsed.email
    };
  } catch {
    return null;
  }
}

export function saveCloudSession(session: CloudSession | null) {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(sessionStorageKey);
    return;
  }

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export async function signUpCloudAccount(email: string, password: string) {
  return authenticate("/auth/v1/signup", email, password, true);
}

export async function signInCloudAccount(email: string, password: string) {
  return authenticate("/auth/v1/token?grant_type=password", email, password);
}

export async function uploadTeamLibrary(session: CloudSession, library: Omit<CloudTeamLibrary, "updatedAt">) {
  const updatedAt = new Date().toISOString();
  const data: CloudTeamLibrary = {
    teams: library.teams,
    folders: library.folders,
    presets: library.presets,
    updatedAt
  };

  const response = await supabaseFetch(`/rest/v1/${tableName}?on_conflict=user_id`, session, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      user_id: session.userId,
      data,
      updated_at: updatedAt
    })
  });

  if (!response.ok) throw new Error(await getResponseError(response, "팀 라이브러리를 업로드하지 못했습니다."));

  return data;
}

export async function downloadTeamLibrary(session: CloudSession): Promise<CloudTeamLibrary | null> {
  const response = await supabaseFetch(
    `/rest/v1/${tableName}?user_id=eq.${encodeURIComponent(session.userId)}&select=data,updated_at&limit=1`,
    session
  );

  if (!response.ok) throw new Error(await getResponseError(response, "팀 라이브러리를 불러오지 못했습니다."));

  const rows = (await response.json()) as LibraryRow[];
  const row = rows[0];
  if (!row?.data) return null;

  return {
    teams: Array.isArray(row.data.teams) ? row.data.teams : [],
    folders: Array.isArray(row.data.folders) ? row.data.folders : [],
    presets: Array.isArray(row.data.presets) ? row.data.presets : [],
    updatedAt: row.data.updatedAt ?? row.updated_at ?? ""
  };
}

export async function uploadSavedTournamentLibrary(session: CloudSession, savedTournaments: SavedTournament[]) {
  const updatedAt = new Date().toISOString();
  const data = {
    savedTournaments,
    updatedAt
  };

  const response = await supabaseFetch(`/rest/v1/${tournamentTableName}?on_conflict=user_id`, session, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      user_id: session.userId,
      data,
      updated_at: updatedAt
    })
  });

  if (!response.ok) throw new Error(await getResponseError(response, "저장된 대회를 업로드하지 못했습니다."));

  return data;
}

export async function downloadSavedTournamentLibrary(session: CloudSession): Promise<SavedTournament[] | null> {
  const response = await supabaseFetch(
    `/rest/v1/${tournamentTableName}?user_id=eq.${encodeURIComponent(session.userId)}&select=data,updated_at&limit=1`,
    session
  );

  if (!response.ok) throw new Error(await getResponseError(response, "저장된 대회를 불러오지 못했습니다."));

  const rows = (await response.json()) as Array<{ data?: { savedTournaments?: SavedTournament[] } }>;
  const savedTournaments = rows[0]?.data?.savedTournaments;
  return Array.isArray(savedTournaments) ? savedTournaments : null;
}

async function authenticate(
  path: string,
  email: string,
  password: string,
  allowEmailConfirmation = false
): Promise<CloudSession | null> {
  const response = await supabaseFetch(path, null, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = (await response.json().catch(() => ({}))) as AuthResponse;
  const user = payload.user ?? (payload.id ? { id: payload.id, email: payload.email } : undefined);

  if (response.ok && allowEmailConfirmation && user?.id && !payload.access_token) {
    return null;
  }

  if (!response.ok || !payload.access_token || !user?.id) {
    throw new Error(payload.error_description || payload.msg || payload.error || "로그인에 실패했습니다.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    userId: user.id,
    email: user.email ?? email
  };
}

async function supabaseFetch(path: string, session?: CloudSession | null, init?: RequestInit) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return fetch(`${url.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : null),
      ...(init?.headers ?? {})
    }
  });
}

async function getResponseError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string; msg?: string; error_description?: string };
    return payload.message || payload.error_description || payload.msg || fallback;
  } catch {
    return fallback;
  }
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
