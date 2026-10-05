"use client";

import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
}: TabsProps) {
  const activeItem = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex overflow-x-auto border-b border-line"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={[
                "shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold",
                "transition-colors duration-150",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:border-line-blue hover:text-brand",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeItem?.content && (
        <div
          id={`tabpanel-${activeItem.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeItem.id}`}
          className="pt-4"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}