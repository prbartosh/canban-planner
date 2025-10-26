import { useEffect, useMemo, useState } from "react";
import { ACCENTS, defaultAccent } from "../config/theme";
import { LS } from "../utils/storage";
import { addDays, mondayOfNextWeek, today, weekKey as wkKeyFn, ymd } from "../utils/date";

/** Hook trzyma cały stan i operacje aplikacji */
export default function usePlanner(){
  // UI / theme
  const [accent, setAccent] = useState(LS.getJSON("settings:accent", defaultAccent));
  useEffect(()=>{ 
    document.documentElement.style.setProperty("--accent", accent);
    LS.setJSON("settings:accent", accent);
  },[accent]);

  // Sidebar (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Roles + tasks
  const [roles, setRoles] = useState(LS.getJSON("roles", []));
  useEffect(()=> LS.setJSON("roles", roles), [roles]);

  // Week / board
  const [weekStart, setWeekStart] = useState(mondayOfNextWeek(today));
  const weekLabel = wkKeyFn(weekStart);

  const emptyColumns = useMemo(()=>{
    const obj = {};
    for(let i=0;i<7;i++) obj[ymd(addDays(weekStart,i))] = [];
    return obj;
  },[weekStart]);

  const [columns, setColumns] = useState(LS.getJSON(`week:${weekLabel}`, {columns: emptyColumns}).columns);
  useEffect(()=>{
    const saved = LS.getJSON(`week:${weekLabel}`, null);
    setColumns(saved?.columns ?? emptyColumns);
    // eslint-disable-next-line
  }, [weekLabel]);
  useEffect(()=>{ LS.setJSON(`week:${weekLabel}`, {columns}); },[columns, weekLabel]);

  // Compare previous week
  const [compare, setCompare] = useState(false);
  function getPrevSummary(){
    const prevKey = wkKeyFn(addDays(weekStart,-7));
    const prev = LS.getJSON(`week:${prevKey}`, null);
    return quickSummary(prev);
  }
  function quickSummary(weekObj){
    if(!weekObj) return {done:0,total:0,pct:0};
    const entries = Object.values(weekObj.columns||{});
    let done=0,total=0;
    entries.forEach(arr => { total += arr.length; done += arr.filter(t=>t.done).length; });
    return {done,total,pct: total? Math.round(100*done/total):0};
  }

  // Stats & helpers
  function dayStats(dayKey){
    const arr = columns[dayKey] ?? [];
    const total = arr.length;
    const done = arr.filter(t=>t.done).length;
    return {done, total, pct: total? Math.round(100*done/total): 0};
  }
  function shiftWeek(delta){ setWeekStart(addDays(weekStart, 7*delta)); }

  // ---- Roles ops ----
  function addRole(name){
    if(!name?.trim()) return;
    setRoles(r => [...r, {id: `r_${Date.now()}`, name: name.trim(), tasks: []}]);
  }
  function editRole(id, name){
    setRoles(rs => rs.map(r => r.id===id ? {...r, name: name?.trim() || r.name} : r));
  }
  function removeRoleCascade(id){
    setRoles(rs => rs.filter(r=>r.id!==id));
    // cascade remove cards with that role
    setColumns(cols=>{
      const next = {...cols};
      Object.keys(next).forEach(day=>{ next[day] = (next[day]||[]).filter(card => card.roleId !== id); });
      return next;
    });
  }

  // ---- Tasks ops ----
  function addTask(roleId, {title, desc="", routine={type:"none"}}){
    if(!title?.trim() || !roleId) return;
    setRoles(rs => rs.map(r=>{
      if(r.id!==roleId) return r;
      const task = { id:`t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, title:title.trim(), desc: desc.trim(), status:"to_be_assigned", routine };
      return {...r, tasks:[...r.tasks, task]};
    }));
  }
  function editTask(roleId, taskId, patch){
    setRoles(rs => rs.map(r=>{
      if(r.id!==roleId) return r;
      const tasks = r.tasks.map(t => t.id!==taskId ? t : {...t, ...patch, title: (patch.title?.trim() ?? t.title), desc: (patch.desc?.trim() ?? t.desc)});
      return {...r, tasks};
    }));
  }
  function deleteTaskCascade(roleId, taskId){
    setRoles(rs => rs.map(r => r.id!==roleId ? r : {...r, tasks: r.tasks.filter(t=>t.id!==taskId)}));
    setColumns(cols=>{
      const next = {...cols};
      Object.keys(next).forEach(day=>{ next[day] = (next[day]||[]).filter(c => c.sourceTaskId !== taskId); });
      return next;
    });
  }

  // ---- Board ops & DnD ----
  function dropSourceToDay(roleId, taskId, dayKey){
    const role = roles.find(r=>r.id===roleId); if(!role) return;
    const src = role.tasks.find(t=>t.id===taskId); if(!src) return;
    const scheduled = { 
      id:`s_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      title:src.title, desc: src.desc || "",
      roleId:role.id, sourceTaskId: src.id, done:false 
    };
    setColumns(cols=> ({ ...cols, [dayKey]: [...(cols[dayKey]||[]), scheduled] }));
    // mark as assigned
    setRoles(rs => rs.map(r=>{
      if(r.id!==role.id) return r;
      return {...r, tasks: r.tasks.map(t=> t.id===src.id ? {...t, status:"assigned"} : t)};
    }));
  }

  function moveScheduledToDay(fromDayKey, index, toDayKey){
    setColumns(cols => {
      const from = [...(cols[fromDayKey]||[])];
      const [moved] = from.splice(index, 1);
      if(!moved) return cols;
      const to = [...(cols[toDayKey]||[]), moved];
      return {...cols, [fromDayKey]: from, [toDayKey]: to};
    });
  }

  function returnScheduledToRole(dayKey, index, roleId){
    const card = (columns[dayKey]||[])[index];
    if(!card || !card.sourceTaskId) return;
    const role = roles.find(r=>r.id===roleId);
    if(!role) return;
    const task = role.tasks.find(t=>t.id===card.sourceTaskId);
    if(!task) return; // only back to original role & existing task

    // flip status
    setRoles(rs => rs.map(r=>{
      if(r.id!==roleId) return r;
      return {...r, tasks: r.tasks.map(t=> t.id===task.id ? {...t, status:"to_be_assigned"} : t)};
    }));
    // remove all instances of that sourceTaskId in current week
    setColumns(cols=>{
      const next = {...cols};
      Object.keys(next).forEach(day=>{ next[day] = (next[day]||[]).filter(c => c.sourceTaskId !== card.sourceTaskId); });
      return next;
    });
  }

  function toggleDone(dayKey, index){
    setColumns(cols=>{
      const arr = [...cols[dayKey]];
      arr[index] = {...arr[index], done: !arr[index].done};
      return {...cols, [dayKey]: arr};
    });
  }
  function removeCard(dayKey, index){
    setColumns(cols=>{
      const arr = [...cols[dayKey]];
      arr.splice(index,1);
      return {...cols, [dayKey]: arr};
    });
  }
  function nudge(dayKey, index, dir){
    setColumns(cols=>{
      const arr = [...cols[dayKey]];
      const j = index+dir;
      if(j<0 || j>=arr.length) return cols;
      const [x] = arr.splice(index,1);
      arr.splice(j,0,x);
      return {...cols, [dayKey]: arr};
    });
  }
  function updateScheduledCard(dayKey, index, patch){
    setColumns(cols=>{
      const arr = [...cols[dayKey]];
      arr[index] = {...arr[index], ...patch};
      return {...cols, [dayKey]: arr};
    });
  }

  function seedRoutines(){
    const weekMap = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
    roles.forEach(r=>{
      r.tasks.forEach(t=>{
        const type = t.routine?.type || "none";
        if(type==="none") return;
        const pack = (d)=> weekMap[d].push({taskId:t.id, title:t.title, desc:t.desc||"", roleId:r.id});
        if(type==="daily"){ for(let d=0; d<7; d++) pack(d); return; }
        if(type==="weekdays"){ for(let d=0; d<5; d++) pack(d); return; }
        if(type==="custom"){ (t.routine.days||[]).forEach(pack); }
      });
    });
    setColumns(cols=>{
      const next = {...cols};
      for(let d=0; d<7; d++){
        const key = ymd(addDays(weekStart, d));
        const existing = next[key] || [];
        const toAdd = weekMap[d].map(x => ({
          id:`s_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, 
          title:x.title, desc:x.desc, roleId:x.roleId, sourceTaskId: x.taskId, done:false
        }));
        const titles = new Set(existing.map(e=>e.title));
        const filtered = toAdd.filter(t=>!titles.has(t.title));
        next[key] = [...existing, ...filtered];
      }
      return next;
    });
  }

  return {
    // state
    accent, setAccent, ACCENTS,
    sidebarOpen, setSidebarOpen,
    roles, setRoles,
    weekStart, setWeekStart, weekLabel,
    columns, setColumns,
    compare, setCompare,

    // helpers
    dayStats, shiftWeek, getPrevSummary,

    // role/task ops
    addRole, editRole, removeRoleCascade,
    addTask, editTask, deleteTaskCascade,

    // board ops
    dropSourceToDay, moveScheduledToDay, returnScheduledToRole,
    toggleDone, removeCard, nudge, updateScheduledCard,

    // features
    seedRoutines,
  };
}
