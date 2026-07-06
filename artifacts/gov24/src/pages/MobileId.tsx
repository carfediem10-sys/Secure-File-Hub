import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";
import { useLocation } from "wouter";
import { ChevronLeft, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

// ── WebAuthn helpers ────────────────────────────────────────────────────────

const BIO_KEY = "gov24_bio_cred_id";

function b64encode(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function randomChallenge() {
  const c = new Uint8Array(32);
  crypto.getRandomValues(c);
  return c;
}

async function bioIsAvailable(): Promise<boolean> {
  try {
    if (typeof window.PublicKeyCredential === "undefined") return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

async function bioRegister(): Promise<string> {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: "정부24", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode("gov24-mobile-id"),
        name: "gov24",
        displayName: "정부24 사용자",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;
  if (!cred) throw new Error("등록 취소됨");
  return b64encode(cred.rawId);
}

async function bioAuthenticate(credId: string): Promise<void> {
  const result = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      allowCredentials: [{ type: "public-key", id: b64decode(credId) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  if (!result) throw new Error("인증 취소됨");
}

// ── Fingerprint SVG icon ────────────────────────────────────────────────────
function FingerprintIcon({ size = 56, color = "#003764", animated = false }: { size?: number; color?: string; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <motion.path
        animate={animated ? { pathLength: [0, 1], opacity: [0.4, 1] } : {}}
        transition={{ duration: 1.2, ease: "easeInOut", repeat: animated ? Infinity : 0, repeatType: "reverse" }}
        d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28z"
        fill={color}
      />
      <motion.path
        animate={animated ? { pathLength: [0, 1], opacity: [0.3, 1] } : {}}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.1, repeat: animated ? Infinity : 0, repeatType: "reverse" }}
        d="M3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 6.07c1.5.76 2.76 1.86 3.75 3.27.16.23.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.27-2.05-2.28-3.43-2.99-2.87-1.83-6.61-1.83-9.48 0-1.38.71-2.53 1.72-3.43 2.99-.09.14-.25.2-.4.2z"
        fill={color}
      />
      <motion.path
        animate={animated ? { pathLength: [0, 1], opacity: [0.3, 1] } : {}}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2, repeat: animated ? Infinity : 0, repeatType: "reverse" }}
        d="M7.3 19.5c-.1 0-.2-.03-.28-.08-.22-.15-.27-.46-.12-.68 1.23-1.75 1.88-3.83 1.88-6.01 0-1.82-.49-3.53-1.42-5.07-.14-.23-.06-.54.17-.68.23-.14.54-.06.68.17 1.03 1.7 1.57 3.6 1.57 5.58 0 2.37-.71 4.63-2.06 6.55-.1.13-.25.22-.42.22z"
        fill={color}
      />
      <motion.path
        animate={animated ? { pathLength: [0, 1], opacity: [0.3, 1] } : {}}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.3, repeat: animated ? Infinity : 0, repeatType: "reverse" }}
        d="M12.01 22c-.18 0-.34-.1-.43-.26-.45-.82-.68-1.68-.68-2.56 0-2.83.97-5.41 2.73-7.28.19-.2.5-.21.7-.02.2.19.21.5.02.7-1.6 1.7-2.45 4.05-2.45 6.6 0 .72.2 1.43.59 2.1.14.24.06.55-.18.69-.08.02-.17.03-.3.03z"
        fill={color}
      />
      <motion.path
        animate={animated ? { pathLength: [0, 1], opacity: [0.3, 1] } : {}}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.15, repeat: animated ? Infinity : 0, repeatType: "reverse" }}
        d="M16.71 19.71c-.06 0-.12-.01-.18-.04-.26-.1-.38-.39-.28-.65.33-.86.49-1.77.49-2.71 0-2.07-.64-4.04-1.87-5.72-.15-.22-.1-.53.12-.68.22-.15.53-.1.68.12 1.37 1.87 2.07 4.06 2.07 6.28 0 1.03-.18 2.04-.55 3-.08.19-.26.4-.48.4z"
        fill={color}
      />
      <motion.path
        animate={animated ? { pathLength: [0, 1], opacity: [0.3, 1] } : {}}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.25, repeat: animated ? Infinity : 0, repeatType: "reverse" }}
        d="M12 10c-1.1 0-2 .9-2 2 0 1.81-.28 3.6-.83 5.33-.09.27.06.57.34.66.27.09.57-.06.66-.34C10.72 15.84 11 13.94 11 12c0-.55.45-1 1-1s1 .45 1 1c0 2.97-.55 5.84-1.63 8.54-.1.27.04.57.31.67.06.02.12.03.18.03.21 0 .41-.13.49-.33C13.46 18.12 14 15.11 14 12c0-1.1-.9-2-2-2z"
        fill={color}
      />
    </svg>
  );
}

