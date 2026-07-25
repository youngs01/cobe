import React, { useEffect, useMemo, useState } from "react";

let HOLIDAYS = [];

const ROLES = {
  SUPER_ADMIN: "최종관리자",
  DIRECTOR: "원장",
  TEACHER: "교사",
  ASSISTANT: "보조교사",
  EXTENDED: "연장교사",
  NIGHT: "야간반 교사",
  COOK: "조리사",
};

const STATUS = {
  PENDING: "대기중",
  APPROVED: "승인",
  REJECTED: "반려",
  CANCELLED: "취소됨",
};

const STORAGE_KEY = "cobe-leave-session";

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeUser(user) {
  if (!user || typeof user !== "object") return null;
  const manualRemain = parseNumber(user.manualRemain);
  const remain = parseNumber(user.remain);
  return {
    ...user,
    manualRemain: manualRemain ?? remain,
    remain: remain ?? manualRemain,
  };
}

function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeUser(parsed);
  } catch {
    return null;
  }
}

function writeSession(user) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeUser(user)));
}

function calcAnnualLeave(hireDate, asOfDate = new Date()) {
  const hire = new Date(hireDate);
  const today = new Date(asOfDate);
  const diffMs = today - hire;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor(diffDays / 30);
  if (years < 1) return Math.min(months, 11);
  const extra = Math.floor((years - 1) / 2);
  return Math.min(15 + extra, 25);
}

function getLeaveYearStart(hireDate, refDate = new Date()) {
  const hire = new Date(hireDate);
  const now = new Date(refDate);
  const start = new Date(hire);
  start.setFullYear(now.getFullYear());
  start.setHours(0, 0, 0, 0);
  if (start > now) start.setFullYear(now.getFullYear() - 1);
  return start;
}

function getLeaveYearRanges(hireDate, refDate = new Date()) {
  const currentStart = getLeaveYearStart(hireDate, refDate);
  const lastStart = new Date(currentStart);
  lastStart.setFullYear(currentStart.getFullYear() - 1);
  return { lastStart, currentStart };
}

function isRequestInRange(request, start, end) {
  const key = request.date || request.startDate;
  if (!key) return false;
  const d = new Date(key);
  return d >= start && d < end;
}

function requestCost(request) {
  if (request.halfDay) return 0.5;
  const start = request.startDate ? new Date(request.startDate) : request.date ? new Date(request.date) : null;
  const end = request.endDate ? new Date(request.endDate) : request.date ? new Date(request.date) : null;
  if (start && end) {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const yyyyMMdd = current.toISOString().slice(0, 10);
      const day = current.getDay();
      const weekend = day === 0 || day === 6;
      if (!weekend && !HOLIDAYS.includes(yyyyMMdd)) count += 1;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
  if (request.date || request.startDate) {
    const d = new Date(request.date || request.startDate);
    const yyyyMMdd = d.toISOString().slice(0, 10);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    return weekend || HOLIDAYS.includes(yyyyMMdd) ? 0 : 1;
  }
  return 1;
}

function calcApprovedLeaveForLeaveYear(requests, hireDate, refDate = new Date()) {
  const { currentStart, currentEnd } = getLeaveYearRanges(hireDate, refDate);
  return requests
    .filter((r) => r.status === STATUS.APPROVED)
    .filter((r) => isRequestInRange(r, currentStart, currentEnd))
    .reduce((acc, r) => acc + requestCost(r), 0);
}

function calcApprovedLeaveForPreviousLeaveYear(requests, hireDate, refDate = new Date()) {
  const { lastStart, currentStart } = getLeaveYearRanges(hireDate, refDate);
  return requests
    .filter((r) => r.status === STATUS.APPROVED)
    .filter((r) => isRequestInRange(r, lastStart, currentStart))
    .reduce((acc, r) => acc + requestCost(r), 0);
}

function calcRemainingLeaveFromRequests(requests, hireDate) {
  const { lastStart, currentStart } = getLeaveYearRanges(hireDate, new Date());
  const lastYearTotal = calcAnnualLeave(hireDate, lastStart);
  const lastYearUsed = calcApprovedLeaveForPreviousLeaveYear(requests, hireDate, new Date());
  const lastYearRemain = lastYearTotal - lastYearUsed;
  const currentYearTotal = calcAnnualLeave(hireDate, currentStart);
  const adjustedTotal = currentYearTotal + lastYearRemain;
  const currentYearUsed = calcApprovedLeaveForLeaveYear(requests, hireDate, new Date());
  return Math.max(0, adjustedTotal - currentYearUsed);
}

function calcEffectiveRemainingLeave(requests, hireDate, manualRemain) {
  const dbRemain = parseNumber(manualRemain);
  if (dbRemain !== null) return Math.max(0, dbRemain);
  return Math.max(0, calcRemainingLeaveFromRequests(requests, hireDate));
}

function buildUserWithRemain(user, remain) {
  if (!user || typeof user !== "object") return null;
  const next = normalizeUser(user);
  if (!next) return null;
  return normalizeUser({ ...next, manualRemain: remain, remain });
}

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("users failed");
  return res.json();
}

async function fetchRequests() {
  const res = await fetch("/api/requests");
  if (!res.ok) throw new Error("requests failed");
  return res.json();
}

