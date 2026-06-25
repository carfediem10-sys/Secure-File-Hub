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

function getRole(sessionId?: string): "admin" | "developer" | "user" {
  if (!sessionId) return "user";
  return sessionRoles.get(sessionId) ?? "user";
}

function isAdminOrDev(sessionId?: string) {
  const r = getRole(sessionId);
  return r === "admin" || r === "developer";
}

// ─── GATE ENTRY ─────────────────────────────────────────────────────────────

gateRouter.post("/gate/enter", (req, res) => {
  const { name, password, sessionId } = req.body as {
    name: string; password: string; sessionId: string;
  };

  if (!name?.trim() || !sessionId) {
    res.status(400).json({ error: "name_required" });
    return;
  }

  // If gate is disabled, just approve
  if (!config.gateEnabled) {
    sessions.set(sessionId, {
      id: sessionId,
      name: name.trim(),
      time: new Date().toLocaleString("ko-KR"),
      status: "approved",
      warnings: 0,
      isWhitelisted: false,
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
    });
    res.json({ status: "approved", role: "developer", sessionId });
    return;
  }

  // Check access password
  if (password !== config.accessPassword) {
    res.json({ status: "wrong_password" });
    return;
  }

  const isWhitelisted = config.whitelist.includes(name.trim());

  // Auto-approve if not in approval mode or whitelisted
  const autoApprove = !config.approvalRequired || isWhitelisted;

  sessions.set(sessionId, {
    id: sessionId,
    name: name.trim(),
    time: new Date().toLocaleString("ko-KR"),
    status: autoApprove ? "approved" : "pending",
    warnings: 0,
    isWhitelisted,
  });

  res.json({ status: autoApprove ? "approved" : "pending", sessionId });
});

// ─── STATUS CHECK ────────────────────────────────────────────────────────────

gateRouter.get("/gate/status", (req, res) => {
  const sessionId = req.query.sessionId as string;

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
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: (profile.name as string) || "익명",
      time: new Date().toLocaleString("ko-KR"),
      status: "approved",
      warnings: 0,
      isWhitelisted: false,
    };
  }
  if (profile.name) session.name = profile.name as string;
  session.profile = profile;
  sessions.set(sessionId, session);
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

export default gateRouter;
