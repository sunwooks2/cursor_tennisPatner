"use client";

import { useEffect, useRef, useState } from "react";
import { formatPlayerRecord } from "@/lib/player-score-totals";
import { getLeadingTeamName, type TeamScoreTotal } from "@/lib/team-score-totals";

interface TeamScoreSummaryProps {
  teams: TeamScoreTotal[];
  allMatchesComplete?: boolean;
}

export function TeamScoreSummary({ teams, allMatchesComplete = false }: TeamScoreSummaryProps) {
  const wasCompleteRef = useRef(allMatchesComplete);
  const [revealWinner, setRevealWinner] = useState(false);

  useEffect(() => {
    if (allMatchesComplete && !wasCompleteRef.current) {
      setRevealWinner(true);
    }
    wasCompleteRef.current = allMatchesComplete;
  }, [allMatchesComplete]);

  if (teams.length === 0) return null;

  const leadingTeamName = getLeadingTeamName(teams);

  return (
    <div className="team-score-summary">
      {teams.map((team) => {
        const isLeading = leadingTeamName === team.teamName;
        const isWinner = allMatchesComplete && isLeading;
        const isTrailing = !!leadingTeamName && !isLeading && !allMatchesComplete;

        return (
          <div
            key={team.teamName}
            className={[
              "team-score-summary__card",
              isWinner
                ? "team-score-summary__card--winner"
                : isLeading
                  ? "team-score-summary__card--leading"
                  : allMatchesComplete
                    ? "team-score-summary__card--settled"
                    : isTrailing
                      ? "team-score-summary__card--trailing"
                      : "",
              isWinner && revealWinner ? "team-score-summary__card--winner-reveal" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="team-score-summary__header">
              <p className="team-score-summary__name">{team.teamName}</p>
              {isWinner ? (
                <span className="team-score-summary__status-badge team-score-summary__status-badge--winner">
                  <span className="team-score-summary__trophy" aria-hidden>
                    🏆
                  </span>
                  승리
                </span>
              ) : isLeading ? (
                <span className="team-score-summary__status-badge team-score-summary__status-badge--lead">
                  리드
                </span>
              ) : null}
            </div>
            <p className="team-score-summary__record">{formatPlayerRecord(team)}</p>
            <p className="team-score-summary__points">합산 {team.totalPoints}점</p>
          </div>
        );
      })}
    </div>
  );
}