function App() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, r] = await Promise.all([fetchUsers(), fetchRequests()]);
        setUsers(u || []);
        setRequests(r || []);
        const restored = readSession();
        if (restored) {
          const latest = (u || []).find((x) => x.id === restored.id);
          const nextUser = normalizeUser(latest || restored);
          if (nextUser) {
            setCurrentUser(nextUser);
            writeSession(nextUser);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    writeSession(currentUser);
  }, [authReady, currentUser]);

  const refresh = async () => {
    const [u, r] = await Promise.all([fetchUsers(), fetchRequests()]);
    setUsers(u || []);
    setRequests(r || []);
    if (currentUser?.id) {
      const latest = (u || []).find((x) => x.id === currentUser.id);
      const nextUser = normalizeUser(latest || currentUser);
      if (nextUser) {
        setCurrentUser(nextUser);
        writeSession(nextUser);
      }
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password: loginPw }),
      });
      if (!res.ok) {
        setLoginError("아이디 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      const user = normalizeUser(await res.json());
      if (!user?.active) {
        setLoginError("비활성화된 계정입니다.");
        return;
      }
      setCurrentUser(user);
      writeSession(user);
      setLoginError("");
      setToast("로그인되었습니다.");
    } catch {
      setLoginError("로그인 오류가 발생했습니다.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    writeSession(null);
    setLoginId("");
    setLoginPw("");
    setLoginError("");
  };

  const approveRequest = async (requestId) => {
    const previous = requests;
    setRequests((prev) => prev.map((item) => item.id === requestId ? { ...item, status: STATUS.APPROVED } : item));
    try {
      const res = await fetch(`/api/requests?id=${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: STATUS.APPROVED, approvedBy: currentUser?.id, approvedAt: new Date().toISOString().slice(0, 10) }),
      });
      const payload = await res.json();
      if (currentUser?.id === payload.userId && payload.remain !== undefined && payload.remain !== null) {
        const nextUser = buildUserWithRemain(currentUser, payload.remain);
        if (nextUser) {
          setCurrentUser(nextUser);
          writeSession(nextUser);
        }
      }
      await refresh();
      setToast("승인되었습니다.");
    } catch {
      setRequests(previous);
      setToast("승인 실패", "error");
    }
  };

  const cancelApproval = async (requestId) => {
    const previous = requests;
    setRequests((prev) => prev.map((item) => item.id === requestId ? { ...item, status: STATUS.CANCELLED } : item));
    try {
      const res = await fetch(`/api/requests?id=${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: STATUS.CANCELLED, approvedBy: null, approvedAt: null }),
      });
      const payload = await res.json();
      if (currentUser?.id === payload.userId && payload.remain !== undefined && payload.remain !== null) {
        const nextUser = buildUserWithRemain(currentUser, payload.remain);
        if (nextUser) {
          setCurrentUser(nextUser);
          writeSession(nextUser);
        }
      }
      await refresh();
      setToast("승인 취소되었습니다.");
    } catch {
      setRequests(previous);
      setToast("취소 실패", "error");
    }
  };

  const myRequests = useMemo(() => requests.filter((r) => r.userId === currentUser?.id), [requests, currentUser]);
  const pendingCount = requests.filter((r) => r.status === STATUS.PENDING).length;
  const usedLeave = useMemo(() => calcApprovedLeaveForLeaveYear(myRequests, currentUser?.hireDate), [myRequests, currentUser]);
  const remainLeave = useMemo(() => calcEffectiveRemainingLeave(myRequests, currentUser?.hireDate, currentUser?.manualRemain), [myRequests, currentUser]);

  if (!authReady) {
    return <div style={{ padding: 24 }}>상태를 불러오는 중입니다…</div>;
  }

  if (!currentUser) {
    return (
      <div style={{ maxWidth: 360, margin: "80px auto", padding: 24, borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
        <h2 style={{ marginBottom: 12 }}>로그인</h2>
        {loginError ? <div style={{ color: "#ef4444", marginBottom: 12 }}>{loginError}</div> : null}
        <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="아이디" style={{ width: "100%", padding: 10, marginBottom: 10 }} />
        <input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="비밀번호" style={{ width: "100%", padding: 10, marginBottom: 10 }} />
        <button onClick={handleLogin} style={{ width: "100%", padding: 10, background: "#6366f1", color: "white", border: "none", borderRadius: 8 }}>로그인</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>{currentUser.name}</h2>
          <div style={{ color: "#6b7280" }}>{currentUser.role}</div>
        </div>
        <button onClick={handleLogout} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", background: "white", borderRadius: 8 }}>로그아웃</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 16, borderRadius: 12, background: "#f9fafb" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>총 연차</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{calcAnnualLeave(currentUser.hireDate)}</div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: "#fef3c7" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>사용</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{usedLeave}</div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: "#dcfce7" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>잔여</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{remainLeave}</div>
        </div>
      </div>

      <div style={{ marginBottom: 12, color: "#6b7280" }}>승인 대기: {pendingCount}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {requests.filter((item) => item.userId === currentUser.id).map((item) => (
          <div key={item.id} style={{ padding: 14, borderRadius: 12, border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{item.reason}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{item.status}</div>
            </div>
            {item.status === STATUS.PENDING ? (
              <button onClick={() => approveRequest(item.id)} style={{ padding: "8px 12px", background: "#10b981", color: "white", border: "none", borderRadius: 8 }}>승인</button>
            ) : (
              <button onClick={() => cancelApproval(item.id)} style={{ padding: "8px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: 8 }}>승인 취소</button>
            )}
          </div>
        ))}
      </div>

      {toast ? <div style={{ marginTop: 16, color: toast.includes("실패") ? "#ef4444" : "#10b981" }}>{toast}</div> : null}
    </div>
  );
}

export default App;
