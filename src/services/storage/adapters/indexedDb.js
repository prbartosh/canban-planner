// src/services/storage/adapters/indexedDb.js
import Dexie from 'dexie';

/** @type {import('../types').StorageAdapter} */
const adapter = (() => {
  const db = new Dexie('planner_db');
  db.version(1).stores({
    roles: 'id',                       // {id, name}
    tasks: 'id, roleId, status',       // {id, roleId, title, desc, status, routine}
    weeks: 'weekKey',                  // {weekKey, data}
    settings: 'key'                    // {key:'settings', data:{accent}}
  });

  async function init(){
    // migracja ze starego localStorage (jednorazowa)
    const hasAnyRole = (await db.roles.count()) > 0;
    const lsRolesRaw = localStorage.getItem('roles');
    const lsAccent = localStorage.getItem('settings:accent');
    const hasLS = !!(lsRolesRaw || lsAccent || Object.keys(localStorage).some(k=>k.startsWith('week:')));

    if(!hasAnyRole && hasLS){
      try{
        if(lsRolesRaw){
          const roles = JSON.parse(lsRolesRaw) || [];
          const flatTasks = [];
          for(const r of roles){
            await db.roles.put({id:r.id, name:r.name});
            for(const t of (r.tasks||[])){
              flatTasks.push({
                id: t.id, roleId: r.id, title: t.title, desc: t.desc||'',
                status: t.status || 'to_be_assigned',
                routine: t.routine || {type:'none'}
              });
            }
          }
          if(flatTasks.length) await db.tasks.bulkPut(flatTasks);
        }
        // weeks
        const weekKeys = Object.keys(localStorage).filter(k=>k.startsWith('week:'));
        for(const k of weekKeys){
          const val = JSON.parse(localStorage.getItem(k));
          await db.weeks.put({weekKey:k.replace('week:',''), data: val});
        }
        // settings
        const accent = lsAccent ? JSON.parse(lsAccent) : '#7c9aff';
        await db.settings.put({key:'settings', data:{accent}});
      } finally {
        // wyczyść stare dane, żeby nie myliło
        if(lsRolesRaw) localStorage.removeItem('roles');
        if(lsAccent) localStorage.removeItem('settings:accent');
        for(const k of Object.keys(localStorage).filter(k=>k.startsWith('week:'))){
          localStorage.removeItem(k);
        }
      }
    } else if(!hasAnyRole) {
      // inicjalne wartości (gdy nie ma nic)
      await db.settings.put({key:'settings', data:{accent:'#7c9aff'}});
    }
  }

  async function getSettings(){
    const row = await db.settings.get('settings');
    return row?.data ?? {accent:'#7c9aff'};
  }
  async function setSettings(s){ await db.settings.put({key:'settings', data:s}); }

  async function getRolesWithTasks(){
    const [roles, tasks] = await Promise.all([db.roles.toArray(), db.tasks.toArray()]);
    const byRole = new Map(roles.map(r=>[r.id, {...r, tasks:[]}]));
    for(const t of tasks){
      const r = byRole.get(t.roleId);
      if(r) r.tasks.push(t);
    }
    return Array.from(byRole.values());
  }

  async function addRole(name){
    const id = `r_${Date.now()}`;
    await db.roles.put({id, name});
    return {id, name};
  }
  async function updateRole(id, name){
    await db.roles.update(id, {name});
  }
  async function deleteRoleCascade(id){
    await db.roles.delete(id);
    await db.tasks.where('roleId').equals(id).delete();
    // Uwaga: kart w tygodniach nie dotykamy tu – robi to warstwa logiki (usePlanner)
  }

  async function addTask(roleId, data){
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const row = {...data, id, roleId, status: data.status || 'to_be_assigned', routine: data.routine || {type:'none'}};
    await db.tasks.put(row);
    return row;
  }
  async function updateTask(taskId, patch){
    await db.tasks.update(taskId, patch);
  }
  async function deleteTask(taskId){
    await db.tasks.delete(taskId);
  }

  async function getWeek(weekKey){
    const row = await db.weeks.get(weekKey);
    return row?.data ?? {columns:{}};
  }
  async function setWeek(weekKey, data){
    await db.weeks.put({weekKey, data});
  }

  return {
    init,
    getSettings, setSettings,
    getRolesWithTasks, addRole, updateRole, deleteRoleCascade,
    addTask, updateTask, deleteTask,
    getWeek, setWeek
  };
})();

export default adapter;
