import { useEffect, useState } from "react";

const useTabIds = () => {
  const [tabIds, setTabIds] = useState<string[]>([]);

  useEffect(() => {
    window.apis.ui.getTabs().then((ids) => {
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
  const tabIds = useTabIds();
  const activeTabId = useActiveTabId();
  const canClose = tabIds.length > 1;

  return (
    <div className="w-full h-full flex">
      <div
        data-test-id="app-header"
        className="app-region-drag bg-slate-50 h-[40px] min-w-full flex items-end overflow-auto"
      >
        <div className="h-[32px] px-24 flex gap-1 whitespace-nowrap app-region-no-drag">
          {tabIds.map((id) => {
            if (id === "shell") return null;
            return (
              <div
                key={id}
                className={
                  "px-4 py-2 bg-slate-200 hover:bg-slate-300 select-none flex items-center" +
                  (id === activeTabId ? " bg-slate-300" : "")
                }
                onClick={() => {
                  window.apis.ui.showTab(id);
                }}
              >
                {id}

                {canClose && (
                  <button
                    className="ml-2 w-4 h-4 bg-slate-200 hover:bg-slate-100 text-[12px]"
                    onClick={() => {
                      window.apis.ui.removeTab(id);
                    }}
                  >
                    X
                  </button>
                )}
              </div>
            );
          })}
          <button
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 flex items-center"
            onClick={() => {
              window.apis.ui.addNewTab();
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
