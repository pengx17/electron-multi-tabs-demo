import { useEffect, useState } from "react";

const useTabIds = () => {
  const [tabIds, setTabIds] = useState<string[]>([]);

  useEffect(() => {
    window.apis.ui.getTabs().then((ids) => {
      setTabIds(ids);
    });

    return window.events.onTabsUpdated((tabs) => {
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

    return window.events.onActiveTabChanged((id) => {
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
        <div className="h-[32px] px-4 flex gap-1 whitespace-nowrap app-region-no-drag select-none">
          {tabIds.map((id) => {
            if (id === "shell") return null;
            return (
              <div
                key={id}
                className={
                  "group px-4 py-2 bg-slate-200 hover:bg-slate-300 flex items-center rounded-t-md" +
                  (id === activeTabId ? " bg-slate-300" : "")
                }
                onClick={() => {
                  window.apis.ui.showTab(id);
                }}
              >
                {id.substring(0, 4)}

                {canClose && (
                  <button
                    className="invisible group-hover:visible ml-2 -mr-2 w-4 h-4 bg-slate-200 hover:bg-slate-100 text-[10px]"
                    onClick={() => {
                      window.apis.ui.removeTab(id);
                    }}
                  >
                    关
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
            新
          </button>
        </div>
      </div>
    </div>
  );
};
