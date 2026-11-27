"use client";

import { Search } from "lucide-react";
import type { Ref } from "react";

import { IconButton, ProgressRing } from "@/components/ui";
import { fmt } from "@/lib/helpers";

import styles from "./TodayHeader.module.css";
import { useGreeting } from "./useTodayData";

export interface TodayHeaderProps {
  /** First name for the greeting; omitted when the account has no name. */
  userName?: string | null;
  today: string;
  done: number;
  total: number;
  /** Search is offered only when there are habits to search. */
  canSearch: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
  searchButtonRef?: Ref<HTMLButtonElement>;
}

/**
 * TodayHeader — compact page header: greeting + date on the left, today's
 * progress ring ("1 of 4 done") and a quiet search toggle on the right.
 * It renders the page's only <h1>.
 */
export function TodayHeader({
  userName,
  today,
  done,
  total,
  canSearch,
  searchOpen,
  onToggleSearch,
  searchButtonRef,
}: TodayHeaderProps) {
  const greeting = useGreeting();

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <p className={styles.date}>{fmt.long(today)}</p>
        <h1 className={styles.title}>
          {greeting}
          {userName ? `, ${userName}` : ""}
        </h1>
      </div>

      <div className={styles.aside}>
        {total > 0 && (
          <div className={styles.progress}>
            <ProgressRing value={done / total} size={48} strokeWidth={5} label="Today's habits completed" />
            <p className={styles.progressText}>{`${done} of ${total} done`}</p>
          </div>
        )}
        {canSearch && (
          <IconButton
            ref={searchButtonRef}
            icon={<Search />}
            aria-label="Search habits"
            aria-expanded={searchOpen}
            aria-controls="today-search"
            onClick={onToggleSearch}
          />
        )}
      </div>
    </header>
  );
}
