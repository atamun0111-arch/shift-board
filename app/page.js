"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("schedule");

  const [staff, setStaff] = useState([
    {
      id: 1,
      name: "山田 太郎",
      grade: "3",
      rank: "2",
      gender: "男性",
    },
    {
      id: 2,
      name: "佐藤 花子",
      grade: "2",
      rank: "1",
      gender: "女性",
    },
    {
      id: 3,
      name: "田中 一郎",
      grade: "F",
      rank: "3",
      gender: "男性",
    },
  ]);

  const [newStaff, setNewStaff] = useState({
    name: "",
    grade: "1",
    rank: "無",
    gender: "男性",
  });

  const [selectedDate, setSelectedDate] = useState("2026-09-01");

  const [events, setEvents] = useState({
    "2026-09-01": {
      name: "ライブイベント",
      start: "10:00",
      sections: [
        { name: "入場口", required: 5 },
        { name: "物販", required: 3 },
        { name: "楽屋", required: 2 },
      ],
    },
    "2026-09-02": {
      name: "イベント設営",
      start: "09:00",
      sections: [
        { name: "設営", required: 8 },
        { name: "受付", required: 2 },
      ],
    },
  });

  const [shifts, setShifts] = useState({
    "1-2026-09-01": "all",
    "2-2026-09-01": "time",
    "3-2026-09-01": "undecided",

    "1-2026-09-02": "off",
    "2-2026-09-02": "all",
    "3-2026-09-02": "all",
  });

  const [timeSettings, setTimeSettings] = useState({
    "2-2026-09-01": "12:00",
  });

  const [negotiated, setNegotiated] = useState({
    "3-2026-09-01": false,
  });

  const [assignments, setAssignments] = useState({
    "2026-09-01": {
      "入場口": ["山田 太郎"],
      "物販": ["佐藤 花子"],
      "楽屋": [],
    },
  });

  const dates = [
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
    "2026-09-04",
    "2026-09-05",
    "2026-09-06",
    "2026-09-07",
  ];

  function addStaff() {
    if (!newStaff.name.trim()) {
      alert("名前を入力してください");
      return;
    }

    const newMember = {
      id: Date.now(),
      ...newStaff,
    };

    setStaff([...staff, newMember]);

    setNewStaff({
      name: "",
      grade: "1",
      rank: "無",
      gender: "男性",
    });
  }

  function deleteStaff(id) {
    if (confirm("このスタッフを削除しますか？")) {
      setStaff(staff.filter((member) => member.id !== id));
    }
  }

  function updateShift(staffId, date, value) {
    const key = `${staffId}-${date}`;

    setShifts({
      ...shifts,
      [key]: value,
    });
  }

  function updateTime(staffId, date, value) {
    const key = `${staffId}-${date}`;

    setTimeSettings({
      ...timeSettings,
      [key]: value,
    });
  }

  function toggleNegotiated(staffId, date) {
    const key = `${staffId}-${date}`;

    setNegotiated({
      ...negotiated,
      [key]: !negotiated[key],
    });
  }

  function getShiftLabel(staffId, date) {
    const key = `${staffId}-${date}`;
    const shift = shifts[key];

    if (shift === "all") {
      return "🟢 終日OK";
    }

    if (shift === "time") {
      return `🔵 ${timeSettings[key] || "時間指定"}`;
    }

    if (shift === "undecided") {
      return "🟡 未定";
    }

    if (shift === "off") {
      return "🔴 勤務不可";
    }

    return "－";
  }

  function assignStaff(sectionName, staffName) {
    const currentDateAssignments = assignments[selectedDate] || {};

    const currentSection =
      currentDateAssignments[sectionName] || [];

    if (currentSection.includes(staffName)) {
      return;
    }

    setAssignments({
      ...assignments,
      [selectedDate]: {
        ...currentDateAssignments,
        [sectionName]: [...currentSection, staffName],
      },
    });
  }

  function removeAssignment(sectionName, staffName) {
    const currentDateAssignments = assignments[selectedDate] || {};

    setAssignments({
      ...assignments,
      [selectedDate]: {
        ...currentDateAssignments,
        [sectionName]: (
          currentDateAssignments[sectionName] || []
        ).filter((name) => name !== staffName),
      },
    });
  }

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>SHIFT BOARD</h1>
          <p style={styles.subtitle}>
            スタッフ・シフト管理システム
          </p>
        </div>

        <div style={styles.admin}>
          👤 管理者モード
        </div>
      </header>

      <nav style={styles.nav}>
        <button
          onClick={() => setActiveTab("schedule")}
          style={
            activeTab === "schedule"
              ? styles.activeTab
              : styles.tab
          }
        >
          📅 シフト管理
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          style={
            activeTab === "staff"
              ? styles.activeTab
              : styles.tab
          }
        >
          👥 スタッフ管理
        </button>

        <button
          onClick={() => setActiveTab("event")}
          style={
            activeTab === "event"
              ? styles.activeTab
              : styles.tab
          }
        >
          🎪 現場管理
        </button>
      </nav>

      {/* ========================= */}
      {/* シフト管理 */}
      {/* ========================= */}

      {activeTab === "schedule" && (
        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h2>2026年9月 シフト表</h2>
              <p style={styles.description}>
                勤務可能状況を確認・編集できます
              </p>
            </div>

            <button style={styles.primaryButton}>
              🔗 シフト提出URLを発行
            </button>
          </div>

          <div style={styles.legend}>
            <span>🟢 終日勤務可能</span>
            <span>🔵 時間指定</span>
            <span>🟡 未定</span>
            <span>🔴 勤務不可</span>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.nameColumn}>
                    スタッフ
                  </th>

                  {dates.map((date) => (
                    <th key={date} style={styles.dateColumn}>
                      {date.slice(5).replace("-", "/")}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td style={styles.staffCell}>
                      <strong>{member.name}</strong>

                      <div style={styles.staffInfo}>
                        {member.grade === "F"
                          ? "F"
                          : `${member.grade}年`}
                        {" / "}
                        Rank {member.rank}
                      </div>
                    </td>

                    {dates.map((date) => {
                      const key = `${member.id}-${date}`;
                      const shift = shifts[key];

                      return (
                        <td key={date} style={styles.shiftCell}>
                          <select
                            value={shift || ""}
                            onChange={(e) =>
                              updateShift(
                                member.id,
                                date,
                                e.target.value
                              )
                            }
                            style={styles.select}
                          >
                            <option value="">
                              －
                            </option>

                            <option value="all">
                              🟢 終日OK
                            </option>

                            <option value="time">
                              🔵 時間指定
                            </option>

                            <option value="undecided">
                              🟡 未定
                            </option>

                            <option value="off">
                              🔴 不可
                            </option>
                          </select>

                          {shift === "time" && (
                            <select
                              value={
                                timeSettings[key] || "09:00"
                              }
                              onChange={(e) =>
                                updateTime(
                                  member.id,
                                  date,
                                  e.target.value
                                )
                              }
                              style={styles.timeSelect}
                            >
                              {[
                                "06:00",
                                "07:00",
                                "08:00",
                                "09:00",
                                "10:00",
                                "11:00",
                                "12:00",
                                "13:00",
                                "14:00",
                                "15:00",
                                "16:00",
                                "17:00",
                                "18:00",
                                "19:00",
                                "20:00",
                              ].map((time) => (
                                <option
                                  key={time}
                                  value={time}
                                >
                                  {time}〜
                                </option>
                              ))}
                            </select>
                          )}

                          {shift === "undecided" && (
                            <label style={styles.negotiation}>
                              <input
                                type="checkbox"
                                checked={
                                  negotiated[key] || false
                                }
                                onChange={() =>
                                  toggleNegotiated(
                                    member.id,
                                    date
                                  )
                                }
                              />
                              交渉済
                            </label>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ========================= */}
      {/* スタッフ管理 */}
      {/* ========================= */}

      {activeTab === "staff" && (
        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h2>スタッフ管理</h2>
              <p style={styles.description}>
                スタッフ情報の登録・編集
              </p>
            </div>
          </div>

          <div style={styles.staffForm}>
            <input
              placeholder="名前"
              value={newStaff.name}
              onChange={(e) =>
                setNewStaff({
                  ...newStaff,
                  name: e.target.value,
                })
              }
              style={styles.input}
            />

            <select
              value={newStaff.grade}
              onChange={(e) =>
                setNewStaff({
                  ...newStaff,
                  grade: e.target.value,
                })
              }
              style={styles.formSelect}
            >
              <option value="1">1年</option>
              <option value="2">2年</option>
              <option value="3">3年</option>
              <option value="4">4年</option>
              <option value="F">F（フリーター）</option>
            </select>

            <select
              value={newStaff.rank}
              onChange={(e) =>
                setNewStaff({
                  ...newStaff,
                  rank: e.target.value,
                })
              }
              style={styles.formSelect}
            >
              <option value="無">ランクなし</option>
              <option value="1">ランク1</option>
              <option value="2">ランク2</option>
              <option value="3">ランク3</option>
              <option value="4">ランク4</option>
            </select>

            <select
              value={newStaff.gender}
              onChange={(e) =>
                setNewStaff({
                  ...newStaff,
                  gender: e.target.value,
                })
              }
              style={styles.formSelect}
            >
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他">その他</option>
            </select>

            <button
              onClick={addStaff}
              style={styles.primaryButton}
            >
              ＋ スタッフ追加
            </button>
          </div>

          <div style={styles.staffList}>
            {staff.map((member) => (
              <div
                key={member.id}
                style={styles.staffCard}
              >
                <div>
                  <strong style={{ fontSize: "18px" }}>
                    {member.name}
                  </strong>

                  <p style={styles.cardInfo}>
                    学年：{member.grade === "F"
                      ? "F"
                      : `${member.grade}年`}
                    {"　"}
                    ランク：{member.rank}
                    {"　"}
                    性別：{member.gender}
                  </p>
                </div>

                <button
                  onClick={() => deleteStaff(member.id)}
                  style={styles.deleteButton}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================= */}
      {/* 現場管理 */}
      {/* ========================= */}

      {activeTab === "event" && (
        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h2>現場・配置管理</h2>
              <p style={styles.description}>
                日付ごとの現場情報とスタッフ配置
              </p>
            </div>
          </div>

          <div style={styles.dateButtons}>
            {dates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={
                  selectedDate === date
                    ? styles.selectedDate
                    : styles.dateButton
                }
              >
                {date}
              </button>
            ))}
          </div>

          {events[selectedDate] ? (
            <>
              <div style={styles.eventCard}>
                <h2>
                  🎪 {events[selectedDate].name}
                </h2>

                <p>
                  ⏰ 開始時間：
                  {events[selectedDate].start}
                </p>
              </div>

              <h3>セクション別 必要人数・配置</h3>

              {events[selectedDate].sections.map(
                (section) => {
                  const assigned =
                    assignments[selectedDate]?.[
                      section.name
                    ] || [];

                  return (
                    <div
                      key={section.name}
                      style={styles.sectionCard}
                    >
                      <div style={styles.sectionTop}>
                        <div>
                          <strong
                            style={{ fontSize: "20px" }}
                          >
                            {section.name}
                          </strong>

                          <p>
                            必要人数：
                            {section.required}人
                            {" / "}
                            配置済：
                            {assigned.length}人
                          </p>
                        </div>

                        <div
                          style={{
                            ...styles.statusBadge,
                            background:
                              assigned.length >=
                              section.required
                                ? "#dcfce7"
                                : "#fee2e2",
                          }}
                        >
                          {assigned.length >=
                          section.required
                            ? "充足"
                            : "不足"}
                        </div>
                      </div>

                      <div style={styles.assignmentArea}>
                        {assigned.map((name) => (
                          <span
                            key={name}
                            style={styles.assignedStaff}
                          >
                            {name}

                            <button
                              onClick={() =>
                                removeAssignment(
                                  section.name,
                                  name
                                )
                              }
                              style={styles.removeButton}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            assignStaff(
                              section.name,
                              e.target.value
                            );
                            e.target.value = "";
                          }
                        }}
                        style={styles.assignSelect}
                      >
                        <option value="">
                          ＋ スタッフを配置
                        </option>

                        {staff.map((member) => (
                          <option
                            key={member.id}
                            value={member.name}
                          >
                            {member.name}
                            {"（"}
                            {getShiftLabel(
                              member.id,
                              selectedDate
                            )}
                            {"）"}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
              )}
            </>
          ) : (
            <div style={styles.empty}>
              この日の現場は登録されていません
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const styles = {
  container: {
    maxWidth: "1500px",
    margin: "0 auto",
    padding: "30px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
    background: "#f6f7fb",
    minHeight: "100vh",
    color: "#1f2937",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
  },

  admin: {
    background: "#1f2937",
    color: "white",
    padding: "10px 18px",
    borderRadius: "10px",
  },

  nav: {
    display: "flex",
    gap: "10px",
    marginBottom: "30px",
    borderBottom: "1px solid #ddd",
    paddingBottom: "15px",
  },

  tab: {
    padding: "12px 20px",
    border: "none",
    background: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
  },

  activeTab: {
    padding: "12px 20px",
    border: "none",
    background: "#2563eb",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  description: {
    color: "#6b7280",
  },

  primaryButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  legend: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    flexWrap: "wrap",
  },

  tableWrapper: {
    overflowX: "auto",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1100px",
  },

  nameColumn: {
    minWidth: "180px",
    padding: "15px",
    textAlign: "left",
    background: "#f3f4f6",
  },

  dateColumn: {
    padding: "15px",
    background: "#f3f4f6",
  },

  staffCell: {
    padding: "15px",
    borderBottom: "1px solid #e5e7eb",
  },

  staffInfo: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "5px",
  },

  shiftCell: {
    padding: "8px",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "center",
    minWidth: "150px",
  },

  select: {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
  },

  timeSelect: {
    width: "100%",
    marginTop: "5px",
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
  },

  negotiation: {
    display: "block",
    fontSize: "12px",
    marginTop: "6px",
  },

  staffForm: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
  },

  input: {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    minWidth: "200px",
  },

  formSelect: {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
  },

  staffList: {
    display: "grid",
    gap: "12px",
  },

  staffCard: {
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardInfo: {
    color: "#6b7280",
    marginBottom: 0,
  },

  deleteButton: {
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  dateButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "25px",
  },

  dateButton: {
    padding: "10px 15px",
    border: "1px solid #d1d5db",
    background: "white",
    borderRadius: "8px",
    cursor: "pointer",
  },

  selectedDate: {
    padding: "10px 15px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
  },

  eventCard: {
    background: "#dbeafe",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "25px",
  },

  sectionCard: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "15px",
  },

  sectionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusBadge: {
    padding: "8px 15px",
    borderRadius: "20px",
    fontWeight: "bold",
  },

  assignmentArea: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    margin: "15px 0",
  },

  assignedStaff: {
    background: "#dbeafe",
    padding: "8px 12px",
    borderRadius: "20px",
  },

  removeButton: {
    border: "none",
    background: "transparent",
    marginLeft: "8px",
    cursor: "pointer",
  },

  assignSelect: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
  },

  empty: {
    background: "white",
    padding: "50px",
    textAlign: "center",
    borderRadius: "12px",
    color: "#6b7280",
  },
};
