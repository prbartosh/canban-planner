import React, { useRef } from "react";
import { addDays, fullDay, ymd } from "../../utils/date";
import DayColumn from "./DayColumn";

export default function Board({
  weekStart, columns, roles,
  dayStats,
  dropSourceToDay, moveScheduledToDay,
  toggleDone, nudge, updateScheduledCard
}){
  const boardRef = useRef(null);

  function scrollBoardBy(px){
    const el = boardRef.current; if(!el) return;
    el.scrollTo({left: el.scrollLeft + px, behavior: "smooth"});
  }
  function handleAutoScroll(e){
    const el = boardRef.current; if(!el) return;
    const rect = el.getBoundingClientRect();
    const leftDist = e.clientX - rect.left;
    const rightDist = rect.right - e.clientX;
    const threshold = 80, step = 30;
    if(leftDist < threshold) el.scrollLeft -= step;
    else if(rightDist < threshold) el.scrollLeft += step;
  }

  const days = [...Array(7)].map((_,i)=> new Date(addDays(weekStart,i)));

  return (
    <main className="glass board">
      <div className="board-nav">
        <button className="icon-btn" onClick={()=>scrollBoardBy(-320)} title="Scroll left">⬅</button>
        <button className="icon-btn" onClick={()=>scrollBoardBy(+320)} title="Scroll right">➡</button>
      </div>

      <div className="columns" ref={boardRef} onDragOver={handleAutoScroll}>
        {days.map((d,i)=>{
          const key = ymd(d);
          const cards = columns[key] || [];
          const st = dayStats(key);
          return (
            <DayColumn key={key}
              dayLabel={fullDay[i]}
              dateLabel={d.toLocaleDateString()}
              dayKey={key}
              cards={cards}
              roles={roles}
              onDropSourceToDay={dropSourceToDay}
              onMoveScheduledToDay={moveScheduledToDay}
              onToggleDone={toggleDone}
              onNudge={nudge}
              onUpdateCard={updateScheduledCard}
              st={st}
            />
          );
        })}
      </div>
    </main>
  );
}
