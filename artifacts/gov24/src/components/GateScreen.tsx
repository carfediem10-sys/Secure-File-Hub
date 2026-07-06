import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Clock, X, AlertTriangle, Lock } from "lucide-react";

interface GateStatus {
  status: "none" | "pending" | "approved" | "rejected" | "kicked" | "blocked" | "wrong_password";
  gateEnabled: boolean;
  approvalRequired: boolean;
  rejectedBy?: string;
  kickedBy?: string;
  warnings?: number;
  error?: string;
}

function getSessionId() {
  let id = localStorage.getItem("gov24_session_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("gov24_session_id", id); }
  return id;
}

interface Props {
  children: React.ReactNode;
}

export default function GateScreen({ children }: Props) {
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [name, setName] = useState(localStorage.getItem("gov24_gate_name") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionId = getSessionId();

  const checkStatus = useCallback(async () => {
    try {
      const r = await fetch(`/api/gate/status?sessionId=${sessionId}`);
      const d = await r.json() as GateStatus & { lockedProfile?: { name: string; photo: string } };
      setGateStatus(d);
      // 잠긴 프로필 적용
      if (d.lockedProfile) {
        localStorage.setItem("gov24_user", JSON.stringify({ name: d.lockedProfile.name }));
        if (d.lockedProfile.photo) localStorage.setItem("gov24_user_photo", d.lockedProfile.photo);
        localStorage.setItem("gov24_profile_locked", "1");
      }
    } catch { /* network error - show app */ setGateStatus({ status: "approved", gateEnabled: false, approvalRequired: false }); }
  }, [sessionId]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  // Poll continuously in all gate states
  useEffect(() => {
    if (gateStatus === null) return;
    const intervals: Record<string, number> = {
      pending: 2000,
      none: 3000,    // re-check if gate gets disabled
      approved: 5000, // detect kicks
      rejected: 0,
      kicked: 0,
    };
    const ms = intervals[gateStatus.status];
    if (!ms) return;
    // Don't poll approved if gate is disabled (no need)
    if (gateStatus.status === "approved" && !gateStatus.gateEnabled) return;
    const t = setInterval(checkStatus, ms);
    return () => clearInterval(t);
  }, [gateStatus?.status, gateStatus?.gateEnabled, checkStatus]);

  async function handleEnter() {
    if (!name.trim()) { setError("이름을 입력해주세요"); return; }
    setLoading(true); setError("");
    try {
      localStorage.setItem("gov24_gate_name", name.trim());
      // Also sync name to gov24_user
      const existingUser = JSON.parse(localStorage.getItem("gov24_user") ?? "{}");
      localStorage.setItem("gov24_user", JSON.stringify({ ...existingUser, name: name.trim() }));

      const r = await fetch("/api/gate/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password, sessionId }),
      });
      const d = await r.json() as { status: string; role?: string };
      if (d.status === "wrong_password") {
        setError("비밀번호가 올바르지 않습니다");
      } else {
        // 관리자/개발자 비밀번호 입력 시 자동 역할 부여
        if (d.role === "admin" || d.role === "developer") {
          localStorage.setItem("gov24_role_pw", password);
        }
        await checkStatus();
      }
    } catch { setError("서버 오류가 발생했습니다"); }
    finally { setLoading(false); }
  }

  function handleReset() {
    localStorage.removeItem("gov24_session_id");
    localStorage.removeItem("gov24_gate_name");
    window.location.reload();
  }

  if (gateStatus === null) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#003764]/20 border-t-[#003764] rounded-full animate-spin" />
      </div>
    );
  }

  // Gate disabled or approved
  if (!gateStatus.gateEnabled || gateStatus.status === "approved") {
    return <>{children}</>;
  }

  // Device blocked
  if (gateStatus.status === "blocked") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 gap-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-900 mb-2">접속 차단됨</h2>
          <p className="text-[14px] text-gray-500">
            보안 정책에 의해 해당 기기의 접속이 차단되었습니다.
          </p>
        </div>
      </div>
    );
  }

  // Rejected
  if (gateStatus.status === "rejected") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 gap-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-900 mb-2">입장 거절됨</h2>
          <p className="text-[14px] text-gray-500">
            {gateStatus.rejectedBy ?? "관리자"}에 의해 승인 거절 되었습니다.
          </p>
        </div>
        <button onClick={handleReset} className="mt-4 h-12 px-8 bg-gray-800 text-white font-bold rounded-2xl text-[14px]">
          다시 시도
        </button>
      </div>
    );
  }

  // Kicked
  if (gateStatus.status === "kicked") {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 gap-6">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-orange-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-900 mb-2">강퇴되었습니다</h2>
          <p className="text-[14px] text-gray-500">
            {gateStatus.kickedBy === "경고 누적"
              ? "경고 누적으로 인해 영구 퇴장 처리되었습니다."
              : `${gateStatus.kickedBy ?? "관리자"}에 의해 강퇴되었습니다.`}
          </p>
        </div>
        <button onClick={handleReset} className="mt-4 h-12 px-8 bg-gray-800 text-white font-bold rounded-2xl text-[14px]">
          재접속 시도
        </button>
      </div>
    );
  }

  // Pending approval
  if (gateStatus.status === "pending") {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#F4F7FC] to-white flex flex-col items-center justify-center p-8 gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center"
        >
          <Clock className="w-10 h-10 text-amber-500" />
        </motion.div>
        <div className="text-center">
          <h2 className="text-xl font-black text-gray-900 mb-2">승인 대기 중</h2>
          <p className="text-[14px] text-gray-500">
            관리자의 입장 승인을 기다리고 있습니다.<br />
            <span className="font-bold text-gray-700">{name}</span>님, 잠시만 기다려 주세요.
          </p>
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-amber-400 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </div>
        <button onClick={handleReset} className="mt-4 text-[12px] text-gray-400 underline">
          처음으로 돌아가기
        </button>
      </div>
    );
  }

  // Entry form (status === "none" or needs to enter)
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#EEF2F7] to-white flex flex-col">
      <div className="bg-[#EEF2F7] border-b border-gray-200 px-4 py-1 flex items-center gap-2 shrink-0">
        <span className="text-[10px]">🇰🇷</span>
        <p className="text-[10px] text-gray-500">이 누리집은 대한민국 공식 전자정부 누리집입니다.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-0">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/gov24-logo.png" alt="정부24" className="h-16 w-auto mx-auto mb-4 object-contain" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-[#003764]" />
              <span className="text-[13px] font-bold text-[#003764]">비밀번호로 보호된 공간입니다</span>
            </div>
            <p className="text-[12px] text-gray-400">이름과 비밀번호를 입력해 입장하세요</p>
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-gray-600 mb-1.5">이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEnter()}
                placeholder="이름을 입력하세요"
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-[14px] outline-none focus:border-[#003764] focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-gray-600 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEnter()}
                placeholder="비밀번호를 입력하세요"
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-[14px] outline-none focus:border-[#003764] focus:bg-white transition-colors"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-red-500 text-[12px] font-medium"
                >
                  <X className="w-3.5 h-3.5" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleEnter}
              disabled={loading || !name.trim()}
              className="w-full h-13 py-3.5 bg-[#003764] text-white rounded-xl font-bold text-[15px] disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {loading ? "확인 중..." : gateStatus.approvalRequired ? "입장 신청" : "입장"}
            </button>

            {gateStatus.approvalRequired && (
              <p className="text-[11px] text-gray-400 text-center">
                🔐 관리자 승인 후 입장됩니다
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5 text-gray-300" />
            <p className="text-[11px] text-gray-300">정부24 보안 게이트</p>
          </div>
        </div>
      </div>
    </div>
  );
}
