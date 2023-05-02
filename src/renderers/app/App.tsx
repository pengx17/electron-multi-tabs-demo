import { useState, useEffect } from "react";

const id = window.appInfo.id;

const useActiveTabId = () => {
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    window.apis.ui.getActiveTab().then((id) => {
      setActiveTabId(id);
    });

    window.events.onActiveTabChanged((id) => {
      setActiveTabId(id);
    });
  });

  return activeTabId;
};

export const App = () => {
  const activeTabId = useActiveTabId();
  const isActive = activeTabId === id;
  return (
    <div
      className={
        "w-full h-full flex flex-col items-center justify-center bg-opacity-25 bg-slate-50 app-region-no-drag" +
        (isActive ? "" : " hidden")
      }
    >
      <h1>tab: {id}</h1>
      <button
        className="bg-slate-400 px-2"
        onClick={() => window.apis.ui.revealDevTools()}
      >
        Open Dev Tools
      </button>
    </div>
  );
};
