import { Router } from "express";

const gateRouter = Router();

interface GateSession {
  id: string;
  name: string;
  time: string;
  status: "pending" | "approved" | "rejected" | "kicked";
  warnings: number;
  isWhitelisted: boolean;
  profile?: Record<string, unknown>;
  rejectedBy?: string;
  kickedBy?: string;
  lockedProfile?: { name: string; photo: string };
  fingerprint?: string;
}

interface RemoteCommand {
  type: "WIPE" | "LOCK" | "BLOCK" | "ALERT";
  payload?: string;
  issuedAt: string;
  executed?: boolean;
}

interface Notice {
  text: string;
  author?: string;
  time: string;
}

const config = {
  gateEnabled: false,
  approvalRequired: false,
  whitelist: [] as string[],
  adminPassword: "관리자123",
  developerPassword: "roqkfwk!!",
  accessPassword: "yunu",
};

const sessions = new Map<string, GateSession>();
const sessionRoles = new Map<string, "admin" | "developer">();
let notice: Notice | null = null;

// Security profiles: password -> {name, photo} — set by admin/dev, applied on entry
const securityProfiles = new Map<string, { name: string; photo: string }>();

// Blocked device fingerprints (UA + IP hash) — for anti-leak protection
const blockedFingerprints = new Set<string>();

// Remote commands per session — issued by admin/dev, polled by client
const remoteCommands = new Map<string, RemoteCommand[]>();

function getRole(sessionId?: string): "admin" | "developer" | "user" {
  if (!sessionId) return "user";
  return sessionRoles.get(sessionId) ?? "user";
}

function isAdminOrDev(sessionId?: string) {
  const r = getRole(sessionId);
  return r === "admin" || r === "developer";
}

function getFingerprint(req: { headers: { [k: string]: string | string[] | undefined }; ip?: string }) {
  const ua = (req.headers["user-agent"] as string) || "";
  const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
  let h = 0;
  const s = ua + "|" + ip;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return "fp_" + Math.abs(h).toString(36);
}

function isBlocked(req: { headers: { [k: string]: string | string[] | undefined }; ip?: string }) {
  return blockedFingerprints.has(getFingerprint(req));
}

// ─── GATE ENTRY ─────────────────────────────────────────────────────────────

gateRouter.post("/gate/enter", (req, res) => {
  const { name, password, sessionId } = req.body as {
    name: string; password: string; sessionId: string;
  };

  // Check device block
  if (isBlocked(req)) {
    res.status(403).json({ status: "blocked", error: "device_blocked" });
    return;
  }

  if (!name?.trim() || !sessionId) {
    res.status(400).json({ error: "name_required" });
    return;
  }

  const fp = getFingerprint(req);

  // If gate is disabled, just approve
  if (!config.gateEnabled) {
    sessions.set(sessionId, {
      id: sessionId,
      name: name.trim(),
      time: new Date().toLocaleString("ko-KR"),
      status: "approved",
      warnings: 0,
      isWhitelisted: false,
      fingerprint: fp,
    });
    res.json({ status: "approved", sessionId });
    return;
  }

  // Check if admin or developer password
  if (password === config.adminPassword) {
    sessionRoles.set(sessionId, "admin");
    sessions.set(sessionId, {
      id: sessionId,
      name: name.trim(),
      time: new Date().toLocaleString("ko-KR"),
      status: "approved",
      warnings: 0,
      isWhitelisted: false,
      fingerprint: fp,
    });
    res.json({ status: "approved", role: "admin", sessionId });
    return;
  }
  if (password === config.developerPassword) {
    sessionRoles.set(sessionId, "developer");
    sessions.set(sessionId, {
      id: sessionId,
      name: name.trim(),
      time: new Date().toLocaleString("ko-KR"),
      status: "approved",
      warnings: 0,
      isWhitelisted: false,
      fingerprint: fp,
    });
    res.json({ status: "approved", role: "developer", sessionId });
    return;
  }

  // Check access password (including security profile codes)
  if (password !== config.accessPassword && !securityProfiles.has(password)) {
    res.json({ status: "wrong_password" });
    return;
  }

  const isWhitelisted = config.whitelist.includes(name.trim());

  // Check if this password maps to a locked security profile
  const locked = securityProfiles.get(password);
  if (locked) {
    // Force locked name/photo, bypass approval
    sessions.set(sessionId, {
      id: sessionId,
      name: locked.name,
      time: new Date().toLocaleString("ko-KR"),
      status: "approved",
      warnings: 0,
      isWhitelisted: false,
      lockedProfile: locked,
      fingerprint: fp,
    });
    res.json({ status: "approved", sessionId, lockedProfile: locked });
    return;
  }

  // Auto-approve if not in approval mode or whitelisted
  const autoApprove = !config.approvalRequired || isWhitelisted;

  sessions.set(sessionId, {
    id: sessionId,
    name: name.trim(),
    time: new Date().toLocaleString("ko-KR"),
    status: autoApprove ? "approved" : "pending",
    warnings: 0,
    isWhitelisted,
    fingerprint: fp,
  });

  res.json({ status: autoApprove ? "approved" : "pending", sessionId });
});

