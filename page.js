"use client";
import { useState } from "react";

const initialStaff = [
  { id: 1, name: "沼田", role: "統括", status: "勤務可" },
  { id: 2, name: "スタッフA", role: "現場スタッフ", status: "勤務可" },
  { id: 3, name: "スタッフB", role: "現場スタッフ", status: "確認中" },
];
const shifts = [
  { time: "09:00", title: "設営・準備", people: ["沼田", "スタッフA"] },
  { time: "12:00", title: "開場準備", people: ["沼田", "スタッフA", "スタッフB"] },
  { time: "15:00", title: "入場対応", people: ["スタッフA", "スタッフB"] },
  { time: "18:00", title: "終演・撤収", people: ["沼田", "スタッフA"] },
];

export default function Home() {
  const [tab, setTab] = useState("board");
  const [staff, setStaff] = useState(initialStaff);
  const [eventName, setEventName] = useState("SHIFT BOARD テスト公演");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const addStaff = () => {
    if (!newName.trim()) return;
    setStaff([...staff, { id: Date.now(), name: newName.trim(), role: "現場スタッフ", status: "勤務可" }]);
    setNewName(""); setShowAdd(false);
  };

  return <main>
    <header className="topbar">
      <div className="brand"><div className="logo">S</div><div><h1>SHIFT BOARD</h1><span>イベントスタッフ管理</span></div></div>
      <button className="primary">＋ 新しいシフト</button>
    </header>
    <div className="layout">
      <aside>
        <button className={tab==="board"?"nav active":"nav"} onClick={()=>setTab("board")}>▦ シフトボード</button>
        <button className={tab==="staff"?"nav active":"nav"} onClick={()=>setTab("staff")}>♙ スタッフ</button>
        <button className={tab==="events"?"nav active":"nav"} onClick={()=>setTab("events")}>● イベント</button>
        <button className={tab==="settings"?"nav active":"nav"} onClick={()=>setTab("settings")}>⚙ 設定</button>
      </aside>
      <section className="content">
        {tab==="board" && <>
          <div className="hero"><div><p className="eyebrow">TODAY'S EVENT</p><h2>{eventName}</h2><p className="sub">2026年9月8日　｜　スタッフ配置・勤務状況を管理</p></div>
          <div className="summary"><div><strong>{staff.length}</strong><span>登録スタッフ</span></div><div><strong>4</strong><span>シフト</span></div></div></div>
          <h3>本日のシフト</h3>
          <div className="timeline">{shifts.map((s,i)=><div className="shift" key={i}><div className="time">{s.time}</div><div className="line"></div><div className="shiftcard"><h4>{s.title}</h4><div className="chips">{s.people.map(p=><span key={p}>{p}</span>)}</div></div></div>)}</div>
        </>}
        {tab==="staff" && <>
          <div className="sectionhead"><div><p className="eyebrow">STAFF</p><h2>スタッフ一覧</h2></div><button className="primary" onClick={()=>setShowAdd(true)}>＋ スタッフ追加</button></div>
          <div className="table"><div className="tr th"><span>名前</span><span>役割</span><span>勤務状況</span></div>{staff.map(s=><div className="tr" key={s.id}><span className="name">{s.name}</span><span>{s.role}</span><span className="status">{s.status}</span></div>)}</div>
        </>}
        {tab==="events" && <><p className="eyebrow">EVENT</p><h2>イベント管理</h2><div className="eventcard"><label>イベント名</label><input value={eventName} onChange={e=>setEventName(e.target.value)}/><p>ここでイベント名を変更できます。</p></div></>}
        {tab==="settings" && <><p className="eyebrow">SETTINGS</p><h2>設定</h2><div className="eventcard"><h3>Supabase連携</h3><p>次のステップでSupabaseのデータベースと接続します。</p></div></>}
      </section>
    </div>
    {showAdd && <div className="modalbg"><div className="modal"><h3>スタッフを追加</h3><input autoFocus placeholder="名前を入力" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addStaff()}/><div className="modalbuttons"><button className="secondary" onClick={()=>setShowAdd(false)}>キャンセル</button><button className="primary" onClick={addStaff}>追加する</button></div></div></div>}
  </main>;
}