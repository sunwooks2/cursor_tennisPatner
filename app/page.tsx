import { Suspense } from "react";
import { TournamentGenerator } from "@/components/tournament-generator";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-[1120px] p-4">로딩 중...</main>}>
      <TournamentGenerator />
    </Suspense>
  );
}
