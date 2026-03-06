// ─── 네이버 공휴일 목록 (예시, 실제로는 매년 업데이트 필요) ────────────────
const HOLIDAYS = [
  "2026-01-01", // 신정
  "2026-02-18", "2026-02-19", "2026-02-20", // 설날
  "2026-03-01", // 삼일절
  "2026-05-05", // 어린이날
  "2026-05-15", // 석가탄신일
  "2026-06-06", // 현충일
  "2026-08-15", // 광복절
  "2026-09-23", "2026-09-24", "2026-09-25", // 추석
  "2026-10-03", // 개천절
  "2026-10-09", // 한글날
  "2026-12-25", // 성탄절
];
import React, { useState, useEffect } from "react";
// import Icon from "./Icon";

// ─── 상수 ───────────────────────────────────────────────────────────────────

const ROLES = {
  SUPER_ADMIN: "최종관리자",
  DIRECTOR: "원장",
  TEACHER: "교사",
  ASSISTANT: "보조교사",
  EXTENDED: "연장교사",
  NIGHT: "야간반 교사",
  COOK: "조리사",
};

const ROLE_COLORS = {
  최종관리자: "#6366f1",
  원장: "#f59e0b",
  교사: "#10b981",
  보조교사: "#3b82f6",
  연장교사: "#8b5cf6",
  "야간반 교사": "#ec4899",
  조리사: "#f97316",
};

const STATUS = {
  PENDING: "대기중",
  APPROVED: "승인",
  REJECTED: "반려",
  CANCELLED: "취소됨",
};

const STATUS_COLOR = {
  대기중: "#f59e0b",
  승인: "#10b981",
  반려: "#ef4444",
  취소됨: "#6b7280",
};

// ─── 연차 계산 로직 (고용노동부 기준) ──────────────────────────────────────

function calcAnnualLeave(hireDate) {
  const hire = new Date(hireDate);
  const today = new Date();
  const diffMs = today - hire;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor(diffDays / 30);

  if (years < 1) {
    // 1년 미만: 매월 1일 (최대 11개)
    return Math.min(months, 11);
  } else {
    // 2년차: 15개, 이후 2년마다 1개씩 추가, 최대 25개
    const extra = Math.floor((years - 1) / 2);
    return Math.min(15 + extra, 25);
  }
}

// 데이터는 더 이상 클라이언트에 하드코딩하지 않습니다.
// 실제 운영 시에는 백엔드 API와 데이터베이스(Prisma/Neon 등)로부터
// 사용자 및 연차 요청을 가져오고 저장해야 합니다.
//
// 아래 예시는 `/api/users` 와 `/api/requests` 엔드포인트를 호출하는
// fetch 함수를 준비한 상태입니다.

async function fetchUsers() {
  try {
    const res = await fetch("/api/users");
    if (!res.ok) {
      console.error("fetchUsers error status:", res.status);
      return [];
    }
    const data = await res.json();
    console.log("fetchUsers success:", data);
    return data;
  } catch (err) {
    console.error("fetchUsers exception:", err);
    return [];
  }
}

async function fetchRequests() {
  try {
    const res = await fetch("/api/requests");
    if (!res.ok) {
      console.error("fetchRequests error status:", res.status);
      return [];
    }
    const data = await res.json();
    console.log("fetchRequests success:", data.length, "items");
    return data;
  } catch (err) {
    console.error("fetchRequests exception:", err);
    return [];
  }
}

// 실제 앱에서 데이터를 변경할 때는 해당 API를 호출한 후
// 화면을 다시 불러오는 식으로 처리합니다.
// 예: createUser(), updateRequest(), deleteUser() 등.

/*
  이전 버전에는 INIT_USERS, INIT_REQUESTS와
  sessionStorage 기반 loadData/saveData가 있었습니다.
  테스트용 더미 데이터가 남아있으면 반드시 삭제하세요.
*/

// ─── 아이콘 SVG ─────────────────────────────────────────────────────────────