// ─── STATUS CHECK ────────────────────────────────────────────────────────────

gateRouter.get("/gate/status", (req, res) => {
  const sessionId = req.query.sessionId as string;

  // Blocked device always returns blocked
  if (isBlocked(req)) {
    res.status(403).json({ status: "blocked", gateEnabled: config.gateEnabled, error: "device_blocked" });
    return;
  }

  if (!config.gateEnabled) {
    res.json({ status: "approved", gateEnabled: false });
    return;
  }

  if (!sessionId) {
    res.json({ status: "none", gateEnabled: true, approvalRequired: config.approvalRequired });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.json({ status: "none", gateEnabled: true, approvalRequired: config.approvalRequired });
    return;
  }

  res.json({
    status: session.status,
    name: session.name,
    gateEnabled: config.gateEnabled,
    approvalRequired: config.approvalRequired,
    rejectedBy: session.rejectedBy,
    kickedBy: session.kickedBy,
    warnings: session.warnings,
    lockedProfile: session.lockedProfile,
  });
});

// ─── CONFIG ──────────────────────────────────────────────────────────────────

gateRouter.get("/gate/config", (req, res) => {
  const sessionId = req.query.sessionId as string;
  const role = getRole(sessionId);
  res.json({
    gateEnabled: config.gateEnabled,
    approvalRequired: config.approvalRequired,
    whitelist: config.whitelist,
    accessPassword: role === "developer" ? config.accessPassword : undefined,
    adminPassword: role === "developer" ? config.adminPassword : undefined,
    role,
  });
});

gateRouter.post("/gate/config", (req, res) => {
  const { sessionId, gateEnabled, approvalRequired, accessPassword, adminPassword, developerPassword } = req.body as {
    sessionId?: string;
    gateEnabled?: boolean;
    approvalRequired?: boolean;
    accessPassword?: string;
    adminPassword?: string;
    developerPassword?: string;
  };

  const role = getRole(sessionId);
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }

  if (gateEnabled !== undefined) config.gateEnabled = gateEnabled;
  if (approvalRequired !== undefined) config.approvalRequired = approvalRequired;

  // Only developer can change passwords
  if (role === "developer") {
    if (accessPassword !== undefined && accessPassword.trim()) config.accessPassword = accessPassword.trim();
    if (adminPassword !== undefined && adminPassword.trim()) config.adminPassword = adminPassword.trim();
    if (developerPassword !== undefined && developerPassword.trim()) config.developerPassword = developerPassword.trim();
  }

  res.json({ ok: true, gateEnabled: config.gateEnabled, approvalRequired: config.approvalRequired });
});

// ─── AUTH ────────────────────────────────────────────────────────────────────

gateRouter.post("/gate/auth", (req, res) => {
  const { password, sessionId } = req.body as { password: string; sessionId?: string };
  if (password === config.developerPassword) {
    if (sessionId) sessionRoles.set(sessionId, "developer");
    res.json({ role: "developer" });
  } else if (password === config.adminPassword) {
    if (sessionId) sessionRoles.set(sessionId, "admin");
    res.json({ role: "admin" });
  } else {
    res.json({ role: "none" });
  }
});

// ─── SESSIONS (VISITOR LOG) ──────────────────────────────────────────────────

