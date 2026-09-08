"use client";

import { useEffect, useMemo, useState } from "react";

const SECTIONS = [
  "整理",
  "案内",
  "ケータ",
  "通し",
  "搬入",
  "搬出",
  "楽屋口",
  "ランナー",
];

const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
);

const initialStaff = [
  { id: "s1", name: "山田 太郎", grade: "3", rank: "2", gender: "男性" },
  { id: "s2", name: "佐藤 花子", grade: "2", rank: "1", gender: "女性" },
  { id: "s3", name: "田中 一郎", grade: "F", rank: "3", gender: "男性" },
];

const initialShifts = {
  "s1|2026-09-01": {
    status: "all",
    startHour: "",
    negotiation: "none",
  },
  "s2|2026-09-01": {
    status: "time",
    startHour: "12:00",
    negotiation: "none",
  },
  "s3|2026-09-01": {
    status: "undecided",
    startHour: "",
    negotiation: "pending",
  },
};

const initialEvents = [
  {
    id: "e1",
    date: "2026-09-01",
    eventName: "テスト公演",
    venueName: "Kアリーナ横浜",
    slots: [
      {
        id: "slot1",
        section: "整理",
        time: "10:00",
        required: 5,
        assigned: ["s1"],
      },
      {
        id: "slot2",
        section: "案内",
        time: "12:00",
        required: 3,
        assigned: ["s1", "s2"],
      },
    ],
  },
];

const emptyShift = {
  status: "none",
  startHour: "",
  negotiation: "none",
};