const PIN_COUNT = 30;

// ── 랜덤 기본값 생성기 ───────────────────────────────────────────

const NAMES = ["김민수", "이지은", "박준호", "최서연", "정우진", "강다연", "송현우", "윤소희", "임재혁", "한가을", "오지현", "신영식", "정미지", "로준석", "홍길동", "신길숙", "안정원", "남순철", "두승호", "김정은", "백지환", "최영수", "유지훈", "한미숙", "오승철", "신은비", "김소연", "정지원", "안수빈", "박지원"];
const CITIES = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "수원", "성남", "고양", "부천", "안양", "안산", "용인", "화성", "춠처시", "원주", "청주시", "천안시", "전주시", "목포시", "포항시", "창원시", "제주시", "세종시", "의정부", "시흥시", "파주시", "김포시", "광명시"];
const GUS = ["강남", "서초", "송파", "마포", "영등포", "동작", "관악", "강서", "양천", "구로", "금천", "노원", "도봉", "강북", "성북", "중랹", "동대문", "광진", "성동", "용산", "종로", "중구", "은평", "서대문", "사상", "영도", "백월", "담양", "근허", "잠실"];
const ROADS = ["테헤란로", "강남대로", "서초대로", "마포대로", "영등포로", "올림픽대로", "백제고분로", "양재대로", "남부순환로", "백부춤화로", "병탄대로", "산성대로", "월갑북로", "용산로", "최종로", "잠실로", "담양로", "근허로", "남대문로", "대로"];
const DETAILS = ["101동 1201호", "202동 305호", "3층", "4호", "7동 1203호", "A동 501호", "B동 802호", "1101호", "203호", "502호", "301호", "102호", "603호", "1502호", "701호", "12동 304호", "3동 1002호", "8동 601호", "902호", "401호"];
const DL_TYPES = ["1종 보통", "2종 보통", "1종 대형", "2종 소형", "1종 특수", "2종 월통"];
const RRN_GENDER_START = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pad2(n: number) { return String(n).padStart(2, "0"); }
function pad4(n: number) { return String(n).padStart(4, "0"); }

function generateRandomResident() {
  const name = rand(NAMES);
  const year = randInt(1990, 2005);
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  const numberFront = pad2(year % 100) + pad2(month) + pad2(day);
  const numberBack = rand(RRN_GENDER_START) + String(randInt(100000, 999999));
  const city = rand(CITIES);
  const gu = rand(GUS);
  const road = rand(ROADS);
  const roadNum = randInt(1, 200);
  const issueDate = String(randInt(2021, 2024)) + pad2(randInt(1, 12)) + pad2(randInt(1, 28));
  const issuer = rand([
    `${city} ${gu}구청`, `${city} ${gu}구청`, `${city} ${gu}구청`,
    `${city} ${gu}경찰서`, `${city} ${gu}경찰서`, `${city}시청`,
  ]);
  const addr1 = city;
  const addr2 = `${gu}${road} ${roadNum}`;
  const addr3 = rand(DETAILS);
  return {
    name,
    issueDate,
    numberFront,
    numberBack,
    addr1,
    addr2,
    addr3,
    issuer,
    photo: "",
  };
}

