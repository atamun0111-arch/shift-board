"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

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

const POSITIONS = [
  "メンツ組",
  "入口管理",
  "場外管理",
  "物販管理",
  "呼び出し",
  "場内管理",
];

const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
);

const emptyShift = {
  status: "none",
  startHour: "",
  negotiated: false,
  negotiatedBy: "",
};

function shortTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function availabilityLabel(shift) {
  if (!shift || shift.status === "none") return "未提出";
  if (shift.status === "all") return "終日勤務可能";
  if (shift.status === "time") {
    return `${shift.startHour || "時間未設定"}〜`;
  }
  if (shift.status === "undecided") return "未定";
  if (shift.status === "off") return "勤務不可";
  return "未提出";
}

function compactLabel(shift) {
  if (!shift || shift.status === "none") return "—";
  if (shift.status === "all") return "⭕️";

  if (shift.status === "time") {
    return `${(shift.startHour || "--:--").slice(0, 2)}時〜`;
  }

  if (shift.status === "undecided") return "🔺";
  if (shift.status === "off") return "❌";

  return "—";
}

function statusClass(status) {
  return (
    {
      all: "statusAll",
      time: "statusTime",
      undecided: "statusUndecided",
      off: "statusOff",
      none: "statusNone",
    }[status || "none"] || "statusNone"
  );
}

function lastDayOfMonth(month) {
  const [y, m] = month.split("-").map(Number);

  const d = new Date(y, m, 0).getDate();

  return `${month}-${String(d).padStart(2, "0")}`;
}

export default function Home() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState("board");

  const [month, setMonth] = useState("2026-09");

  const [staff, setStaff] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [shifts, setShifts] = useState({});
  const [events, setEvents] = useState([]);

  const [eventFiles, setEventFiles] = useState({});
  const [eventPdfs, setEventPdfs] = useState({});

  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState(null);

  const [newStaff, setNewStaff] = useState({
    name: "",
    grade: "1",
    rank: "無",
    gender: "男性",
  });

  const [newAdmin, setNewAdmin] = useState("");

  const [newEvent, setNewEvent] = useState({
    date: "2026-09-01",
    eventName: "",
    venueName: "",
  });

  const [selectedEventId, setSelectedEventId] = useState("");

  const [newSlot, setNewSlot] = useState({
    section: "整理",
    time: "09:00",
    required: "1",
  });

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setAuthChecked(true);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    loadData();
  }, [session, month]);

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
    events.find((event) => event.id === selectedEventId) || null;

  useEffect(() => {
    if (!selectedEventId) return;

    loadEventPdf(selectedEventId);
  }, [selectedEventId, eventFiles]);

