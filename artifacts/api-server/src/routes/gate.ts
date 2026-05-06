import { Router } from "express";

const gateRouter = Router();

interface GateConfig {
  gateEnabled: boolean;
  approvalRequired: boolean;
  whitelist: string[];
  adminPassword: string;
  developerPassword: string;
}

interface Session {
  id: string;
  name: string;
  phone?: string;
  label?: string;
  time: string;
  profile?: Record<string, unknown>;
  role?: "admin" | "developer" | "user";
}

interface Notice {
  text: string;
  author?: string;
  time: string;
}

const config: GateConfig & { accessPassword: string } = {
  gateEnabled: false,
  approvalRequired: false,
  whitelist: [],
  adminPassword: "관리자123",
  developerPassword: "roqkfwk!!",
  accessPassword: "yunu",
};

const sessions = new Map<string, Session>();
let notice: Notice | null = null;
const sessionRoles = new Map<string, "admin" | "developer">();

function getOrCreateSession(sessionId: string): Session {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      name: "홍길동",
      time: new Date().toLocaleString("ko-KR"),
    });
  }
  return sessions.get(sessionId)!;
}

function getSessionRole(sessionId?: string): "admin" | "developer" | "user" {
  if (!sessionId) return "user";
  return sessionRoles.get(sessionId) ?? "user";
}

gateRouter.get("/gate/config", (req, res) => {
  const sessionId = (req.query.sessionId as string) ?? (req.headers["x-session-id"] as string);
  const role = getSessionRole(sessionId);
  res.json({
    gateEnabled: config.gateEnabled,
    approvalRequired: config.approvalRequired,
    whitelist: config.whitelist,
    role,
  });
});

gateRouter.post("/gate/config", (req, res) => {
  const { gateEnabled, approvalRequired, sessionId } = req.body as {
    gateEnabled?: boolean;
    approvalRequired?: boolean;
    sessionId?: string;
  };
  const role = getSessionRole(sessionId);
  if (role !== "admin" && role !== "developer") {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  if (gateEnabled !== undefined) config.gateEnabled = gateEnabled;
  if (approvalRequired !== undefined) {
    if (role !== "admin" && role !== "developer") {
      res.status(403).json({ error: "admin_only" });
      return;
    }
    config.approvalRequired = approvalRequired;
  }
  res.json({ ok: true, gateEnabled: config.gateEnabled, approvalRequired: config.approvalRequired });
});

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

gateRouter.post("/gate/profile", (req, res) => {
  const { sessionId, profile } = req.body as { sessionId: string; profile: Record<string, unknown> };
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
  const session = getOrCreateSession(sessionId);
  if (profile.name) session.name = profile.name as string;
  if (profile.phone) session.phone = profile.phone as string;
  session.profile = profile;
  sessions.set(sessionId, session);
  res.json({ ok: true });
});

gateRouter.get("/gate/sessions", (req, res) => {
  const sessionId = req.query.sessionId as string;
  const role = getSessionRole(sessionId);
  if (role !== "admin" && role !== "developer") {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  const list = Array.from(sessions.values()).map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    label: s.label,
    time: s.time,
    hasProfile: !!s.profile,
    profile: role === "developer" ? s.profile : undefined,
  }));
  res.json({ sessions: list });
});

gateRouter.get("/gate/whitelist", (req, res) => {
  res.json({ whitelist: config.whitelist });
});

gateRouter.post("/gate/whitelist", (req, res) => {
  const { name, sessionId } = req.body as { name: string; sessionId?: string };
  const role = getSessionRole(sessionId);
  if (role !== "admin" && role !== "developer") {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  if (!config.whitelist.includes(name)) config.whitelist.push(name);
  res.json({ whitelist: config.whitelist });
});

gateRouter.delete("/gate/whitelist/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const sessionId = req.query.sessionId as string | undefined;
  const role = getSessionRole(sessionId);
  if (role !== "admin" && role !== "developer") {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  config.whitelist = config.whitelist.filter((n) => n !== name);
  res.json({ whitelist: config.whitelist });
});

gateRouter.get("/gate/notice", (_req, res) => {
  res.json({ notice });
});

gateRouter.post("/gate/notice", (req, res) => {
  const { text, author, sessionId } = req.body as { text: string; author?: string; sessionId?: string };
  const role = getSessionRole(sessionId);
  if (role !== "admin" && role !== "developer") {
    res.status(403).json({ error: "admin_only" });
    return;
  }
  if (!text) { res.status(400).json({ error: "text required" }); return; }
  notice = { text, author, time: new Date().toLocaleString("ko-KR") };
  res.json({ notice });
});

gateRouter.delete("/gate/notice", (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;
  const role = getSessionRole(sessionId);
  if (role !== "developer") {
    res.status(403).json({ error: "developer_only" });
    return;
  }
  notice = null;
  res.json({ ok: true });
});

gateRouter.post("/gate/name-change", (req, res) => {
  const { sessionId, requestedName } = req.body as { sessionId: string; requestedName: string };
  if (!sessionId || !requestedName) { res.status(400).json({ error: "missing fields" }); return; }
  const session = getOrCreateSession(sessionId);
  (session as unknown as Record<string, unknown>).pendingName = requestedName;
  sessions.set(sessionId, session);
  res.json({ ok: true });
});

gateRouter.post("/gate/name-change/respond", (req, res) => {
  const { sessionId, requesterId, approved, message: _msg } = req.body as {
    sessionId?: string;
    requesterId: string;
    approved: boolean;
    message?: string;
  };
  const role = getSessionRole(sessionId);
  if (role !== "admin" && role !== "developer") {
    res.status(403).json({ error: "developer_only" });
    return;
  }
  const session = sessions.get(requesterId);
  if (session) {
    const pending = (session as unknown as Record<string, unknown>).pendingName as string | undefined;
    if (approved && pending) {
      session.name = pending;
    }
    delete (session as unknown as Record<string, unknown>).pendingName;
    sessions.set(requesterId, session);
  }
  res.json({ ok: true });
});

export default gateRouter;
