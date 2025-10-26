// src/hooks/usePlanner.js
import { useEffect, useMemo, useState } from "react";
import storage from "../services/storage";
import { ACCENTS, defaultAccent } from "../config/theme";
import { addDays, mondayOfNextWeek, today, weekKey as wkKeyFn, ymd } from "../utils/date";

export default function usePlanner(){
  const [ready, setReady] = useState(false);

  // UI / theme
  const [accent, setAccent] = useState(defaultAccent);
  useEffect(()=>{ document.documentElement.style.setProperty("--accent", accent); },[accent]);
  useEffect(()=>{ (async()=>{
    await storage.init();
    const s = await storage.getSettings();
    setAccent(s.accent || defaultAccent);
    setReady(true);
  })(); },[]);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Roles + tasks (z bazy)
  const [roles, setRoles] = useState([]);

  // Week / board
  const [weekStart, setWeekStart] = useState(mondayOfNextWeek(today));
  const weekLabel = wkKeyFn(weekStart);
  const emptyColumns = useMemo(()=>{
    const obj = {};
    for(let i=0;i<7;i++) obj[ymd(addDays(weekStart,i))] = [];
    return obj;
  },[weekStart]);
  const [columns, setColumns] = useState(emptyColumns);

  // INITIAL LOAD roles + current week
  useEffect(()=>{ if(!ready) return; (async()=>{
      const [rs, wk] = await Promise.all([
        storage.getRolesWithTasks(),
        storage.getWeek(weekLabel)
      ]);
      setRoles(rs);
      setColumns(wk.columns && Object.keys(wk.columns).length ? wk.columns : emptyColumns);
  })(); },[ready, weekLabel]); // przeładowanie przy zmianie tygodnia

  // PERSIST
  useEffect(()=>{ if(!ready) return; storage.setSettings({accent}); },[ready, accent]);
  useEffect(()=>{ if(!ready) return; storage.setWeek(weekLabel, {columns}); },[ready, columns, weekLabel]);

  // Compare previous week
  const [compare, setCompare] = useState(false);
  function getPrevSummary(){
    // bierzemy z bazy tylko na potrzeby headera
    // (sync: nie trzymamy w stanie)
    return {done:0,total:0,pct:0}; // uproszczenie – możesz rozwinąć: await storage.getWeek(prevKey) i policzyć
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
  async function addRole(name){
    if(!name?.trim()) return;
    await storage.addRole(name.trim());
    setRoles(await storage.getRolesWithTasks());
  }
  async function editRole(id, name){
    await storage.updateRole(id, name?.trim() || '');
    setRoles(await storage.getRolesWithTasks());
  }
  async function removeRoleCascade(id){
    await storage.deleteRoleCascade(id);
    setRoles(await storage.getRolesWithTasks());
    // cascade na tablicy (aktualny tydzień)
    setColumns(cols=>{
      const next = {...cols};
      Object.keys(next).forEach(day=>{ next[day] = (next[day]||[]).filter(card => card.roleId !== id); });
      return next;
    });
  }

  // ---- Tasks ops ----
  async function addTask(roleId, {title, desc="", routine={type:"none"}}){
    if(!title?.trim() || !roleId) return;
    await storage.addTask(roleId, {title:title.trim(), desc:desc.trim(), status:'to_be_assigned', routine});
    setRoles(await storage.getRolesWithTasks());
  }
  async function editTask(roleId, taskId, patch){
    await storage.updateTask(taskId, patch);
    setRoles(await storage.getRolesWithTasks());
  }
  async function deleteTaskCascade(roleId, taskId){
    await storage.deleteTask(taskId);
    setRoles(await storage.getRolesWithTasks());
    // usuń wszystkie instancje kart z tego źródła w bieżącym tygodniu
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
    // mark as assigned w bazie + odświeżenie ról
    storage.updateTask(taskId, {status:'assigned'}).then(async()=> setRoles(await storage.getRolesWithTasks()));
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

  async function returnScheduledToRole(dayKey, index, roleId){
    const card = (columns[dayKey]||[])[index];
    if(!card || !card.sourceTaskId) return;
    const role = roles.find(r=>r.id===roleId); if(!role) return;
    const task = role.tasks.find(t=>t.id===card.sourceTaskId); if(!task) return;

    await storage.updateTask(task.id, {status:'to_be_assigned'});

    // usuń wszystkie instancje tej karty z bieżącego tygodnia
    setColumns(cols=>{
      const next = {...cols};
      Object.keys(next).forEach(day=>{ next[day] = (next[day]||[]).filter(c => c.sourceTaskId !== card.sourceTaskId); });
      return next;
    });

    setRoles(await storage.getRolesWithTasks());
  }

  function toggleDone(dayKey, index){
    setColumns(cols=>{
      const arr = [...cols[dayKey]];
      arr[index] = {...arr[index], done: !arr[index].done};
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
    toggleDone, nudge, updateScheduledCard,

    // features
    seedRoutines,
  };
}
