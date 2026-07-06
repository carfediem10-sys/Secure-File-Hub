import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import {
  Bell, Settings, FileText, Shield, Gift, Star, ChevronRight,
  Eye, EyeOff, RefreshCw, Trash2, Plus, X, Users, AlertTriangle,
  CheckCircle, XCircle, UserX, Clock, Info, Key, Lock, Radio, Zap, Eraser, MessageSquare
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function getSessionId() {
  let id = localStorage.getItem("gov24_session_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("gov24_session_id", id); }
  return id;
}

function getUserData() {
  try {
    const d = localStorage.getItem("gov24_user");
    const photo = localStorage.getItem("gov24_user_photo") ?? "";
    return { ...(d ? JSON.parse(d) : {}), photo };
  } catch { return {}; }
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-12 h-7 rounded-full shrink-0 transition-colors duration-200"
      style={{ background: on ? "#003764" : "#D1D5DB" }}
    >
      <motion.div
        className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow"
        animate={{ left: on ? "calc(100% - 25px)" : "3px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

interface GateSession {
  id: string;
  name: string;
  time: string;
  status: "pending" | "approved" | "rejected" | "kicked";
  warnings: number;
  isWhitelisted: boolean;
  rejectedBy?: string;
  kickedBy?: string;
  profile?: Record<string, unknown>;
}

type AdminPanel = "none" | "gate" | "visitors" | "pending" | "passwords" | "security" | "remote";

export default function MyGovTab() {
  const sessionId = getSessionId();
  const [user, setUser] = useState(getUserData);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<"user" | "admin" | "developer">("user");
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [panel, setPanel] = useState<AdminPanel>("none");

  // Gate config
  const [gateEnabled, setGateEnabled] = useState(false);
  const [approvalMode, setApprovalMode] = useState(false);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [wlInput, setWlInput] = useState("");
  const [notice, setNotice] = useState<{ text: string; author?: string; time?: string } | null>(null);
  const [noticeInput, setNoticeInput] = useState("");

  // Visitor log
  const [sessions, setSessions] = useState<GateSession[]>([]);
  const [detailSession, setDetailSession] = useState<GateSession | null>(null);

  // Password editing (dev only)
  const [newAccessPw, setNewAccessPw] = useState("");
  const [newAdminPw, setNewAdminPw] = useState("");
  const [newDevPw, setNewDevPw] = useState("");
  const [serverPasswords, setServerPasswords] = useState<{ accessPassword?: string; adminPassword?: string }>({});

  // Security profiles
  const [securityProfiles, setSecurityProfiles] = useState<{ code: string; name: string; photo: string }[]>([]);
  const [secCode, setSecCode] = useState("");
  const [secName, setSecName] = useState("");
  const [secPhoto, setSecPhoto] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  async function loadConfig() {
    try {
      const r = await fetch(`/api/gate/config?sessionId=${sessionId}`);
      const d = await r.json();
      setGateEnabled(d.gateEnabled ?? false);
      setApprovalMode(d.approvalRequired ?? false);
      setWhitelist(d.whitelist ?? []);
      if (d.role === "admin" && role === "user") setRole("admin");
      if (d.role === "developer") setRole("developer");
      setServerPasswords({ accessPassword: d.accessPassword, adminPassword: d.adminPassword });
    } catch {}
  }

  async function loadSessions() {
    try {
      const r = await fetch(`/api/gate/sessions?sessionId=${sessionId}`);
      if (!r.ok) return;
      const d = await r.json();
      if (d.sessions) setSessions(d.sessions);
    } catch {}
  }

  async function loadNotice() {
    try {
      const r = await fetch(api("/api/gate/notice");
      const d = await r.json();
      setNotice(d.notice ?? null);
    } catch {}
  }

  async function loadSecurityProfiles() {
    try {
      const r = await fetch(`/api/gate/security-profiles?sessionId=${sessionId}`);
      if (!r.ok) return;
      const d = await r.json();
      if (d.profiles) setSecurityProfiles(d.profiles);
    } catch {}
  }

  const refreshAll = useCallback(() => {
    loadConfig();
    loadNotice();
    if (role !== "user") { loadSessions(); loadSecurityProfiles(); }
  }, [role]);

  // ── 앱 로드 시 저장된 역할 자동 복구 ──────────────────────────
  useEffect(() => {
    const d = getUserData();
    if (d.name) { setUser(d); setLoggedIn(true); }
    loadConfig();
    loadNotice();

    const storedPw = localStorage.getItem("gov24_role_pw");
    if (storedPw) {
      fetch(api("/api/gate/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: storedPw, sessionId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.role === "developer") { setRole("developer"); loadConfig(); loadSessions(); }
          else if (d.role === "admin") { setRole("admin"); loadConfig(); loadSessions(); }
          else { localStorage.removeItem("gov24_role_pw"); }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (role === "user") return;
    loadSessions();
    const t = setInterval(loadSessions, 2000);
    return () => clearInterval(t);
  }, [role]);

  async function handleAuth() {
    if (!pwInput.trim()) return;
    setAuthLoading(true);
    try {
      const res = await fetch(api("/api/gate/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwInput, sessionId }),
      });
      const d = await res.json();
      if (d.role === "developer") {
        setRole("developer");
        localStorage.setItem("gov24_role_pw", pwInput);
        showToast("개발자 인증 완료");
        await loadConfig(); await loadSessions();
      } else if (d.role === "admin") {
        setRole("admin");
        localStorage.setItem("gov24_role_pw", pwInput);
        showToast("관리자 인증 완료");
        await loadConfig(); await loadSessions();
      } else {
        showToast("비밀번호가 올바르지 않습니다");
      }
    } catch { showToast("서버 오류"); }
    finally { setAuthLoading(false); setPwInput(""); }
  }

  async function postConfig(updates: object) {
    const r = await fetch(api("/api/gate/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...updates }),
    });
    const d = await r.json();
    if (d.error) { showToast("권한이 없습니다"); return false; }
    return true;
  }

  async function toggleGate() {
    const next = !gateEnabled;
    if (await postConfig({ gateEnabled: next })) { setGateEnabled(next); showToast(next ? "게이트 켜짐" : "게이트 꺼짐"); }
  }

  async function toggleApproval() {
    const next = !approvalMode;
    if (await postConfig({ approvalRequired: next })) { setApprovalMode(next); showToast(next ? "승인 모드 켜짐" : "꺼짐"); }
  }

  async function addWhitelist() {
    if (!wlInput.trim()) return;
    const r = await fetch(api("/api/gate/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wlInput.trim(), sessionId }),
    });
    const d = await r.json();
    if (d.whitelist) { setWhitelist(d.whitelist); setWlInput(""); showToast(`"${wlInput.trim()}" 화이트리스트 추가`); }
  }

  async function removeWhitelist(name: string) {
    const r = await fetch(`/api/gate/whitelist/${encodeURIComponent(name)}?sessionId=${sessionId}`, { method: "DELETE" });
    const d = await r.json();
    if (d.whitelist) { setWhitelist(d.whitelist); showToast("화이트리스트 삭제됨"); }
  }

  async function approve(targetId: string) {
    await fetch(api("/api/gate/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    showToast("승인했습니다"); loadSessions();
  }

  async function reject(targetId: string) {
    await fetch(api("/api/gate/reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    showToast("거절했습니다"); loadSessions();
  }

  async function kick(targetId: string) {
    await fetch(api("/api/gate/kick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    showToast("강퇴했습니다"); loadSessions();
  }

  async function warn(targetId: string) {
    const r = await fetch(api("/api/gate/warn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    const d = await r.json();
    if (d.kicked) showToast("경고 2회 누적 — 영구 퇴장");
    else showToast(`경고 ${d.warnings}회 누적`);
    loadSessions();
  }

  async function remoteCommand(targetId: string, type: "WIPE" | "LOCK" | "BLOCK" | "ALERT", payload?: string) {
    await fetch(api("/api/gate/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, targetId, type, payload }),
    });
    const label = { WIPE: "원격 색제", LOCK: "원격 잠금", BLOCK: "원격 차단", ALERT: "팬스 메시지" }[type];
    showToast(`${label} 실행 완료`);
    loadSessions();
  }

  async function postNotice() {
    if (!noticeInput.trim()) return;
    const r = await fetch(api("/api/gate/notice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noticeInput.trim(), author: user.name || "관리자", sessionId }),
    });
    const d = await r.json();
    if (d.notice) { setNotice(d.notice); setNoticeInput(""); showToast("공지 등록됨"); }
  }

  async function deleteNotice() {
    await fetch(`/api/gate/notice?sessionId=${sessionId}`, { method: "DELETE" });
    setNotice(null); showToast("공지 삭제됨");
  }

  async function savePasswords() {
    const ok = await postConfig({
      accessPassword: newAccessPw || undefined,
      adminPassword: newAdminPw || undefined,
      developerPassword: newDevPw || undefined,
    });
    if (ok) { showToast("비밀번호 변경됨"); setNewAccessPw(""); setNewAdminPw(""); setNewDevPw(""); loadConfig(); }
  }

  async function addSecurityProfile() {
    if (!secCode.trim() || !secName.trim()) return;
    const r = await fetch(api("/api/gate/security-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, code: secCode.trim(), name: secName.trim(), photo: secPhoto.trim() }),
    });
    if (r.ok) { showToast("보안 프로필 등록됨"); setSecCode(""); setSecName(""); setSecPhoto(""); loadSecurityProfiles(); }
    else showToast("등록 실패");
  }

  async function deleteSecurityProfile(code: string) {
    const r = await fetch(`/api/gate/security-profile/${encodeURIComponent(code)}?sessionId=${sessionId}`, { method: "DELETE" });
    if (r.ok) { showToast("삭제됨"); loadSecurityProfiles(); }
  }

  function handleLogin() {
    const name = localStorage.getItem("gov24_gate_name") || "홍길동";
    localStorage.setItem("gov24_user", JSON.stringify({ name }));
    setUser({ name }); setLoggedIn(true);
    window.dispatchEvent(new Event("storage"));
  }

  const pendingSessions = sessions.filter((s) => s.status === "pending");
  const displayName = (user.name || "홍길동").replace(/\s/g, "");
  const initial = displayName.charAt(0) || "홍";

  const statusBadge = (s: GateSession) => {
    if (s.status === "approved") return <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">입장</span>;
    if (s.status === "pending") return <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">대기</span>;
    if (s.status === "rejected") return <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">거절</span>;
    if (s.status === "kicked") return <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full font-bold">강퇴</span>;
    return null;
  };

  // ── NOT LOGGED IN ────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="w-full h-full flex flex-col bg-white overflow-y-auto">
        <header className="px-5 py-4 border-b border-gray-100 shrink-0">
          <h1 className="text-xl font-bold text-gray-900">로그인</h1>
        </header>
        <div className="flex-1 p-6 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#003764]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#003764]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">정부24 로그인</h2>
          </div>
          <div className="space-y-3">
            <button onClick={handleLogin} className="w-full h-14 bg-gradient-to-r from-blue-600 to-[#003764] text-white rounded-xl font-bold text-base shadow-md">
              간편인증 (민간인증서)
            </button>
            <button onClick={handleLogin} className="w-full h-14 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-base">
              아이디 로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  const MY_ITEMS = [
    { Icon: FileText, label: "민원신청내역", count: 2 },
    { Icon: Shield, label: "나의증명서", count: 5 },
    { Icon: Gift, label: "나의혜택", count: 3 },
    { Icon: Star, label: "관심서비스", count: 8 },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-50 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-lg pointer-events-none"
          >
            <p className="text-[12px] font-bold text-green-700 text-center">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Detail Modal (dev only) */}
      <AnimatePresence>
        {detailSession && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setDetailSession(null)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 max-h-[80dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-[16px]">자세히 보기 — {detailSession.name}</h3>
                <button onClick={() => setDetailSession(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {detailSession.profile ? (
                <div className="space-y-0">
                  {/* 사진 */}
                  <div className="flex justify-center mb-5">
                    {detailSession.profile.photo ? (
                      <img
                        src={detailSession.profile.photo as string}
                        alt="증명사진"
                        className="w-28 h-36 object-cover rounded-2xl border-2 border-gray-100 shadow"
                      />
                    ) : (
                      <div className="w-28 h-36 rounded-2xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-300 text-[12px] flex-col gap-1">
                        <div className="text-3xl">👤</div>
                        <span>사진 없음</span>
                      </div>
                    )}
                  </div>
                  {[
                    { label: "이름", val: detailSession.profile.name as string || "—" },
                    { label: "주소", val: [detailSession.profile.addr1, detailSession.profile.addr2, detailSession.profile.addr3].filter(Boolean).join(" ") || "—" },
                    { label: "생년월일", val: (() => { const f = detailSession.profile.numberFront as string; return f ? `${f.slice(0,2)}년 ${f.slice(2,4)}월 ${f.slice(4,6)}일` : "—"; })() },
                    { label: "주민번호 앞자리", val: (detailSession.profile.numberFront as string) || "—" },
                    { label: "발급일자", val: (detailSession.profile.issueDate as string) || "—" },
                    { label: "발급기관", val: (detailSession.profile.issuer as string) || "—" },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-start gap-3 py-3 border-b border-gray-50">
                      <span className="text-[11px] text-gray-400 font-bold w-24 shrink-0 pt-0.5">{label}</span>
                      <span className="text-[13px] text-gray-800 font-medium break-all">{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-300">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-[13px]">모바일 신분증 정보 없음</p>
                  <p className="text-[11px] mt-1 text-gray-400">사용자가 모바일 신분증 페이지를 방문하면 표시됩니다</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <header className="px-5 py-4 flex items-center justify-between bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">MY정부24</h1>
        <div className="flex items-center gap-1">
          {role !== "user" && (
            <button onClick={refreshAll} className="p-2 text-gray-400 active:text-gray-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 text-gray-600 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C60C30] rounded-full border border-white" />
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50 pb-6">

        {/* Profile Card */}
        <section className="bg-white px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#003764] to-blue-500 rounded-full flex items-center justify-center shadow relative shrink-0">
              <span className="text-white font-bold text-xl">{initial}</span>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[8px] font-black">✓</span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{displayName}<span className="font-normal text-gray-600 text-base ml-1">님</span></h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${role === "developer" ? "bg-purple-100 text-purple-700" : role === "admin" ? "bg-blue-100 text-[#003764]" : "bg-gray-100 text-gray-600"}`}>
                  {role === "developer" ? "개발자" : role === "admin" ? "관리자" : "일반회원"}
                </span>
              </div>
            </div>
            <button onClick={() => { setLoggedIn(false); setRole("user"); localStorage.removeItem("gov24_role_pw"); }} className="text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-5">
            {MY_ITEMS.map(({ Icon, label, count }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center relative">
                  <Icon className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#C60C30] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{count}</span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Admin Auth */}
        {role === "user" && (
          <section className="mx-4 mt-4 bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-amber-50 border-amber-100">
              <Shield className="w-4 h-4 text-amber-600" />
              <p className="font-bold text-[13px] text-amber-800">관리자 / 개발자 인증</p>
            </div>
            <div className="px-4 py-3 flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pwInput}
                  onChange={(e) => setPwInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  placeholder="관리자 / 개발자 비밀번호"
                  className="w-full h-11 border border-amber-200 rounded-xl pl-3 pr-9 text-[14px] outline-none bg-white"
                />
                <button onClick={() => setShowPw((p) => !p)} className="absolute right-2.5 top-3 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={handleAuth} disabled={authLoading || !pwInput.trim()} className="px-4 h-11 text-white rounded-xl font-bold text-[13px] bg-amber-500 disabled:opacity-40">
                {authLoading ? "..." : "인증"}
              </button>
            </div>
          </section>
        )}

        {/* Admin Panel Buttons (2x2 grid) */}
        {role !== "user" && (
          <section className="mx-4 mt-4 grid grid-cols-2 gap-2.5">
            {[
              { id: "gate" as AdminPanel, Icon: Settings, label: "게이트 설정", accent: "#003764", light: "bg-blue-50 border-blue-200" },
              { id: "visitors" as AdminPanel, Icon: Users, label: `방문자 로그`, accent: "#059669", light: "bg-emerald-50 border-emerald-200", badge: sessions.filter(s => s.status === "approved").length },
              { id: "pending" as AdminPanel, Icon: Clock, label: `승인 대기`, accent: "#D97706", light: "bg-amber-50 border-amber-200", badge: pendingSessions.length },
              ...(role === "developer" ? [{ id: "passwords" as AdminPanel, Icon: Key, label: "비밀번호 관리", accent: "#7C3AED", light: "bg-purple-50 border-purple-200" }] : []),
              { id: "security" as AdminPanel, Icon: Shield, label: "보안 프로필", accent: "#C60C30", light: "bg-red-50 border-red-200", badge: securityProfiles.length },
              { id: "remote" as AdminPanel, Icon: Radio, label: "원격 제어", accent: "#DC2626", light: "bg-red-50 border-red-200", badge: sessions.filter(s => s.status === "approved" && !s.kickedBy?.includes("원격")).length },
            ].map(({ id, Icon, label, accent, light, badge }) => (
              <button
                key={id}
                onClick={() => setPanel(panel === id ? "none" : id)}
                className={`flex items-center gap-2.5 px-3.5 py-3.5 rounded-2xl border-2 transition-all ${panel === id ? "border-current" : `border-transparent bg-white`} ${light}`}
                style={{ color: accent }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent + "18" }}>
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[12px] font-bold block leading-tight">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="text-[10px] font-bold" style={{ color: accent }}>{badge}명</span>
                  )}
                </div>
              </button>
            ))}
          </section>
        )}

        {/* ── GATE SETTINGS PANEL ── */}
        <AnimatePresence>
          {panel === "gate" && role !== "user" && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-2 overflow-hidden"
            >
              <div className="bg-white rounded-2xl border-2 border-[#003764] overflow-hidden shadow-md">
                <div className="px-4 py-3 bg-[#003764] flex items-center gap-2">
                  <Settings className="w-4 h-4 text-white" />
                  <p className="font-bold text-white text-[14px]">게이트 설정</p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900 text-[13px]">비밀번호 게이트</p>
                      <p className="text-[11px] text-gray-400">{gateEnabled ? "켜짐 — 비밀번호로 입장" : "꺼짐 — 누구나 입장"}</p>
                    </div>
                    <Toggle on={gateEnabled} onToggle={toggleGate} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900 text-[13px]">관리자 승인 모드</p>
                      <p className="text-[11px] text-gray-400">{approvalMode ? "켜짐 — 승인 후 입장" : "꺼짐 — 비밀번호만으로 입장"}</p>
                    </div>
                    <Toggle on={approvalMode} onToggle={toggleApproval} />
                  </div>

                  {/* Whitelist — dev만 수정, 관리자는 읽기전용 */}
                  <div className="py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[12px] font-bold text-gray-700">화이트리스트</p>
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">승인 면제</span>
                      {role !== "developer" && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold">읽기 전용</span>}
                    </div>
                    {role === "developer" && (
                      <div className="flex gap-2 mb-2">
                        <input
                          value={wlInput}
                          onChange={(e) => setWlInput(e.target.value.slice(0, 40))}
                          onKeyDown={(e) => e.key === "Enter" && addWhitelist()}
                          placeholder="이름 입력"
                          className="flex-1 h-9 border border-gray-200 rounded-xl px-3 text-[13px] outline-none focus:border-green-400 bg-gray-50"
                        />
                        <button onClick={addWhitelist} disabled={!wlInput.trim()} className="px-3 h-9 bg-green-500 text-white rounded-xl font-bold text-[12px] disabled:opacity-40">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {whitelist.length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center py-2">등록된 화이트리스트 없음</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {whitelist.map((name) => (
                          <div key={name} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full pl-3 pr-1 py-1">
                            <span className="text-[12px] font-bold text-green-800">{name}</span>
                            {role === "developer" && (
                              <button onClick={() => removeWhitelist(name)} className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center ml-0.5">
                                <X className="w-3 h-3 text-green-700" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 공지 — dev만 */}
                  {role === "developer" && (
                    <div className="py-2">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[12px] font-bold text-gray-700">전체 공지</p>
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">개발자 전용</span>
                      </div>
                      {notice && (
                        <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-[13px] font-bold text-gray-900 break-words whitespace-pre-wrap">{notice.text}</p>
                              <p className="text-[10px] text-gray-500 mt-1">{notice.author ?? ""} · {notice.time}</p>
                            </div>
                            <button onClick={deleteNotice} className="shrink-0 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[11px] font-bold flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> 삭제
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={noticeInput}
                          onChange={(e) => setNoticeInput(e.target.value.slice(0, 500))}
                          onKeyDown={(e) => e.key === "Enter" && postNotice()}
                          placeholder="공지 내용 입력"
                          className="flex-1 h-9 border border-purple-200 rounded-xl px-3 text-[13px] outline-none focus:border-purple-400 bg-gray-50"
                        />
                        <button onClick={postNotice} disabled={!noticeInput.trim()} className="px-3 h-9 bg-purple-500 text-white rounded-xl font-bold text-[11px] disabled:opacity-40">
                          {notice ? "교체" : "등록"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── VISITOR LOG PANEL ── */}
        <AnimatePresence>
          {panel === "visitors" && role !== "user" && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-2 overflow-hidden"
            >
              <div className="bg-white rounded-2xl border-2 border-emerald-500 overflow-hidden shadow-md">
                <div className="px-4 py-3 bg-emerald-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-white" />
                    <p className="font-bold text-white text-[14px]">방문자 로그 ({sessions.length}명)</p>
                    <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-300 live-dot" />
                      <span className="text-[9px] text-white font-bold">실시간</span>
                    </span>
                  </div>
                  <button onClick={loadSessions} className="text-white/70 active:text-white">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {sessions.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-[13px]">
                      <div className="text-3xl mb-2">👥</div>
                      방문자가 없습니다
                    </div>
                  ) : sessions.map((s) => (
                    <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-bold text-gray-600 text-[14px]">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[13px] text-gray-900">{s.name}</span>
                          {statusBadge(s)}
                          {s.isWhitelisted && <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">화이트</span>}
                          {s.warnings > 0 && <span className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold">경고{s.warnings}</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{s.time}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {role === "developer" && s.status === "approved" && (
                          <>
                            <button onClick={() => warn(s.id)} title="경고" className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center active:bg-orange-200">
                              <AlertTriangle className="w-4 h-4 text-orange-500" />
                            </button>
                            <button onClick={() => setDetailSession(s)} title="자세히 보기" className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center active:bg-blue-200">
                              <Info className="w-4 h-4 text-blue-500" />
                            </button>
                          </>
                        )}
                        {s.status === "approved" && (
                          <button onClick={() => kick(s.id)} title="강퇴" className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center active:bg-red-200">
                            <UserX className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── PENDING APPROVAL PANEL ── */}
        <AnimatePresence>
          {panel === "pending" && role !== "user" && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-2 overflow-hidden"
            >
              <div className="bg-white rounded-2xl border-2 border-amber-400 overflow-hidden shadow-md">
                <div className="px-4 py-3 bg-amber-500 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white" />
                    <p className="font-bold text-white text-[14px]">승인 대기 ({pendingSessions.length})</p>
                    <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-200 live-dot" />
                      <span className="text-[9px] text-white font-bold">실시간</span>
                    </span>
                  </div>
                  <button onClick={loadSessions} className="text-white/70">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {pendingSessions.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-[13px]">
                      <div className="text-3xl mb-2">✅</div>
                      대기 중인 사용자가 없습니다
                    </div>
                  ) : pendingSessions.map((s) => (
                    <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0 font-bold text-amber-700 text-[14px] border border-amber-200">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] text-gray-900">{s.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{s.time}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => approve(s.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-xl text-[11px] font-bold active:bg-green-600">
                          <CheckCircle className="w-3 h-3" /> 승인
                        </button>
                        <button onClick={() => reject(s.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-xl text-[11px] font-bold active:bg-red-600">
                          <XCircle className="w-3 h-3" /> 거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── PASSWORD MANAGEMENT (dev only) ── */}
        <AnimatePresence>
          {panel === "passwords" && role === "developer" && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-2 overflow-hidden"
            >
              <div className="bg-white rounded-2xl border-2 border-purple-400 overflow-hidden shadow-md">
                <div className="px-4 py-3 bg-purple-600 flex items-center gap-2">
                  <Key className="w-4 h-4 text-white" />
                  <p className="font-bold text-white text-[14px]">비밀번호 관리</p>
                  <span className="ml-auto text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">개발자 전용</span>
                </div>
                <div className="p-4 space-y-3">
                  {serverPasswords.accessPassword && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-[10px] text-gray-500 font-bold mb-1">현재 접속 비번</p>
                      <p className="text-[14px] font-mono font-bold text-gray-800">{serverPasswords.accessPassword}</p>
                    </div>
                  )}
                  {[
                    { label: "접속 비밀번호 (게이트)", value: newAccessPw, onChange: setNewAccessPw, ph: "새 접속 비번" },
                    { label: "관리자 비밀번호", value: newAdminPw, onChange: setNewAdminPw, ph: "새 관리자 비번" },
                    { label: "개발자 비밀번호", value: newDevPw, onChange: setNewDevPw, ph: "새 개발자 비번 (주의)" },
                  ].map(({ label, value, onChange, ph }) => (
                    <div key={label}>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">{label}</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                          placeholder={ph}
                          className="w-full h-10 border border-gray-200 rounded-xl pl-9 pr-3 text-[13px] outline-none focus:border-purple-400 bg-gray-50"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={savePasswords}
                    disabled={!newAccessPw && !newAdminPw && !newDevPw}
                    className="w-full h-10 bg-purple-600 text-white rounded-xl font-bold text-[13px] disabled:opacity-40"
                  >
                    비밀번호 저장
                  </button>
                  <p className="text-[11px] text-gray-400 text-center">비운 항목은 변경하지 않습니다</p>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── SECURITY PROFILES PANEL ── */}
        <AnimatePresence>
          {panel === "security" && role !== "user" && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-2 overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4">
                <p className="font-bold text-[13px] text-red-800 mb-1">보안 프로필 관리</p>
                <p className="text-[11px] text-gray-500 mb-3">코드, 이름, 사진을 설정하면 해당 코드로 입장하는 사용자는 수정 불가</p>

                <div className="space-y-2 mb-4">
                  <input value={secCode} onChange={(e) => setSecCode(e.target.value)} placeholder="입장 코드 (비밀번호)" className="w-full h-10 border border-gray-200 rounded-xl px-3 text-[13px] outline-none" />
                  <input value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="잠금 이름" className="w-full h-10 border border-gray-200 rounded-xl px-3 text-[13px] outline-none" />
                  <input type="file" accept="image/*" className="hidden" id="sec-photo-input" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const img = new Image();
                      img.onload = () => {
                        const scale = Math.min(1, 400 / img.width, 500 / img.height);
                        const w = Math.round(img.width * scale);
                        const h = Math.round(img.height * scale);
                        const canvas = document.createElement("canvas");
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext("2d")!;
                        ctx.drawImage(img, 0, 0, w, h);
                        setSecPhoto(canvas.toDataURL("image/jpeg", 0.85));
                      };
                      img.src = ev.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }} />
                  <div className="flex items-center gap-3">
                    <button onClick={() => document.getElementById("sec-photo-input")?.click()} className="h-10 px-4 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 bg-white">
                      갤러리/카메라 선택
                    </button>
                    {secPhoto && <img src={secPhoto} className="w-10 h-10 rounded-full object-cover border border-gray-200" />}
                  </div>
                  <button onClick={addSecurityProfile} disabled={!secCode.trim() || !secName.trim()} className="w-full h-10 bg-red-600 text-white rounded-xl font-bold text-[13px] disabled:opacity-40">
                    프로필 등록
                  </button>
                </div>

                {securityProfiles.length > 0 && (
                  <div className="space-y-2">
                    {securityProfiles.map((p) => (
                      <div key={p.code} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          {p.photo ? <img src={p.photo} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500">{p.name.charAt(0)}</div>}
                          <div>
                            <p className="text-[13px] font-bold text-gray-900">{p.name}</p>
                            <p className="text-[10px] text-gray-400">코드: {p.code}</p>
                          </div>
                        </div>
                        <button onClick={() => deleteSecurityProfile(p.code)} className="px-2 py-1 text-[11px] text-red-600 font-bold bg-red-50 rounded-lg">
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── REMOTE CONTROL PANEL ── */}
        <AnimatePresence>
          {panel === "remote" && role !== "user" && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-2 overflow-hidden"
            >
              <div className="bg-white rounded-2xl border-2 border-red-500 overflow-hidden shadow-md">
                <div className="px-4 py-3 bg-red-600 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-white" />
                  <p className="font-bold text-white text-[14px]">원격 제어 대상 목록</p>
                  <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">공인 필수</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {sessions.filter(s => s.status === "approved" && !s.kickedBy?.includes("원격")).length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-[13px]">
                      <div className="text-3xl mb-2">📱</div>
                      제어 가능한 접속 기기가 없습니다
                    </div>
                  ) : sessions.filter(s => s.status === "approved" && !s.kickedBy?.includes("원격")).map((s) => (
                    <div key={s.id} className="px-4 py-3">
                      <div className="flex items-center gap-3 mb-2.5">
                        <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0 font-bold text-red-600 text-[14px]">
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[13px] text-gray-900">{s.name}</span>
                          <p className="text-[10px] text-gray-400 truncate">{s.time}</p>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">연결 중</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => remoteCommand(s.id, "ALERT", window.prompt("전송할 메시지를 입력하세요") || "관리자 통지")} className="py-2 bg-gray-100 rounded-xl active:bg-gray-200 flex flex-col items-center gap-1">
                          <MessageSquare className="w-4 h-4 text-gray-600" />
                          <span className="text-[9px] font-bold text-gray-600">팬스 보내기</span>
                        </button>
                        <button onClick={() => { if (confirm("해당 기기의 모든 데이터를 삭제하겠습니까?\n★주의: 모든 localStorage와 싱분증 및 사진이 영구 삭제되며, 재부팅 후 복류 불가능합니다.")) remoteCommand(s.id, "WIPE"); }} className="py-2 bg-red-50 rounded-xl active:bg-red-100 flex flex-col items-center gap-1">
                          <Eraser className="w-4 h-4 text-red-600" />
                          <span className="text-[9px] font-bold text-red-600">원격 색제</span>
                        </button>
                        <button onClick={() => { if (confirm("해당 기기의 접속을 잠금하겠습니까?\n잠금 해제는 관리자 만이 가능합니다.")) remoteCommand(s.id, "LOCK"); }} className="py-2 bg-orange-50 rounded-xl active:bg-orange-100 flex flex-col items-center gap-1">
                          <Lock className="w-4 h-4 text-orange-600" />
                          <span className="text-[9px] font-bold text-orange-600">원격 잠금</span>
                        </button>
                        <button onClick={() => { if (confirm("해당 기기의 접속을 영구 차단하겠습니까?\n★주의: 이 기기의 지문은 영구적으로 차단되어 복류가 불가능합니다.")) remoteCommand(s.id, "BLOCK"); }} className="py-2 bg-red-100 rounded-xl active:bg-red-200 flex flex-col items-center gap-1">
                          <Zap className="w-4 h-4 text-red-700" />
                          <span className="text-[9px] font-bold text-red-700">원격 차단</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Quick links */}
        <section className="px-4 mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {[
              { Icon: FileText, label: "최근 본 서비스" },
              { Icon: Settings, label: "회원정보 수정" },
            ].map(({ Icon: Icon2, label }) => (
              <button key={label} className="w-full p-4 flex items-center justify-between bg-white active:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                    <Icon2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="font-medium text-gray-800 text-sm">{label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </section>

        <div className="py-8 flex flex-col items-center gap-1">
          <p className="text-[11px] text-gray-300 font-medium tracking-widest uppercase">대한민국 정부</p>
          <p className="text-[15px] text-gray-400 font-bold">정부24</p>
        </div>
      </div>
    </div>
  );
}
