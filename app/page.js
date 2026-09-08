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

function compactLabel(shift) {
  if (!shift || shift.status === "none") return "—";

  if (shift.status === "all") return "終日";

  if (shift.status === "time") {
    return `${(shift.startHour || "--:--").slice(0, 2)}時〜`;
  }

  if (shift.status === "undecided") return "未定";

  if (shift.status === "off") return "不可";

  return "—";
}

function shiftClass(status) {
  return {
    all: "statusAll",
    time: "statusTime",
    undecided: "statusUndecided",
    off: "statusOff",
    none: "statusNone",
  }[status || "none"];
}

export default function Home() {
  const [tab, setTab] = useState("board");

  const [month, setMonth] = useState("2026-09");

  const [staff, setStaff] = useState(initialStaff);

  const [shifts, setShifts] = useState(initialShifts);

  const [events, setEvents] = useState(initialEvents);

  const [hydrated, setHydrated] = useState(false);

  const [editingCell, setEditingCell] = useState(null);

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

  const [selectedEventId, setSelectedEventId] =
    useState("e1");

  const [newSlot, setNewSlot] = useState({
    section: "整理",
    time: "09:00",
    required: "1",
  });

  useEffect(() => {
    setStaff(
      storageRead("sb_staff_v4", initialStaff)
    );

    setShifts(
      storageRead("sb_shifts_v4", initialShifts)
    );

    setEvents(
      storageRead("sb_events_v4", initialEvents)
    );

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(
        "sb_staff_v4",
        JSON.stringify(staff)
      );
    }
  }, [staff, hydrated]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(
        "sb_shifts_v4",
        JSON.stringify(shifts)
      );
    }
  }, [shifts, hydrated]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(
        "sb_events_v4",
        JSON.stringify(events)
      );
    }
  }, [events, hydrated]);

  const days = useMemo(() => {
    const [year, monthNumber] =
      month.split("-").map(Number);

    const count =
      new Date(year, monthNumber, 0).getDate();

    return Array.from(
      { length: count },

      (_, index) =>
        `${month}-${String(index + 1).padStart(
          2,
          "0"
        )}`
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
    events.find(
      (event) => event.id === selectedEventId
    ) ||
    events[0] ||
    null;

  function setShift(staffId, date, patch) {
    const key = `${staffId}|${date}`;

    const current =
      shifts[key] || emptyShift;

    setShifts((prev) => ({
      ...prev,

      [key]: {
        ...current,
        ...patch,
      },
    }));
  }

  function handleNegotiationResult(
    staffId,
    date,
    result
  ) {
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
          shifts[`${staffId}|${date}`]
            ?.startHour || "09:00",

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
      alert(
        "日付・現場名・会場名を入力してください"
      );

      return;
    }

    const event = {
      id: crypto.randomUUID(),

      date: newEvent.date,

      eventName:
        newEvent.eventName.trim(),

      venueName:
        newEvent.venueName.trim(),

      slots: [],
    };

    setEvents((prev) => [
      ...prev,
      event,
    ]);

    setSelectedEventId(event.id);

    setNewEvent((prev) => ({
      ...prev,
      eventName: "",
      venueName: "",
    }));
  }

  function updateEventField(
    eventId,
    field,
    value
  ) {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              [field]: value,
            }
          : event
      )
    );
  }

  function deleteEvent(eventId) {
    if (
      !confirm(
        "この現場を削除しますか？"
      )
    ) {
      return;
    }

    setEvents((prev) => {
      const next =
        prev.filter(
          (event) =>
            event.id !== eventId
        );

      setSelectedEventId(
        next[0]?.id || ""
      );

      return next;
    });
  }

  function addSlot() {
    if (!selectedEvent) {
      alert(
        "先に現場を選択してください"
      );

      return;
    }

    const required =
      Number(newSlot.required);

    if (!required || required < 1) {
      alert(
        "必要人数を1以上で入力してください"
      );

      return;
    }

    setEvents((prev) =>
      prev.map((event) =>
        event.id ===
        selectedEvent.id
          ? {
              ...event,

              slots: [
                ...event.slots,

                {
                  id:
                    crypto.randomUUID(),

                  section:
                    newSlot.section,

                  time:
                    newSlot.time,

                  required,

                  assigned: [],
                },
              ],
            }
          : event
      )
    );
  }

  function updateSlot(
    eventId,
    slotId,
    patch
  ) {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,

              slots:
                event.slots.map(
                  (slot) =>
                    slot.id === slotId
                      ? {
                          ...slot,
                          ...patch,
                        }
                      : slot
                ),
            }
          : event
      )
    );
  }

  function deleteSlot(
    eventId,
    slotId
  ) {
    if (
      !confirm(
        "この時間・セクションを削除しますか？"
      )
    ) {
      return;
    }

    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,

              slots:
                event.slots.filter(
                  (slot) =>
                    slot.id !== slotId
                ),
            }
          : event
      )
    );
  }

  function canWork(
    staffId,
    date,
    time
  ) {
    const shift =
      shifts[
        `${staffId}|${date}`
      ] || emptyShift;

    if (shift.status === "all") {
      return true;
    }

    if (
      shift.status === "time" &&
      shift.startHour
    ) {
      return (
        shift.startHour <= time
      );
    }

    return false;
  }

  function canWorkOnDate(
    staffId,
    date
  ) {
    const shift =
      shifts[
        `${staffId}|${date}`
      ] || emptyShift;

    return (
      shift.status === "all" ||
      shift.status === "time"
    );
  }

  function toggleAssignment(
    eventId,
    slotId,
    staffId
  ) {
    setEvents((prev) =>
      prev.map((event) => {
        if (
          event.id !== eventId
        ) {
          return event;
        }

        return {
          ...event,

          slots:
            event.slots.map(
              (slot) => {
                if (
                  slot.id !== slotId
                ) {
                  return slot;
                }

                const exists =
                  slot.assigned.includes(
                    staffId
                  );

                return {
                  ...slot,

                  assigned: exists
                    ? slot.assigned.filter(
                        (id) =>
                          id !== staffId
                      )
                    : [
                        ...slot.assigned,
                        staffId,
                      ],
                };
              }
            ),
        };
      })
    );
  }

  function assignedStaffIdsOnDate(
    date
  ) {
    const ids = new Set();

    for (
      const event of events.filter(
        (event) =>
          event.date === date
      )
    ) {
      for (
        const slot of event.slots
      ) {
        for (
          const id of slot.assigned
        ) {
          ids.add(id);
        }
      }
    }

    return ids;
  }

  const offRows = days
    .map((date) => {
      const assigned =
        assignedStaffIdsOnDate(
          date
        );

      return {
        date,

        people:
          staff.filter(
            (person) =>
              !assigned.has(
                person.id
              )
          ),
      };
    })
    .filter(
      (row) =>
        row.people.length > 0
    );

  return (
    <main>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f5f6f8;
          color: #1f2937;

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Hiragino Sans",
            "Yu Gothic",
            sans-serif;
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
          color: white;

          padding: 16px 22px;

          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 14px;
        }

        .brand h1 {
          margin: 0;
          font-size: 21px;
        }

        .brand p {
          margin: 3px 0 0;

          font-size: 11px;

          color: #9ca3af;
        }

        .month {
          border: 0;

          border-radius: 8px;

          padding: 9px 11px;

          background: white;
        }

        .tabs {
          position: sticky;

          top: 0;

          z-index: 30;

          display: flex;

          gap: 7px;

          flex-wrap: wrap;

          padding: 11px 16px;

          background: white;

          border-bottom:
            1px solid #e5e7eb;
        }

        .tab {
          border: 0;

          border-radius: 8px;

          background: #eef0f3;

          padding: 9px 13px;

          font-weight: 700;
        }

        .tab.active {
          background: #111827;

          color: white;
        }

        .content {
          max-width: 1800px;

          margin: auto;

          padding: 16px;
        }

        .card {
          background: white;

          border:
            1px solid #e5e7eb;

          border-radius: 12px;

          padding: 16px;

          margin-bottom: 14px;
        }

        .titleRow {
          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 10px;

          flex-wrap: wrap;

          margin-bottom: 12px;
        }

        .titleRow h2,
        .card h3 {
          margin: 0;
        }

        .muted {
          color: #6b7280;

          font-size: 12px;
        }

        .primary {
          border: 0;

          border-radius: 8px;

          background: #2563eb;

          color: white;

          padding: 9px 13px;

          font-weight: 700;
        }

        .danger {
          border: 0;

          border-radius: 8px;

          background: #fee2e2;

          color: #b91c1c;

          padding: 8px 11px;

          font-weight: 700;
        }

        .formRow {
          display: flex;

          gap: 8px;

          flex-wrap: wrap;

          align-items: center;
        }

        .formRow input,
        .formRow select,
        .editForm input,
        .editForm select {
          border:
            1px solid #d1d5db;

          border-radius: 8px;

          padding: 9px;

          background: white;
        }

        .boardWrap {
          overflow: auto;

          height:
            calc(100vh - 190px);

          min-height: 520px;

          border:
            1px solid #dfe3e8;

          border-radius: 10px;

          background: white;
        }

        .shiftTable {
          border-collapse:
            separate;

          border-spacing: 0;

          width: max-content;

          min-width: 100%;

          table-layout: fixed;

          background: white;
        }

        .shiftTable th,
        .shiftTable td {
          border-right:
            1px solid #e5e7eb;

          border-bottom:
            1px solid #e5e7eb;

          padding: 4px;

          text-align: center;

          vertical-align: middle;

          height: 46px;
        }

        .shiftTable th {
          position: sticky;

          top: 0;

          z-index: 8;

          background: #f3f4f6;
        }

        .dateHead {
          position: sticky !important;

          left: 0;

          z-index: 12 !important;

          min-width: 190px;

          width: 190px;

          text-align: left !important;
        }

        .dateCell {
          position: sticky;

          left: 0;

          z-index: 6;

          min-width: 190px;

          width: 190px;

          background: white;

          text-align: left !important;

          padding: 7px 9px !important;
        }

        .dateTop {
          display: flex;

          align-items: baseline;

          justify-content:
            space-between;

          gap: 8px;
        }

        .availableCount {
          font-size: 11px;

          font-weight: 800;

          color: #166534;

          white-space: nowrap;
        }

        .eventMini {
          margin-top: 5px;

          padding: 5px 6px;

          border-radius: 6px;

          background: #eff6ff;

          font-size: 10px;
        }

        .personHead {
          min-width: 104px;

          width: 104px;

          max-width: 104px;

          padding: 6px 4px !important;
        }

        .personName {
          display: block;

          font-size: 12px;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;
        }

        .personMeta {
          font-size: 9px;

          color: #6b7280;

          margin-top: 2px;
        }

        .shiftCell {
          min-width: 104px;

          width: 104px;

          padding: 3px !important;
        }

        .cellButton {
          width: 100%;

          min-height: 36px;

          border: 0;

          border-radius: 6px;

          font-size: 11px;

          font-weight: 800;
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
          background: #f3f4f6;

          color: #6b7280;
        }

        .modalBack {
          position: fixed;

          inset: 0;

          z-index: 100;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 18px;

          background:
            rgba(17,24,39,.45);
        }

        .modal {
          width:
            min(440px,100%);

          background: white;

          border-radius: 14px;

          padding: 18px;
        }

        .modalHeader {
          display: flex;

          justify-content:
            space-between;

          gap: 12px;

          margin-bottom: 14px;
        }

        .modalHeader h3 {
          margin: 0;
        }

        .closeBtn {
          border: 0;

          background: #eef0f3;

          border-radius: 8px;

          padding: 7px 10px;
        }

        .modal select {
          width: 100%;

          border:
            1px solid #d1d5db;

          border-radius: 8px;

          padding: 10px;

          margin-top: 8px;

          background: white;
        }

        .eventLayout {
          display: grid;

          grid-template-columns:
            310px minmax(0,1fr);

          gap: 14px;
        }

        .eventList {
          max-height:
            calc(100vh - 180px);

          overflow: auto;
        }

        .eventList button {
          width: 100%;

          text-align: left;

          border:
            1px solid #e5e7eb;

          background: white;

          border-radius: 9px;

          padding: 11px;

          margin-bottom: 7px;
        }

        .eventList button.selected {
          border-color: #2563eb;

          background: #eff6ff;
        }

        .editForm {
          display: grid;

          grid-template-columns:
            150px 1fr 1fr auto;

          gap: 8px;
        }

        .slot {
          border:
            1px solid #e5e7eb;

          border-radius: 10px;

          padding: 12px;

          margin-bottom: 10px;
        }

        .slotEdit {
          display: grid;

          grid-template-columns:
            130px 120px 120px auto;

          gap: 8px;
        }

        .slotEdit select,
        .slotEdit input {
          width: 100%;

          border:
            1px solid #d1d5db;

          border-radius: 8px;

          padding: 8px;

          background: white;
        }

        .slotStats {
          display: flex;

          justify-content:
            space-between;

          gap: 12px;

          margin-top: 9px;

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

          grid-template-columns:
            repeat(
              auto-fill,
              minmax(160px,1fr)
            );

          gap: 7px;

          margin-top: 10px;
        }

        .candidate {
          border:
            1px solid #d1d5db;

          background: white;

          border-radius: 8px;

          padding: 9px;

          text-align: left;
        }

        .candidate.assigned {
          background: #dcfce7;

          border-color: #86efac;
        }

        .staffGrid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fill,
              minmax(240px,1fr)
            );

          gap: 9px;
        }

        .staffCard {
          border:
            1px solid #e5e7eb;

          border-radius: 10px;

          padding: 12px;

          display: flex;

          justify-content:
            space-between;

          align-items: center;
        }

        .offDate {
          margin-bottom: 13px;
        }

        .offList {
          display: flex;

          flex-wrap: wrap;

          gap: 7px;

          margin-top: 7px;
        }

        .offChip {
          background: #f3f4f6;

          border-radius: 999px;

          padding: 6px 9px;

          font-size: 12px;
        }

        @media (
          max-width: 900px
        ) {
          .content {
            padding: 10px;
          }

          .eventLayout {
            grid-template-columns:
              1fr;
          }

          .editForm,
          .slotEdit {
            grid-template-columns:
              1fr;
          }

          .dateHead,
          .dateCell {
            min-width: 160px;

            width: 160px;
          }
        }
      `}</style>

      <header className="topbar">
        <div className="brand">
          <h1>SHIFT BOARD</h1>

          <p>
            イベントスタッフ
            シフト・配置管理
          </p>
        </div>

        <input
          className="month"
          type="month"
          value={month}
          onChange={(e) =>
            setMonth(e.target.value)
          }
        />
      </header>

      <nav className="tabs">
        {[
          ["board", "月間シフト"],
          [
            "events",
            "現場管理・配置",
          ],
          ["off", "OFF一覧"],
          ["staff", "スタッフ管理"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`tab ${
              tab === id
                ? "active"
                : ""
            }`}
            onClick={() =>
              setTab(id)
            }
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
                <h2>
                  {month.replace(
                    "-",
                    "年"
                  )}
                  月 シフト表
                </h2>

                <div className="muted">
                  マスをクリックすると編集できます
                </div>
              </div>
            </div>

            <div className="boardWrap">
              <table className="shiftTable">
                <thead>
                  <tr>
                    <th className="dateHead">
                      日付・現場
                    </th>

                    {staff.map(
                      (person) => (
                        <th
                          className="personHead"
                          key={person.id}
                          title={
                            person.name
                          }
                        >
                          <span className="personName">
                            {person.name}
                          </span>

                          <div className="personMeta">
                            {person.grade ===
                            "F"
                              ? "F"
                              : `${person.grade}年`}{" "}
                            / R
                            {person.rank}
                          </div>
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {days.map(
                    (date) => {
                      const availablePeople =
                        staff.filter(
                          (person) =>
                            canWorkOnDate(
                              person.id,
                              date
                            )
                        );

                      const allCount =
                        availablePeople.filter(
                          (person) =>
                            (
                              shifts[
                                `${person.id}|${date}`
                              ] ||
                              emptyShift
                            ).status ===
                            "all"
                        ).length;

                      const timeCount =
                        availablePeople.length -
                        allCount;

                      return (
                        <tr key={date}>

                          <td className="dateCell">
                            <div className="dateTop">
                              <strong>
                                {date
                                  .slice(5)
                                  .replace(
                                    "-",
                                    "/"
                                  )}
                              </strong>

                              <span className="availableCount">
                                稼働可能{" "}
                                {
                                  availablePeople.length
                                }
                                人
                              </span>
                            </div>

                            <div className="muted">
                              終日{" "}
                              {allCount} /
                              時間指定{" "}
                              {timeCount}
                            </div>

                            {(
                              eventsByDate[
                                date
                              ] || []
                            ).map(
                              (event) => (
                                <div
                                  className="eventMini"
                                  key={
                                    event.id
                                  }
                                >
                                  <strong>
                                    {
                                      event.eventName
                                    }
                                  </strong>
                                  ｜
                                  {
                                    event.venueName
                                  }
                                </div>
                              )
                            )}
                          </td>

                          {staff.map(
                            (person) => {
                              const key =
                                `${person.id}|${date}`;

                              const shift =
                                shifts[
                                  key
                                ] ||
                                emptyShift;

                              return (
                                <td
                                  className="shiftCell"
                                  key={
                                    person.id
                                  }
                                >
                                  <button
                                    className={`cellButton ${shiftClass(
                                      shift.status
                                    )}`}
                                    onClick={() =>
                                      setEditingCell(
                                        {
                                          staffId:
                                            person.id,

                                          date,
                                        }
                                      )
                                    }
                                  >
                                    {compactLabel(
                                      shift
                                    )}
                                  </button>
                                </td>
                              );
                            }
                          )}
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {editingCell &&
          (() => {
            const person =
              staff.find(
                (p) =>
                  p.id ===
                  editingCell.staffId
              );

            const key =
              `${editingCell.staffId}|${editingCell.date}`;

            const shift =
              shifts[key] ||
              emptyShift;

            return (
              <div
                className="modalBack"
                onClick={() =>
                  setEditingCell(
                    null
                  )
                }
              >
                <div
                  className="modal"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  <div className="modalHeader">
                    <div>
                      <h3>
                        {person?.name}
                      </h3>

                      <div className="muted">
                        {
                          editingCell.date
                        }
                      </div>
                    </div>

                    <button
                      className="closeBtn"
                      onClick={() =>
                        setEditingCell(
                          null
                        )
                      }
                    >
                      閉じる
                    </button>
                  </div>

                  <select
                    value={
                      shift.status
                    }
                    onChange={(e) => {
                      const status =
                        e.target.value;

                      setShift(
                        editingCell.staffId,
                        editingCell.date,
                        {
                          status,

                          startHour:
                            status ===
                            "time"
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

                  {shift.status ===
                    "time" && (
                    <select
                      value={
                        shift.startHour ||
                        "09:00"
                      }
                      onChange={(e) =>
                        setShift(
                          editingCell.staffId,
                          editingCell.date,
                          {
                            startHour:
                              e.target
                                .value,
                          }
                        )
                      }
                    >
                      {HOURS.map(
                        (hour) => (
                          <option
                            key={hour}
                          >
                            {hour}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {shift.status ===
                    "undecided" && (
                    <select
                      value={
                        shift.negotiation ||
                        "pending"
                      }
                      onChange={(e) =>
                        handleNegotiationResult(
                          editingCell.staffId,
                          editingCell.date,
                          e.target.value
                        )
                      }
                    >
                      <option value="pending">
                        交渉中 /
                        未交渉
                      </option>

                      <option value="all">
                        交渉結果：
                        終日OK
                      </option>

                      <option value="time">
                        交渉結果：
                        時間指定
                      </option>

                      <option value="off">
                        交渉結果：
                        勤務不可
                      </option>
                    </select>
                  )}
                </div>
              </div>
            );
          })()}

        {tab === "events" && (
          <>
            <div className="card">
              <h2>現場登録</h2>

              <div
                className="formRow"
                style={{
                  marginTop: 12,
                }}
              >
                <input
                  type="date"
                  value={
                    newEvent.date
                  }
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      date:
                        e.target.value,
                    })
                  }
                />

                <input
                  placeholder="現場名"
                  value={
                    newEvent.eventName
                  }
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      eventName:
                        e.target.value,
                    })
                  }
                />

                <input
                  placeholder="会場名"
                  value={
                    newEvent.venueName
                  }
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      venueName:
                        e.target.value,
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
                <h3>
                  登録現場
                </h3>

                {events
                  .slice()
                  .sort((a, b) =>
                    a.date.localeCompare(
                      b.date
                    )
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
                          .replace(
                            "-",
                            "/"
                          )}{" "}
                        {
                          event.eventName
                        }
                      </strong>

                      <div className="muted">
                        {
                          event.venueName
                        }
                      </div>
                    </button>
                  ))}
              </div>

              <div>
                {selectedEvent && (
                  <>

                    <div className="card">

                      <h2>
                        現場情報の編集
                      </h2>

                      <div
                        className="editForm"
                        style={{
                          marginTop: 12,
                        }}
                      >
                        <input
                          type="date"
                          value={
                            selectedEvent.date
                          }
                          onChange={(e) =>
                            updateEventField(
                              selectedEvent.id,
                              "date",
                              e.target.value
                            )
                          }
                        />

                        <input
                          value={
                            selectedEvent.eventName
                          }
                          onChange={(e) =>
                            updateEventField(
                              selectedEvent.id,
                              "eventName",
                              e.target.value
                            )
                          }
                        />

                        <input
                          value={
                            selectedEvent.venueName
                          }
                          onChange={(e) =>
                            updateEventField(
                              selectedEvent.id,
                              "venueName",
                              e.target.value
                            )
                          }
                        />

                        <button
                          className="danger"
                          onClick={() =>
                            deleteEvent(
                              selectedEvent.id
                            )
                          }
                        >
                          現場削除
                        </button>
                      </div>
                    </div>

                    <div className="card">

                      <h3>
                        セクション追加
                      </h3>

                      <div
                        className="formRow"
                        style={{
                          marginTop: 10,
                        }}
                      >
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
                                key={
                                  section
                                }
                              >
                                {section}
                              </option>
                            )
                          )}
                        </select>

                        <select
                          value={
                            newSlot.time
                          }
                          onChange={(e) =>
                            setNewSlot({
                              ...newSlot,
                              time:
                                e.target.value,
                            })
                          }
                        >
                          {HOURS.map(
                            (hour) => (
                              <option
                                key={hour}
                              >
                                {hour}
                              </option>
                            )
                          )}
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={
                            newSlot.required
                          }
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
                          onClick={
                            addSlot
                          }
                        >
                          追加
                        </button>
                      </div>
                    </div>

                    <div className="card">

                      <h3>配置</h3>

                      {selectedEvent.slots
                        .slice()
                        .sort((a, b) =>
                          a.time.localeCompare(
                            b.time
                          )
                        )
                        .map((slot) => {

                          const availableStaff =
                            staff.filter(
                              (person) =>
                                canWork(
                                  person.id,
                                  selectedEvent.date,
                                  slot.time
                                )
                            );

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
                              key={
                                slot.id
                              }
                            >

                              <div className="slotEdit">

                                <select
                                  value={
                                    slot.section
                                  }
                                  onChange={(e) =>
                                    updateSlot(
                                      selectedEvent.id,
                                      slot.id,
                                      {
                                        section:
                                          e.target.value,
                                      }
                                    )
                                  }
                                >
                                  {SECTIONS.map(
                                    (
                                      section
                                    ) => (
                                      <option
                                        key={
                                          section
                                        }
                                      >
                                        {
                                          section
                                        }
                                      </option>
                                    )
                                  )}
                                </select>

                                <select
                                  value={
                                    slot.time
                                  }
                                  onChange={(e) =>
                                    updateSlot(
                                      selectedEvent.id,
                                      slot.id,
                                      {
                                        time:
                                          e.target.value,
                                      }
                                    )
                                  }
                                >
                                  {HOURS.map(
                                    (hour) => (
                                      <option
                                        key={
                                          hour
                                        }
                                      >
                                        {
                                          hour
                                        }
                                      </option>
                                    )
                                  )}
                                </select>

                                <input
                                  type="number"
                                  min="1"
                                  value={
                                    slot.required
                                  }
                                  onChange={(e) =>
                                    updateSlot(
                                      selectedEvent.id,
                                      slot.id,
                                      {
                                        required:
                                          Number(
                                            e.target.value
                                          ) ||
                                          1,
                                      }
                                    )
                                  }
                                />

                                <button
                                  className="danger"
                                  onClick={() =>
                                    deleteSlot(
                                      selectedEvent.id,
                                      slot.id
                                    )
                                  }
                                >
                                  削除
                                </button>
                              </div>

                              <div className="slotStats">

                                <div className="muted">
                                  稼働可能{" "}
                                  {
                                    availableStaff.length
                                  }
                                  人 /
                                  必要{" "}
                                  {
                                    slot.required
                                  }
                                  人 /
                                  配置{" "}
                                  {
                                    slot.assigned.length
                                  }
                                  人
                                </div>

                                <span
                                  className={
                                    shortage >
                                    0
                                      ? "shortage"
                                      : "ok"
                                  }
                                >
                                  {shortage >
                                  0
                                    ? `あと${shortage}人不足`
                                    : "充足"}
                                </span>
                              </div>

                              <div className="candidateGrid">

                                {availableStaff.map(
                                  (
                                    person
                                  ) => {

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
                                        className={`candidate ${
                                          assigned
                                            ? "assigned"
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
                                            ✓
                                            配置済み
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
                )}
              </div>
            </div>
          </>
        )}

        {tab === "off" && (
          <div className="card">

            <h2>OFF一覧</h2>

            {offRows.map(
              ({
                date,
                people,
              }) => (
                <div
                  className="offDate"
                  key={date}
                >
                  <strong>
                    {date
                      .slice(5)
                      .replace(
                        "-",
                        "/"
                      )}
                  </strong>

                  <div className="offList">
                    {people.map(
                      (person) => {

                        const shift =
                          shifts[
                            `${person.id}|${date}`
                          ] ||
                          emptyShift;

                        return (
                          <span
                            className="offChip"
                            key={
                              person.id
                            }
                          >
                            {
                              person.name
                            }
                            ｜
                            {availabilityLabel(
                              shift
                            )}
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {tab === "staff" && (
          <>
            <div className="card">

              <h2>
                スタッフ管理
              </h2>

              <div
                className="formRow"
                style={{
                  marginTop: 12,
                }}
              >
                <input
                  placeholder="名前"
                  value={
                    newStaff.name
                  }
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      name:
                        e.target.value,
                    })
                  }
                />

                <select
                  value={
                    newStaff.grade
                  }
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      grade:
                        e.target.value,
                    })
                  }
                >
                  <option value="1">
                    1年
                  </option>

                  <option value="2">
                    2年
                  </option>

                  <option value="3">
                    3年
                  </option>

                  <option value="4">
                    4年
                  </option>

                  <option value="F">
                    F
                  </option>
                </select>

                <select
                  value={
                    newStaff.rank
                  }
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      rank:
                        e.target.value,
                    })
                  }
                >
                  <option value="無">
                    無
                  </option>

                  <option value="1">
                    1
                  </option>

                  <option value="2">
                    2
                  </option>

                  <option value="3">
                    3
                  </option>

                  <option value="4">
                    4
                  </option>
                </select>

                <select
                  value={
                    newStaff.gender
                  }
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      gender:
                        e.target.value,
                    })
                  }
                >
                  <option>
                    男性
                  </option>

                  <option>
                    女性
                  </option>

                  <option>
                    その他
                  </option>
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

              {staff.map(
                (person) => (
                  <div
                    className="staffCard"
                    key={
                      person.id
                    }
                  >
                    <div>
                      <strong>
                        {
                          person.name
                        }
                      </strong>

                      <div className="muted">
                        {person.grade ===
                        "F"
                          ? "F"
                          : `${person.grade}年`}{" "}
                        / ランク{" "}
                        {
                          person.rank
                        }{" "}
                        /{" "}
                        {
                          person.gender
                        }
                      </div>
                    </div>

                    <button
                      className="danger"
                      onClick={() =>
                        setStaff(
                          (prev) =>
                            prev.filter(
                              (
                                member
                              ) =>
                                member.id !==
                                person.id
                            )
                        )
                      }
                    >
                      削除
                    </button>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
