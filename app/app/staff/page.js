"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "⭕️ 終日勤務",
    short: "⭕️",
  },
  {
    value: "off",
    label: "❌ 勤務不可",
    short: "❌",
  },
  {
    value: "time",
    label: "🕐 時間指定",
    short: "🕐",
  },
  {
    value: "undecided",
    label: "🔺 未定",
    short: "🔺",
  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getDaysInMonth(month) {
  if (!month) return [];

  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) return [];

  const lastDay = new Date(year, monthNumber, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(monthNumber).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    const jsDate = new Date(year, monthNumber - 1, day);

    return {
      date,
      day,
      weekday: ["日", "月", "火", "水", "木", "金", "土"][jsDate.getDay()],
      weekdayNumber: jsDate.getDay(),
    };
  });
}

function formatMonth(month) {
  if (!month) return "";

  const [year, monthNumber] = month.split("-");

  return `${year}年${Number(monthNumber)}月`;
}

function formatDate(date) {
  if (!date) return "-";

  const [year, month, day] = date.split("-");

  return `${Number(month)}月${Number(day)}日`;
}

function normalizeStartHour(value) {
  if (!value) return null;

  const match = String(value).match(/^(\d{1,2})/);

  if (!match) return null;

  return Number(match[1]);
}

export default function StaffShiftPage() {
  const [token, setToken] = useState("");
  const [context, setContext] = useState(null);
  const [staffId, setStaffId] = useState("");

  const [availability, setAvailability] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadingShift, setLoadingShift] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const days = useMemo(
    () => getDaysInMonth(context?.month),
    [context?.month]
  );

  const selectedStaff = useMemo(() => {
    return context?.staff?.find((staff) => staff.id === staffId) || null;
  }, [context, staffId]);

  const submissionClosed = useMemo(() => {
    if (!context) return true;

    if (context.is_locked) return true;

    const today = new Date();
    const todayText = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (
      context.submission_start &&
      todayText < context.submission_start
    ) {
      return true;
    }

    if (
      context.submission_end &&
      todayText > context.submission_end
    ) {
      return true;
    }

    return false;
  }, [context]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token") || "";

    setToken(urlToken);

    if (!urlToken) {
      setError("シフト提出用URLが正しくありません。");
      setLoading(false);
      return;
    }

    loadContext(urlToken);
  }, []);

  async function loadContext(urlToken) {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.rpc(
        "get_staff_submission_context",
        {
          p_token: urlToken,
        }
      );

      if (error) throw error;

      setContext(data);
    } catch (err) {
      console.error(err);
      setError(
        "このURLは使用できません。管理者から送られたURLを確認してください。"
      );
    } finally {
      setLoading(false);
    }
  }

  async function selectStaff(id) {
    setStaffId(id);
    setMessage("");
    setError("");

    if (!id) {
      setAvailability({});
      return;
    }

    setLoadingShift(true);

    try {
      const initial = {};

      days.forEach((day) => {
        initial[day.date] = {
          status: "undecided",
          startHour: null,
        };
      });

      const { data, error } = await supabase.rpc(
        "get_staff_submission_availability",
        {
          p_token: token,
          p_staff_id: id,
        }
      );

      if (error) throw error;

      (data || []).forEach((row) => {
        initial[row.work_date] = {
          status: row.status || "undecided",
          startHour: normalizeStartHour(row.start_hour),
        };
      });

      setAvailability(initial);
    } catch (err) {
      console.error(err);
      setError("現在のシフト情報を読み込めませんでした。");
    } finally {
      setLoadingShift(false);
    }
  }

  function updateStatus(date, status) {
    setMessage("");

    setAvailability((prev) => ({
      ...prev,
      [date]: {
        status,
        startHour:
          status === "time"
            ? prev[date]?.startHour ?? 9
            : null,
      },
    }));
  }

  function updateStartHour(date, hour) {
    setMessage("");

    setAvailability((prev) => ({
      ...prev,
      [date]: {
        status: "time",
        startHour: Number(hour),
      },
    }));
  }

  function setAllDays(status) {
    setMessage("");

    const next = {};

    days.forEach((day) => {
      next[day.date] = {
        status,
        startHour: status === "time" ? 9 : null,
      };
    });

    setAvailability(next);
  }

  async function submitShift() {
    if (!staffId) {
      setError("最初に自分の名前を選んでください。");
      return;
    }

    if (submissionClosed) {
      setError("現在はシフト提出期間外です。");
      return;
    }

    const timeWithoutHour = days.find((day) => {
      const item = availability[day.date];
      return item?.status === "time" && item?.startHour == null;
    });

    if (timeWithoutHour) {
      setError(
        `${timeWithoutHour.day}日の勤務開始時間を選んでください。`
      );
      return;
    }

    const confirmed = window.confirm(
      `${selectedStaff?.name || ""} さんの${formatMonth(
        context.month
      )}シフトを提出しますか？`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const items = days.map((day) => {
        const item = availability[day.date] || {
          status: "undecided",
          startHour: null,
        };

        return {
          work_date: day.date,
          status: item.status,
          start_hour:
            item.status === "time" && item.startHour != null
              ? `${String(item.startHour).padStart(2, "0")}:00`
              : null,
        };
      });

      const { data, error } = await supabase.rpc(
        "submit_staff_availability",
        {
          p_token: token,
          p_staff_id: staffId,
          p_items: items,
        }
      );

      if (error) throw error;

      if (data?.success !== true) {
        throw new Error("SAVE_FAILED");
      }

      setMessage(
        `${selectedStaff?.name || ""} さんのシフトを提出しました！`
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(err);

      const text = String(err?.message || "");

      if (text.includes("SUBMISSION_LOCKED")) {
        setError("シフト提出は締め切られています。");
      } else if (text.includes("OUTSIDE_SUBMISSION_PERIOD")) {
        setError("現在はシフト提出期間外です。");
      } else {
        setError(
          "シフトを保存できませんでした。時間をおいてもう一度お試しください。"
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingTitle}>3班現場割</div>
          <div style={styles.loadingText}>読み込み中...</div>
        </div>
      </main>
    );
  }

  if (error && !context) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>3班現場割</div>
          <h1 style={styles.title}>シフト提出</h1>

          <div style={styles.errorBox}>{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <section style={styles.headerCard}>
          <div style={styles.logo}>3班現場割</div>

          <h1 style={styles.title}>
            {formatMonth(context?.month)} シフト提出
          </h1>

          <div style={styles.periodBox}>
            <div style={styles.periodLabel}>提出期間</div>

            <div style={styles.periodText}>
              {formatDate(context?.submission_start)}
              {" ～ "}
              {formatDate(context?.submission_end)}
            </div>
          </div>

          {submissionClosed ? (
            <div style={styles.closedBox}>
              現在はシフト提出期間外です
            </div>
          ) : (
            <div style={styles.openBox}>
              シフト提出受付中
            </div>
          )}

          {message && (
            <div style={styles.successBox}>
              {message}
            </div>
          )}

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <label style={styles.label}>
            あなたの名前
          </label>

          <select
            value={staffId}
            onChange={(e) => selectStaff(e.target.value)}
            style={styles.staffSelect}
          >
            <option value="">
              名前を選択してください
            </option>

            {(context?.staff || []).map((staff) => (
              <option
                key={staff.id}
                value={staff.id}
              >
                {staff.name}
              </option>
            ))}
          </select>

          {selectedStaff && (
            <div style={styles.selectedName}>
              {selectedStaff.name} さん
            </div>
          )}
        </section>

        {staffId && (
          <>
            <section style={styles.card}>
              <div style={styles.sectionTitle}>
                一括入力
              </div>

              <div style={styles.bulkButtons}>
                <button
                  type="button"
                  disabled={submissionClosed}
                  onClick={() => setAllDays("all")}
                  style={styles.bulkButton}
                >
                  ⭕️ 全日勤務
                </button>

                <button
                  type="button"
                  disabled={submissionClosed}
                  onClick={() => setAllDays("off")}
                  style={styles.bulkButton}
                >
                  ❌ 全日不可
                </button>

                <button
                  type="button"
                  disabled={submissionClosed}
                  onClick={() => setAllDays("undecided")}
                  style={styles.bulkButton}
                >
                  🔺 全日未定
                </button>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.sectionTitle}>
                1日ずつ入力
              </div>

              <div style={styles.helpText}>
                ⭕️ 終日勤務 / ❌ 勤務不可 / 🕐 時間指定 / 🔺 未定
              </div>

              {loadingShift ? (
                <div style={styles.loadingText}>
                  シフトを読み込み中...
                </div>
              ) : (
                <div style={styles.dayList}>
                  {days.map((day) => {
                    const item =
                      availability[day.date] || {
                        status: "undecided",
                        startHour: null,
                      };

                    const isSunday =
                      day.weekdayNumber === 0;

                    const isSaturday =
                      day.weekdayNumber === 6;

                    return (
                      <div
                        key={day.date}
                        style={styles.dayRow}
                      >
                        <div style={styles.dateArea}>
                          <div style={styles.dayNumber}>
                            {day.day}
                          </div>

                          <div
                            style={{
                              ...styles.weekday,
                              ...(isSunday
                                ? styles.sunday
                                : {}),
                              ...(isSaturday
                                ? styles.saturday
                                : {}),
                            }}
                          >
                            {day.weekday}
                          </div>
                        </div>

                        <div style={styles.statusArea}>
                          <div style={styles.statusButtons}>
                            {STATUS_OPTIONS.map((option) => {
                              const active =
                                item.status ===
                                option.value;

                              return (
                                <button
                                  type="button"
                                  key={option.value}
                                  disabled={
                                    submissionClosed
                                  }
                                  onClick={() =>
                                    updateStatus(
                                      day.date,
                                      option.value
                                    )
                                  }
                                  style={{
                                    ...styles.statusButton,
                                    ...(active
                                      ? styles.statusButtonActive
                                      : {}),
                                  }}
                                  title={option.label}
                                >
                                  {option.short}
                                </button>
                              );
                            })}
                          </div>

                          {item.status === "time" && (
                            <div style={styles.timeArea}>
                              <select
                                value={
                                  item.startHour ?? 9
                                }
                                disabled={
                                  submissionClosed
                                }
                                onChange={(e) =>
                                  updateStartHour(
                                    day.date,
                                    e.target.value
                                  )
                                }
                                style={styles.timeSelect}
                              >
                                {HOURS.map((hour) => (
                                  <option
                                    value={hour}
                                    key={hour}
                                  >
                                    {String(
                                      hour
                                    ).padStart(
                                      2,
                                      "0"
                                    )}
                                    :00
                                  </option>
                                ))}
                              </select>

                              <span style={styles.timeText}>
                                〜 勤務可能
                              </span>
                            </div>
                          )}

                          <div style={styles.currentStatus}>
                            {
                              STATUS_OPTIONS.find(
                                (option) =>
                                  option.value ===
                                  item.status
                              )?.label
                            }

                            {item.status === "time" &&
                            item.startHour != null
                              ? `（${String(
                                  item.startHour
                                ).padStart(
                                  2,
                                  "0"
                                )}:00〜）`
                              : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section style={styles.submitCard}>
              <button
                type="button"
                onClick={submitShift}
                disabled={
                  saving ||
                  loadingShift ||
                  submissionClosed
                }
                style={{
                  ...styles.submitButton,
                  ...(saving ||
                  loadingShift ||
                  submissionClosed
                    ? styles.submitButtonDisabled
                    : {}),
                }}
              >
                {saving
                  ? "保存中..."
                  : submissionClosed
                  ? "提出期間外です"
                  : "この内容でシフトを提出"}
              </button>

              {!submissionClosed && (
                <div style={styles.submitNote}>
                  提出期間中は何度でも変更できます
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f5f7",
    padding: "20px 12px 50px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
    color: "#222",
  },

  container: {
    width: "100%",
    maxWidth: 720,
    margin: "0 auto",
  },

  headerCard: {
    background: "#fff",
    borderRadius: 18,
    padding: 22,
    marginBottom: 14,
    boxShadow:
      "0 2px 12px rgba(0,0,0,0.06)",
  },

  card: {
    background: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    boxShadow:
      "0 2px 12px rgba(0,0,0,0.06)",
  },

  submitCard: {
    background: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    boxShadow:
      "0 2px 12px rgba(0,0,0,0.06)",
    position: "sticky",
    bottom: 10,
    zIndex: 5,
  },

  loadingCard: {
    width: "calc(100% - 24px)",
    maxWidth: 500,
    margin: "100px auto",
    background: "#fff",
    borderRadius: 18,
    padding: 30,
    textAlign: "center",
  },

  loadingTitle: {
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 12,
  },

  loadingText: {
    padding: 20,
    textAlign: "center",
    color: "#777",
  },

  logo: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 1.5,
    color: "#666",
    marginBottom: 6,
  },

  title: {
    margin: 0,
    fontSize: 25,
    lineHeight: 1.4,
  },

  periodBox: {
    marginTop: 16,
    background: "#f5f5f5",
    borderRadius: 12,
    padding: 14,
  },

  periodLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 3,
  },

  periodText: {
    fontSize: 16,
    fontWeight: 700,
  },

  openBox: {
    marginTop: 12,
    padding: "11px 14px",
    borderRadius: 12,
    background: "#eaf7ed",
    fontWeight: 700,
    textAlign: "center",
  },

  closedBox: {
    marginTop: 12,
    padding: "11px 14px",
    borderRadius: 12,
    background: "#f4f4f4",
    fontWeight: 700,
    textAlign: "center",
  },

  successBox: {
    marginTop: 14,
    padding: "13px 14px",
    borderRadius: 12,
    background: "#e8f7ed",
    fontWeight: 700,
  },

  errorBox: {
    marginTop: 14,
    padding: "13px 14px",
    borderRadius: 12,
    background: "#fff0f0",
    fontWeight: 700,
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
  },

  staffSelect: {
    width: "100%",
    minHeight: 52,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #ccc",
    background: "#fff",
    fontSize: 16,
  },

  selectedName: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: 800,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 12,
  },

  helpText: {
    fontSize: 12,
    color: "#777",
    marginBottom: 12,
    lineHeight: 1.6,
  },

  bulkButtons: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 8,
  },

  bulkButton: {
    minHeight: 44,
    border: "1px solid #ddd",
    borderRadius: 10,
    background: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  dayList: {
    borderTop: "1px solid #eee",
  },

  dayRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 0",
    borderBottom: "1px solid #eee",
  },

  dateArea: {
    width: 50,
    flexShrink: 0,
    textAlign: "center",
  },

  dayNumber: {
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.1,
  },

  weekday: {
    fontSize: 12,
    marginTop: 3,
    color: "#555",
  },

  sunday: {
    color: "#c62828",
  },

  saturday: {
    color: "#1565c0",
  },

  statusArea: {
    flex: 1,
    minWidth: 0,
  },

  statusButtons: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: 6,
  },

  statusButton: {
    minHeight: 42,
    border: "1px solid #ddd",
    borderRadius: 10,
    background: "#fff",
    fontSize: 20,
    cursor: "pointer",
  },

  statusButtonActive: {
    border: "2px solid #222",
    background: "#f1f1f1",
    transform: "translateY(-1px)",
  },

  timeArea: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 9,
  },

  timeSelect: {
    minHeight: 40,
    border: "1px solid #ccc",
    borderRadius: 9,
    background: "#fff",
    padding: "0 10px",
    fontSize: 15,
  },

  timeText: {
    fontSize: 13,
    fontWeight: 700,
  },

  currentStatus: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
  },

  submitButton: {
    width: "100%",
    minHeight: 56,
    border: "none",
    borderRadius: 14,
    background: "#111",
    color: "#fff",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
  },

  submitButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },

  submitNote: {
    marginTop: 9,
    textAlign: "center",
    fontSize: 12,
    color: "#777",
  },
};
