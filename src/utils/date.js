export const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
export const fullDay = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
export const today = new Date();

export function mondayOfWeek(d) {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // Mon=0 ... Sun=6
  dt.setDate(dt.getDate() - day);
  dt.setHours(0,0,0,0);
  return dt;
}
export function mondayOfNextWeek(from=new Date()){
  const mon = mondayOfWeek(from);
  mon.setDate(mon.getDate()+7);
  return mon;
}
export function addDays(date, days){
  const d = new Date(date); d.setDate(d.getDate()+days); return d;
}
export function ymd(d){ return d.toISOString().slice(0,10); }

export function weekKey(mondayDate){
  const d = new Date(mondayDate);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(),0,4));
  const week = 1 + Math.round(((t - firstThu)/86400000 - 3) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,"0")}`;
}
