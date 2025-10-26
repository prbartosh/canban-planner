import React, { useState } from "react";

export default function DayColumn({
  dayLabel, dateLabel, dayKey, cards, roles,
  onDropSourceToDay, onMoveScheduledToDay,
  onToggleDone, onNudge, onUpdateCard
}){
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({title:"", desc:"", roleId:""});

  function onDragOver(e){
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDrop(e){
    e.preventDefault();
    const data = e.dataTransfer.getData("application/x-task");
    if(!data) return;
    const item = JSON.parse(data);
    if(item.kind==="source"){
      onDropSourceToDay(item.roleId, item.taskId, dayKey);
    } else if(item.kind==="scheduled"){
      onMoveScheduledToDay(item.dayKey, item.idx, dayKey);
    }
  }

  function startEdit(card){
    setEditingId(card.id);
    setDraft({title:card.title, desc:card.desc||"", roleId: card.roleId || ""});
  }
  function saveEdit(idx){
    const title = (draft.title || "").trim() || "Untitled";
    onUpdateCard(dayKey, idx, {title, desc:draft.desc||"", roleId:draft.roleId || null});
    setEditingId(null);
  }

  return (
    <section className="col" style={{scrollSnapAlign:"start"}}>
      <div className="col-header">
        <div>
          <div className="col-title">{dayLabel}</div>
          <div className="col-sub">{dateLabel}</div>
        </div>
      </div>

      <div className="dropzone" onDragOver={onDragOver} onDrop={onDrop}>
        {cards.map((card, idx)=>(
          <article key={card.id} className={`card ${card.done?'done':''}`} draggable
                   onDragStart={(e)=>{ e.dataTransfer.setData("application/x-task", JSON.stringify({kind:"scheduled", dayKey, idx})); e.dataTransfer.effectAllowed="move";}}
                   title="Drag between days or drop onto role to return">
            <input type="checkbox" checked={card.done} onChange={()=>onToggleDone(dayKey, idx)} />
            {editingId===card.id ? (
              <div style={{display:"grid", gap:6, width:"100%"}}>
                <input className="input sm" value={draft.title} onChange={e=>setDraft(s=>({...s, title:e.target.value}))} placeholder="Title"/>
                <textarea className="input sm" rows={3} value={draft.desc} onChange={e=>setDraft(s=>({...s, desc:e.target.value}))} placeholder="Description (optional)"/>
                <select className="select sm" value={draft.roleId || ""} onChange={e=>setDraft(s=>({...s, roleId:e.target.value}))}>
                  <option value="">(no role)</option>
                  {roles.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            ) : (
              <div style={{display:"grid", gap:6}}>
                <span className="title">{card.title}</span>
                {card.desc && <div style={{fontSize:12, color:"var(--muted)", whiteSpace:"pre-wrap"}}>{card.desc}</div>}
                <span className="role-tag">{roles.find(r=>r.id===card.roleId)?.name || "No role"}</span>
              </div>
            )}
            <div className="tools">
              {editingId===card.id ? (
                <>
                  <button className="icon-btn" onClick={()=>saveEdit(idx)} title="Save">💾</button>
                  <button className="icon-btn" onClick={()=>setEditingId(null)} title="Cancel">↩</button>
                </>
              ) : (
                <>
                  <button className="icon-btn" onClick={()=>onNudge(dayKey, idx, -1)} title="Up">↑</button>
                  <button className="icon-btn" onClick={()=>onNudge(dayKey, idx, +1)} title="Down">↓</button>
                  <button className="icon-btn" onClick={()=>startEdit(card)} title="Edit">✎</button>
                  {/* Brak przycisku 🗑 na tablicy */}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