function generateRandomDL() {
  const name = rand(NAMES);
  const dlNum = `${randInt(11, 28)}-${pad2(randInt(0, 23))}-${pad4(randInt(0, 9999))}-${pad2(randInt(0, 99))}`;
  const type = rand(DL_TYPES);
  const year = randInt(1990, 2005);
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  const numFront = pad2(year % 100) + pad2(month) + pad2(day);
  const issueYear = randInt(2021, 2024);
  const issueDate = String(issueYear) + pad2(randInt(1, 12)) + pad2(randInt(1, 28));
  const expiry = String(issueYear + 10) + pad2(randInt(1, 12)) + pad2(randInt(1, 28));
  const city = rand(CITIES);
  const gu = rand(GUS);
  const road = rand(ROADS);
  const roadNum = randInt(1, 200);
  const issuer = rand([`${city} ${gu}경찰서`, `${city} ${gu}경찰서`, `${city} 경찰서`]);
  const addr1 = city;
  const addr2 = `${gu}${road} ${roadNum}`;
  return {
    dlName: name,
    dlNumber: dlNum,
    dlType: type,
    dlNumFront: numFront,
    dlIssueDate: issueDate,
    dlExpiry: expiry,
    dlAddr1: addr1,
    dlAddr2: addr2,
    dlIssuer: issuer,
    photo: "",
  };
}

function getResidentData() {
  try {
    const d = localStorage.getItem("gov24_user");
    if (d) {
      const parsed = JSON.parse(d);
      const photo = localStorage.getItem("gov24_user_photo") ?? "";
      return { ...parsed, photo };
    }
    // 저장된 데이터 없음 → 랜덤 기본값 생성 & 저장
    const defaults = generateRandomResident();
    localStorage.setItem("gov24_user", JSON.stringify(defaults));
    return defaults;
  } catch {
    return generateRandomResident();
  }
}

function getDLData() {
  try {
    const d = localStorage.getItem("gov24_dl");
    if (d) {
      const parsed = JSON.parse(d);
      const photo = localStorage.getItem("gov24_dl_photo") ?? "";
      return { ...parsed, photo };
    }
    const defaults = generateRandomDL();
    localStorage.setItem("gov24_dl", JSON.stringify(defaults));
    return defaults;
  } catch {
    return generateRandomDL();
  }
}

function saveResidentData(data: Record<string, string>) {
  try {
    const { photo, ...rest } = data;
    localStorage.setItem("gov24_user", JSON.stringify(rest));
    if (photo) localStorage.setItem("gov24_user_photo", photo);
    else localStorage.removeItem("gov24_user_photo");
  } catch {}
}

function saveDLData(data: Record<string, string>) {
  try {
    const { photo, ...rest } = data;
    localStorage.setItem("gov24_dl", JSON.stringify(rest));
    if (photo) localStorage.setItem("gov24_dl_photo", photo);
    else localStorage.removeItem("gov24_dl_photo");
  } catch {}
}

function shuffleNums() {
  const arr = ["0","1","2","3","4","5","6","7","8","9"];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [...arr, "", "⌫"];
}

function fmt8(d: string) {
  if (!d || d.length !== 8) return d || "";
  return `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4,6)}.${d.slice(6,8)}`;
}

async function compressImage(src: string) {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 400 / img.width, 500 / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function syncProfile(data: Record<string, unknown>) {
  try {
    const sessionId = localStorage.getItem("gov24_session_id") ?? (() => {
      const id = crypto.randomUUID();
      localStorage.setItem("gov24_session_id", id);
      return id;
    })();
    await fetch(api("/api/gate/profile"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, profile: data }),
    }).catch(() => {});
  } catch {}
}

