import React from "react";
import usePlanner from "./hooks/usePlanner";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board/Board";

export default function App(){
  const P = usePlanner();
  const prevSummary = P.getPrevSummary();

  return (
    <div className="app">
      <Header
        weekLabel={P.weekLabel}
        shiftWeek={P.shiftWeek}
        setWeekStart={P.setWeekStart}
        compare={P.compare}
        setCompare={P.setCompare}
        prevSummary={prevSummary}
        accent={P.accent}
        setAccent={P.setAccent}
        ACCENTS={P.ACCENTS}
        onSeedRoutines={P.seedRoutines}
        onToggleSidebar={()=>P.setSidebarOpen(s=>!s)}
      />

      <Sidebar
        roles={P.roles}
        sidebarOpen={P.sidebarOpen}
        setSidebarOpen={P.setSidebarOpen}
        addRole={P.addRole}
        editRole={P.editRole}
        removeRoleCascade={P.removeRoleCascade}
        addTask={P.addTask}
        editTask={P.editTask}
        deleteTaskCascade={P.deleteTaskCascade}
        returnScheduledToRole={P.returnScheduledToRole}
      />

      <Board
        weekStart={P.weekStart}
        columns={P.columns}
        roles={P.roles}
        dayStats={P.dayStats}
        dropSourceToDay={P.dropSourceToDay}
        moveScheduledToDay={P.moveScheduledToDay}
        toggleDone={P.toggleDone}
        nudge={P.nudge}
        updateScheduledCard={P.updateScheduledCard}
      />
    </div>
  );
}