const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    home: (
      <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    check: <path d="M5 13l4 4L19 7" />,
    x: (
      <path d="M18 6L6 18M6 6l12 12" />
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    logout: (
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    ),
    list: (
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </>
    ),
    bell: (
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
    trash: (
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
};

// ─── 메인 앱 ────────────────────────────────────────────────────────────────

export default function App() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toast, setToast] = useState(null);

  // 초기 렌더링 시 서버에서 데이터를 로드
  useEffect(() => {
    (async () => {
      const [u, r] = await Promise.all([fetchUsers(), fetchRequests()]);
      setUsers(u);
      setRequests(r);
    })();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 서버에서 최신 데이터를 가져오는 헬퍼
  const refresh = async () => {
    const [u, r] = await Promise.all([fetchUsers(), fetchRequests()]);
    setUsers(u);
    setRequests(r);
    // 현재 로그인한 사용자가 있으면 최신 사용자 정보로 갱신
    if (currentUser) {
      const updated = u.find((x) => x.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
  };

  const handleLogin = () => {
    // compare against loginId field from database, not the internal UUID `id`
    const u = users.find((u) => u.loginId === loginId && u.pw === loginPw && u.active);
    if (u) {
      setCurrentUser(u);
      setLoginError("");
      setPage("dashboard");
    } else {
      setLoginError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginId("");
    setLoginPw("");
    setPage("dashboard");
  };

  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN;
  const isDirector = currentUser?.role === ROLES.DIRECTOR;
  const canManage = isSuperAdmin || isDirector;

  if (!currentUser) {
    return (
      <LoginScreen
        loginId={loginId}
        setLoginId={setLoginId}
        loginPw={loginPw}
        setLoginPw={setLoginPw}
        loginError={loginError}
        onLogin={handleLogin}
      />
    );
  }

  const myRequests = requests.filter((r) => r.userId === currentUser.id);
  const pendingCount = requests.filter((r) => r.status === STATUS.PENDING).length;
  const totalLeave = calcAnnualLeave(currentUser.hireDate);
  const usedLeave = myRequests.filter((r) => r.status === STATUS.APPROVED).reduce((acc, r) => acc + requestCost(r), 0);
  const remainLeave = (typeof currentUser.manualRemain === "number" && currentUser.manualRemain !== null)
    ? currentUser.manualRemain - usedLeave
    : totalLeave - usedLeave;

  const navItems = [
    { id: "dashboard", label: "홈", icon: "home" },
    ...(!isSuperAdmin ? [{ id: "myLeave", label: "내 연차", icon: "calendar" }] : []),
    ...(canManage ? [{ id: "manage", label: "관리", icon: "list" }] : []),
    ...(isSuperAdmin ? [{ id: "admin", label: "관리자", icon: "settings" }] : []),
    { id: "profile", label: "내 정보", icon: "user" },
  ];

  return (
    <div style={styles.appWrap}>
      {/* 토스트 */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "error" ? "#ef4444" : "#10b981",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <span style={styles.logoMark}>🌸</span>
            <span style={styles.logoText}>코코베베 연차관리</span>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.userChip}>
              <span
                style={{
                  ...styles.roleTag,
                  background: ROLE_COLORS[currentUser.role] + "22",
                  color: ROLE_COLORS[currentUser.role],
                }}
              >
                {currentUser.role}
              </span>
              <span style={styles.userName}>{currentUser.name}</span>
            </div>
            {canManage && pendingCount > 0 && (
              <div style={styles.badge}>{pendingCount}</div>
            )}
            <button style={styles.logoutBtn} onClick={handleLogout}>
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main style={styles.main}>
        {page === "dashboard" && (
          <Dashboard
            user={currentUser}
            myRequests={myRequests}
            totalLeave={totalLeave}
            usedLeave={usedLeave}
            remainLeave={remainLeave}
            allRequests={requests}
            canManage={canManage}
            isSuperAdmin={isSuperAdmin}
            setPage={setPage}
          />
        )}
        {page === "myLeave" && !isSuperAdmin && (
          <MyLeave
            user={currentUser}
            requests={myRequests}
            totalLeave={totalLeave}
            usedLeave={usedLeave}
            remainLeave={remainLeave}
            setRequests={setRequests}
            allRequests={requests}
            showToast={showToast}
          />
        )}
        {page === "manage" && canManage && (
          <ManagePage
            currentUser={currentUser}
            isSuperAdmin={isSuperAdmin}
            users={users}
            requests={requests}
            setRequests={setRequests}
            showToast={showToast}
            refresh={refresh}
          />
        )}
        {page === "admin" && isSuperAdmin && (
          <AdminPage
            users={users}
            setUsers={setUsers}
            showToast={showToast}
            refresh={refresh}
          />
        )}
        {page === "profile" && (
          <ProfilePage
            user={currentUser}
            setUsers={setUsers}
            users={users}
            setCurrentUser={setCurrentUser}
            isSuperAdmin={isSuperAdmin}
            showToast={showToast}
          />
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav style={styles.bottomNav}>
        {navItems.map((item) => (
          <button
            key={item.id}
            style={{
              ...styles.navBtn,
              ...(page === item.id ? styles.navBtnActive : {}),
            }}
            onClick={() => setPage(item.id)}
          >
            <Icon
              name={item.icon}
              size={22}
              color={page === item.id ? "#6366f1" : "#9ca3af"}
            />
            <span
              style={{
                ...styles.navLabel,
                color: page === item.id ? "#6366f1" : "#9ca3af",
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── 로그인 화면 ─────────────────────────────────────────────────────────────

function LoginScreen({ loginId, setLoginId, loginPw, setLoginPw, loginError, onLogin }) {
  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>🌸</div>
        <h1 style={styles.loginTitle}>코코베베 어린이집</h1>
        <p style={styles.loginSub}>연차 관리 시스템</p>
        <div style={styles.formGroup}>
          <input
            style={styles.input}
            placeholder="아이디"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLogin()}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="비밀번호"
            value={loginPw}
            onChange={(e) => setLoginPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLogin()}
          />
          {loginError && <p style={styles.errorMsg}>{loginError}</p>}
          <button style={styles.primaryBtn} onClick={onLogin}>
            로그인
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── 대시보드 ─────────────────────────────────────────────────────────────────

function Dashboard({ user, myRequests, totalLeave, usedLeave, remainLeave, allRequests, canManage, isSuperAdmin, setPage }) {
  const allPending = allRequests.filter((r) => r.status === STATUS.PENDING);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  // ratio bar weights based on actual days; no percent displayed
  const usedWeight = usedLeave || 0;
  const remainWeight = remainLeave || 0;


  return (
    <div style={styles.pageWrap}>
      {/* 인사 카드 */}
      <div style={styles.greetCard}>
        <div>
          <p style={styles.greetDate}>{today}</p>
          <h2 style={styles.greetTitle}>안녕하세요, {user.name}님 👋</h2>
          {user.classRoom && (
            <p style={styles.greetSub}>{user.classRoom}</p>
          )}
        </div>
        <div
          style={{
            ...styles.roleCircle,
            background: ROLE_COLORS[user.role] + "33",
            color: ROLE_COLORS[user.role],
          }}
        >
          {user.role}
        </div>
      </div>

      {/* 연차 현황 카드 - 최고관리자/원장 숨김 */}
      {!isSuperAdmin && user.role !== ROLES.DIRECTOR && (
        <div style={styles.leaveCard}>
          <div style={styles.leaveCardHeader}>
            <span style={styles.leaveCardTitle}>연차 현황</span>
            <span style={styles.leaveCardYear}>
              {calcYearLabel(user.hireDate)}
            </span>
          </div>
          <div style={styles.leaveStats}>
            <div style={styles.leaveStat}>
              <span style={styles.leaveStatNum}>{totalLeave}</span>
              <span style={styles.leaveStatLabel}>총 연차</span>
            </div>
            <div style={styles.leaveDivider} />
            <div style={styles.leaveStat}>
              <span style={{ ...styles.leaveStatNum, color: "#f59e0b" }}>{usedLeave}</span>
              <span style={styles.leaveStatLabel}>사용</span>
            </div>
            <div style={styles.leaveDivider} />
            <div style={styles.leaveStat}>
              <span style={{ ...styles.leaveStatNum, color: "#10b981" }}>{remainLeave < 0 ? `-${Math.abs(remainLeave)}일` : remainLeave}</span>
              <span style={styles.leaveStatLabel}>잔여</span>
            </div>
          </div>
          {/* 비율 바 (flex 기반, 퍼센트 없음) */}
          <div style={styles.ratioBar}>
            <div style={{ ...styles.ratioSegmentUsed, flex: usedWeight }} />
            <div style={{ ...styles.ratioSegmentRemain, flex: remainWeight }} />
          </div>
        </div>
      )}

      {/* 빠른 메뉴 */}
      <div style={styles.quickGrid}>
        {!isSuperAdmin && (
          <>
            <button style={styles.quickBtn} onClick={() => setPage("myLeave")}>
              <Icon name="plus" size={24} color="#6366f1" />
              <span style={styles.quickLabel}>연차 신청</span>
            </button>
            <button style={styles.quickBtn} onClick={() => setPage("myLeave")}>
              <Icon name="list" size={24} color="#10b981" />
              <span style={styles.quickLabel}>내 신청 내역</span>
            </button>
          </>
        )}
        {canManage && (
          <button style={{ ...styles.quickBtn, position: "relative" }} onClick={() => setPage("manage")}>
            <Icon name="bell" size={24} color="#f59e0b" />
            {allPending.length > 0 && (
              <span style={styles.quickBadge}>{allPending.length}</span>
            )}
            <span style={styles.quickLabel}>승인 대기</span>
          </button>
        )}
        {isSuperAdmin && (
          <button style={styles.quickBtn} onClick={() => setPage("admin")}>
            <Icon name="settings" size={24} color="#6366f1" />
            <span style={styles.quickLabel}>계정 관리</span>
          </button>
        )}
      </div>

      {/* 최근 신청 - 최고관리자 숨김 */}
      {!isSuperAdmin && myRequests.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>최근 신청 내역</h3>
          {myRequests.slice(-3).reverse().map((r) => (
            <RequestItem key={r.id} req={r} showUser={false} />
          ))}
        </div>
      )}
    </div>
  );
}
function formatDate(d) {
    if (!d) return "";
    try {
        return new Date(d).toLocaleDateString("ko-KR");
    } catch {
        return d;
    }
}
function calcYearLabel(hireDate) {
  const years = Math.floor((new Date() - new Date(hireDate)) / (365.25 * 24 * 3600 * 1000));
  if (years < 1) return "1년차 (수습)";
  return `${years + 1}년차`;
}

// helper: compute request cost in days (supports startDate/endDate/halfDay)
function requestCost(r) {
  // halfDay specified ("AM" or "PM")
  if (r.halfDay) return 0.5;
  // range specified
  const start = r.startDate ? new Date(r.startDate) : (r.date ? new Date(r.date) : null);
  const end = r.endDate ? new Date(r.endDate) : (r.date ? new Date(r.date) : null);
  if (start && end) {
    let count = 0;
    let d = new Date(start);
    while (d <= end) {
      const info = getDayInfo(d);
      const yyyyMMdd = d.toISOString().slice(0, 10);
      if (!info.isWeekend && !HOLIDAYS.includes(yyyyMMdd)) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }
  // fallback: type-based
  if (r.type === "반차") return 0.5;
  // 단일 날짜도 공휴일/주말 제외
  const singleDate = r.date || r.startDate;
  if (singleDate) {
    const d = new Date(singleDate);
    const info = getDayInfo(d);
    const yyyyMMdd = d.toISOString().slice(0, 10);
    if (!info.isWeekend && !HOLIDAYS.includes(yyyyMMdd)) return 1;
    return 0;
  }
  return 1;
}

function formatRequestDate(r) {
  if (r.halfDay) {
    return `${new Date(r.date || r.startDate).toLocaleDateString("ko-KR")} (${r.halfDay === 'AM' ? '오전' : '오후'} 반차)`;
  }
  if (r.startDate && r.endDate) {
    const s = new Date(r.startDate).toLocaleDateString("ko-KR");
    const e = new Date(r.endDate).toLocaleDateString("ko-KR");
    return s === e ? s : `${s} ~ ${e}`;
  }
  if (r.date) return new Date(r.date).toLocaleDateString("ko-KR");
  return "-";
}

// helper: get day of week (0=Sun, 1=Mon, ..., 6=Sat) and label
function getDayInfo(date) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const dayOfWeek = d.getDay(); // 0=Sunday, 6=Saturday
  const dayName = ["일", "월", "화", "수", "목", "금", "토"][dayOfWeek];
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return { dayOfWeek, dayName, isWeekend };
}

// ─── 내 연차 ──────────────────────────────────────────────────────────────────

function MyLeave({ user, requests, totalLeave, usedLeave, remainLeave, setRequests, allRequests, showToast }) {

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "연차", startDate: null, endDate: null, date: null, halfDay: "AM", reason: "" });

  const submitLeave = async () => {
    // validate
    if (form.type === "연차") {
      if (!form.startDate) return showToast("시작 날짜를 선택해주세요.", "error");
      if (!form.endDate) return showToast("종료 날짜를 선택해주세요.", "error");
    } else {
      if (!form.date) return showToast("날짜를 선택해주세요.", "error");
    }
    if (!form.reason.trim()) return showToast("사유를 입력해주세요.", "error");
    // 과거 날짜 제한 없음

    // 실제 leave 신청 payload 정의
    const payload = {
      userId: user.id,
      type: form.type,
      reason: form.reason,
      status: STATUS.PENDING,
    };
    if (form.type === "연차") {
      payload.startDate = form.startDate.toISOString().split("T")[0];
      payload.endDate = form.endDate.toISOString().split("T")[0];
    } else {
      payload.date = form.date.toISOString().split("T")[0];
      payload.halfDay = form.halfDay; // 'AM' or 'PM'
    }

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        showToast("신청 실패", "error");
        return;
      }
      const newReq = await res.json();
      setRequests((prev) => [...prev, newReq]);
      setForm({ type: "연차", startDate: null, endDate: null, date: null, halfDay: "AM", reason: "" });
      setShowForm(false);
      showToast("연차 신청이 완료되었습니다.");
    } catch (err) {
      console.error("submitLeave error:", err);
      showToast("신청 실패", "error");
    }
  };

  const deleteReq = async (reqId) => {
    const req = allRequests.find((r) => r.id === reqId);
    // 교사는 취소됨 상태만 삭제 가능
    if (req.status !== STATUS.CANCELLED) return showToast("취소된 신청만 삭제할 수 있습니다.", "error");
    try {
      await fetch(`/api/requests?id=${reqId}`, {
        method: "DELETE",
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
      showToast("삭제되었습니다.");
    } catch (err) {
      console.error("deleteReq error:", err);
      showToast("삭제 실패", "error");
    }
  };

  const cancelReq = async (reqId) => {
    const req = allRequests.find((r) => r.id === reqId);
    if (req.status !== STATUS.PENDING) return showToast("대기중인 신청만 취소할 수 있습니다.", "error");
    try {
      await fetch(`/api/requests?id=${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: STATUS.CANCELLED }),
      });
      setRequests((prev) =>
        prev.map((r) => r.id === reqId ? { ...r, status: STATUS.CANCELLED } : r)
      );
      showToast("신청이 취소되었습니다.");
    } catch (err) {
      console.error("cancelReq error:", err);
      showToast("취소 실패", "error");
    }
  };

  return (
    <div style={styles.pageWrap}>
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>내 연차</h2>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          <Icon name="plus" size={18} color="white" />
        </button>
      </div>

      {/* 연차 요약 */}
      <div style={styles.miniStats}>
        {[
          { label: "총 연차", val: totalLeave, color: "#6366f1" },
          { label: "사용", val: usedLeave, color: "#f59e0b" },
          { label: "잔여", val: remainLeave, color: "#10b981" },
        ].map((s) => (
          <div key={s.label} style={{ ...styles.miniStat, borderTop: `3px solid ${s.color}` }}>
            <span style={{ ...styles.miniStatNum, color: s.color }}>{s.label === "잔여" && s.val < 0 ? '-' : s.val}</span>
            <span style={styles.miniStatLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* 신청 폼 */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>연차 신청</h3>
          <div style={styles.typeGroup}>
            {["연차", "반차"].map((t) => (
              <button
                key={t}
                style={{
                  ...styles.typeBtn,
                  ...(form.type === t ? styles.typeBtnActive : {}),
                }}
                onClick={() => setForm((f) => ({ ...f, type: t }))}
              >
                {t}
              </button>
            ))}
          </div>
          {form.type === "연차" ? (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>시작 날짜</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={form.startDate ? form.startDate.toISOString().slice(0, 10) : ""}
                    // min removed to allow past dates
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value ? new Date(e.target.value) : null }))}
                  />
                  {form.startDate && (() => {
                    const info = getDayInfo(form.startDate);
                    return info && info.isWeekend ? (
                      <p style={{ fontSize: 11, color: info.dayOfWeek === 0 ? "#dc2626" : "#d97706", marginTop: 4, marginBottom: 0 }}>
                        ({info.dayName}) {info.dayOfWeek === 0 ? "일요일" : "토요일"}입니다
                      </p>
                    ) : null;
                  })()}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>종료 날짜</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={form.endDate ? form.endDate.toISOString().slice(0, 10) : ""}
                    // min removed to allow past dates
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value ? new Date(e.target.value) : null }))}
                  />
                  {form.endDate && (() => {
                    const info = getDayInfo(form.endDate);
                    return info && info.isWeekend ? (
                      <p style={{ fontSize: 11, color: info.dayOfWeek === 0 ? "#dc2626" : "#d97706", marginTop: 4, marginBottom: 0 }}>
                        ({info.dayName}) {info.dayOfWeek === 0 ? "일요일" : "토요일"}입니다
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>날짜</label>
                <input
                  type="date"
                  style={styles.input}
                  value={form.date ? form.date.toISOString().slice(0, 10) : ""}
                  // min removed to allow past dates
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value ? new Date(e.target.value) : null }))}
                />
                {form.date && (() => {
                  const info = getDayInfo(form.date);
                  return info && info.isWeekend ? (
                    <p style={{ fontSize: 11, color: info.dayOfWeek === 0 ? "#dc2626" : "#d97706", marginTop: 4, marginBottom: 0 }}>
                      ({info.dayName}) {info.dayOfWeek === 0 ? "일요일" : "토요일"}입니다
                    </p>
                  ) : null;
                })()}
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>반차 시간</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["오전", "오후"].map((t) => (
                    <button
                      key={t}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: form.halfDay === (t === "오전" ? "AM" : "PM") ? "#0284c7" : "#e5e7eb",
                        background: form.halfDay === (t === "오전" ? "AM" : "PM") ? "#dbeafe" : "white",
                        color: form.halfDay === (t === "오전" ? "AM" : "PM") ? "#0284c7" : "#6b7280",
                        cursor: "pointer",
                        fontWeight: form.halfDay === (t === "오전" ? "AM" : "PM") ? 600 : 400,
                      }}
                      onClick={() => setForm((f) => ({ ...f, halfDay: t === "오전" ? "AM" : "PM" }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <textarea
            style={{ ...styles.input, height: 80, resize: "none", marginTop: 12 }}
            placeholder="신청 사유"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={submitLeave}>
              신청하기
            </button>
            <button
              style={{ ...styles.ghostBtn, flex: 1 }}
              onClick={() => setShowForm(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>신청 내역</h3>
        {requests.length === 0 ? (
          <EmptyState msg="연차 신청 내역이 없습니다." />
        ) : (
          [...requests].reverse().map((r) => (
            <RequestItem
              key={r.id}
              req={r}
              showUser={false}
              actions={
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {r.status === STATUS.PENDING && (
                    <button
                      style={styles.smallBtn}
                      onClick={() => cancelReq(r.id)}
                    >
                      신청 취소
                    </button>
                  )}
                  {r.status === STATUS.CANCELLED && (
                    <button
                      style={{ ...styles.smallBtn, background: "#fee2e2", color: "#ef4444" }}
                      onClick={() => deleteReq(r.id)}
                    >
                      <Icon name="trash" size={14} /> 삭제
                    </button>
                  )}
                </div>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── 관리 페이지 (원장/최종관리자) ──────────────────────────────────────────

function ManagePage({ currentUser, isSuperAdmin, users, requests, setRequests, showToast, refresh }) {
  const [tab, setTab] = useState("requests"); // "requests" | "staff"
  const [filter, setFilter] = useState("전체");
  const statuses = ["전체", STATUS.PENDING, STATUS.APPROVED, STATUS.REJECTED, STATUS.CANCELLED];

  const filtered = requests.filter((r) =>
    filter === "전체" ? true : r.status === filter
  );

  const approve = async (reqId) => {
    try {
      await fetch(`/api/requests?id=${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: STATUS.APPROVED, approvedBy: currentUser.id, approvedAt: new Date().toISOString().slice(0, 10) }),
      });
      await refresh();
      showToast("승인되었습니다.");
    } catch {
      showToast("승인 실패", "error");
    }
  };

  const reject = async (reqId) => {
    try {
      await fetch(`/api/requests?id=${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: STATUS.REJECTED, approvedBy: currentUser.id, approvedAt: new Date().toISOString().slice(0, 10) }),
      });
      await refresh();
      showToast("반려되었습니다.");
    } catch {
      showToast("반려 실패", "error");
    }
  };

  const cancelApproval = async (reqId) => {
    try {
      await fetch(`/api/requests?id=${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: STATUS.CANCELLED, approvedBy: null, approvedAt: null }),
      });
      await refresh();
      showToast("승인이 취소되었습니다.");
    } catch {
      showToast("취소 실패", "error");
    }
  };

  // 최고관리자: 반려·취소 건 완전 삭제
  const deleteRequest = async (reqId) => {
    try {
      await fetch(`/api/requests?id=${reqId}`, {
        method: "DELETE",
      });
      await refresh();
      showToast("삭제되었습니다.");
    } catch {
      showToast("삭제 실패", "error");
    }
  };

  const getUserName = (uid) => users.find((u) => u.id === uid)?.name || uid;
  const getUserRole = (uid) => users.find((u) => u.id === uid)?.role;

  // 직원별 연차 현황 계산
  const staffUsers = users.filter(
    (u) => u.role !== ROLES.SUPER_ADMIN && u.active
  );
  const staffLeaveStats = staffUsers.map((u) => {
    const total = calcAnnualLeave(u.hireDate);
    const used = requests.filter((r) => r.userId === u.id && r.status === STATUS.APPROVED).reduce((acc, r) => acc + requestCost(r), 0);
    const pending = requests.filter((r) => r.userId === u.id && r.status === STATUS.PENDING).reduce((acc, r) => acc + requestCost(r), 0);
    const remain = (typeof u.manualRemain === "number" && u.manualRemain !== null) ? u.manualRemain - used : total - used;
    return { ...u, total, used, pending, remain };
  });

  const pendingCount = requests.filter((r) => r.status === STATUS.PENDING).length;

  return (
    <div style={styles.pageWrap}>
      <h2 style={styles.pageTitle}>관리</h2>

      {/* 탭 */}
      <div style={styles.tabRow}>
        <button
          style={{ ...styles.tabBtn, ...(tab === "requests" ? styles.tabBtnActive : {}) }}
          onClick={() => setTab("requests")}
        >
          연차 신청
          {pendingCount > 0 && (
            <span style={styles.filterBadge}>{pendingCount}</span>
          )}
        </button>
        <button
          style={{ ...styles.tabBtn, ...(tab === "staff" ? styles.tabBtnActive : {}) }}
          onClick={() => setTab("staff")}
        >
          직원 연차 현황
        </button>
      </div>

      {/* ── 탭 1: 연차 신청 관리 ── */}
      {tab === "requests" && (
        <>
          <div style={styles.filterRow}>
            {statuses.map((s) => (
              <button
                key={s}
                style={{
                  ...styles.filterBtn,
                  ...(filter === s ? styles.filterBtnActive : {}),
                }}
                onClick={() => setFilter(s)}
              >
                {s}
                {s === STATUS.PENDING && pendingCount > 0 && (
                  <span style={styles.filterBadge}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState msg="해당 신청이 없습니다." />
          ) : (
            [...filtered].reverse().map((r) => (
              <RequestItem
                key={r.id}
                req={r}
                showUser={true}
                userName={getUserName(r.userId)}
                userRole={getUserRole(r.userId)}
                actions={
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {r.status === STATUS.PENDING && (
                      <>
                        <button
                          style={{ ...styles.smallBtn, background: "#d1fae5", color: "#059669" }}
                          onClick={() => approve(r.id)}
                        >
                          <Icon name="check" size={14} /> 승인
                        </button>
                        <button
                          style={{ ...styles.smallBtn, background: "#fee2e2", color: "#ef4444" }}
                          onClick={() => reject(r.id)}
                        >
                          <Icon name="x" size={14} /> 반려
                        </button>
                      </>
                    )}
                    {r.status === STATUS.APPROVED && (
                      <button
                        style={{ ...styles.smallBtn, background: "#fef3c7", color: "#d97706" }}
                        onClick={() => cancelApproval(r.id)}
                      >
                        승인 취소
                      </button>
                    )}
                    {/* 최고관리자: 반려·취소 건 삭제 */}
                    {isSuperAdmin && (r.status === STATUS.REJECTED || r.status === STATUS.CANCELLED) && (
                      <button
                        style={{ ...styles.smallBtn, background: "#fee2e2", color: "#ef4444" }}
                        onClick={() => deleteRequest(r.id)}
                      >
                        <Icon name="trash" size={14} /> 삭제
                      </button>
                    )}
                  </div>
                }
              />
            ))
          )}
        </>
      )}

      {/* ── 탭 2: 직원 연차 현황 ── */}
      {tab === "staff" && (
        <>
          {/* 요약 배너 */}
          <div style={styles.staffSummaryBanner}>
            <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 700 }}>
              재직 중 직원 {staffLeaveStats.length}명의 연차 현황
            </span>
          </div>

          {staffLeaveStats.length === 0 ? (
            <EmptyState msg="직원이 없습니다." />
          ) : (
            staffLeaveStats.map((u) => {
              return (
                <div key={u.id} style={styles.staffLeaveCard}>
                  {/* 상단: 이름 + 역할 + 잔여 */}
                  <div style={styles.staffLeaveTop}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          background: ROLE_COLORS[u.role] + "22",
                          color: ROLE_COLORS[u.role],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 15,
                          flexShrink: 0,
                        }}
                      >
                        {u.name[0]}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{u.name}</span>
                          <span
                            style={{
                              ...styles.roleTag,
                              background: ROLE_COLORS[u.role] + "22",
                              color: ROLE_COLORS[u.role],
                              fontSize: 11,
                            }}
                          >
                            {u.role}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                          {u.classRoom || formatDate(u.hireDate)} · {calcYearLabel(u.hireDate)}
                        </p>
                      </div>
                    </div>
                    {/* 잔여 연차 크게 */}
                    <div style={styles.remainBadge}>
                      <span style={styles.remainBadgeNum}>{u.remain < 0 ? `-${Math.abs(u.remain)}일` : u.remain}</span>
                      <span style={styles.remainBadgeLabel}>잔여</span>
                    </div>
                  </div>

                  {/* 비율 바 + 연차 수치 */}
                  <div style={{ marginTop: 12 }}>
                    {/* flex 비율로 사용/잔여 표시, 숫자 없음 */}
                    <div style={styles.ratioBar}>
                      <div style={{ ...styles.ratioSegmentUsed, flex: u.used || 0 }} />
                      <div style={{ ...styles.ratioSegmentRemain, flex: u.remain || 0 }} />
                    </div>
                    <div style={styles.staffLeaveNums}>
                      <span>총 <strong>{u.total}</strong>일</span>
                      <span style={{ color: "#f59e0b" }}>사용 <strong>{u.used}</strong>일</span>
                      {u.pending > 0 && (
                        <span style={{ color: "#6366f1" }}>대기 <strong>{u.pending}</strong>일</span>
                      )}
                      <span style={{ color: "#10b981" }}>잔여 <strong>{u.remain < 0 ? `-${Math.abs(u.remain)}일` : u.remain}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

// ─── 삭제 확인 모달 ──────────────────────────────────────────────────────────

function DeleteModal({ user, onConfirm, onCancel }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <div style={styles.modalIcon}>⚠️</div>
        <h3 style={styles.modalTitle}>계정을 삭제하시겠습니까?</h3>
        <div style={styles.modalUserInfo}>
          <span
            style={{
              ...styles.roleTag,
              background: ROLE_COLORS[user.role] + "22",
              color: ROLE_COLORS[user.role],
            }}
          >
            {user.role}
          </span>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{user.name}</span>
        </div>
        <p style={styles.modalDesc}>
          이 계정과 관련된 모든 데이터가 목록에서 사라집니다.{"\n"}이 작업은 되돌릴 수 없습니다.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...styles.ghostBtn, flex: 1 }} onClick={onCancel}>취소</button>
          <button
            style={{
              ...styles.primaryBtn,
              flex: 1,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
            }}
            onClick={onConfirm}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 연차 미리보기 배지 ──────────────────────────────────────────────────────

function LeaveBadge({ hireDate }) {
  if (!hireDate) return null;
  const leave = calcAnnualLeave(hireDate);
  const hire = new Date(hireDate);
  const today = new Date();
  const diffDays = Math.floor((today - hire) / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const label = years < 1 ? "1년 미만 (월차)" : `${years + 1}년차`;

  return (
    <div style={styles.leaveBadgeWrap}>
      <div style={styles.leaveBadgeIcon}>📋</div>
      <div>
        <p style={styles.leaveBadgeLabel}>입사일 기준 적용 연차</p>
        <p style={styles.leaveBadgeVal}>
          <strong style={{ color: "#6366f1", fontSize: 20 }}>{leave}일</strong>
          <span style={{ color: "#6b7280", fontSize: 13, marginLeft: 6 }}>({label})</span>
        </p>
        {years < 1 && (
          <p style={styles.leaveBadgeNote}>
            매월 1일 발생 · 현재까지 {Math.min(Math.floor(diffDays / 30), 11)}개월 경과
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 관리자 페이지 ────────────────────────────────────────────────────────────

function AdminPage({ users, setUsers, showToast, refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: "", pw: "", name: "", role: ROLES.TEACHER, hireDate: "", classRoom: "",
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedManualRemain, setExpandedManualRemain] = useState(null);

  const createUser = async () => {
    if (!form.id || !form.pw || !form.name || !form.hireDate)
      return showToast("모든 필드를 입력해주세요.", "error");
    if (users.find((u) => u.loginId === form.id))
      return showToast("이미 존재하는 아이디입니다.", "error");
    if (form.pw.length < 4)
      return showToast("비밀번호는 4자 이상이어야 합니다.", "error");

    try {
      const payload = {
        loginId: form.id,
        pw: form.pw,
        name: form.name,
        role: form.role,
        hireDate: form.hireDate,
        classRoom: form.classRoom,
        active: true,
      };
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("생성 실패");
      await refresh();
      setForm({ id: "", pw: "", name: "", role: ROLES.TEACHER, hireDate: "", classRoom: "" });
      setShowForm(false);
      showToast(`${form.name} 계정이 생성되었습니다.`);
    } catch (e) {
      showToast("계정 생성에 실패했습니다.", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await refresh();
      showToast(`${deleteTarget.name} 계정이 삭제되었습니다.`);
    } catch {
      showToast("삭제에 실패했습니다.", "error");
    }
    setDeleteTarget(null);
    setExpandedId(null);
  };

  const applySystem = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'applySystem' }),
      });
      if (!res.ok) throw new Error('apply failed');
      const data = await res.json();
      await refresh();
      showToast(`시스템 적용 완료: ${data.applied}명`);
    } catch (e) {
      showToast('시스템 적용 실패', 'error');
    }
  };

  const toggleActive = (uid) => {
    setUsers((prev) =>
      prev.map((u) => u.id === uid ? { ...u, active: !u.active } : u)
    );
    const u = users.find((x) => x.id === uid);
    showToast(`${u.name} 계정이 ${u.active ? "비활성화" : "활성화"}되었습니다.`);
  };

  const staffUsers = users.filter((u) => u.role !== ROLES.SUPER_ADMIN);

  // 역할별 그룹핑
  const roleOrder = [
    ROLES.DIRECTOR, // 원장
    ROLES.TEACHER, // 교사
    ROLES.ASSISTANT, // 보조교사
    ROLES.EXTENDED, // 연장교사
    ROLES.NIGHT, // 야간반 교사
    ROLES.COOK // 조리사
  ];
  const grouped = roleOrder.map((role) => ({
    role,
    members: staffUsers.filter((u) => u.role === role),
  })).filter((g) => g.members.length > 0);

  return (
    <div style={styles.pageWrap}>
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>직원 계정 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...styles.ghostBtn, padding: '10px 12px' }} onClick={applySystem}>시스템 적용</button>
          <button style={styles.addBtn} onClick={() => { setShowForm(!showForm); setExpandedId(null); setExpandedManualRemain(null); }}>
          <Icon name="plus" size={18} color="white" />
        </button>
        </div>
      </div>

      {/* 통계 요약 */}
      <div style={styles.adminSummary}>
        <div style={styles.adminSumItem}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#6366f1" }}>{staffUsers.length}</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>전체 직원</span>
        </div>
        <div style={styles.adminSumDivider} />
        <div style={styles.adminSumItem}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{staffUsers.filter(u => u.active).length}</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>재직중</span>
        </div>
        <div style={styles.adminSumDivider} />
        <div style={styles.adminSumItem}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#9ca3af" }}>{staffUsers.filter(u => !u.active).length}</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>비활성</span>
        </div>
      </div>

      {/* 계정 생성 폼 */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>✨ 새 계정 생성</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...styles.input, flex: 1 }} placeholder="아이디" value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.replace(/\s/g, "") }))} />
            <input style={{ ...styles.input, flex: 1 }} placeholder="초기 비밀번호" value={form.pw}
              onChange={(e) => setForm((f) => ({ ...f, pw: e.target.value }))} />
          </div>
          <input style={styles.input} placeholder="이름" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <select style={styles.input} value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {Object.values(ROLES).filter((r) => r !== ROLES.SUPER_ADMIN).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <div>
            <label style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, display: "block" }}>입사일 (연차 계산 기준)</label>
            <input type="date" style={styles.input} value={form.hireDate}
              onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))} />
          </div>
          {/* 입사일 입력 시 연차 미리보기 */}
          {form.hireDate && <LeaveBadge hireDate={form.hireDate} />}
          <input style={styles.input} placeholder="담당반 (선택)" value={form.classRoom}
            onChange={(e) => setForm((f) => ({ ...f, classRoom: e.target.value }))} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={createUser}>계정 생성</button>
            <button style={{ ...styles.ghostBtn, flex: 1 }} onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {/* 역할별 목록 */}
      {grouped.map(({ role, members }) => (
        <div key={role} style={styles.section}>
          <div style={styles.groupHeader}>
            <span
              style={{
                ...styles.roleTag,
                background: ROLE_COLORS[role] + "22",
                color: ROLE_COLORS[role],
                fontSize: 13,
                padding: "4px 10px",
              }}
            >
              {role}
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{members.length}명</span>
          </div>
          {members.map((u) => {
            const leave = calcAnnualLeave(u.hireDate);
            const isExpanded = expandedId === u.id;
            const years = Math.floor((new Date() - new Date(u.hireDate)) / (365.25 * 24 * 3600 * 1000));
            return (
              <div key={u.id} style={{ ...styles.userCard, opacity: u.active ? 1 : 0.6, flexDirection: "column", alignItems: "stretch" }}>
                {/* 카드 상단 */}
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : u.id);
                    setExpandedManualRemain(isExpanded ? null : (u.manualRemain !== undefined && u.manualRemain !== null ? u.manualRemain : ""));
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: ROLE_COLORS[u.role] + "22",
                        color: ROLE_COLORS[u.role],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {u.name[0]}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={styles.userCardName}>{u.name}</span>
                        {!u.active && <span style={styles.inactiveTag}>비활성</span>}
                      </div>
                      <p style={styles.userCardSub}>
                        {u.loginId} · 연차 {leave}일 · {years < 1 ? "1년 미만" : `${years}년`}
                        {u.classRoom ? ` · ${u.classRoom}` : ""}
                      </p>
                    </div>
                  </div>
                  <span style={{ color: "#9ca3af", fontSize: 18, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ›
                  </span>
                </div>

                {/* 확장 영역 */}
                {isExpanded && (
                  <div style={styles.expandedArea}>
                    <div style={styles.expandedInfo}>
                      <div style={styles.expandedRow}>
                        <span style={styles.expandedLabel}>아이디</span>
                        <span style={styles.expandedVal}>{u.loginId}</span>
                      </div>
                      <div style={styles.expandedRow}>
                        <span style={styles.expandedLabel}>입사일</span>
                        <span style={styles.expandedVal}>{u.hireDate ? u.hireDate.slice(0, 10) : ""}</span>
                      </div>
                      {u.role !== ROLES.DIRECTOR && (
                        <>
                          <div style={styles.expandedRow}>
                            <span style={styles.expandedLabel}>적용 연차</span>
                            <span style={{ ...styles.expandedVal, color: "#6366f1", fontWeight: 800 }}>{leave}일</span>
                          </div>
                          <div style={styles.expandedRow}>
                            <span style={styles.expandedLabel}>수동 잔여</span>
                            <span style={styles.expandedVal}>
                              <input
                                type="number"
                                step="0.5"
                                min="-100"
                                style={{ width: 120, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                value={expandedManualRemain ?? ""}
                                onChange={(e) => setExpandedManualRemain(e.target.value)}
                              />
                            </span>
                          </div>
                        </>
                      )}
                      {u.classRoom && (
                        <div style={styles.expandedRow}>
                          <span style={styles.expandedLabel}>담당반</span>
                          <span style={styles.expandedVal}>{u.classRoom}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        style={{
                          ...styles.smallBtn,
                          flex: 1,
                          justifyContent: "center",
                          background: u.active ? "#fef3c7" : "#d1fae5",
                          color: u.active ? "#d97706" : "#059669",
                          padding: "10px",
                        }}
                        onClick={() => toggleActive(u.id)}
                      >
                        {u.active ? "비활성화" : "활성화"}
                      </button>
                        <button
                          style={{ ...styles.smallBtn, flex: 1, justifyContent: 'center', background: '#e0f2fe', color: '#2563eb', padding: '10px' }}
                          onClick={async () => {
                            const newPw = prompt(`${u.name}님의 새 비밀번호를 입력하세요:`);
                            if (!newPw) return;
                            try {
                              const res = await fetch(`/api/users?id=${u.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ password: newPw }),
                              });
                              if (!res.ok) throw new Error('reset failed');
                              await refresh();
                              showToast('비밀번호가 초기화되었습니다.');
                            } catch (e) {
                              showToast('비밀번호 초기화 실패', 'error');
                            }
                          }}
                        >비번 초기화</button>
                      <button
                        style={{ ...styles.smallBtn, flex: 1, justifyContent: 'center', background: '#eef2ff', color: '#374151', padding: '10px' }}
                        onClick={async () => {
                          try {
                            const val = expandedManualRemain === "" ? null : Number(expandedManualRemain);
                            const res = await fetch(`/api/users?id=${u.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ manualRemain: val }),
                            });
                            if (!res.ok) throw new Error('update failed');
                            await refresh();
                            showToast('저장되었습니다.');
                          } catch (e) {
                            showToast('저장에 실패했습니다.', 'error');
                          }
                        }}
                      >저장</button>
                      <button
                        style={{
                          ...styles.smallBtn,
                          flex: 1,
                          justifyContent: "center",
                          background: "#fee2e2",
                          color: "#ef4444",
                          padding: "10px",
                        }}
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Icon name="trash" size={14} /> 계정 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {staffUsers.length === 0 && (
        <EmptyState msg="등록된 직원이 없습니다. + 버튼으로 추가해보세요." />
      )}
    </div>
  );
}

// ─── 내 정보 ──────────────────────────────────────────────────────────────────

function ProfilePage({ user, users, setUsers, setCurrentUser, isSuperAdmin, showToast }) {
  const [pw, setPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [classRoom, setClassRoom] = useState(user.classRoom);

  const saveProfile = () => {
    if (pw && pw !== user.pw) return showToast("현재 비밀번호가 틀립니다.", "error");
    const updated = {
      ...user,
      pw: newPw || user.pw,
      classRoom: isSuperAdmin ? user.classRoom : classRoom,
    };
    setUsers((prev) => prev.map((u) => u.id === user.id ? updated : u));
    setCurrentUser(updated);
    setPw("");
    setNewPw("");
    showToast("저장되었습니다.");
  };

  const totalLeave = calcAnnualLeave(user.hireDate);
  const years = Math.floor((new Date() - new Date(user.hireDate)) / (365.25 * 24 * 3600 * 1000));

  return (
    <div style={styles.pageWrap}>
      <h2 style={styles.pageTitle}>내 정보</h2>

      <div style={styles.profileCard}>
        <div
          style={{
            ...styles.profileAvatar,
            background: ROLE_COLORS[user.role] + "33",
            color: ROLE_COLORS[user.role],
          }}
        >
          {user.name[0]}
        </div>
        <h3 style={styles.profileName}>{user.name}</h3>
        <span
          style={{
            ...styles.roleTag,
            background: ROLE_COLORS[user.role] + "22",
            color: ROLE_COLORS[user.role],
            fontSize: 14,
            padding: "4px 12px",
          }}
        >
          {user.role}
        </span>
      </div>

      <div style={styles.infoCard}>
        {[
          { label: "아이디", val: user.loginId },
          { label: "입사일", val: formatDate(user.hireDate) },
          { label: "근속", val: years < 1 ? "1년 미만" : `${years}년` },
          { label: "총 연차", val: `${totalLeave}일` },
          { label: "담당반", val: user.classRoom || "-" },
        ].map((item) => (
          <div key={item.label} style={styles.infoRow}>
            <span style={styles.infoLabel}>{item.label}</span>
            <span style={styles.infoVal}>{item.val}</span>
          </div>
        ))}
      </div>

      <div style={styles.formCard}>
        <h3 style={styles.formTitle}>정보 수정</h3>
        {!isSuperAdmin && (
          <input
            style={styles.input}
            placeholder="담당반"
            value={classRoom}
            onChange={(e) => setClassRoom(e.target.value)}
          />
        )}
        <input
          style={styles.input}
          type="password"
          placeholder="현재 비밀번호 (변경 시 입력)"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="새 비밀번호"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <button style={styles.primaryBtn} onClick={saveProfile}>
          저장
        </button>
      </div>
    </div>
  );
}

// ─── 공통 컴포넌트 ─────────────────────────────────────────────────────────────

function RequestItem({ req, showUser, userName, userRole, actions }) {
  return (
    <div style={styles.reqCard}>
      <div style={styles.reqTop}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {showUser && (
            <span
              style={{
                ...styles.roleTag,
                background: ROLE_COLORS[userRole] + "22",
                color: ROLE_COLORS[userRole],
                fontSize: 11,
              }}
            >
              {userName}
            </span>
          )}
          <span style={styles.reqType}>{req.type}</span>
        </div>
        <span
          style={{
            ...styles.statusTag,
            background: STATUS_COLOR[req.status] + "22",
            color: STATUS_COLOR[req.status],
          }}
        >
          {req.status}
        </span>
      </div>
      <p style={styles.reqReason}>{req.reason}</p>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
        <span>신청일: {formatDate(req.createdAt)}</span>
        {req.approvedAt && (
          <span style={{ marginLeft: 8 }}>처리일: {formatDate(req.approvedAt)}</span>
        )}
      </div>
      {actions}
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div style={styles.empty}>
      <span style={{ fontSize: 40 }}>🗂️</span>
      <p style={styles.emptyMsg}>{msg}</p>
    </div>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const styles = {
  appWrap: {
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
    maxWidth: 480,
    margin: "0 auto",
    minHeight: "100vh",
    background: "#f8fafc",
    position: "relative",
    paddingBottom: 80,
  },
  toast: {
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    color: "white",
    padding: "12px 24px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    zIndex: 1000,
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    whiteSpace: "nowrap",
  },
  header: {
    background: "white",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  logoMark: { fontSize: 22 },
  logoText: { fontWeight: 800, fontSize: 18, color: "#1e1b4b", letterSpacing: -0.5 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  userChip: { display: "flex", alignItems: "center", gap: 6 },
  userName: { fontWeight: 600, fontSize: 14, color: "#374151" },
  badge: {
    background: "#ef4444",
    color: "white",
    borderRadius: "50%",
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
  },
  logoutBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 8,
    color: "#6b7280",
  },
  main: { padding: "0 0 20px" },
  pageWrap: { padding: "20px 16px" },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 },
  addBtn: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none",
    borderRadius: 12,
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
  },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 480,
    background: "white",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    padding: "8px 0",
    zIndex: 100,
    boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
  },
  navBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 0",
    borderRadius: 12,
  },
  navBtnActive: {},
  navLabel: { fontSize: 11, fontWeight: 600 },
  // 로그인
  loginWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #eef2ff 0%, #fdf4ff 100%)",
    padding: 20,
  },
  loginCard: {
    background: "white",
    borderRadius: 24,
    padding: 36,
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 20px 60px rgba(99,102,241,0.15)",
    textAlign: "center",
  },
  loginLogo: { fontSize: 48, marginBottom: 12 },
  loginTitle: { fontSize: 24, fontWeight: 800, color: "#1e1b4b", margin: 0 },
  loginSub: { color: "#6b7280", fontSize: 14, marginBottom: 28, marginTop: 6 },
  formGroup: { display: "flex", flexDirection: "column", gap: 12 },
  loginHint: {
    marginTop: 20,
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 1.6,
  },
  // 대시보드
  greetCard: {
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "white",
  },
  greetDate: { fontSize: 12, opacity: 0.8, margin: "0 0 4px" },
  greetTitle: { fontSize: 20, fontWeight: 700, margin: "0 0 4px" },
  greetSub: { fontSize: 13, opacity: 0.8, margin: 0 },
  roleCircle: {
    borderRadius: 12,
    padding: "8px 12px",
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  leaveCard: {
    background: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  leaveCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  leaveCardTitle: { fontWeight: 700, fontSize: 16, color: "#111827" },
  leaveCardYear: { fontSize: 12, color: "#6b7280" },
  leaveStats: { display: "flex", justifyContent: "space-around", marginBottom: 16 },
  leaveStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  leaveStatNum: { fontSize: 28, fontWeight: 800, color: "#6366f1" },
  leaveStatLabel: { fontSize: 12, color: "#6b7280" },
  leaveDivider: { width: 1, background: "#e5e7eb" },
  ratioBar: { display: "flex", height: 8, borderRadius: 99, overflow: "hidden", background: "#f3f4f6", marginTop: 8 },
  ratioSegmentUsed: { background: "#f59e0b" },
  ratioSegmentRemain: { background: "#10b981" },
  quickGrid: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },
  quickBtn: {
    flex: 1,
    background: "white",
    border: "none",
    borderRadius: 16,
    padding: "16px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    position: "relative",
  },
  quickLabel: { fontSize: 12, fontWeight: 600, color: "#374151" },
  quickBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "#ef4444",
    color: "white",
    borderRadius: 99,
    padding: "1px 6px",
    fontSize: 10,
    fontWeight: 700,
  },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 12 },
  // 연차 신청
  miniStats: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },
  miniStat: {
    flex: 1,
    background: "white",
    borderRadius: 14,
    padding: "14px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  miniStatNum: { fontSize: 24, fontWeight: 800 },
  miniStatLabel: { fontSize: 11, color: "#6b7280" },
  formCard: {
    background: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  formTitle: { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
  typeGroup: { display: "flex", gap: 8 },
  typeBtn: {
    flex: 1,
    padding: "10px",
    border: "2px solid #e5e7eb",
    borderRadius: 12,
    background: "white",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    color: "#6b7280",
  },
  typeBtnActive: {
    borderColor: "#6366f1",
    background: "#eef2ff",
    color: "#6366f1",
  },
  // 공통 입력
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 12,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    background: "#f9fafb",
    fontFamily: "inherit",
    color: "#111827",
  },
  primaryBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    border: "none",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
  },
  ghostBtn: {
    width: "100%",
    padding: "14px",
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  },
  smallBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 12px",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    background: "#f3f4f6",
    color: "#374151",
  },
  // 요청 카드
  reqCard: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  reqTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reqType: { fontWeight: 700, fontSize: 14, color: "#111827" },
  reqDate: { fontSize: 13, color: "#6b7280" },
  reqReason: { fontSize: 13, color: "#374151", margin: "0 0 4px" },
  reqSub: { fontSize: 11, color: "#9ca3af", margin: 0 },
  statusTag: {
    padding: "3px 10px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 700,
  },
  roleTag: {
    padding: "2px 8px",
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 700,
  },
  // 관리
  filterRow: {
    display: "flex",
    gap: 6,
    marginBottom: 16,
    overflowX: "auto",
    paddingBottom: 4,
  },
  filterBtn: {
    padding: "6px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 99,
    background: "white",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    color: "#6b7280",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  filterBtnActive: {
    borderColor: "#6366f1",
    background: "#eef2ff",
    color: "#6366f1",
  },
  filterBadge: {
    background: "#ef4444",
    color: "white",
    borderRadius: 99,
    padding: "0 5px",
    fontSize: 10,
    fontWeight: 700,
  },
  // 관리자
  userCard: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  userCardLeft: { flex: 1 },
  userCardName: { fontWeight: 700, fontSize: 15, color: "#111827" },
  userCardSub: { fontSize: 12, color: "#6b7280", margin: "4px 0 0" },
  inactiveTag: {
    background: "#f3f4f6",
    color: "#9ca3af",
    padding: "2px 6px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  // 프로필
  profileCard: {
    background: "white",
    borderRadius: 20,
    padding: 28,
    textAlign: "center",
    marginBottom: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    fontWeight: 800,
    margin: "0 auto 12px",
  },
  profileName: { fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 10px" },
  infoCard: {
    background: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  infoLabel: { fontSize: 14, color: "#6b7280" },
  infoVal: { fontSize: 14, fontWeight: 600, color: "#111827" },
  errorMsg: { color: "#ef4444", fontSize: 13, margin: 0 },
  empty: {
    textAlign: "center",
    padding: 40,
    color: "#9ca3af",
  },
  emptyMsg: { fontSize: 14, marginTop: 12 },
  // 삭제 모달
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    background: "white",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  modalIcon: { fontSize: 40, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 12px" },
  modalUserInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    padding: "10px 16px",
    background: "#f9fafb",
    borderRadius: 12,
  },
  modalDesc: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.6,
    marginBottom: 20,
    whiteSpace: "pre-line",
  },
  leaveBadgeWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#eef2ff",
    borderRadius: 14,
    padding: "12px 16px",
    border: "1.5px solid #c7d2fe",
  },
  leaveBadgeIcon: { fontSize: 28 },
  leaveBadgeLabel: { fontSize: 11, color: "#6366f1", fontWeight: 600, margin: "0 0 2px" },
  leaveBadgeVal: { margin: 0, lineHeight: 1.3 },
  leaveBadgeNote: { fontSize: 11, color: "#818cf8", margin: "2px 0 0" },
  adminSummary: {
    display: "flex",
    background: "white",
    borderRadius: 16,
    padding: "16px 20px",
    marginBottom: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  adminSumItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  adminSumDivider: { width: 1, background: "#e5e7eb", margin: "0 8px" },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 8,
  },
  expandedArea: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px dashed #e5e7eb",
  },
  expandedInfo: {
    background: "#f9fafb",
    borderRadius: 10,
    padding: "10px 14px",
  },
  expandedRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  expandedLabel: { fontSize: 13, color: "#6b7280" },
  expandedVal: { fontSize: 13, fontWeight: 600, color: "#111827" },
  // 탭
  tabRow: {
    display: "flex",
    gap: 0,
    marginBottom: 16,
    background: "#f3f4f6",
    borderRadius: 14,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    padding: "10px 12px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    color: "#6b7280",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "all 0.2s",
  },
  tabBtnActive: {
    background: "white",
    color: "#6366f1",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  // 직원 연차 현황
  staffSummaryBanner: {
    background: "#eef2ff",
    borderRadius: 12,
    padding: "10px 16px",
    marginBottom: 14,
    border: "1.5px solid #c7d2fe",
  },
  staffLeaveCard: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  staffLeaveTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  staffLeaveNums: {
    display: "flex",
    gap: 12,
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
    flexWrap: "wrap",
  },
  remainBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
    borderRadius: 12,
    padding: "8px 14px",
    border: "1.5px solid #c7d2fe",
    flexShrink: 0,
  },
  remainBadgeNum: {
    fontSize: 24,
    fontWeight: 900,
    color: "#6366f1",
    lineHeight: 1,
  },
  remainBadgeLabel: {
    fontSize: 11,
    color: "#818cf8",
    fontWeight: 600,
    marginTop: 2,
  },
};
