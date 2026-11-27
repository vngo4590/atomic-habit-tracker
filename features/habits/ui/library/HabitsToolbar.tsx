"use client";

import { Search, X } from "lucide-react";

import { IconButton, Input, Select, Tab, TabList } from "@/components/ui";

import { LIBRARY_FILTERS, LIBRARY_SORTS, type LibrarySort } from "./filter-habits";
import styles from "./HabitsToolbar.module.css";

export interface HabitsToolbarProps {
  search: string;
  sort: LibrarySort;
  onSearchChange: (value: string) => void;
  onSortChange: (value: LibrarySort) => void;
}

/**
 * HabitsToolbar — filter tabs, search and sort for the habits library, in one
 * row on desktop and two stacked rows on mobile. Must render inside the
 * library's <Tabs> so the filter tabs share its selection.
 */
export function HabitsToolbar({ search, sort, onSearchChange, onSortChange }: HabitsToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <TabList aria-label="Filter habits" className={styles.tabs}>
        {LIBRARY_FILTERS.map((item) => (
          <Tab key={item.value} value={item.value}>
            {item.label}
          </Tab>
        ))}
      </TabList>

      <div className={styles.controls}>
        <div className={styles.search} role="search">
          <Search className={styles.searchIcon} size={16} strokeWidth={1.75} aria-hidden="true" />
          <Input
            type="search"
            className={styles.searchInput}
            placeholder="Search habits..."
            aria-label="Search habits by name, identity or cue"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {search ? (
            <IconButton
              className={styles.searchClear}
              aria-label="Clear search"
              icon={<X size={16} strokeWidth={1.75} />}
              onClick={() => onSearchChange("")}
            />
          ) : null}
        </div>
        <label className={styles.sort}>
          <span className={styles.sortLabel}>Sort</span>
          <Select
            className={styles.sortSelect}
            value={sort}
            onChange={(event) => onSortChange(event.target.value as LibrarySort)}
          >
            {LIBRARY_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </div>
  );
}
