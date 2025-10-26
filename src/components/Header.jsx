import React from "react";
import { mondayOfNextWeek } from "../utils/date";

export default function Header({
  weekLabel, shiftWeek, setWeekStart,
  compare, setCompare,
  prevSummary,
  accent, setAccent, ACCENTS,
  onSeedRoutines,
  onToggleSidebar
}){
  return (
    <div className="glass header">
      <div className="h-group">
        <button className="btn show-sidebar" onClick={onToggleSidebar}>☰ Panel</button>
        <span className="h-title">Weekly Planner · {weekLabel}</span>
        <button className="btn" onClick={()=>shiftWeek(-1)}>← Prev</button>
        <button className="btn" onClick={()=>setWeekStart(mondayOfNextWeek(new Date()))}>Next Week (auto)</button>
        <button className="btn" onClick={()=>shiftWeek(+1)}>Next →</button>

        <div className="summary hide-mobile" style={{marginLeft:12}}>
          {compare ? (
            <>
              <span>Prev week:</span>
              <div className="progress"><span style={{width:`${prevSummary.pct}%`}}/></div>
              <span>{prevSummary.done}/{prevSummary.total} ({prevSummary.pct}%)</span>
            </>
          ): <span style={{color:"var(--muted)"}}>Toggle compare to see last week</span>}
        </div>
      </div>

      <div className="h-group">
        <button className={`btn-pill ${compare?'active':''}`} onClick={()=>setCompare(v=>!v)}>Compare</button>
        <button className="btn" onClick={onSeedRoutines}>Seed routines</button>
        <div className="h-group" style={{marginLeft:8}}>
          <span className="hide-mobile" style={{color:"var(--muted)", fontSize:13}}>Accent</span>
          <div className="h-group">
            {ACCENTS.map(c=>(
              <button key={c} className="icon-btn" onClick={()=>setAccent(c)} title={c}
                style={{borderColor: accent===c?'var(--accent)':'var(--border)'}}>
                <div style={{width:16,height:16,borderRadius:999,background:c}}/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
