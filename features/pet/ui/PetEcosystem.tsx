"use client";

import { Plus, Sprout } from "lucide-react";
import { useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { Button, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { useMounted } from "@/lib/hooks/useMounted";

import { AdoptPanel } from "./AdoptPanel";
import { FoodPanel } from "./FoodPanel";
import { PetCard } from "./PetCard";
import { usePetEcosystem } from "./usePetEcosystem";
import styles from "./PetEcosystem.module.css";

const ADOPT_LABEL = "Adopt a companion";

/** Placeholder cards shown until the live clock is available on the client. */
function LoadingGrid() {
  return (
    <div className={styles.grid} aria-busy="true" aria-label="Waking your companions">
      {[0, 1].map((key) => (
        <Skeleton key={key} height={420} />
      ))}
    </div>
  );
}

/**
 * The Pet tab: a small Tamagotchi-style world where completing habits earns
 * food, food keeps procedurally generated companions alive and evolving, and
 * neglect can permanently cost a pet. Shows today's food pool, the living
 * companions, a focused adopt flow while there's room, and a graveyard.
 */
export function PetEcosystem() {
  const store = useStoreContext();
  // Live, time-dependent rendering waits for hydration so the server's "now"
  // never disagrees with the client's first paint.
  const mounted = useMounted();
  const { alive, dead, availableFood, remainingSlots } = usePetEcosystem();

  // The adopt flow remembers how many pets were alive when it opened; once an
  // adoption lands (the count changes) it closes itself. A refused adoption
  // leaves it open with the user's input intact.
  const [adoptOpenedAt, setAdoptOpenedAt] = useState<number | null>(null);
  const adoptOpen = adoptOpenedAt === alive.length && remainingSlots > 0;
  const openAdopt = () => setAdoptOpenedAt(alive.length);

  const showHeaderAction = mounted && alive.length > 0 && remainingSlots > 0 && !adoptOpen;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Companions"
        title="Pet Ecosystem"
        subtitle="Feed your companions with the habits you complete. Care for them and they evolve; neglect them and they may not make it."
        actions={
          showHeaderAction ? (
            <Button icon={<Plus />} onClick={openAdopt}>
              {ADOPT_LABEL}
            </Button>
          ) : null
        }
      />

      {!mounted ? (
        <LoadingGrid />
      ) : (
        <>
          <FoodPanel availableFood={availableFood} />

          {adoptOpen ? (
            <AdoptPanel
              remainingSlots={remainingSlots}
              onAdopt={(draft) => store.adoptPet(draft)}
              onClose={() => setAdoptOpenedAt(null)}
            />
          ) : null}

          {alive.length > 0 ? (
            <section aria-labelledby="pet-companions-title" className={styles.section}>
              <h2 id="pet-companions-title" className={styles.sectionTitle}>
                Your companions
              </h2>
              <div className={styles.grid}>
                {alive.map((view) => (
                  <PetCard
                    key={view.id}
                    view={view}
                    availableFood={availableFood}
                    onFeed={(amount) => store.feedPet(view.id, amount)}
                    onBury={() => store.buryPet(view.id)}
                    onDelete={() => store.deletePet(view.id)}
                  />
                ))}
              </div>
            </section>
          ) : adoptOpen ? null : (
            <EmptyState
              icon={<Sprout />}
              title="Adopt your first companion"
              action={<Button onClick={openAdopt}>{ADOPT_LABEL}</Button>}
            >
              Every habit you complete earns food. Adopt a companion and your daily wins will keep it
              growing.
            </EmptyState>
          )}

          {dead.length > 0 ? (
            <section aria-labelledby="pet-memory-title" className={styles.section}>
              <h2 id="pet-memory-title" className={styles.sectionTitle}>
                In memory
              </h2>
              <div className={styles.grid}>
                {dead.map((view) => (
                  <PetCard
                    key={view.id}
                    view={view}
                    availableFood={0}
                    onFeed={() => undefined}
                    onBury={() => store.buryPet(view.id)}
                    onDelete={() => store.deletePet(view.id)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