function buildQrData(res: Record<string, string>) {
  const payload = {
    n: res.name || "",
    birth: res.numberFront || "",
    b: res.numberBack || "",
    a: [res.addr1, res.addr2, res.addr3].filter(Boolean).join(" "),
    i: res.issueDate || "",
    r: res.issuer || "",
    t: "R",
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_");
  return `${window.location.origin}/adult-verify?d=${encoded}`;
}

function buildDLQrData(dl: Record<string, string>) {
  const payload = {
    n: dl.dlName || "",
    birth: dl.dlNumFront || "",
    num: dl.dlNumber || "",
    type: dl.dlType || "",
    exp: dl.dlExpiry || "",
    t: "D",
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_");
  return `${window.location.origin}/adult-verify?d=${encoded}`;
}

function DarkToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
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

type Screen = "pin" | "auth" | "bio-auth" | "bio-register" | "id";
type IdTab = "주민등록증" | "운전면허증";
type BioState = "idle" | "scanning" | "success" | "error";

export default function MobileIdPage() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<Screen>("pin");
  const [pin, setPin] = useState("");
  const [timer, setTimer] = useState(PIN_COUNT);
  const [showNum, setShowNum] = useState(false);
  const [idTab, setIdTab] = useState<IdTab>("주민등록증");
  const [nums, setNums] = useState(shuffleNums);
  const [editMode, setEditMode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toast, setToast] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Biometric state ─────────────────────────────────────────
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioState, setBioState] = useState<BioState>("idle");
  const [bioError, setBioError] = useState("");

  const [res, setRes] = useState(getResidentData);
  const [dl, setDL] = useState(getDLData);
  const [editRes, setEditRes] = useState({ ...getResidentData() });
  const [editDL, setEditDL] = useState({ ...getDLData() });
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // ── Biometric init ───────────────────────────────────────────
  useEffect(() => {
    bioIsAvailable().then((ok) => {
      setBioAvailable(ok);
      if (ok) setBioRegistered(!!localStorage.getItem(BIO_KEY));
    });
  }, []);

  const handleBiometric = useCallback(async () => {
    setBioError("");
    const stored = localStorage.getItem(BIO_KEY);

    if (!stored) {
      // 최초 등록
      setScreen("bio-register");
      setBioState("scanning");
      try {
        const credId = await bioRegister();
        localStorage.setItem(BIO_KEY, credId);
        setBioRegistered(true);
        setBioState("success");
        setTimeout(() => { setScreen("auth"); setTimeout(() => setScreen("id"), 900); }, 700);
      } catch (e: unknown) {
        setBioState("error");
        setBioError(e instanceof Error && e.message.includes("취소") ? "등록이 취소되었습니다" : "생체인증 등록 실패");
        setTimeout(() => { setScreen("pin"); setBioState("idle"); }, 2000);
      }
    } else {
      // 인증
      setScreen("bio-auth");
      setBioState("scanning");
      try {
        await bioAuthenticate(stored);
        setBioState("success");
        setTimeout(() => { setScreen("auth"); setTimeout(() => setScreen("id"), 900); }, 600);
      } catch (e: unknown) {
        setBioState("error");
        setBioError(e instanceof Error && e.message.includes("취소") ? "인증이 취소되었습니다" : "생체인증 실패 — PIN을 사용하세요");
        setTimeout(() => { setScreen("pin"); setBioState("idle"); }, 2000);
      }
    }
  }, []);

  useEffect(() => {
    if (screen === "pin") {
      timerRef.current = setInterval(() => setTimer((t) => (t <= 1 ? PIN_COUNT : t - 1)), 1000);
      setNums(shuffleNums());
    }
    if (screen === "id") setTimer(PIN_COUNT);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen]);

  // Timer countdown when on id screen
  useEffect(() => {
    if (screen !== "id") return;
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen]);

  useEffect(() => {
    const rd = getResidentData(); const dd = getDLData();
    setRes(rd); setDL(dd);
    setEditRes({ ...rd }); setEditDL({ ...dd });
    syncProfile({ ...rd, dlName: dd.dlName, dlNumber: dd.dlNumber });
  }, []);

  function tapNum(val: string) {
    if (val === "") return;
    if (val === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    const next = pin + val;
    setPin(next);
    if (next.length === 6) {
      setTimeout(() => { setScreen("auth"); setTimeout(() => { setScreen("id"); }, 1200); }, 200);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target?.result as string);
      setPendingPhoto(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function startEdit() {
    setEditRes({ ...res }); setEditDL({ ...dl }); setPendingPhoto(null); setEditMode(true);
  }

  async function saveEdit() {
    if (idTab === "주민등록증") {
      const updated = { ...editRes, photo: pendingPhoto ?? res.photo ?? "" };
      saveResidentData(updated); setRes({ ...updated }); syncProfile(updated);
    } else {
      const updated = { ...editDL, photo: pendingPhoto ?? dl.photo ?? "" };
      saveDLData(updated); setDL({ ...updated });
    }
    setEditMode(false); setPendingPhoto(null); showToast("저장됐습니다");
  }

  const progress = timer / PIN_COUNT;
  const urgent = timer <= 10;
  const timerStr = String(timer).padStart(2, "0");

  // ── PIN SCREEN ─────────────────────────────────────────────
  if (screen === "pin") {
    return (
      <div className="fixed inset-0 flex flex-col bg-white" style={{ zIndex: 100 }}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
          <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>
          <span className="font-bold text-[16px] text-gray-900">모바일신분증</span>
          <div className="w-9" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">

            {/* 잠금 아이콘 */}
            <div className="w-16 h-16 bg-[#003764]/8 rounded-full flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" fill="#003764"/>
                <path d="M8 11V7a4 4 0 018 0v4" stroke="#003764" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="white"/>
              </svg>
            </div>

            <p className="text-[15px] font-semibold text-gray-700">PIN 번호를 입력하세요</p>

            {/* PIN 점 */}
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={i < pin.length ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.15 }}
                  className={`w-3 h-3 rounded-full border-2 transition-colors duration-150 ${
                    i < pin.length ? "bg-[#003764] border-[#003764]" : "border-gray-300"
                  }`}
                />
              ))}
            </div>

            {/* 타이머 */}
            <div className="w-full max-w-[260px]">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${progress * 100}%`,
                    background: urgent ? "#ef4444" : "linear-gradient(90deg,#3B82F6 0%,#8B5CF6 100%)"
                  }}
                />
              </div>
              <p className="text-[12px] text-center mt-1.5">
                <span className="text-gray-500">남은시간 </span>
                <span className="font-bold tabular-nums" style={{ color: urgent ? "#ef4444" : "#3B82F6" }}>
                  {timerStr}초
                </span>
              </p>
            </div>

            {/* 생체인증 버튼 */}
            {bioAvailable && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={handleBiometric}
                className="flex flex-col items-center gap-1.5 px-6 py-3 rounded-2xl active:scale-95 transition-transform"
                style={{ background: "rgba(0,55,100,0.06)" }}
              >
                <FingerprintIcon size={40} color="#003764" />
                <span className="text-[11px] font-bold text-[#003764]">
                  {bioRegistered ? "생체인증으로 열기" : "생체인증 등록"}
                </span>
              </motion.button>
            )}
          </div>

          {/* 숫자 패드 */}
          <div className="grid grid-cols-3 border-t border-gray-100">
            {nums.map((n, i) => (
              <button
                key={i}
                onClick={() => tapNum(n)}
                className={`h-16 flex items-center justify-center text-[22px] font-semibold border-r border-b border-gray-100 active:bg-gray-100 select-none ${n === "" ? "pointer-events-none opacity-0" : ""} ${i % 3 === 2 ? "border-r-0" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── BIOMETRIC AUTH / REGISTER SCREEN ───────────────────────
  if (screen === "bio-auth" || screen === "bio-register") {
    const isRegister = screen === "bio-register";
    const stateConfig = {
      scanning: {
        color: "#003764",
        ringColor: "border-[#003764]/30",
        ringActive: "border-t-[#003764]",
        msg: isRegister ? "생체정보를 등록합니다…" : "생체인증 중…",
        sub: isRegister ? "Face ID 또는 지문을 인식해 주세요" : "기기에 등록된 얼굴 또는 지문을 인식하세요",
      },
      success: {
        color: "#16a34a",
        ringColor: "border-green-200",
        ringActive: "border-t-green-500",
        msg: isRegister ? "등록 완료!" : "인증 성공!",
        sub: isRegister ? "이제 생체인증으로 신분증을 열 수 있습니다" : "신분증을 열겠습니다",
      },
      error: {
        color: "#dc2626",
        ringColor: "border-red-200",
        ringActive: "border-t-red-500",
        msg: "인증 실패",
        sub: bioError,
      },
      idle: {
        color: "#003764",
        ringColor: "border-[#003764]/30",
        ringActive: "border-t-[#003764]",
        msg: "",
        sub: "",
      },
    }[bioState];

    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-8 px-8" style={{ zIndex: 100 }}>
        {/* 외부 회전 링 + 지문 아이콘 */}
        <div className="relative flex items-center justify-center">
          {bioState === "scanning" && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className={`absolute w-28 h-28 rounded-full border-4 ${stateConfig.ringColor} ${stateConfig.ringActive}`}
            />
          )}
          {bioState === "success" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute w-28 h-28 rounded-full border-4 border-green-400"
            />
          )}
          {bioState === "error" && (
            <motion.div
              animate={{ x: [-6, 6, -6, 6, 0] }}
              transition={{ duration: 0.4 }}
              className="absolute w-28 h-28 rounded-full border-4 border-red-300"
            />
          )}

          <motion.div
            animate={
              bioState === "scanning"
                ? { scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }
                : bioState === "success"
                ? { scale: [1, 1.15, 1] }
                : {}
            }
            transition={{ duration: 1.2, repeat: bioState === "scanning" ? Infinity : 0 }}
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: `${stateConfig.color}12` }}
          >
            {bioState === "success" ? (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                width="44" height="44" viewBox="0 0 24 24" fill="none"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  d="M5 13l4 4L19 7"
                  stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </motion.svg>
            ) : bioState === "error" ? (
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <FingerprintIcon size={44} color={stateConfig.color} animated={bioState === "scanning"} />
            )}
          </motion.div>
        </div>

        {/* 텍스트 */}
        <div className="text-center">
          <motion.p
            key={stateConfig.msg}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[18px] font-black text-gray-900"
            style={{ color: stateConfig.color }}
          >
            {stateConfig.msg}
          </motion.p>
          <motion.p
            key={stateConfig.sub}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[13px] text-gray-500 mt-1.5 leading-relaxed"
          >
            {stateConfig.sub}
          </motion.p>
        </div>

        {/* PIN으로 전환 (스캔 중일 때만) */}
        {bioState === "scanning" && (
          <button
            onClick={() => { setScreen("pin"); setBioState("idle"); }}
            className="text-[12px] text-gray-400 underline mt-2"
          >
            PIN 번호로 입력
          </button>
        )}
      </div>
    );
  }

  // ── AUTH LOADING ────────────────────────────────────────────
  if (screen === "auth") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-4" style={{ zIndex: 100 }}>
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#003764]/20 border-t-[#003764] rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" fill="#003764"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="#003764" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <p className="text-[14px] text-gray-500 font-medium">인증 중...</p>
      </div>
    );
  }

  // ── ID CARD VIEW ────────────────────────────────────────────
  const currentPhoto = idTab === "주민등록증" ? res.photo : dl.photo;
  const currentName = idTab === "주민등록증" ? (res.name || "홍길동") : (dl.dlName || "홍길동");
  const qrData = idTab === "주민등록증" ? buildQrData(res) : buildDLQrData(dl);

  if (editMode) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col" style={{ zIndex: 100 }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 shrink-0 bg-white">
          <button onClick={() => { setEditMode(false); setPendingPhoto(null); }} className="w-9 h-9 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-[16px]">정보 수정</span>
          <button onClick={saveEdit} className="px-3 h-8 bg-[#003764] text-white rounded-lg font-bold text-[13px]">
            저장
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-5 pb-32">
          {idTab === "주민등록증" ? (
            <>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">이름</label><input type="text" value={editRes.name || ""} onChange={(e) => setEditRes((p) => ({ ...p, name: e.target.value }))} placeholder="홍길동" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">발급일자 (8자리)</label><input type="text" value={editRes.issueDate || ""} onChange={(e) => setEditRes((p) => ({ ...p, issueDate: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="20230627" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">주민번호 앞자리 (6자리)</label><input type="text" value={editRes.numberFront || ""} onChange={(e) => setEditRes((p) => ({ ...p, numberFront: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="070204" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">주민번호 뒷자리 (7자리)</label><input type="text" value={editRes.numberBack || ""} onChange={(e) => setEditRes((p) => ({ ...p, numberBack: e.target.value.replace(/\D/g, "").slice(0, 7) }))} placeholder="3055215" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">주소 (지명)</label><input type="text" value={editRes.addr1 || ""} onChange={(e) => setEditRes((p) => ({ ...p, addr1: e.target.value }))} placeholder="경기도 파주시" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">주소 (도로명)</label><input type="text" value={editRes.addr2 || ""} onChange={(e) => setEditRes((p) => ({ ...p, addr2: e.target.value }))} placeholder="운정로 67-24" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">주소 (상세)</label><input type="text" value={editRes.addr3 || ""} onChange={(e) => setEditRes((p) => ({ ...p, addr3: e.target.value }))} placeholder="7동4호" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">발급기관</label><input type="text" value={editRes.issuer || ""} onChange={(e) => setEditRes((p) => ({ ...p, issuer: e.target.value }))} placeholder="경기 파주시장" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
            </>
          ) : (
            <>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">이름</label><input type="text" value={editDL.dlName || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlName: e.target.value }))} placeholder="홍길동" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">면허번호</label><input type="text" value={editDL.dlNumber || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlNumber: e.target.value }))} placeholder="11-00-000000-00" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">면허종별</label><input type="text" value={editDL.dlType || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlType: e.target.value }))} placeholder="1종 보통" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">주민번호 앞자리 (6자리)</label><input type="text" value={editDL.dlNumFront || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlNumFront: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="070204" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">발급일자 (8자리)</label><input type="text" value={editDL.dlIssueDate || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlIssueDate: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="20230627" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">갱신만료일 (8자리)</label><input type="text" value={editDL.dlExpiry || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlExpiry: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="20280315" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">주소 (지명)</label><input type="text" value={editDL.dlAddr1 || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlAddr1: e.target.value }))} placeholder="경기도 파주시" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">주소 (도로명)</label><input type="text" value={editDL.dlAddr2 || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlAddr2: e.target.value }))} placeholder="운정로 67-24" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
              <div className="mb-4"><label className="block text-[12px] text-gray-500 font-bold mb-1.5">발급기관</label><input type="text" value={editDL.dlIssuer || ""} onChange={(e) => setEditDL((p) => ({ ...p, dlIssuer: e.target.value }))} placeholder="경기남부경찰청장" className="w-full h-12 border border-gray-200 rounded-xl px-4 text-[15px] outline-none focus:border-[#003764] bg-white" style={{ fontSize: "16px" }} /></div>
            </>
          )}
          <div className="mt-4">
            <label className="block text-[12px] text-gray-500 font-bold mb-2">증명사진</label>
            <div className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()} className="h-10 px-4 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 bg-white">
                갤러리/카메라 선택
              </button>
              {pendingPhoto ? <span className="text-[13px] text-green-600 font-bold">✓ 선택됨</span> : <span className="text-[13px] text-gray-400">선택 안 함</span>}
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => { setEditMode(false); setPendingPhoto(null); }} className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-bold text-[15px] bg-white">닫기</button>
            <button onClick={saveEdit} className="flex-1 h-12 rounded-xl bg-[#003764] text-white font-bold text-[15px]">저장</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#F2F4F8] flex flex-col" style={{ zIndex: 100 }}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-4 right-4 z-50 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-lg"
          >
            <p className="text-[12px] font-bold text-green-700 text-center">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {showQr && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 z-50"
              onClick={() => setShowQr(false)}
            />
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-8 pointer-events-none"
            >
              <div className="bg-white rounded-3xl p-5 shadow-2xl pointer-events-auto flex flex-col items-center gap-3 w-full max-w-[280px]">
                {/* Header */}
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="font-black text-[15px] text-gray-900">신분증 QR</p>
                    <p className="text-[11px] text-gray-400">{idTab} · {currentName}</p>
                  </div>
                  <button
                    onClick={() => setShowQr(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* QR — white background, high contrast for camera */}
                <div className="bg-white p-3 border border-gray-200 rounded-2xl shadow-inner">
                  <QRCodeSVG
                    value={qrData}
                    size={200}
                    level="Q"
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    imageSettings={{
                      src: "/gov24-logo.png",
                      x: undefined,
                      y: undefined,
                      height: 36,
                      width: 36,
                      excavate: true,
                    }}
                  />
                </div>

                {/* Timer bar */}
                <div className="w-full">
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{
                        width: `${progress * 100}%`,
                        background: urgent ? "#ef4444" : "linear-gradient(90deg,#3B82F6,#8B5CF6)"
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-center mt-1.5 text-gray-400">
                    {timer > 0
                      ? <><span className="font-bold tabular-nums" style={{ color: urgent ? "#ef4444" : "#3B82F6" }}>{timerStr}초</span> 후 만료</> 
                      : <span className="text-red-500 font-bold">만료됨 — 다시 인증하세요</span>
                    }
                  </p>
                </div>

                {/* Scan hint */}
                <p className="text-[10px] text-gray-300 text-center">카메라로 QR을 스캔하세요</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 shrink-0">
        <button onClick={() => navigate("/")} className="w-9 h-9 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-gray-800" />
        </button>
        <span className="font-bold text-[16px] text-gray-900">모바일신분증</span>
        {localStorage.getItem("gov24_profile_locked") !== "1" && (
          <button onClick={startEdit} className="w-9 h-9 flex items-center justify-center">
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex bg-white border-b border-gray-100 shrink-0">
        {(["주민등록증", "운전면허증"] as IdTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setIdTab(t)}
            className={`flex-1 py-3 text-[13px] font-bold border-b-2 transition-colors ${idTab === t ? "border-[#003764] text-[#003764]" : "border-transparent text-gray-400"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Card + Controls */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5 flex flex-col gap-4">
        {/* ID Card */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
          {/* Photo */}
          <div className="flex justify-center pt-6 pb-4">
            <div className="w-36 h-44 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
              {currentPhoto ? (
                <img src={currentPhoto} alt="증명사진" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-300">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 5C17.373 5 12 10.373 12 17C12 21.302 14.352 25.054 17.914 27.09C11.875 29.54 7.5 35.481 7.5 42.5H10.5C10.5 35.873 16.373 30 24 30C31.627 30 37.5 35.873 37.5 42.5H40.5C40.5 35.481 36.125 29.54 30.086 27.09C33.648 25.054 36 21.302 36 17C36 10.373 30.627 5 24 5Z" fill="currentColor"/>
                  </svg>
                  <span className="text-[11px]">사진 없음</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="px-5 pb-5 space-y-1.5">
            <p className="text-[24px] font-black text-gray-900">{currentName}</p>

            {idTab === "주민등록증" ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-bold font-mono text-gray-800">
                    {res.numberFront || "070204"} - {showNum ? (res.numberBack || "3055215") : (res.numberBack ? res.numberBack.slice(0,1) + "●●●●●●" : "3●●●●●●")}
                  </p>
                  <DarkToggle on={showNum} onToggle={() => setShowNum((p) => !p)} />
                </div>
                <p className="text-[13px] text-gray-600">
                  {[res.addr1, res.addr2].filter(Boolean).join(" ") || "경기도 파주시 운정로 67-24"}
                </p>
                {res.addr3 && <p className="text-[13px] text-gray-600">{res.addr3}</p>}
                <div className="pt-1 space-y-0.5">
                  <p className="text-[13px] text-gray-500">{fmt8(res.issueDate || "20230627")}</p>
                  <p className="text-[12px] text-gray-400">{res.issuer || "경기 파주시장"}</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold font-mono text-gray-800">{dl.dlNumber || "11-00-000000-00"}</p>
                  <DarkToggle on={showNum} onToggle={() => setShowNum((p) => !p)} />
                </div>
                <p className="text-[13px] text-gray-600">{dl.dlType || "1종 보통"}</p>
                <p className="text-[13px] text-gray-600">
                  {dl.dlNumFront || "070204"} - {showNum ? "●●●●●●●" : "●●●●●●●"}
                </p>
                <p className="text-[13px] text-gray-500">유효: {fmt8(dl.dlIssueDate || "20230627")} ~ {fmt8(dl.dlExpiry || "20280315")}</p>
                <p className="text-[12px] text-gray-400">{dl.dlIssuer || "경기남부경찰청장"}</p>
              </>
            )}

            {/* Timer bar inside card */}
            <div className="pt-3">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${progress * 100}%`,
                    background: urgent ? "#ef4444" : "linear-gradient(90deg,#3B82F6 0%,#8B5CF6 100%)"
                  }}
                />
              </div>
              <p className="text-[12px] mt-1">
                <span className="text-gray-500">남은시간 </span>
                <span className="font-bold tabular-nums" style={{ color: urgent ? "#ef4444" : "#3B82F6" }}>
                  {timerStr}초
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* QR Button */}
        <button
          onClick={() => setShowQr(true)}
          className="w-full h-14 rounded-2xl bg-[#1a1a1a] text-white font-bold text-[16px] shadow-md active:scale-[0.98] transition-transform"
        >
          QR정보 표시
        </button>
      </div>
    </div>
  );
}
