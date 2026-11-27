import { Card } from "@/components/ui";

import styles from "./IdentityVotes.module.css";

export interface IdentityVotesProps {
  /** The user's identity statement from /identity (may be empty). */
  statement: string;
  /** [identity, votes cast today] pairs. */
  votes: Array<[string, number]>;
}

/**
 * IdentityVotes — "every action is a vote for the person you want to
 * become". Shows the identity statement and today's tally per identity.
 */
export function IdentityVotes({ statement, votes }: IdentityVotesProps) {
  return (
    <Card as="section" className={styles.card} aria-labelledby="today-votes-heading">
      <h2 id="today-votes-heading" className={styles.heading}>
        Today&apos;s identity votes
      </h2>
      {statement && <p className={styles.statement}>{statement}</p>}
      {votes.length === 0 ? (
        <p className={styles.empty}>No votes cast yet - check off a habit to cast one.</p>
      ) : (
        <ul className={styles.list}>
          {votes.map(([identity, count]) => (
            <li key={identity} className={styles.row}>
              <span>
                I am <span className={styles.identity}>{identity}</span>
              </span>
              <span className={styles.count}>+{count}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
