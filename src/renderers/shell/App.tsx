import { useEffect, useState } from "react";

const useTabIds = () => {
  const [tabIds, setTabIds] = useState<string[]>([]);

  useEffect(() => {
    window.apis.getTabs().then((ids) => {
      setTabIds(ids);
    });

    window.events.onTabsUpdated((tabs) => {
      setTabIds(tabs);
    });
  }, []);

  return tabIds;
};

const useActiveTabId = () => {
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    window.apis.getActiveTab().then((id) => {
      setActiveTabId(id);
    });

    window.events.onActiveTabChanged((id) => {
      setActiveTabId(id);
    });
  });

  return activeTabId;
};

export const App = () => {
  const tabIds = useTabIds();
  const activeTabId = useActiveTabId();
  return (
    <div className="w-full h-full flex">
      <div
        data-test-id="app-header"
        className="app-region-drag bg-slate-50 h-[40px] w-full pl-24 flex gap-1"
      >
        {tabIds.map((id) => {
          if (id === "shell") return null;
          return (
            <div
              key={id}
              className={
                "px-4 py-2 bg-slate-200 hover:bg-slate-300 app-region-no-drag select-none" +
                (id === activeTabId ? " bg-slate-300" : "")
              }
              onClick={() => {
                window.apis.showTab(id);
              }}
            >
              {id}

              <button
                className="ml-2 px-2 py-1 bg-slate-200 hover:bg-slate-300 app-region-no-drag"
                onClick={() => {
                  window.apis.removeTab(id);
                }}
              >
                x
              </button>
            </div>
          );
        })}
        <button
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 app-region-no-drag"
          onClick={() => {
            window.apis.addNewTab();
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};