async function login(e) {
  e.preventDefault();

  setLoggingIn(true);
  setLoginError("");

  try {
    const response = await fetch("/api/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        loginId: loginEmail,
        password: loginPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      setLoginError(
        result.message || "IDまたはパスワードが違います。"
      );
      return;
    }

    const { error } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });

    if (error) {
      console.error(error);
      setLoginError("ログイン処理に失敗しました。");
    }
  } catch (error) {
    console.error(error);
    setLoginError("ログイン処理に失敗しました。");
  } finally {
    setLoggingIn(false);
  }
}
  async function loadData() {
    setLoading(true);

    try {
      const firstDate = `${month}-01`;
      const lastDate = lastDayOfMonth(month);

      const [
        staffResult,
        adminResult,
        availabilityResult,
        eventResult,
      ] = await Promise.all([
        supabase
          .from("staff")
          .select("*")
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("admins")
          .select("*")
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("availability")
          .select("*")
          .gte("work_date", firstDate)
          .lte("work_date", lastDate),

        supabase
          .from("events")
          .select("*")
          .gte("event_date", firstDate)
          .lte("event_date", lastDate)
          .order("event_date"),
      ]);

      if (staffResult.error) throw staffResult.error;
      if (adminResult.error) throw adminResult.error;
      if (availabilityResult.error) throw availabilityResult.error;
      if (eventResult.error) throw eventResult.error;

      const staffRows = staffResult.data || [];
      const adminRows = adminResult.data || [];
      const availabilityRows = availabilityResult.data || [];
      const eventRows = eventResult.data || [];

      setStaff(staffRows);
      setAdmins(adminRows);

      const shiftMap = {};

      for (const row of availabilityRows) {
        shiftMap[`${row.staff_id}|${row.work_date}`] = {
          id: row.id,
          status: row.status,
          startHour: shortTime(row.start_hour),
          negotiated: !!row.negotiated,
          negotiatedBy: row.negotiated_by || "",
        };
      }

      setShifts(shiftMap);

      let slotRows = [];
      let assignmentRows = [];
      let fileRows = [];

      const eventIds = eventRows.map((event) => event.id);

      if (eventIds.length > 0) {
        const [slotResult, assignmentResult, fileResult] =
          await Promise.all([
            supabase
              .from("event_slots")
              .select("*")
              .in("event_id", eventIds),

            supabase
              .from("assignments")
              .select("*")
              .in("event_id", eventIds),

            supabase
              .from("event_files")
              .select("*")
              .in("event_id", eventIds),
          ]);

        if (slotResult.error) throw slotResult.error;
        if (assignmentResult.error) throw assignmentResult.error;
        if (fileResult.error) throw fileResult.error;

        slotRows = slotResult.data || [];
        assignmentRows = assignmentResult.data || [];
        fileRows = fileResult.data || [];
      }

      const builtEvents = eventRows.map((event) => {
        const eventSlots = slotRows
          .filter((slot) => slot.event_id === event.id)
          .map((slot) => {
            const slotAssignments = assignmentRows.filter(
              (assignment) => assignment.slot_id === slot.id
            );

            const positions = {};

            for (const assignment of slotAssignments) {
              if (assignment.position) {
                positions[assignment.staff_id] = assignment.position;
              }
            }

            return {
              id: slot.id,
              section: slot.section,
              time: shortTime(slot.start_time),
              required: Number(slot.required_count),
              stasen: Number(slot.stasen_count || 0),
              assigned: slotAssignments.map(
                (assignment) => assignment.staff_id
              ),
              positions,
            };
          });

        return {
          id: event.id,
          date: event.event_date,
          eventName: event.event_name,
          venueName: event.venue_name,
          slots: eventSlots,
        };
      });

      setEvents(builtEvents);

      setSelectedEventId((current) => {
        if (builtEvents.some((event) => event.id === current)) {
          return current;
        }

        return builtEvents[0]?.id || "";
      });

      const fileMap = {};

      for (const file of fileRows) {
        fileMap[file.event_id] = file;
      }

      setEventFiles(fileMap);
    } catch (error) {
      console.error(error);

      alert(
        "Supabaseからの読み込みに失敗しました。\nもう一度ページを開き直してください。"
      );
    } finally {
      setLoading(false);
    }
  }

  async function setShift(staffId, date, patch) {
    const key = `${staffId}|${date}`;

    const current = shifts[key] || emptyShift;

    const next = {
      ...current,
      ...patch,
    };

    const payload = {
      staff_id: staffId,
      work_date: date,
      status: next.status,
      start_hour:
        next.status === "time" && next.startHour
          ? next.startHour
          : null,
      negotiated: !!next.negotiated,
      negotiated_by: next.negotiatedBy || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("availability")
      .upsert(payload, {
        onConflict: "staff_id,work_date",
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("シフトの保存に失敗しました。");
      return;
    }

    setShifts((prev) => ({
      ...prev,

      [key]: {
        id: data.id,
        status: data.status,
        startHour: shortTime(data.start_hour),
        negotiated: !!data.negotiated,
        negotiatedBy: data.negotiated_by || "",
      },
    }));

    if (current.status !== next.status) {
      await supabase.from("availability_changes").insert({
        availability_id: data.id,
        staff_id: staffId,
        work_date: date,
        old_status: current.status,
        new_status: next.status,
        changed_by: session?.user?.id || null,
      });
    }
  }

  async function addStaff() {
    if (!newStaff.name.trim()) {
      alert("名前を入力してください");
      return;
    }

    const { data, error } = await supabase
      .from("staff")
      .insert({
        name: newStaff.name.trim(),
        grade: newStaff.grade,
        rank: newStaff.rank,
        gender: newStaff.gender,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("スタッフ登録に失敗しました。");
      return;
    }

    setStaff((prev) =>
      [...prev, data].sort((a, b) =>
        a.name.localeCompare(b.name, "ja")
      )
    );

    setNewStaff({
      name: "",
      grade: "1",
      rank: "無",
      gender: "男性",
    });
  }

  async function deleteStaff(person) {
    if (!confirm(`${person.name}を名簿から外しますか？`)) {
      return;
    }

    const { error } = await supabase
      .from("staff")
      .update({
        is_active: false,
      })
      .eq("id", person.id);

    if (error) {
      alert("スタッフの削除に失敗しました。");
      return;
    }

    setStaff((prev) =>
      prev.filter((item) => item.id !== person.id)
    );
  }

  async function addAdmin() {
    if (!newAdmin.trim()) {
      alert("管理者名を入力してください");
      return;
    }

    const { data, error } = await supabase
      .from("admins")
      .insert({
        name: newAdmin.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("管理者登録に失敗しました。");
      return;
    }

    setAdmins((prev) =>
      [...prev, data].sort((a, b) =>
        a.name.localeCompare(b.name, "ja")
      )
    );

    setNewAdmin("");
  }

  async function deleteAdmin(admin) {
    if (admin.id === session?.user?.id) {
      alert("現在ログイン中の管理者は削除できません。");
      return;
    }

    if (!confirm(`${admin.name}を管理者名簿から削除しますか？`)) {
      return;
    }

    const { error } = await supabase
      .from("admins")
      .update({
        is_active: false,
      })
      .eq("id", admin.id);

    if (error) {
      alert("管理者の削除に失敗しました。");
      return;
    }

    setAdmins((prev) =>
      prev.filter((item) => item.id !== admin.id)
    );
  }

  async function addEvent() {
    if (
      !newEvent.date ||
      !newEvent.eventName.trim() ||
      !newEvent.venueName.trim()
    ) {
      alert("日付・現場名・会場名を入力してください");
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .insert({
        event_date: newEvent.date,
        event_name: newEvent.eventName.trim(),
        venue_name: newEvent.venueName.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("現場登録に失敗しました。");
      return;
    }

    if (newEvent.date.slice(0, 7) !== month) {
      setMonth(newEvent.date.slice(0, 7));
    } else {
      const event = {
        id: data.id,
        date: data.event_date,
        eventName: data.event_name,
        venueName: data.venue_name,
        slots: [],
      };

      setEvents((prev) => [...prev, event]);
      setSelectedEventId(event.id);
    }

    setNewEvent((prev) => ({
      ...prev,
      eventName: "",
      venueName: "",
    }));
  }

  async function updateEventField(eventId, field, value) {
    const databaseField =
      field === "date"
        ? "event_date"
        : field === "eventName"
        ? "event_name"
        : "venue_name";

    const { error } = await supabase
      .from("events")
      .update({
        [databaseField]: value,
      })
      .eq("id", eventId);

    if (error) {
      alert("現場情報の更新に失敗しました。");
      return;
    }

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

  async function deleteEvent(eventId) {
    if (!confirm("この現場を削除しますか？")) {
      return;
    }

    await removeEventPdf(eventId, false);

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      alert("現場削除に失敗しました。");
      return;
    }

    setEvents((prev) => {
      const next = prev.filter(
        (event) => event.id !== eventId
      );

      setSelectedEventId(next[0]?.id || "");

      return next;
    });
  }

  async function addSlot() {
    if (!selectedEvent) {
      alert("先に現場を選択してください");
      return;
    }

    const required = Number(newSlot.required);

    if (!required || required < 1) {
      alert("必要人数を1以上で入力してください");
      return;
    }

    const { data, error } = await supabase
      .from("event_slots")
      .insert({
        event_id: selectedEvent.id,
        section: newSlot.section,
        start_time: newSlot.time,
        required_count: required,
        stasen_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("セクション追加に失敗しました。");
      return;
    }

    const slot = {
      id: data.id,
      section: data.section,
      time: shortTime(data.start_time),
      required: Number(data.required_count),
      stasen: Number(data.stasen_count || 0),
      assigned: [],
      positions: {},
    };

    setEvents((prev) =>
      prev.map((event) =>
        event.id === selectedEvent.id
          ? {
              ...event,
              slots: [...event.slots, slot],
            }
          : event
      )
    );
  }

  async function updateSlot(eventId, slotId, patch) {
    const update = {};

    if ("section" in patch) {
      update.section = patch.section;
    }

    if ("time" in patch) {
      update.start_time = patch.time;
    }

    if ("required" in patch) {
      update.required_count = Number(patch.required);
    }

    if ("stasen" in patch) {
      update.stasen_count = Number(patch.stasen);
    }

    const { error } = await supabase
      .from("event_slots")
      .update(update)
      .eq("id", slotId);

    if (error) {
      console.error(error);
      alert("セクションの更新に失敗しました。");
      return;
    }

    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,

              slots: event.slots.map((slot) =>
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

  async function deleteSlot(eventId, slotId) {
    if (!confirm("この時間・セクションを削除しますか？")) {
      return;
    }

    const { error } = await supabase
      .from("event_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      alert("削除に失敗しました。");
      return;
    }

    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              slots: event.slots.filter(
                (slot) => slot.id !== slotId
              ),
            }
          : event
      )
    );
  }

  async function updateStaffPosition(
    eventId,
    slotId,
    staffId,
    position
  ) {
    const { error } = await supabase
      .from("assignments")
      .update({
        position: position || null,
      })
      .eq("slot_id", slotId)
      .eq("staff_id", staffId);

    if (error) {
      alert("ポジションの保存に失敗しました。");
      return;
    }

    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;

        return {
          ...event,

          slots: event.slots.map((slot) => {
            if (slot.id !== slotId) return slot;

            return {
              ...slot,

              positions: {
                ...(slot.positions || {}),
                [staffId]: position,
              },
            };
          }),
        };
      })
    );
  }

  function canWork(staffId, date, time) {
    const shift =
      shifts[`${staffId}|${date}`] || emptyShift;

    if (shift.status === "all") {
      return true;
    }

    if (
      shift.status === "time" &&
      shift.startHour
    ) {
      return shift.startHour <= time;
    }

    return false;
  }

  function canWorkOnDate(staffId, date) {
    const shift =
      shifts[`${staffId}|${date}`] || emptyShift;

    return (
      shift.status === "all" ||
      shift.status === "time"
    );
  }

  function getStaffAssignmentOnDate(staffId, date) {
    for (const event of events) {
      if (event.date !== date) continue;

      for (const slot of event.slots || []) {
        if ((slot.assigned || []).includes(staffId)) {
          return {
            eventId: event.id,
            slotId: slot.id,
            eventName: event.eventName,
            section: slot.section,
            time: slot.time,
          };
        }
      }
    }

    return null;
  }

  async function toggleAssignment(eventId, slotId, staffId) {
    const event = events.find(
      (item) => item.id === eventId
    );

    if (!event) return;

    const slot = event.slots.find(
      (item) => item.id === slotId
    );

    if (!slot) return;

    const alreadyHere =
      slot.assigned.includes(staffId);

    if (alreadyHere) {
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("slot_id", slotId)
        .eq("staff_id", staffId);

      if (error) {
        alert("配置解除に失敗しました。");
        return;
      }

      setEvents((prev) =>
        prev.map((item) => {
          if (item.id !== eventId) return item;

          return {
            ...item,

            slots: item.slots.map((itemSlot) => {
              if (itemSlot.id !== slotId) return itemSlot;

              const positions = {
                ...(itemSlot.positions || {}),
              };

              delete positions[staffId];

              return {
                ...itemSlot,

                assigned: itemSlot.assigned.filter(
                  (id) => id !== staffId
                ),

                positions,
              };
            }),
          };
        })
      );

      return;
    }

    const otherAssignment =
      getStaffAssignmentOnDate(staffId, event.date);

    if (otherAssignment) {
      alert(
        `このスタッフはすでに\n${otherAssignment.eventName} / ${otherAssignment.time} / ${otherAssignment.section}\nに配置されています。`
      );

      return;
    }

    const { error } = await supabase
      .from("assignments")
      .insert({
        event_id: eventId,
        slot_id: slotId,
        staff_id: staffId,
        work_date: event.date,
        position: null,
      });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        alert("このスタッフはすでに別の現場へ配置されています。");
      } else {
        alert("配置登録に失敗しました。");
      }

      return;
    }

    setEvents((prev) =>
      prev.map((item) => {
        if (item.id !== eventId) return item;

        return {
          ...item,

          slots: item.slots.map((itemSlot) =>
            itemSlot.id === slotId
              ? {
                  ...itemSlot,

                  assigned: [
                    ...itemSlot.assigned,
                    staffId,
                  ],
                }
              : itemSlot
          ),
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

  async function handlePdfUpload(eventId, file) {
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("PDFファイルを選択してください");
      return;
    }

    try {
      const existing = eventFiles[eventId];

      if (existing?.storage_path) {
        await supabase.storage
          .from("event-pdfs")
          .remove([existing.storage_path]);
      }

      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const storagePath = `${eventId}/${Date.now()}-${safeName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("event-pdfs")
          .upload(storagePath, file, {
            contentType: "application/pdf",
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: fileData, error: databaseError } =
        await supabase
          .from("event_files")
          .upsert(
            {
              event_id: eventId,
              file_name: file.name,
              storage_path: storagePath,
              uploaded_at: new Date().toISOString(),
            },
            {
              onConflict: "event_id",
            }
          )
          .select()
          .single();

      if (databaseError) {
        throw databaseError;
      }

      setEventFiles((prev) => ({
        ...prev,
        [eventId]: fileData,
      }));

      const { data, error } =
        await supabase.storage
          .from("event-pdfs")
          .createSignedUrl(storagePath, 3600);

      if (error) throw error;

      setEventPdfs((prev) => ({
        ...prev,
        [eventId]: data.signedUrl,
      }));
    } catch (error) {
      console.error(error);

      alert("PDFのアップロードに失敗しました。");
    }
  }

  async function loadEventPdf(eventId) {
    const file = eventFiles[eventId];

    if (!file?.storage_path) {
      setEventPdfs((prev) => {
        const next = {
          ...prev,
        };

        delete next[eventId];

        return next;
      });

      return;
    }

    const { data, error } =
      await supabase.storage
        .from("event-pdfs")
        .createSignedUrl(file.storage_path, 3600);

    if (error) {
      console.error(error);
      return;
    }

    setEventPdfs((prev) => ({
      ...prev,
      [eventId]: data.signedUrl,
    }));
  }

  async function removeEventPdf(eventId, ask = true) {
    if (
      ask &&
      !confirm("配置表PDFを削除しますか？")
    ) {
      return;
    }

    const file = eventFiles[eventId];

    if (!file) return;

    if (file.storage_path) {
      await supabase.storage
        .from("event-pdfs")
        .remove([file.storage_path]);
    }

    await supabase
      .from("event_files")
      .delete()
      .eq("event_id", eventId);

    setEventFiles((prev) => {
      const next = {
        ...prev,
      };

      delete next[eventId];

      return next;
    });

    setEventPdfs((prev) => {
      const next = {
        ...prev,
      };

      delete next[eventId];

      return next;
    });
  }

  const offRows = days
    .map((date) => {
      const assigned =
        assignedStaffIdsOnDate(date);

      return {
        date,

        people: staff.filter(
          (person) =>
            canWorkOnDate(person.id, date) &&
            !assigned.has(person.id)
        ),
      };
    })
    .filter((row) => row.people.length > 0);

  if (!authChecked) {
    return (
      <div className="centerScreen">
        読み込み中...
      </div>
    );
  }

  if (!session) {
    return (
      <main className="loginPage">
        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family:
              -apple-system,
              BlinkMacSystemFont,
              "Hiragino Sans",
              "Yu Gothic",
              sans-serif;
            background: #f3f4f6;
          }

          .loginPage,
          .centerScreen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .loginBox {
            width: 100%;
            max-width: 420px;
            background: white;
            border-radius: 16px;
            padding: 28px;
            box-shadow:
              0 10px 35px rgba(0, 0, 0, 0.08);
          }

          .loginBox h1 {
            margin: 0;
            font-size: 27px;
          }

          .loginBox p {
            color: #6b7280;
            margin-bottom: 22px;
          }

          .loginBox input {
            width: 100%;
            margin-bottom: 10px;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 9px;
            font-size: 16px;
          }

          .loginBox button {
            width: 100%;
            padding: 12px;
            border: 0;
            border-radius: 9px;
            background: #111827;
            color: white;
            font-weight: 800;
            cursor: pointer;
          }

          .loginError {
            margin-bottom: 10px;
            color: #b91c1c;
            font-size: 13px;
          }
        `}</style>

        <form
          className="loginBox"
          onSubmit={login}
        >
          <h1>3班現場割</h1>

          <p>管理者ログイン</p>

          <input
            type="email"
            placeholder="メールアドレス"
            value={loginEmail}
            onChange={(e) =>
              setLoginEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="パスワード"
            value={loginPassword}
            onChange={(e) =>
              setLoginPassword(e.target.value)
            }
            required
          />

          {loginError && (
            <div className="loginError">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn}
          >
            {loggingIn
              ? "ログイン中..."
              : "ログイン"}
          </button>
        </form>
      </main>
    );
  }

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
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .brand h1 {
          margin: 0;
          font-size: 21px;
        }

        .brand p {
          margin: 3px 0 0;
          color: #9ca3af;
          font-size: 11px;
        }

        .topActions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .month {
          border: 0;
          border-radius: 8px;
          padding: 9px;
          background: white;
        }

        .logout {
          border: 1px solid #4b5563;
          background: transparent;
          color: white;
          border-radius: 8px;
          padding: 8px 10px;
        }

        .tabs {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          padding: 10px 14px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }

        .tab {
          border: 0;
          border-radius: 8px;
          background: #eef0f3;
          padding: 8px 12px;
          font-weight: 700;
        }

        .tab.active {
          background: #111827;
          color: white;
        }

        .content {
          max-width: 1900px;
          margin: auto;
          padding: 14px;
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 14px;
        }

        h2,
        h3 {
          margin-top: 0;
        }

        .muted {
          color: #6b7280;
          font-size: 11px;
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
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        input,
        select {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 9px;
          background: white;
        }

        .loadingBar {
          position: fixed;
          z-index: 500;
          left: 0;
          right: 0;
          top: 0;
          background: #2563eb;
          color: white;
          text-align: center;
          font-size: 11px;
          padding: 3px;
        }

        .boardWrap {
          overflow: auto;
          height: calc(100vh - 180px);
          min-height: 500px;
          border: 1px solid #dfe3e8;
          border-radius: 10px;
          background: white;
        }

        .shiftTable {
          border-collapse: separate;
          border-spacing: 0;
          width: max-content;
          min-width: 100%;
        }

        .shiftTable th,
        .shiftTable td {
          border-right: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          padding: 3px;
          text-align: center;
          vertical-align: middle;
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
          z-index: 15 !important;
          width: 190px;
          min-width: 190px;
          text-align: left !important;
        }

        .dateCell {
          position: sticky;
          left: 0;
          z-index: 6;
          width: 190px;
          min-width: 190px;
          background: white;
          text-align: left !important;
          padding: 6px 8px !important;
        }

        .dateTop {
          display: flex;
          justify-content: space-between;
          gap: 6px;
        }

        .availableCount {
          font-size: 10px;
          color: #166534;
          font-weight: 800;
        }

        .requiredCount {
          margin-top: 2px;
          color: #b45309;
          font-size: 10px;
          font-weight: 800;
        }

        .eventMini {
          margin-top: 4px;
          padding: 4px;
          border-radius: 5px;
          background: #eff6ff;
          font-size: 9px;
        }

        .personHead {
          width: 78px;
          min-width: 78px;
          max-width: 78px;
          padding: 5px 2px !important;
        }

        .personName {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-size: 10px;
          line-height: 1.2;
          word-break: break-all;
        }

        .personMeta {
          margin-top: 2px;
          font-size: 8px;
          color: #6b7280;
        }

        .shiftCell {
          width: 78px;
          min-width: 78px;
          max-width: 78px;
        }

        .cellButton {
          width: 100%;
          min-height: 36px;
          border: 0;
          border-radius: 6px;
          font-weight: 800;
          font-size: 13px;
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

        .negotiatedMark {
          display: block;
          margin-top: 1px;
          font-size: 7px;
          line-height: 1.1;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .modalBack {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(17, 24, 39, 0.48);
        }

        .modal {
          width: min(460px, 100%);
          background: white;
          border-radius: 14px;
          padding: 18px;
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .closeBtn {
          border: 0;
          border-radius: 8px;
          background: #eef0f3;
          padding: 7px 10px;
        }

        .modalField {
          margin-top: 14px;
        }

        .modalField label {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
          font-weight: 800;
        }

        .modalField select {
          width: 100%;
        }

        .negotiationBox {
          margin-top: 16px;
          padding: 13px;
          border-radius: 10px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
        }

        .checkRow {
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 800;
        }

        .checkRow input {
          width: 18px;
          height: 18px;
        }

        .eventLayout {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 14px;
        }

        .eventList button {
          width: 100%;
          margin-bottom: 7px;
          padding: 10px;
          text-align: left;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
        }

        .eventList button.selected {
          background: #eff6ff;
          border-color: #2563eb;
        }

        .editForm {
          display: grid;
          grid-template-columns: 150px 1fr 1fr auto;
          gap: 8px;
        }

        .slot {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
        }

        .slotEdit {
          display: grid;
          grid-template-columns: 130px 110px 100px auto;
          gap: 7px;
        }

        .slotStats {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .stasenBox {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          background: #f3f4f6;
        }

        .stasenBox input {
          width: 85px;
          padding: 7px;
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
              minmax(150px, 1fr)
            );
          gap: 7px;
          margin-top: 10px;
        }

        .candidate {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          padding: 9px;
          text-align: left;
        }

        .candidate.assigned {
          background: #dcfce7;
          border-color: #86efac;
        }

        .hereText {
          display: block;
          margin-top: 3px;
          font-weight: 900;
          color: #15803d;
        }

        .positionSelect {
          width: 100%;
          margin-top: 6px;
          padding: 5px 4px;
          border: 1px solid #86efac;
          border-radius: 6px;
          background: white;
          font-size: 10px;
        }

        .warningMini {
          margin-top: 4px;
          color: #b91c1c;
          font-size: 9px;
          font-weight: 800;
        }

        .pdfViewer {
          width: 100%;
          height: 650px;
          margin-top: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
        }

        .staffGrid,
        .adminGrid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(230px, 1fr)
            );
          gap: 9px;
        }

        .staffCard,
        .adminCard {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 11px;
          border: 1px solid #e5e7eb;
          border-radius: 9px;
          background: white;
        }

        .offDate {
          margin-bottom: 14px;
        }

        .offList {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .offChip {
          padding: 6px 9px;
          border-radius: 999px;
          background: #f3f4f6;
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .content {
            padding: 9px;
          }

          .eventLayout {
            grid-template-columns: 1fr;
          }

          .editForm,
          .slotEdit {
            grid-template-columns: 1fr;
          }

          .dateHead,
          .dateCell {
            width: 160px;
            min-width: 160px;
          }

          .personHead,
          .shiftCell {
            width: 70px;
            min-width: 70px;
            max-width: 70px;
          }

          .pdfViewer {
            height: 500px;
          }
        }
      `}</style>

      {loading && (
        <div className="loadingBar">
          読み込み中...
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          <h1>3班現場割</h1>

          <p>
            イベントスタッフ シフト・配置管理
          </p>
        </div>

        <div className="topActions">
          <input
            className="month"
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);

              setNewEvent((prev) => ({
                ...prev,
                date: `${e.target.value}-01`,
              }));
            }}
          />

          <button
            className="logout"
            onClick={logout}
          >
            ログアウト
          </button>
        </div>
      </header>

      <nav className="tabs">
        {[
          ["board", "月間シフト"],
          ["events", "現場管理・配置"],
          ["off", "OFF一覧"],
          ["staff", "スタッフ管理"],
          ["admins", "管理者管理"],
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
            <h2>
              {month.replace("-", "年")}月 シフト表
            </h2>

            <div className="boardWrap">
              <table className="shiftTable">
                <thead>
                  <tr>
                    <th className="dateHead">
                      日付・現場
                    </th>

                    {staff.map((person) => (
                      <th
                        key={person.id}
                        className="personHead"
                      >
                        <span className="personName">
                          {person.name}
                        </span>

                        <div className="personMeta">
                          {person.grade === "F"
                            ? "F"
                            : `${person.grade}年`}
                          {" / "}
                          R{person.rank}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {days.map((date) => {
                    const availablePeople =
                      staff.filter((person) =>
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
                            ] || emptyShift
                          ).status === "all"
                      ).length;

                    const timeCount =
                      availablePeople.length -
                      allCount;

                    const dateEvents =
                      eventsByDate[date] || [];

                    const totalRequired =
                      dateEvents.reduce(
                        (total, event) =>
                          total +
                          event.slots.reduce(
                            (slotTotal, slot) =>
                              slotTotal +
                              Number(
                                slot.required
                              ),
                            0
                          ),
                        0
                      );

                    return (
                      <tr key={date}>
                        <td className="dateCell">
                          <div className="dateTop">
                            <strong>
                              {date
                                .slice(5)
                                .replace("-", "/")}
                            </strong>

                            <span className="availableCount">
                              稼働可能{" "}
                              {
                                availablePeople.length
                              }
                              人
                            </span>
                          </div>

                          <div className="requiredCount">
                            現場必要{" "}
                            {totalRequired}人
                          </div>

                          <div className="muted">
                            ⭕️ {allCount}
                            {" / "}
                            時間 {timeCount}
                          </div>

                          {dateEvents.map(
                            (event) => {
                              const eventRequired =
                                event.slots.reduce(
                                  (
                                    total,
                                    slot
                                  ) =>
                                    total +
                                    Number(
                                      slot.required
                                    ),
                                  0
                                );

                              return (
                                <div
                                  className="eventMini"
                                  key={event.id}
                                >
                                  <strong>
                                    {
                                      event.eventName
                                    }
                                  </strong>
                                  {" "}
                                  必要
                                  {eventRequired}人
                                </div>
                              );
                            }
                          )}
                        </td>

                        {staff.map((person) => {
                          const key =
                            `${person.id}|${date}`;

                          const shift =
                            shifts[key] ||
                            emptyShift;

                          const admin =
                            admins.find(
                              (admin) =>
                                admin.id ===
                                shift.negotiatedBy
                            );

                          return (
                            <td
                              key={person.id}
                              className="shiftCell"
                            >
                              <button
                                className={`cellButton ${statusClass(
                                  shift.status
                                )}`}
                                onClick={() =>
                                  setEditingCell({
                                    staffId:
                                      person.id,
                                    date,
                                  })
                                }
                              >
                                <span>
                                  {compactLabel(
                                    shift
                                  )}
                                </span>

                                {shift.negotiated && (
                                  <span className="negotiatedMark">
                                    交渉済
                                    {admin
                                      ? `:${admin.name}`
                                      : ""}
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {editingCell &&
          (() => {
            const person = staff.find(
              (person) =>
                person.id ===
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
                  setEditingCell(null)
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
                        {editingCell.date}
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

                  <div className="modalField">
                    <label>
                      勤務状況
                    </label>

                    <select
                      value={shift.status}
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
                          }
                        );
                      }}
                    >
                      <option value="none">
                        未提出
                      </option>

                      <option value="all">
                        ⭕️ 終日勤務可能
                      </option>

                      <option value="time">
                        時間指定
                      </option>

                      <option value="undecided">
                        🔺 未定
                      </option>

                      <option value="off">
                        ❌ 勤務不可
                      </option>
                    </select>
                  </div>

                  {shift.status ===
                    "time" && (
                    <div className="modalField">
                      <label>
                        勤務開始時間
                      </label>

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
                              value={hour}
                            >
                              {hour}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  <div className="negotiationBox">
                    <label className="checkRow">
                      <input
                        type="checkbox"
                        checked={
                          !!shift.negotiated
                        }
                        onChange={(e) =>
                          setShift(
                            editingCell.staffId,
                            editingCell.date,
                            {
                              negotiated:
                                e.target
                                  .checked,

                              negotiatedBy:
                                e.target
                                  .checked
                                  ? shift.negotiatedBy
                                  : "",
                            }
                          )
                        }
                      />

                      交渉済み
                    </label>

                    {shift.negotiated && (
                      <div className="modalField">
                        <label>
                          交渉した管理者
                        </label>

                        <select
                          value={
                            shift.negotiatedBy ||
                            ""
                          }
                          onChange={(e) =>
                            setShift(
                              editingCell.staffId,
                              editingCell.date,
                              {
                                negotiatedBy:
                                  e.target
                                    .value,
                              }
                            )
                          }
                        >
                          <option value="">
                            選択してください
                          </option>

                          {admins.map(
                            (admin) => (
                              <option
                                key={
                                  admin.id
                                }
                                value={
                                  admin.id
                                }
                              >
                                {
                                  admin.name
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        {tab === "events" && (
          <>
            <div className="card">
              <h2>現場登録</h2>

              <div className="formRow">
                <input
                  type="date"
                  value={newEvent.date}
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
                <h3>登録現場</h3>

                {events.length === 0 && (
                  <div className="muted">
                    この月の現場はまだありません。
                  </div>
                )}

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
                        {event.eventName}
                      </strong>

                      <div className="muted">
                        {event.venueName}
                      </div>
                    </button>
                  ))}
              </div>

              <div>
                {selectedEvent && (
                  <>
                    <div className="card">
                      <h3>
                        現場情報編集
                      </h3>

                      <div className="editForm">
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
                      <h3>配置表PDF</h3>

                      <div className="muted">
                        この現場の配置表をアップロードすると、他の管理者も確認できます。
                      </div>

                      {eventFiles[
                        selectedEvent.id
                      ] && (
                        <div
                          style={{
                            marginTop:
                              8,
                          }}
                        >
                          現在：
                          {
                            eventFiles[
                              selectedEvent
                                .id
                            ].file_name
                          }
                        </div>
                      )}

                      <div
                        className="formRow"
                        style={{
                          marginTop:
                            10,
                        }}
                      >
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) =>
                            handlePdfUpload(
                              selectedEvent.id,
                              e.target.files?.[0]
                            )
                          }
                        />

                        {eventPdfs[
                          selectedEvent.id
                        ] && (
                          <>
                            <button
                              className="primary"
                              onClick={() =>
                                window.open(
                                  eventPdfs[
                                    selectedEvent
                                      .id
                                  ],
                                  "_blank"
                                )
                              }
                            >
                              配置表を見る
                            </button>

                            <button
                              className="danger"
                              onClick={() =>
                                removeEventPdf(
                                  selectedEvent.id
                                )
                              }
                            >
                              PDF削除
                            </button>
                          </>
                        )}
                      </div>

                      {eventPdfs[
                        selectedEvent.id
                      ] && (
                        <iframe
                          title="配置表PDF"
                          className="pdfViewer"
                          src={
                            eventPdfs[
                              selectedEvent.id
                            ]
                          }
                        />
                      )}
                    </div>

                    <div className="card">
                      <h3>
                        セクション追加
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
                                key={
                                  section
                                }
                                value={
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
                                value={hour}
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
                          onClick={addSlot}
                        >
                          追加
                        </button>
                      </div>
                    </div>

                    <div className="card">
                      <h3>配置</h3>

                      {selectedEvent.slots.length ===
                        0 && (
                        <div className="muted">
                          セクションを追加してください。
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
                          const visibleStaff =
                            staff.filter(
                              (person) => {
                                const assignedHere =
                                  slot.assigned.includes(
                                    person.id
                                  );

                                if (
                                  assignedHere
                                ) {
                                  return true;
                                }

                                if (
                                  !canWork(
                                    person.id,
                                    selectedEvent.date,
                                    slot.time
                                  )
                                ) {
                                  return false;
                                }

                                const assignment =
                                  getStaffAssignmentOnDate(
                                    person.id,
                                    selectedEvent.date
                                  );

                                return !assignment;
                              }
                            );

                          const stasen =
                            Number(
                              slot.stasen
                            ) || 0;

                          const totalPlaced =
                            slot.assigned
                              .length +
                            stasen;

                          const shortage =
                            Math.max(
                              0,
                              slot.required -
                                totalPlaced
                            );

                          return (
                            <div
                              className="slot"
                              key={slot.id}
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
                                          e.target
                                            .value,
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
                                        value={
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
                                          e.target
                                            .value,
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
                                        value={
                                          hour
                                        }
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
                                    slot.required
                                  }
                                  onChange={(e) =>
                                    updateSlot(
                                      selectedEvent.id,
                                      slot.id,
                                      {
                                        required:
                                          Number(
                                            e.target
                                              .value
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

                              <div className="stasenBox">
                                <strong>
                                  スタセン
                                </strong>

                                <input
                                  type="number"
                                  min="0"
                                  value={stasen}
                                  onChange={(e) =>
                                    updateSlot(
                                      selectedEvent.id,
                                      slot.id,
                                      {
                                        stasen:
                                          Math.max(
                                            0,
                                            Number(
                                              e.target
                                                .value
                                            ) ||
                                              0
                                          ),
                                      }
                                    )
                                  }
                                />

                                <span className="muted">
                                  人
                                </span>
                              </div>

                              <div className="slotStats">
                                <span className="muted">
                                  名簿{" "}
                                  {
                                    slot.assigned
                                      .length
                                  }
                                  人
                                  {" / "}
                                  スタセン{" "}
                                  {stasen}人
                                  {" / "}
                                  合計{" "}
                                  {
                                    totalPlaced
                                  }
                                  人
                                  {" / "}
                                  必要{" "}
                                  {
                                    slot.required
                                  }
                                  人
                                </span>

                                <strong
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
                                </strong>
                              </div>

                              <div className="candidateGrid">
                                {visibleStaff.map(
                                  (person) => {
                                    const assigned =
                                      slot.assigned.includes(
                                        person.id
                                      );

                                    const available =
                                      canWork(
                                        person.id,
                                        selectedEvent.date,
                                        slot.time
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
                                          <>
                                            <span className="hereText">
                                              ここ
                                            </span>

                                            {!available && (
                                              <div className="warningMini">
                                                現在のシフトでは勤務不可
                                              </div>
                                            )}

                                            <select
                                              className="positionSelect"
                                              value={
                                                slot.positions?.[
                                                  person.id
                                                ] ||
                                                ""
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              onChange={(e) => {
                                                e.stopPropagation();

                                                updateStaffPosition(
                                                  selectedEvent.id,
                                                  slot.id,
                                                  person.id,
                                                  e
                                                    .target
                                                    .value
                                                );
                                              }}
                                            >
                                              <option value="">
                                                ポジション選択
                                              </option>

                                              {POSITIONS.map(
                                                (
                                                  position
                                                ) => (
                                                  <option
                                                    key={
                                                      position
                                                    }
                                                    value={
                                                      position
                                                    }
                                                  >
                                                    {
                                                      position
                                                    }
                                                  </option>
                                                )
                                              )}
                                            </select>
                                          </>
                                        )}
                                      </button>
                                    );
                                  }
                                )}
                              </div>

                              {visibleStaff.length ===
                                0 && (
                                <div
                                  className="muted"
                                  style={{
                                    marginTop:
                                      10,
                                  }}
                                >
                                  この枠に配置できるスタッフはいません。
                                </div>
                              )}
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

            <div className="muted">
              稼働可能だが、どの現場にも配置されていないスタッフです。
            </div>

            {offRows.length === 0 && (
              <div
                className="muted"
                style={{
                  marginTop: 15,
                }}
              >
                現在OFF対象者はいません。
              </div>
            )}

            {offRows.map(
              ({ date, people }) => (
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

              <div className="formRow">
                <input
                  placeholder="名前"
                  value={newStaff.name}
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      name:
                        e.target.value,
                    })
                  }
                />

                <select
                  value={newStaff.grade}
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
                  value={newStaff.rank}
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
                    key={person.id}
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
                          : `${person.grade}年`}
                        {" / "}
                        ランク{" "}
                        {person.rank}
                        {" / "}
                        {person.gender}
                      </div>
                    </div>

                    <button
                      className="danger"
                      onClick={() =>
                        deleteStaff(
                          person
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

        {tab === "admins" && (
          <>
            <div className="card">
              <h2>
                管理者管理
              </h2>

              <div className="muted">
                交渉担当者として選択する管理者名簿です。
              </div>

              <div
                className="formRow"
                style={{
                  marginTop: 12,
                }}
              >
                <input
                  placeholder="管理者名"
                  value={newAdmin}
                  onChange={(e) =>
                    setNewAdmin(
                      e.target.value
                    )
                  }
                />

                <button
                  className="primary"
                  onClick={addAdmin}
                >
                  管理者を追加
                </button>
              </div>
            </div>

            <div className="adminGrid">
              {admins.map(
                (admin) => (
                  <div
                    className="adminCard"
                    key={admin.id}
                  >
                    <div>
                      <strong>
                        {
                          admin.name
                        }
                      </strong>

                      {admin.id ===
                        session?.user
                          ?.id && (
                        <div className="muted">
                          ログイン中
                        </div>
                      )}
                    </div>

                    <button
                      className="danger"
                      onClick={() =>
                        deleteAdmin(
                          admin
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
