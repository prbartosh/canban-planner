// src/services/storage/adapters/localStorage.js
/** @type {import('../types').StorageAdapter} */
const adapter = (() => {
  const get = (k, fb)=>{ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):fb; }catch{return fb;} };
  const set = (k, v)=> localStorage.setItem(k, JSON.stringify(v));

  async function init(){ /* no-op */ }

  async function getSettings(){ return {accent: get('settings:accent','#7c9aff')} }
  async function setSettings(s){ set('settings:accent', s.accent); }

  async function getRolesWithTasks(){ return get('roles', []); }
  async function addRole(name){
    const roles = get('roles', []);
    const r = {id:`r_${Date.now()}`, name, tasks:[]};
    set('roles', [...roles, r]); return r;
  }
  async function updateRole(id, name){
    const roles = get('roles', []);
    set('roles', roles.map(r=>r.id===id?{...r,name}:r));
  }
  async function deleteRoleCascade(id){
    const roles = get('roles', []).filter(r=>r.id!==id);
    set('roles', roles);
    // weeks cleanup robi warstwa logiki
  }
  async function addTask(roleId, data){
    const roles = get('roles', []);
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const task = {id, roleId, ...data};
    set('roles', roles.map(r=> r.id!==roleId? r : {...r, tasks:[...(r.tasks||[]), task]}));
    return task;
  }
  async function updateTask(taskId, patch){
    const roles = get('roles', []);
    set('roles', roles.map(r => ({...r, tasks:(r.tasks||[]).map(t=>t.id===taskId? {...t, ...patch}: t)})));
  }
  async function deleteTask(taskId){
    const roles = get('roles', []);
    set('roles', roles.map(r => ({...r, tasks:(r.tasks||[]).filter(t=>t.id!==taskId)})));
  }

  async function getWeek(weekKey){ return get(`week:${weekKey}`, {columns:{}}); }
  async function setWeek(weekKey, data){ set(`week:${weekKey}`, data); }

  return {
    init, getSettings, setSettings,
    getRolesWithTasks, addRole, updateRole, deleteRoleCascade,
    addTask, updateTask, deleteTask,
    getWeek, setWeek
  };
})();

export default adapter;
