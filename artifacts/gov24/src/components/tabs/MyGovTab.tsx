import { useState, useEffect, useCallback } from "react";
import {
  Bell, Settings, FileText, Shield, Gift, Star, ChevronRight,
  Eye, EyeOff, RefreshCw, Trash2, Plus, X, Users, AlertTriangle,
  CheckCircle, XCircle, UserX, Clock, Info, Key, Lock
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
      style={{ background: on ? "#1a1a1a" : "#D1D5DB" }}
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

type AdminPanel = "none" | "gate" | "visitors" | "pending" | "passwords";

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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  async function loadConfig() {
    try {
      const r = await fetch(`/api/gate/config?sessionId=${sessionId}`);
      const d = await r.json();
      setGateEnabled(d.gateEnabled ?? false);
      setApprovalMode(d.approvalRequired ?? false);
      setWhitelist(d.whitelist ?? []);
      if (d.role === "admin") setRole("admin");
      if (d.role === "developer") setRole("developer");
      setServerPasswords({ accessPassword: d.accessPassword, adminPassword: d.adminPassword });
    } catch {}
  }

  async function loadSessions() {
    try {
      const r = await fetch(`/api/gate/sessions?sessionId=${sessionId}`);
      const d = await r.json();
      if (d.sessions) setSessions(d.sessions);
    } catch {}
  }

  async function loadNotice() {
    try {
      const r = await fetch("/api/gate/notice");
      const d = await r.json();
      if (d.notice) setNotice(d.notice);
    } catch {}
  }

  const refreshAll = useCallback(() => {
    loadConfig();
    loadNotice();
    if (role !== "user") loadSessions();
  }, [role, sessionId]);

  useEffect(() => {
    const d = getUserData();
    if (d.name) { setUser(d); setLoggedIn(true); }
    refreshAll();
  }, []);

  useEffect(() => {
    if (role === "user") return;
    const t = setInterval(loadSessions, 4000);
    return () => clearInterval(t);
  }, [role, sessionId]);

  async function handleAuth() {
    if (!pwInput.trim()) return;
    setAuthLoading(true);
    try {
      const res = await fetch("/api/gate/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwInput, sessionId }),
      });
      const d = await res.json();
      if (d.role === "developer") { setRole("developer"); showToast("개발자 인증 완료"); await loadConfig(); await loadSessions(); }
      else if (d.role === "admin") { setRole("admin"); showToast("관리자 인증 완료"); await loadConfig(); await loadSessions(); }
      else showToast("비밀번호가 올바르지 않습니다");
    } catch { showToast("서버 오류"); }
    finally { setAuthLoading(false); setPwInput(""); }
  }

  async function postConfig(updates: object) {
    const r = await fetch("/api/gate/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...updates }),
    });
    const d = await r.json();
    if (d.error === "admin_only") { showToast("권한이 없습니다"); return false; }
    return true;
  }

  async function toggleGate() {
    const next = !gateEnabled;
    if (await postConfig({ gateEnabled: next })) { setGateEnabled(next); showToast(next ? "게이트 켜짐" : "게이트 꺼짐"); }
  }

  async function toggleApproval() {
    const next = !approvalMode;
    if (await postConfig({ approvalRequired: next })) { setApprovalMode(next); showToast(next ? "승인 모드 켜짐" : "승인 모드 꺼짐"); }
  }

  async function addWhitelist() {
    if (!wlInput.trim()) return;
    const r = await fetch("/api/gate/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wlInput.trim(), sessionId }),
    });
    const d = await r.json();
    if (d.whitelist) { setWhitelist(d.whitelist); setWlInput(""); }
  }

  async function removeWhitelist(name: string) {
    const r = await fetch(`/api/gate/whitelist/${encodeURIComponent(name)}?sessionId=${sessionId}`, { method: "DELETE" });
    const d = await r.json();
    if (d.whitelist) setWhitelist(d.whitelist);
  }

  async function approve(targetId: string) {
    await fetch("/api/gate/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    showToast("승인했습니다"); loadSessions();
  }

  async function reject(targetId: string) {
    await fetch("/api/gate/reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    showToast("거절했습니다"); loadSessions();
  }

  async function kick(targetId: string) {
    await fetch("/api/gate/kick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    showToast("강퇴했습니다"); loadSessions();
  }

  async function warn(targetId: string) {
    const r = await fetch("/api/gate/warn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, targetId }) });
    const d = await r.json();
    if (d.kicked) showToast("경고 2회 누적 — 영구 퇴장");
    else showToast(`경고 ${d.warnings}회 누적`);
    loadSessions();
  }

  async function postNotice() {
    if (!noticeInput.trim()) return;
    const r = await fetch("/api/gate/notice", {
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
    const ok = await postConfig({ accessPassword: newAccessPw || undefined, adminPassword: newAdminPw || undefined, developerPassword: newDevPw || undefined });
    if (ok) { showToast("비밀번호가 변경됐습니다"); setNewAccessPw(""); setNewAdminPw(""); setNewDevPw(""); loadConfig(); }
  }

  function handleLogin() {
    const name = localStorage.getItem("gov24_gate_name") || "홍길동";
    const data = { name };
    localStorage.setItem("gov24_user", JSON.stringify(data));
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
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-y-auto no-scrollbar">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-50 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-lg"
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
                <h3 className="font-black text-[16px]">상세 정보 — {detailSession.name}</h3>
                <button onClick={() => setDetailSession(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {detailSession.profile ? (
                <div className="space-y-3">
                  {detailSession.profile.photo && (
                    <div className="flex justify-center mb-4">
                      <img src={detailSession.profile.photo as string} alt="증명사진" className="w-24 h-32 object-cover rounded-xl border border-gray-200" />
                    </div>
                  )}
                  {[
                    { label: "이름", key: "name" },
                    { label: "주소", key: "addr1", extra: (p: Record<string,unknown>) => [p.addr2, p.addr3].filter(Boolean).join(" ") },
                    { label: "주민번호 앞", key: "numberFront" },
                    { label: "생년월일", key: "numberFront", format: (v: string) => v ? `${v.slice(0,2)}년 ${v.slice(2,4)}월 ${v.slice(4,6)}일` : "—" },
                    { label: "발급일자", key: "issueDate" },
                    { label: "발급기관", key: "issuer" },
                  ].map(({ label, key, extra, format }) => {
                    const val = detailSession.profile![key] as string ?? "";
                    const display = format ? format(val) : extra ? `${val} ${extra(detailSession.profile!)}` : val;
                    return (
                      <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50">
                        <span className="text-[11px] text-gray-400 font-semibold w-20 shrink-0">{label}</span>
                        <span className="text-[13px] text-gray-800 font-medium break-all">{display || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Info className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-[13px]">모바일 신분증 정보 없음</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">MY정부24</h1>
        <div className="flex items-center gap-2">
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

      {/* Profile Card */}
      <section className="bg-white p-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#003764] to-blue-500 rounded-full flex items-center justify-center shadow-inner relative">
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
          <button onClick={() => { setLoggedIn(false); setRole("user"); }} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-6">
          {MY_ITEMS.map(({ Icon, label, count }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center relative">
                <Icon className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C60C30] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{count}</span>
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Admin Auth (if not already admin/dev) */}
      {role === "user" && (
        <section className="mx-4 mt-3 bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-amber-50 border-amber-100">
            <Shield className="w-4 h-4 text-amber-600" />
            <p className="font-bold text-[13px] text-amber-800">관리자 / 개발자 인증</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pwInput}
                  onChange={(e) => setPwInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  placeholder="관리자/개발자 비밀번호"
                  className="w-full h-10 border border-amber-200 rounded-xl pl-3 pr-9 text-[14px] outline-none bg-white"
                />
                <button onClick={() => setShowPw((p) => !p)} className="absolute right-2.5 top-2.5 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={handleAuth} disabled={authLoading || !pwInput.trim()} className="px-4 h-10 text-white rounded-xl font-bold text-[13px] bg-amber-500 disabled:opacity-40">
                {authLoading ? "중..." : "인증"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Admin Panel Buttons */}
      {role !== "user" && (
        <section className="mx-4 mt-3 grid grid-cols-2 gap-2">
          {[
            { id: "gate" as AdminPanel, Icon: Settings, label: "게이트 설정", color: "#003764", bg: "bg-blue-50" },
            { id: "visitors" as AdminPanel, Icon: Users, label: `방문자 로그 (${sessions.length})`, color: "#059669", bg: "bg-green-50", badge: sessions.filter(s => s.status === "approved").length },
            { id: "pending" as AdminPanel, Icon: Clock, label: `승인 대기 (${pendingSessions.length})`, color: "#D97706", bg: "bg-amber-50", badge: pendingSessions.length },
            ...(role === "developer" ? [{ id: "passwords" as AdminPanel, Icon: Key, label: "비밀번호 관리", color: "#7C3AED", bg: "bg-purple-50" }] : []),
          ].map(({ id, Icon, label, color, bg, badge }) => (
            <button
              key={id}
              onClick={() => setPanel(panel === id ? "none" : id)}
              className={`flex items-center gap-2 px-3 py-3 rounded-2xl border-2 transition-all ${panel === id ? "border-current" : "border-transparent bg-white"} ${bg}`}
              style={{ color }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[12px] font-bold flex-1 text-left leading-tight">{label}</span>
              {badge ? <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{badge}</span> : null}
            </button>
          ))}
        </section>
      )}

      {/* ── GATE SETTINGS PANEL ── */}
      <AnimatePresence>
        {panel === "gate" && role !== "user" && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 bg-white rounded-2xl border-2 border-[#003764] overflow-hidden shadow-md"
          >
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

              {/* Whitelist (dev only) */}
              {role === "developer" && (
                <div className="py-2 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-[12px] font-bold text-gray-700">화이트리스트</p>
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">승인 면제</span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={wlInput}
                      onChange={(e) => setWlInput(e.target.value.slice(0, 40))}
                      onKeyDown={(e) => e.key === "Enter" && addWhitelist()}
                      placeholder="이름 입력"
                      className="flex-1 h-9 border border-gray-200 rounded-xl px-3 text-[13px] outline-none focus:border-green-400 bg-white"
                    />
                    <button onClick={addWhitelist} className="px-3 h-9 bg-green-500 text-white rounded-xl font-bold text-[12px]">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {whitelist.length === 0 ? (
                    <p className="text-[11px] text-gray-400 text-center py-1">등록된 화이트리스트 없음</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {whitelist.map((name) => (
                        <div key={name} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full pl-3 pr-1 py-1">
                          <span className="text-[12px] font-bold text-green-800">{name}</span>
                          <button onClick={() => removeWhitelist(name)} className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center">
                            <X className="w-3 h-3 text-green-700" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notice (dev only) */}
              {role === "developer" && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 mb-2">
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
                      className="flex-1 h-9 border border-purple-200 rounded-xl px-3 text-[13px] outline-none focus:border-purple-400 bg-white"
                    />
                    <button onClick={postNotice} disabled={!noticeInput.trim()} className="px-3 h-9 bg-purple-500 text-white rounded-xl font-bold text-[11px] disabled:opacity-40">
                      {notice ? "교체" : "등록"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── VISITOR LOG PANEL ── */}
      <AnimatePresence>
        {panel === "visitors" && role !== "user" && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 bg-white rounded-2xl border-2 border-green-500 overflow-hidden shadow-md"
          >
            <div className="px-4 py-3 bg-green-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <p className="font-bold text-white text-[14px]">방문자 로그</p>
              </div>
              <button onClick={loadSessions} className="text-white/70 active:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto no-scrollbar">
              {sessions.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[13px]">방문자가 없습니다</div>
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
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.time}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Dev only: warn + details */}
                    {role === "developer" && s.status === "approved" && (
                      <>
                        <button onClick={() => warn(s.id)} title="경고" className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center active:bg-orange-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                        </button>
                        <button onClick={() => setDetailSession(s)} title="자세히 보기" className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center active:bg-blue-200">
                          <Info className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                      </>
                    )}
                    {/* Admin + Dev: kick */}
                    {s.status === "approved" && (
                      <button onClick={() => kick(s.id)} title="강퇴" className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center active:bg-red-200">
                        <UserX className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── PENDING APPROVAL PANEL ── */}
      <AnimatePresence>
        {panel === "pending" && role !== "user" && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 bg-white rounded-2xl border-2 border-amber-400 overflow-hidden shadow-md"
          >
            <div className="px-4 py-3 bg-amber-500 flex items-center gap-2">
              <Clock className="w-4 h-4 text-white" />
              <p className="font-bold text-white text-[14px]">승인 대기 목록</p>
            </div>
            <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto no-scrollbar">
              {pendingSessions.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[13px]">대기 중인 사용자가 없습니다</div>
              ) : pendingSessions.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0 font-bold text-amber-700 text-[14px] border border-amber-200">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] text-gray-900">{s.name}</p>
                    <p className="text-[10px] text-gray-400">{s.time}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => approve(s.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 text-white rounded-xl text-[11px] font-bold">
                      <CheckCircle className="w-3 h-3" /> 승인
                    </button>
                    <button onClick={() => reject(s.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-xl text-[11px] font-bold">
                      <XCircle className="w-3 h-3" /> 거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── PASSWORD MANAGEMENT PANEL (dev only) ── */}
      <AnimatePresence>
        {panel === "passwords" && role === "developer" && (
          <motion.section
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 bg-white rounded-2xl border-2 border-purple-400 overflow-hidden shadow-md"
          >
            <div className="px-4 py-3 bg-purple-600 flex items-center gap-2">
              <Key className="w-4 h-4 text-white" />
              <p className="font-bold text-white text-[14px]">비밀번호 관리</p>
              <span className="ml-auto text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">개발자 전용</span>
            </div>
            <div className="p-4 space-y-3">
              {serverPasswords.accessPassword && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-3">
                  <p className="text-[11px] text-gray-500 font-bold mb-1">현재 접속 비번</p>
                  <p className="text-[14px] font-mono font-bold text-gray-800">{serverPasswords.accessPassword}</p>
                </div>
              )}
              {[
                { label: "접속 비밀번호 (게이트)", value: newAccessPw, onChange: setNewAccessPw, placeholder: "새 접속 비번" },
                { label: "관리자 비밀번호", value: newAdminPw, onChange: setNewAdminPw, placeholder: "새 관리자 비번" },
                { label: "개발자 비밀번호", value: newDevPw, onChange: setNewDevPw, placeholder: "새 개발자 비번" },
              ].map(({ label, value, onChange, placeholder }) => (
                <div key={label}>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full h-10 border border-gray-200 rounded-xl pl-9 pr-3 text-[13px] outline-none focus:border-purple-400 bg-white"
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
              <p className="text-[11px] text-gray-400 text-center">비우면 변경하지 않습니다</p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Quick links */}
      <section className="px-5 mt-4 pb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {[
            { Icon: FileText, label: "최근 본 서비스" },
            { Icon: Settings, label: "회원정보 수정" },
          ].map(({ Icon: Icon2, label }) => (
            <button key={label} className="w-full p-4 flex items-center justify-between bg-white">
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
  );
}
