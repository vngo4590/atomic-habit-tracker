"use client";

import {
  createContext,
  use,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "./Tabs.module.css";

/**
 * Shared state for one Tabs group. The provider is the only place that knows
 * how the selected value is stored (controlled vs uncontrolled); Tab and
 * TabPanel only read `value` and call `select`.
 */
interface TabsContextValue {
  value: string;
  select: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = use(TabsContext);
  if (!context) {
    throw new Error(`<${component}> must be rendered inside <Tabs>.`);
  }
  return context;
}

/** Stable DOM ids so each tab and its panel reference one another. */
const tabId = (baseId: string, value: string) => `${baseId}-tab-${value}`;
const panelId = (baseId: string, value: string) => `${baseId}-panel-${value}`;

export interface TabsProps {
  /** Initially selected tab (uncontrolled). */
  defaultValue?: string;
  /** Selected tab (controlled). Pair with onValueChange. */
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

/**
 * Tabs — WAI-ARIA tabs with a roving tabindex.
 *
 * Keyboard: Tab moves focus into the selected tab only (one tab stop for the
 * whole list); Left/Right arrows move to the previous/next tab, wrapping at
 * the ends; Home/End jump to the first/last tab. Moving focus also selects
 * the tab ("automatic activation"), which suits cheap, already-loaded panels.
 *
 * Usage:
 *   <Tabs defaultValue="journal">
 *     <TabList aria-label="Reflect">
 *       <Tab value="journal">Journal</Tab>
 *       <Tab value="review">Weekly review</Tab>
 *     </TabList>
 *     <TabPanel value="journal">…</TabPanel>
 *     <TabPanel value="review">…</TabPanel>
 *   </Tabs>
 */
export function Tabs({ defaultValue = "", value, onValueChange, children }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const baseId = useId();
  const current = value ?? internal;

  const select = (next: string) => {
    if (value === undefined) {
      setInternal(next);
    }
    onValueChange?.(next);
  };

  return <TabsContext value={{ value: current, select, baseId }}>{children}</TabsContext>;
}

export interface TabListProps {
  /** Accessible name for the tab list (required — there's no visible one). */
  "aria-label": string;
  className?: string;
  children: ReactNode;
}

/**
 * Move focus between tabs with the arrow/Home/End keys. Tabs are discovered
 * from the DOM so the order always matches what the user sees, and disabled
 * tabs are skipped.
 */
function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(event.key)) {
    return;
  }
  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
  );
  if (tabs.length === 0) {
    return;
  }
  const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;

  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}

/** The row of tabs. */
export function TabList({ className, children, ...rest }: TabListProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={[styles.list, className ?? ""].filter(Boolean).join(" ")}
      onKeyDown={handleListKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  disabled?: boolean;
  children: ReactNode;
}

/** One tab. Only the selected tab is in the Tab order (roving tabindex). */
export function Tab({ value, disabled, children }: TabProps) {
  const { value: selected, select, baseId } = useTabsContext("Tab");
  const isSelected = selected === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={isSelected}
      aria-controls={panelId(baseId, value)}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      className={styles.tab}
      onClick={() => select(value)}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  className?: string;
  children: ReactNode;
}

/** Content for one tab. Inactive panels stay in the DOM (so each tab's
 *  aria-controls target exists) but are `hidden` and render no children. */
export function TabPanel({ value, className, children }: TabPanelProps) {
  const { value: selected, baseId } = useTabsContext("TabPanel");
  const isSelected = selected === value;
  return (
    <div
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      hidden={!isSelected}
      tabIndex={0}
      className={[styles.panel, className ?? ""].filter(Boolean).join(" ")}
    >
      {isSelected ? children : null}
    </div>
  );
}
