const { app, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

function openDb(){
  const file = path.join(app.getPath('userData'), 'planner.db');
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      roleId TEXT NOT NULL,
      title TEXT NOT NULL,
      desc TEXT,
      status TEXT NOT NULL,
      routine TEXT NOT NULL,           -- JSON
      FOREIGN KEY(roleId) REFERENCES roles(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS weeks (
      weekKey TEXT PRIMARY KEY,
      data TEXT NOT NULL               -- JSON
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL               -- JSON
    );
  `);
  return db;
}

function id(prefix){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

function registerStorageIPC(){
  const db = openDb();

  const q = {
    getSettings(){
      const row = db.prepare(`SELECT data FROM settings WHERE key='settings'`).get();
      return row ? JSON.parse(row.data) : { accent: '#7c9aff' };
    },
    setSettings(s){
      db.prepare(`INSERT INTO settings(key,data) VALUES('settings', @data)
                  ON CONFLICT(key) DO UPDATE SET data=@data`)
        .run({ data: JSON.stringify(s) });
      return true;
    },

    async getRolesWithTasks(){
      const roles = db.prepare(`SELECT id,name FROM roles`).all();
      const tasks = db.prepare(`SELECT * FROM tasks`).all();
      const byRole = new Map(roles.map(r=>[r.id, {...r, tasks: []}]));
      for(const t of tasks){
        const r = byRole.get(t.roleId);
        if(r){
          r.tasks.push({
            ...t,
            routine: JSON.parse(t.routine || '{"type":"none"}')
          });
        }
      }
      return Array.from(byRole.values());
    },

    addRole(name){
      const rid = id('r');
      db.prepare(`INSERT INTO roles(id,name) VALUES(@id,@name)`)
        .run({id: rid, name});
      return { id: rid, name };
    },
    updateRole(id, name){
      db.prepare(`UPDATE roles SET name=@name WHERE id=@id`).run({id, name});
      return true;
    },
    deleteRoleCascade(id){
      db.prepare(`DELETE FROM roles WHERE id=@id`).run({id});
      // tasks znikną przez ON DELETE CASCADE
      return true;
    },

    addTask(roleId, data){
      const tid = id('t');
      const row = {
        id: tid,
        roleId,
        title: data.title,
        desc: data.desc || '',
        status: data.status || 'to_be_assigned',
        routine: JSON.stringify(data.routine || {type:'none'})
      };
      db.prepare(`INSERT INTO tasks(id,roleId,title,desc,status,routine)
                  VALUES(@id,@roleId,@title,@desc,@status,@routine)`).run(row);
      return { ...row, id: tid };
    },
    updateTask(taskId, patch){
      // budujemy SET dynamicznie
      const sets = [];
      const args = { id: taskId };
      if(patch.title!=null){ sets.push('title=@title'); args.title = patch.title; }
      if(patch.desc!=null){ sets.push('desc=@desc'); args.desc = patch.desc; }
      if(patch.status!=null){ sets.push('status=@status'); args.status = patch.status; }
      if(patch.routine!=null){ sets.push('routine=@routine'); args.routine = JSON.stringify(patch.routine); }
      if(!sets.length) return true;
      db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id=@id`).run(args);
      return true;
    },
    deleteTask(taskId){
      db.prepare(`DELETE FROM tasks WHERE id=@id`).run({id: taskId});
      return true;
    },

    getWeek(weekKey){
      const row = db.prepare(`SELECT data FROM weeks WHERE weekKey=@k`).get({k: weekKey});
      return row ? JSON.parse(row.data) : { columns: {} };
    },
    setWeek(weekKey, data){
      db.prepare(`INSERT INTO weeks(weekKey,data) VALUES(@k,@d)
                  ON CONFLICT(weekKey) DO UPDATE SET data=@d`)
        .run({ k: weekKey, d: JSON.stringify(data) });
      return true;
    },
  };

  ipcMain.handle('storage:call', async (_evt, { fn, args = [] }) => {
    if(!(fn in q)) throw new Error(`Unknown storage fn: ${fn}`);
    const res = await q[fn](...args);
    return res;
  });
}

module.exports = { registerStorageIPC };