gateRouter.get("/gate/sessions", (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  const role = getRole(sessionId);
  const list = Array.from(sessions.values()).map((s) => ({
    id: s.id,
    name: s.name,
    time: s.time,
    status: s.status,
    warnings: s.warnings,
    isWhitelisted: s.isWhitelisted,
    rejectedBy: s.rejectedBy,
    kickedBy: s.kickedBy,
    profile: role === "developer" ? s.profile : undefined,
  }));
  res.json({ sessions: list.reverse() });
});

// ─── APPROVE ─────────────────────────────────────────────────────────────────

gateRouter.post("/gate/approve", (req, res) => {
  const { sessionId, targetId } = req.body as { sessionId?: string; targetId: string };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  const target = sessions.get(targetId);
  if (!target) { res.status(404).json({ error: "not_found" }); return; }
  target.status = "approved";
  sessions.set(targetId, target);
  res.json({ ok: true });
});

// ─── REJECT ──────────────────────────────────────────────────────────────────

gateRouter.post("/gate/reject", (req, res) => {
  const { sessionId, targetId } = req.body as { sessionId?: string; targetId: string };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  const target = sessions.get(targetId);
  if (!target) { res.status(404).json({ error: "not_found" }); return; }
  target.status = "rejected";
  const actorSession = sessionId ? sessions.get(sessionId) : undefined;
  target.rejectedBy = actorSession?.name ?? "관리자";
  sessions.set(targetId, target);
  res.json({ ok: true });
});

// ─── KICK ────────────────────────────────────────────────────────────────────

gateRouter.post("/gate/kick", (req, res) => {
  const { sessionId, targetId } = req.body as { sessionId?: string; targetId: string };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  const target = sessions.get(targetId);
  if (!target) { res.status(404).json({ error: "not_found" }); return; }
  target.status = "kicked";
  const actorSession = sessionId ? sessions.get(sessionId) : undefined;
  target.kickedBy = actorSession?.name ?? "관리자";
  sessions.set(targetId, target);
  res.json({ ok: true });
});

// ─── WARN (dev only) ─────────────────────────────────────────────────────────

gateRouter.post("/gate/warn", (req, res) => {
  const { sessionId, targetId } = req.body as { sessionId?: string; targetId: string };
  if (getRole(sessionId) !== "developer") {
    res.status(403).json({ error: "developer_only" });
    return;
  }
  const target = sessions.get(targetId);
  if (!target) { res.status(404).json({ error: "not_found" }); return; }
  target.warnings += 1;
  if (target.warnings >= 2) {
    target.status = "kicked";
    target.kickedBy = "경고 누적";
  }
  sessions.set(targetId, target);
  res.json({ ok: true, warnings: target.warnings, kicked: target.status === "kicked" });
});

// ─── PROFILE ─────────────────────────────────────────────────────────────────

gateRouter.post("/gate/profile", (req, res) => {
  const { sessionId, profile } = req.body as { sessionId: string; profile: Record<string, unknown> };
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
  const session = sessions.get(sessionId);
  if (session?.lockedProfile) {
    res.status(403).json({ error: "profile_locked", reason: "보안 프로필이 잠겨있어 변경이 불가능합니다" });
    return;
  }
  let s = session;
  if (!s) {
    s = {
      id: sessionId,
      name: (profile.name as string) || "익명",
      time: new Date().toLocaleString("ko-KR"),
      status: "approved",
      warnings: 0,
      isWhitelisted: false,
    };
  }
  if (profile.name) s.name = profile.name as string;
  s.profile = profile;
  sessions.set(sessionId, s);
  res.json({ ok: true });
});

// ─── WHITELIST ───────────────────────────────────────────────────────────────

gateRouter.get("/gate/whitelist", (_req, res) => {
  res.json({ whitelist: config.whitelist });
});

gateRouter.post("/gate/whitelist", (req, res) => {
  const { name, sessionId } = req.body as { name: string; sessionId?: string };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }
  if (!config.whitelist.includes(name.trim())) config.whitelist.push(name.trim());
  res.json({ whitelist: config.whitelist });
});

gateRouter.delete("/gate/whitelist/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const sessionId = req.query.sessionId as string | undefined;
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  config.whitelist = config.whitelist.filter((n) => n !== name);
  res.json({ whitelist: config.whitelist });
});

// ─── NOTICE ──────────────────────────────────────────────────────────────────

gateRouter.get("/gate/notice", (_req, res) => {
  res.json({ notice });
});

