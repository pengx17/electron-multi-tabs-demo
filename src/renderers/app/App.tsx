import { useEffect, useState } from "react";

const id = window.appInfo.id;

export const App = () => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-opacity-25 bg-slate-50 app-region-no-drag">
      <h1>tab: {id}</h1>
    </div>
  );
};
