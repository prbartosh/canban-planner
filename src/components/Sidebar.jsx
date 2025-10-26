import React, { useState } from "react";
import { fullDay, dayNames } from "../utils/date";

export default function Sidebar({
  roles,
  sidebarOpen, setSidebarOpen,
  addRole, editRole, removeRoleCascade,
  addTask, editTask, deleteTaskCascade,
  returnScheduledToRole // uses dataTransfer from drop
}){
  const [newRole, setNewRole] = useState("");

  // role edit state
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleEditName, setRoleEditName] = useState("");

  // task new
  const [taskRole, setTaskRole] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [routineType, setRoutineType] = useState("none");
  const [routineDays, setRoutineDays] = useState([0,1,2,3,4]);

  // task edit state
  const [editingTask, setEditingTask] = useState(null); // {roleId, taskId}
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editRoutineType, setEditRoutineType] = useState("none");
  const [editRoutineDays, setEditRoutineDays] = useState([]);

  const [hoverRoleId, setHoverRoleId] = useState(null);

  function handleAddRole(){
    if(!newRole.trim()) return;
    addRole(newRole.trim());
    setNewRole("");
  }
  function startEditRole(r){ setEditingRoleId(r.id); setRoleEditName(r.name); }
  function saveEditRole(){ if(!editingRoleId) return; editRole(editingRoleId, roleEditName); setEditingRoleId(null); }
  function cancelEditRole(){ setEditingRoleId(null); }

  function handleAddTask(){
    if(!newTaskTitle.trim() || !taskRole) return;
    const routine = routineType==="none" ? {type:"none"} :
                    routineType==="custom" ? {type:"custom", days:[...routineDays]} :
                    {type:routineType};
    addTask(taskRole, {title:newTaskTitle, desc:newTaskDesc, routine});
    setNewTaskTitle(""); setNewTaskDesc("");
  }

  function startEditTask(roleId, task){
    setEditingTask({roleId, taskId: task.id});
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.desc || "");
    setEditRoutineType(task.routine?.type || "none");
    setEditRoutineDays(task.routine?.days || []);
  }
  function saveEditTask(){
    if(!editingTask) return;
    const routine =
      editRoutineType==="none" ? {type:"none"} :
      editRoutineType==="custom" ? {type:"custom", days:[...editRoutineDays]} :
      {type: editRoutineType};
    editTask(editingTask.roleId, editingTask.taskId, {title:editTaskTitle, desc:editTaskDesc, routine});
    setEditingTask(null);
  }
  function cancelEditTask(){ setEditingTask(null); }

  function onDragStartSource(ev, roleId, taskId){
    ev.dataTransfer.setData("application/x-task", JSON.stringify({kind:"source", roleId, taskId}));
    ev.dataTransfer.effectAllowed = "copy";
  }

  function onDropToRole(ev, roleId){
    ev.preventDefault();
    setHoverRoleId(null);
    const data = ev.dataTransfer.getData("application/x-task");
    if(!data) return;
    const item = JSON.parse(data);
    if(item.kind==="scheduled"){
      // pass to controller
      returnScheduledToRole(item.dayKey, item.idx, roleId);
    }
  }

  return (
    <aside className={`glass sidebar ${sidebarOpen ? 'open' : ''}`}>
      {/* Add role */}
      <div>
        <h3 style={{margin:"0 0 8px 0"}}>Roles</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
          <input className="input" placeholder="Add role (e.g. Student, Work, Fitness)"
                 value={newRole} onChange={e=>setNewRole(e.target.value)}/>
          <button className="btn" onClick={handleAddRole}>Add</button>
        </div>
      </div>

      <hr className="sep"/>

      {/* New task */}
      <div className="glass" style={{padding:12}}>
        <h3 style={{margin:"0 0 8px 0"}}>New task</h3>
        <input className="input" placeholder="Task title" value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} />
        <textarea className="input" style={{marginTop:8}} rows={3} placeholder="Task description (optional)" value={newTaskDesc} onChange={e=>setNewTaskDesc(e.target.value)} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8, marginTop:8}}>
          <select className="select" value={taskRole} onChange={e=>setTaskRole(e.target.value)}>
            <option value="">Select role</option>
            {roles.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="select" value={routineType} onChange={e=>setRoutineType(e.target.value)}>
            <option value="none">Routine: none</option>
            <option value="daily">Routine: daily</option>
            <option value="weekdays">Routine: weekdays</option>
            <option value="custom">Routine: custom</option>
          </select>
        </div>
        {routineType==="custom" && (
          <div className="day-grid" style={{marginTop:8}}>
            {fullDay.map((nm, i)=>(
              <label key={i} className={`btn-pill ${routineDays.includes(i)?'active':''}`} style={{textAlign:"center",cursor:"pointer"}}>
                <input type="checkbox" checked={routineDays.includes(i)} onChange={(e)=>{
                  setRoutineDays(d => e.target.checked ? [...d,i] : d.filter(x=>x!==i));
                }} style={{display:"none"}}/>
                {nm.slice(0,3)}
              </label>
            ))}
          </div>
        )}
        <div style={{marginTop:8, display:"flex", gap:8}}>
          <button className="btn" onClick={handleAddTask}>Save task</button>
        </div>
      </div>

      <hr className="sep"/>

      {/* Role list (+ drop target to return cards) */}
      <div>
        {roles.map(r=>{
          const visibleTasks = (r.tasks||[]).filter(t => t.status !== "assigned");
          const dropping = hoverRoleId===r.id ? "dropping" : "";
          return (
            <div key={r.id}
                 className={`role ${dropping}`}
                 onDragEnter={()=>setHoverRoleId(r.id)}
                 onDragLeave={()=>setHoverRoleId(null)}
                 onDragOver={(e)=>{e.preventDefault(); e.dataTransfer.dropEffect="move";}}
                 onDrop={(e)=>onDropToRole(e, r.id)}
            >
              <div className="row">
                {editingRoleId===r.id ? (
                  <>
                    <input className="input sm" value={roleEditName} onChange={e=>setRoleEditName(e.target.value)} />
                    <div className="inline-controls">
                      <button className="icon-btn" onClick={saveEditRole} title="Save">💾</button>
                      <button className="icon-btn" onClick={cancelEditRole} title="Cancel">↩</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 style={{margin:0}}>{r.name}</h4>
                    <div className="inline-controls">
                      <button className="icon-btn" onClick={()=>startEditRole(r)} title="Edit role">✎</button>
                      <button className="icon-btn" onClick={()=>removeRoleCascade(r.id)} title="Delete role">🗑</button>
                    </div>
                  </>
                )}
              </div>

              {visibleTasks.length===0 && <div style={{color:"var(--muted)",fontSize:13,marginTop:6}}>No tasks to assign</div>}
              {visibleTasks.map(t=>(
                <div key={t.id} className="task" draggable={editingTask?.taskId!==t.id}
                     onDragStart={(e)=>onDragStartSource(e, r.id, t.id)}
                     title={editingTask?.taskId===t.id ? "Editing…" : "Drag to a day"}>
                  {editingTask?.taskId===t.id ? (
                    <div style={{width:"100%"}}>
                      <input className="input sm" value={editTaskTitle} onChange={e=>setEditTaskTitle(e.target.value)} placeholder="Task title"/>
                      <textarea className="input sm" style={{marginTop:6}} rows={3} value={editTaskDesc} onChange={e=>setEditTaskDesc(e.target.value)} placeholder="Task description (optional)"/>
                      <div className="row" style={{marginTop:6}}>
                        <select className="select sm" value={editRoutineType} onChange={e=>setEditRoutineType(e.target.value)}>
                          <option value="none">routine: none</option>
                          <option value="daily">routine: daily</option>
                          <option value="weekdays">routine: weekdays</option>
                          <option value="custom">routine: custom</option>
                        </select>
                        <div className="inline-controls">
                          <button className="icon-btn" onClick={saveEditTask} title="Save">💾</button>
                          <button className="icon-btn" onClick={cancelEditTask} title="Cancel">↩</button>
                        </div>
                      </div>
                      {editRoutineType==="custom" && (
                        <div className="day-grid">
                          {fullDay.map((nm,i)=>(
                            <label key={i} className={`btn-pill ${editRoutineDays.includes(i)?'active':''}`} style={{textAlign:"center",cursor:"pointer"}}>
                              <input type="checkbox" checked={editRoutineDays.includes(i)} onChange={(e)=>{
                                setEditRoutineDays(d => e.target.checked ? [...d,i] : d.filter(x=>x!==i));
                              }} style={{display:"none"}}/>
                              {nm.slice(0,3)}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div style={{display:"grid", gap:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span className="dot"></span>
                          <div>
                            <div style={{fontWeight:500}}>{t.title}</div>
                            <div style={{fontSize:12,color:"var(--muted)"}}>
                              {t.routine?.type==="none" && "one-off"}
                              {t.routine?.type==="daily" && "daily"}
                              {t.routine?.type==="weekdays" && "weekdays"}
                              {t.routine?.type==="custom" && `custom (${(t.routine.days||[]).map(d=>dayNames[d]).join(",")})`}
                            </div>
                          </div>
                        </div>
                        {t.desc && <div style={{fontSize:12, color:"var(--muted)", whiteSpace:"pre-wrap"}}>{t.desc}</div>}
                      </div>
                      <div className="inline-controls">
                        <button className="icon-btn" onClick={()=>startEditTask(r.id, t)} title="Edit task">✎</button>
                        <button className="icon-btn" onClick={()=>deleteTaskCascade(r.id, t.id)} title="Delete task">🗑</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      

      
    </aside>
  );
}
