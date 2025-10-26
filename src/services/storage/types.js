// src/services/storage/types.js
/**
 * @typedef {{ type: 'none'|'daily'|'weekdays'|'custom', days?: number[] }} Routine
 * @typedef {{ id:string, name:string }} Role
 * @typedef {{ id:string, roleId:string, title:string, desc?:string,
 *            status:'to_be_assigned'|'assigned', routine:Routine }} Task
 * @typedef {{ columns: Record<string, Array<{id:string,title:string,desc?:string,roleId?:string|null,sourceTaskId?:string|null,done:boolean}>> }} WeekData
 * @typedef {{ accent:string }} Settings
 */

/**
 * @typedef StorageAdapter
 * @prop {() => Promise<void>} init
 * @prop {() => Promise<Settings>} getSettings
 * @prop {(s:Settings)=> Promise<void>} setSettings
 * @prop {() => Promise<Array<Role & {tasks:Task[]}>>} getRolesWithTasks
 * @prop {(name:string)=> Promise<Role>} addRole
 * @prop {(id:string,name:string)=> Promise<void>} updateRole
 * @prop {(id:string)=> Promise<void>} deleteRoleCascade
 * @prop {(roleId:string, data: Omit<Task,'id'|'roleId'>)=> Promise<Task>} addTask
 * @prop {(taskId:string, patch: Partial<Omit<Task,'id'|'roleId'>>)=> Promise<void>} updateTask
 * @prop {(taskId:string)=> Promise<void>} deleteTask
 * @prop {(weekKey:string)=> Promise<WeekData>} getWeek
 * @prop {(weekKey:string, data:WeekData)=> Promise<void>} setWeek
 */
export {};
