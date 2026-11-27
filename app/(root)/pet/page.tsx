import { PetEcosystem } from "@/features/pet/ui";

/**
 * The Pet tab (`/pet`). A thin server shell; the living ecosystem (food pool,
 * companions, adopt flow, graveyard) lives in `features/pet/ui`.
 */
export default function PetPage() {
  return <PetEcosystem />;
}