function storageRead(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function availabilityLabel(shift) {
  if (!shift || shift.status === "none") return "未提出";
  if (shift.status === "all") return "終日";
  if (shift.status === "time") {
    return `${shift.startHour || "時間未設定"}〜`;
  }
  if (shift.status === "undecided") return "未定";
  if (shift.status === "off") return "勤務不可";

  return "未提出";
}

function shiftClass(status) {
  return (
    {
      all: "statusAll",
      time: "statusTime",
      undecided: "statusUndecided",
      off: "statusOff",
      none: "statusNone",
    }[status || "none"]
  );
}

export default function Home() {
  const [tab, setTab] = useState("board");
  const [month, setMonth] = useState("2026-09");

  const [staff, setStaff] = useState(initialStaff);
  const [shifts, setShifts] = useState(initialShifts);
  const [events, setEvents] = useState(initialEvents);

  const [hydrated, setHydrated] = useState(false);

  const [newStaff, setNewStaff] = useState({
    name: "",
    grade: "1",
    rank: "無",
    gender: "男性",
  });

  const [newEvent, setNewEvent] = useState({
    date: "2026-09-01",
    eventName: "",
    venueName: "",
  });

  const [selectedEventId, setSelectedEventId] = useState("e1");

  const [newSlot, setNewSlot] = useState({
    section: "整理",
    time: "09:00",
    required: "1",
  });

  useEffect(() => {
    setStaff(storageRead("sb_staff_v3", initialStaff));
    setShifts(storageRead("sb_shifts_v3", initialShifts));
    setEvents(storageRead("sb_events_v3", initialEvents));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("sb_staff_v3", JSON.stringify(staff));
    }
  }, [staff, hydrated]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("sb_shifts_v3", JSON.stringify(shifts));
    }
  }, [shifts, hydrated]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("sb_events_v3", JSON.stringify(events));
    }
  }, [events, hydrated]);

  const days = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const count = new Date(year, monthNumber, 0).getDate();

    return Array.from(
      { length: count },
      (_, index) =>
        `${month}-${String(index + 1).padStart(2, "0")}`
    );
  }, [month]);

  const eventsByDate = useMemo(() => {
    const map = {};

    for (const event of events) {
      if (!map[event.date]) {
        map[event.date] = [];
      }

      map[event.date].push(event);
    }

    return map;
  }, [events]);

  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ||
    events[0] ||
    null;

  function setShift(staffId, date, patch) {
    const key = `${staffId}|${date}`;
    const current = shifts[key] || emptyShift;

    setShifts((prev) => ({
      ...prev,
      [key]: {
        ...current,
        ...patch,
      },
    }));
  }

  function handleNegotiationResult(staffId, date, result) {
    if (result === "pending") {
      setShift(staffId, date, {
        status: "undecided",
        negotiation: "pending",
      });

      return;
    }

    if (result === "all") {
      setShift(staffId, date, {
        status: "all",
        startHour: "",
        negotiation: "done_all",
      });

      return;
    }

    if (result === "time") {
      setShift(staffId, date, {
        status: "time",
        startHour:
          shifts[`${staffId}|${date}`]?.startHour || "09:00",
        negotiation: "done_time",
      });

      return;
    }

    if (result === "off") {
      setShift(staffId, date, {
        status: "off",
        startHour: "",
        negotiation: "done_off",
      });
    }
  }

  function addStaff() {
    if (!newStaff.name.trim()) {
      alert("名前を入力してください");
      return;
    }

    setStaff((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ...newStaff,
        name: newStaff.name.trim(),
      },
    ]);

    setNewStaff({
      name: "",
      grade: "1",
      rank: "無",
      gender: "男性",
    });
  }

  function addEvent() {
    if (
      !newEvent.date ||
      !newEvent.eventName.trim() ||
      !newEvent.venueName.trim()
    ) {
      alert("日付・現場名・会場名を入力してください");
      return;
    }

    const event = {
      id: crypto.randomUUID(),
      date: newEvent.date,
      eventName: newEvent.eventName.trim(),
      venueName: newEvent.venueName.trim(),
      slots: [],
    };

    setEvents((prev) => [...prev, event]);
    setSelectedEventId(event.id);

    setNewEvent((prev) => ({
      ...prev,
      eventName: "",
      venueName: "",
    }));
  }

  function addSlot() {
    if (!selectedEvent) {
      alert("先に現場を選択してください");
      return;
    }

    const required = Number(newSlot.required);

    if (!required || required < 1) {
      alert("必要人数を1以上で入力してください");
      return;
    }

    setEvents((prev) =>
      prev.map((event) =>
        event.id === selectedEvent.id
          ? {
              ...event,
              slots: [
                ...event.slots,
                {
                  id: crypto.randomUUID(),
                  section: newSlot.section,
                  time: newSlot.time,
                  required,
                  assigned: [],
                },
              ],
            }
          : event
      )
    );
  }

  function canWork(staffId, date, time) {
    const shift =
      shifts[`${staffId}|${date}`] || emptyShift;

    if (shift.status === "all") {
      return true;
    }

    if (shift.status === "time" && shift.startHour) {
      return shift.startHour <= time;
    }

    return false;
  }

  function toggleAssignment(eventId, slotId, staffId) {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) {
          return event;
        }

        return {
          ...event,
          slots: event.slots.map((slot) => {
            if (slot.id !== slotId) {
              return slot;
            }

            const exists = slot.assigned.includes(staffId);

            return {
              ...slot,
              assigned: exists
                ? slot.assigned.filter((id) => id !== staffId)
                : [...slot.assigned, staffId],
            };
          }),
        };
      })
    );
  }

  function assignedStaffIdsOnDate(date) {
    const ids = new Set();

    for (const event of events.filter(
      (event) => event.date === date
    )) {
      for (const slot of event.slots) {
        for (const id of slot.assigned) {
          ids.add(id);
        }
      }
    }

    return ids;
  }

  const offRows = days
    .map((date) => {
      const assigned = assignedStaffIdsOnDate(date);

      return {
        date,
        people: staff.filter(
          (person) => !assigned.has(person.id)
        ),
      };
    })
    .filter((row) => row.people.length > 0);

  return (
    <main className="app">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f5f6f8;
          color: #1f2937;
          font-family: -apple-system, BlinkMacSystemFont,
            "Hiragino Sans", "Yu Gothic", sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .topbar {
          background: #111827;
          color: #fff;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand h1 {
          margin: 0;
          font-size: 22px;
          letter-spacing: 0.04em;
        }

        .brand p {
          margin: 4px 0 0;
          color: #9ca3af;
          font-size: 12px;
        }

        .month {
          background: #fff;
          border: 0;
          border-radius: 8px;
          padding: 9px 12px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 14px 20px;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .tab {
          border: 0;
          background: #eef0f3;
          padding: 10px 14px;
          border-radius: 8px;
          font-weight: 700;
        }

        .tab.active {
          background: #111827;
          color: #fff;
        }

        .content {
          padding: 20px;
          max-width: 1600px;
          margin: auto;
        }

        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 16px;
        }

        .titleRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .titleRow h2,
        .card h3 {
          margin: 0;
        }

        .muted {
          color: #6b7280;
          font-size: 13px;
        }

        .primary {
          border: 0;
          background: #2563eb;
          color: white;
          padding: 10px 14px;
          border-radius: 8px;
          font-weight: 700;
        }

        .danger {
          border: 0;
          background: #fee2e2;
          color: #b91c1c;
          padding: 7px 10px;
          border-radius: 7px;
        }

        .formRow {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }

        .formRow input,
        .formRow select {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px;
          background: white;
        }

        .boardWrap {
          overflow: auto;
          max-height: 72vh;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
        }

        table {
          border-collapse: separate;
          border-spacing: 0;
          min-width: 1200px;
          width: 100%;
          background: #fff;
        }

        th,
        td {
          border-right: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px;
          text-align: center;
          vertical-align: top;
        }

        th {
          background: #f3f4f6;
          position: sticky;
          top: 0;
          z-index: 4;
        }

        .dateHead {
          position: sticky;
          left: 0;
          z-index: 6;
          min-width: 220px;
          text-align: left;
        }

        .dateCell {
          position: sticky;
          left: 0;
          background: #fff;
          z-index: 3;
          text-align: left;
          min-width: 220px;
        }

        .eventMini {
          margin-top: 7px;
          padding: 7px;
          border-radius: 7px;
          background: #eff6ff;
          font-size: 12px;
        }

        .personHead {
          min-width: 150px;
        }

        .personMeta {
          font-size: 11px;
          color: #6b7280;
          margin-top: 3px;
        }

        .cellSelect,
        .timeSelect,
        .negSelect {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          padding: 7px;
          background: #fff;
        }

        .timeSelect,
        .negSelect {
          margin-top: 6px;
          font-size: 12px;
        }

        .statusAll {
          background: #dcfce7;
        }

        .statusTime {
          background: #dbeafe;
        }

        .statusUndecided {
          background: #fef3c7;
        }

        .statusOff {
          background: #fee2e2;
        }

        .statusNone {
          background: #f9fafb;
        }

        .staffGrid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(260px, 1fr)
          );
          gap: 10px;
          margin-top: 12px;
        }

        .staffCard {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .eventLayout {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 16px;
        }

        .eventList button {
          width: 100%;
          text-align: left;
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 9px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .eventList button.selected {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .slot {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 10px;
        }

        .slotTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .shortage {
          color: #b91c1c;
          font-weight: 800;
        }

        .ok {
          color: #15803d;
          font-weight: 800;
        }

        .candidateGrid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(190px, 1fr)
          );
          gap: 8px;
          margin-top: 12px;
        }

        .candidate {
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 8px;
          padding: 9px;
          text-align: left;
        }

        .candidate.assigned {
          background: #dcfce7;
          border-color: #86efac;
        }

        .candidate.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .offDate {
          margin-bottom: 14px;
        }

        .offList {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .offChip {
          background: #f3f4f6;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 13px;
        }

        @media (max-width: 900px) {
          .eventLayout {
            grid-template-columns: 1fr;
          }

          .content {
            padding: 12px;
          }

          .dateHead,
          .dateCell {
            min-width: 180px;
          }
        }
      `}</style>

      <header className="topbar">
        <div className="brand">
          <h1>SHIFT BOARD</h1>
          <p>イベントスタッフ シフト・配置管理</p>
        </div>

        <input
          className="month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </header>

      <nav className="tabs">
        {[
          ["board", "月間シフト"],
          ["events", "現場管理・配置"],
          ["off", "OFF一覧"],
          ["staff", "スタッフ管理"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`tab ${
              tab === id ? "active" : ""
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="content">
        {tab === "board" && (
          <>
            <div className="titleRow">
              <div>
                <h2>{month.replace("-", "年")}月 シフト表</h2>
                <div className="muted">
                  縦＝日付 / 横＝スタッフ。未定者は交渉結果まで登録できます。
                </div>
              </div>
            </div>

            <div className="boardWrap">
              <table>
                <thead>
                  <tr>
                    <th className="dateHead">
                      日付・現場
                    </th>

                    {staff.map((person) => (
                      <th
                        className="personHead"
                        key={person.id}
                      >
                        {person.name}

                        <div className="personMeta">
                          {person.grade === "F"
                            ? "F"
                            : `${person.grade}年`}{" "}
                          / R{person.rank} /{" "}
                          {person.gender}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {days.map((date) => (
                    <tr key={date}>
                      <td className="dateCell">
                        <strong>
                          {date
                            .slice(5)
                            .replace("-", "/")}
                        </strong>

                        {(eventsByDate[date] || []).map(
                          (event) => (
                            <div
                              className="eventMini"
                              key={event.id}
                            >
                              <strong>
                                {event.eventName}
                              </strong>

                              <br />

                              {event.venueName}

                              {event.slots.length > 0 && (
                                <div>
                                  {event.slots
                                    .map(
                                      (slot) =>
                                        `${slot.time} ${slot.section}:${slot.required}人`
                                    )
                                    .join(" / ")}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </td>

                      {staff.map((person) => {
                        const key = `${person.id}|${date}`;

                        const shift =
                          shifts[key] || emptyShift;

                        return (
                          <td
                            key={person.id}
                            className={shiftClass(
                              shift.status
                            )}
                          >
                            <select
                              className="cellSelect"
                              value={shift.status}
                              onChange={(e) => {
                                const status =
                                  e.target.value;

                                setShift(
                                  person.id,
                                  date,
                                  {
                                    status,

                                    startHour:
                                      status === "time"
                                        ? shift.startHour ||
                                          "09:00"
                                        : "",

                                    negotiation:
                                      status ===
                                      "undecided"
                                        ? "pending"
                                        : "none",
                                  }
                                );
                              }}
                            >
                              <option value="none">
                                未提出
                              </option>

                              <option value="all">
                                終日勤務可能
                              </option>

                              <option value="time">
                                時間指定
                              </option>

                              <option value="undecided">
                                未定
                              </option>

                              <option value="off">
                                勤務不可
                              </option>
                            </select>

                            {shift.status === "time" && (
                              <select
                                className="timeSelect"
                                value={
                                  shift.startHour ||
                                  "09:00"
                                }
                                onChange={(e) =>
                                  setShift(
                                    person.id,
                                    date,
                                    {
                                      startHour:
                                        e.target.value,
                                    }
                                  )
                                }
                              >
                                {HOURS.map((hour) => (
                                  <option key={hour}>
                                    {hour}
                                  </option>
                                ))}
                              </select>
                            )}

                            {shift.status ===
                              "undecided" && (
                              <select
                                className="negSelect"
                                value={
                                  shift.negotiation ||
                                  "pending"
                                }
                                onChange={(e) =>
                                  handleNegotiationResult(
                                    person.id,
                                    date,
                                    e.target.value
                                  )
                                }
                              >
                                <option value="pending">
                                  交渉中 / 未交渉
                                </option>

                                <option value="all">
                                  交渉結果：終日OK
                                </option>

                                <option value="time">
                                  交渉結果：時間指定
                                </option>

                                <option value="off">
                                  交渉結果：勤務不可
                                </option>
                              </select>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "staff" && (
          <>
            <div className="card">
              <div className="titleRow">
                <h2>スタッフ管理</h2>
              </div>

              <div className="formRow">
                <input
                  placeholder="名前"
                  value={newStaff.name}
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      name: e.target.value,
                    })
                  }
                />

                <select
                  value={newStaff.grade}
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      grade: e.target.value,
                    })
                  }
                >
                  <option value="1">1年</option>
                  <option value="2">2年</option>
                  <option value="3">3年</option>
                  <option value="4">4年</option>
                  <option value="F">F</option>
                </select>

                <select
                  value={newStaff.rank}
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      rank: e.target.value,
                    })
                  }
                >
                  <option value="無">無</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>

                <select
                  value={newStaff.gender}
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      gender: e.target.value,
                    })
                  }
                >
                  <option>男性</option>
                  <option>女性</option>
                  <option>その他</option>
                </select>

                <button
                  className="primary"
                  onClick={addStaff}
                >
                  追加
                </button>
              </div>
            </div>

            <div className="staffGrid">
              {staff.map((person) => (
                <div
                  className="staffCard"
                  key={person.id}
                >
                  <div>
                    <strong>{person.name}</strong>

                    <div className="muted">
                      {person.grade === "F"
                        ? "F"
                        : `${person.grade}年`}{" "}
                      / ランク {person.rank} /{" "}
                      {person.gender}
                    </div>
                  </div>

                  <button
                    className="danger"
                    onClick={() =>
                      setStaff((prev) =>
                        prev.filter(
                          (staffMember) =>
                            staffMember.id !==
                            person.id
                        )
                      )
                    }
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "events" && (
          <>
            <div className="card">
              <div className="titleRow">
                <div>
                  <h2>現場登録</h2>

                  <div className="muted">
                    現場名・会場名を登録し、その中に時間×セクション×必要人数を追加します。
                  </div>
                </div>
              </div>

              <div className="formRow">
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      date: e.target.value,
                    })
                  }
                />

                <input
                  placeholder="現場名"
                  value={newEvent.eventName}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      eventName: e.target.value,
                    })
                  }
                />

                <input
                  placeholder="会場名"
                  value={newEvent.venueName}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      venueName: e.target.value,
                    })
                  }
                />

                <button
                  className="primary"
                  onClick={addEvent}
                >
                  現場を追加
                </button>
              </div>
            </div>

            <div className="eventLayout">
              <div className="card eventList">
                <h3>登録現場</h3>

                {events.length === 0 && (
                  <div className="muted">
                    まだ現場がありません。
                  </div>
                )}

                {events
                  .slice()
                  .sort((a, b) =>
                    a.date.localeCompare(b.date)
                  )
                  .map((event) => (
                    <button
                      key={event.id}
                      className={
                        selectedEvent?.id ===
                        event.id
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setSelectedEventId(
                          event.id
                        )
                      }
                    >
                      <strong>
                        {event.date
                          .slice(5)
                          .replace("-", "/")}{" "}
                        {event.eventName}
                      </strong>

                      <div className="muted">
                        {event.venueName}
                      </div>
                    </button>
                  ))}
              </div>

              <div>
                {selectedEvent ? (
                  <>
                    <div className="card">
                      <div className="titleRow">
                        <div>
                          <h2>
                            {
                              selectedEvent.eventName
                            }
                          </h2>

                          <div className="muted">
                            {selectedEvent.date} /{" "}
                            {
                              selectedEvent.venueName
                            }
                          </div>
                        </div>
                      </div>

                      <h3
                        style={{
                          marginTop: 20,
                        }}
                      >
                        時間・セクション追加
                      </h3>

                      <div className="formRow">
                        <select
                          value={
                            newSlot.section
                          }
                          onChange={(e) =>
                            setNewSlot({
                              ...newSlot,
                              section:
                                e.target.value,
                            })
                          }
                        >
                          {SECTIONS.map(
                            (section) => (
                              <option
                                key={section}
                              >
                                {section}
                              </option>
                            )
                          )}
                        </select>

                        <select
                          value={newSlot.time}
                          onChange={(e) =>
                            setNewSlot({
                              ...newSlot,
                              time: e.target.value,
                            })
                          }
                        >
                          {HOURS.map((hour) => (
                            <option key={hour}>
                              {hour}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          placeholder="必要人数"
                          value={newSlot.required}
                          onChange={(e) =>
                            setNewSlot({
                              ...newSlot,
                              required:
                                e.target.value,
                            })
                          }
                        />

                        <button
                          className="primary"
                          onClick={addSlot}
                        >
                          追加
                        </button>
                      </div>
                    </div>

                    <div className="card">
                      <h3>配置</h3>

                      {selectedEvent.slots
                        .length === 0 && (
                        <div className="muted">
                          時間・セクションを追加してください。
                        </div>
                      )}

                      {selectedEvent.slots
                        .slice()
                        .sort((a, b) =>
                          a.time.localeCompare(
                            b.time
                          )
                        )
                        .map((slot) => {
                          const shortage =
                            Math.max(
                              0,
                              slot.required -
                                slot.assigned
                                  .length
                            );

                          return (
                            <div
                              className="slot"
                              key={slot.id}
                            >
                              <div className="slotTop">
                                <div>
                                  <strong>
                                    {slot.time}　
                                    {slot.section}
                                  </strong>

                                  <div className="muted">
                                    必要{" "}
                                    {slot.required}人 /
                                    配置{" "}
                                    {
                                      slot.assigned
                                        .length
                                    }
                                    人
                                  </div>
                                </div>

                                <span
                                  className={
                                    shortage > 0
                                      ? "shortage"
                                      : "ok"
                                  }
                                >
                                  {shortage > 0
                                    ? `あと${shortage}人不足`
                                    : "充足"}
                                </span>
                              </div>

                              <div className="candidateGrid">
                                {staff.map(
                                  (person) => {
                                    const available =
                                      canWork(
                                        person.id,
                                        selectedEvent.date,
                                        slot.time
                                      );

                                    const assigned =
                                      slot.assigned.includes(
                                        person.id
                                      );

                                    const shift =
                                      shifts[
                                        `${person.id}|${selectedEvent.date}`
                                      ] ||
                                      emptyShift;

                                    return (
                                      <button
                                        key={
                                          person.id
                                        }
                                        disabled={
                                          !available &&
                                          !assigned
                                        }
                                        className={`candidate ${
                                          assigned
                                            ? "assigned"
                                            : ""
                                        } ${
                                          !available &&
                                          !assigned
                                            ? "disabled"
                                            : ""
                                        }`}
                                        onClick={() =>
                                          toggleAssignment(
                                            selectedEvent.id,
                                            slot.id,
                                            person.id
                                          )
                                        }
                                      >
                                        <strong>
                                          {
                                            person.name
                                          }
                                        </strong>

                                        <div className="muted">
                                          {availabilityLabel(
                                            shift
                                          )}
                                        </div>

                                        {assigned && (
                                          <div>
                                            ✓ 配置済み
                                          </div>
                                        )}
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <div className="card">
                    現場を追加してください。
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "off" && (
          <div className="card">
            <div className="titleRow">
              <div>
                <h2>OFF一覧</h2>

                <div className="muted">
                  その日にどの現場・セクションにも配置されていないスタッフです。
                </div>
              </div>
            </div>

            {offRows.map(({ date, people }) => (
              <div
                className="offDate"
                key={date}
              >
                <strong>
                  {date
                    .slice(5)
                    .replace("-", "/")}
                </strong>

                <div className="offList">
                  {people.map((person) => {
                    const shift =
                      shifts[
                        `${person.id}|${date}`
                      ] || emptyShift;

                    return (
                      <span
                        className="offChip"
                        key={person.id}
                      >
                        {person.name}｜
                        {availabilityLabel(
                          shift
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
