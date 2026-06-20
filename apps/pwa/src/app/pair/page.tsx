import { PairClient } from '@/components/pair/pair-client';

// No login gate: scanning the QR carries the pairing proof, which is all the
// phone needs to authorize. Forcing a GitHub login here caused account
// mismatches. Direct/manual pairing still works the same way.
export default function PairPage() {
  return <PairClient />;
}