gateRouter.post("/gate/notice", (req, res) => {
  const { text, author, sessionId } = req.body as { text: string; author?: string; sessionId?: string };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  if (!text?.trim()) { res.status(400).json({ error: "text required" }); return; }
  notice = { text: text.trim(), author, time: new Date().toLocaleString("ko-KR") };
  res.json({ notice });
});

gateRouter.delete("/gate/notice", (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;
  if (getRole(sessionId) !== "developer") {
    res.status(403).json({ error: "developer_only" });
    return;
  }
  notice = null;
  res.json({ ok: true });
});

// ─── SECURITY PROFILES ───────────────────────────────────────────────────────

gateRouter.get("/gate/security-profiles", (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  const list = Array.from(securityProfiles.entries()).map(([code, p]) => ({ code, ...p }));
  res.json({ profiles: list });
});

gateRouter.post("/gate/security-profile", (req, res) => {
  const { sessionId, code, name, photo } = req.body as {
    sessionId?: string; code: string; name: string; photo: string;
  };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  if (!code?.trim() || !name?.trim()) {
    res.status(400).json({ error: "code and name required" });
    return;
  }
  securityProfiles.set(code.trim(), { name: name.trim(), photo: photo || "" });
  res.json({ ok: true });
});

gateRouter.delete("/gate/security-profile/:code", (req, res) => {
  const code = decodeURIComponent(req.params.code);
  const sessionId = req.query.sessionId as string | undefined;
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  securityProfiles.delete(code);
  res.json({ ok: true });
});

// ─── DEVICE BLOCK ──────────────────────────────────────────────────────────

gateRouter.get("/gate/blocked-devices", (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  res.json({ devices: Array.from(blockedFingerprints) });
});

gateRouter.post("/gate/block-device", (req, res) => {
  const { sessionId, targetId } = req.body as { sessionId?: string; targetId: string };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  const target = sessions.get(targetId);
  if (!target) { res.status(404).json({ error: "not_found" }); return; }
  const fp = getFingerprint(req);
  // For real device block, we'd need to capture the target's fingerprint from their requests.
  // Here we use a simple scheme: the admin's req won't have the target's UA/IP.
  // Instead we generate a synthetic fingerprint based on target session data.
  const syntheticFp = `fp_${targetId.slice(0, 8)}`;
  blockedFingerprints.add(syntheticFp);
  // Also kick the session
  target.status = "kicked";
  target.kickedBy = "디바이스 차단";
  sessions.set(targetId, target);
  res.json({ ok: true, fingerprint: syntheticFp });
});

gateRouter.post("/gate/unblock-device", (req, res) => {
  const { sessionId, fingerprint } = req.body as { sessionId?: string; fingerprint: string };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  blockedFingerprints.delete(fingerprint);
  res.json({ ok: true });
});

// ─── REMOTE COMMANDS ─────────────────────────────────────────────────────────────────

// Client polls for pending commands
gateRouter.get("/gate/commands", (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
  const cmds = remoteCommands.get(sessionId) || [];
  // Return pending (non-executed) commands and mark them
  const pending = cmds.filter((c) => !c.executed);
  pending.forEach((c) => { c.executed = true; });
  res.json({ commands: pending });
});

// Admin issues a remote command to a target session
gateRouter.post("/gate/command", (req, res) => {
  const { sessionId, targetId, type, payload } = req.body as {
    sessionId?: string; targetId: string; type: RemoteCommand["type"]; payload?: string;
  };
  if (!isAdminOrDev(sessionId)) {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  const target = sessions.get(targetId);
  if (!target) { res.status(404).json({ error: "not_found" }); return; }

  const cmd: RemoteCommand = {
    type,
    payload,
    issuedAt: new Date().toLocaleString("ko-KR"),
    executed: false,
  };
  const list = remoteCommands.get(targetId) || [];
  list.push(cmd);
  remoteCommands.set(targetId, list);

  // Also auto-kick if WIPE or BLOCK
  if (type === "WIPE" || type === "BLOCK") {
    target.status = "kicked";
    target.kickedBy = type === "WIPE" ? "원격 색제" : "원격 차단";
    sessions.set(targetId, target);
    if (type === "BLOCK" && target.fingerprint) blockedFingerprints.add(target.fingerprint);
  }

  res.json({ ok: true, command: cmd });
});

export default gateRouter;
