import type { MatchType, PlayerStat, ScheduleMode, TeamScheduleInfo } from "@/lib/types";

interface PlayerStatsPrintProps {
  stats: PlayerStat[];
  mode?: ScheduleMode;
  teamInfo?: TeamScheduleInfo;
}

function StatMatrix({
  title,
  stats,
  allPlayers,
  getCount,
}: {
  title: string;
  stats: PlayerStat[];
  allPlayers: string[];
  getCount: (stat: PlayerStat, name: string) => number;
}) {
  if (!stats.length || !allPlayers.length) return null;

  return (
    <div className="print-matrix-block">
      <h3 className="print-subheading">{title}</h3>
      <table className="print-matrix-table">
        <thead>
          <tr>
            <th className="print-matrix-corner" />
            {allPlayers.map((name) => (
              <th key={name} className="print-matrix-col-head">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => (
            <tr key={stat.player}>
              <th className="print-matrix-row-head">{stat.player}</th>
              {allPlayers.map((name) => (
                <td key={name} className="print-matrix-cell">
                  {name === stat.player ? "—" : getCount(stat, name)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlayerStatsPrint({ stats, mode = "free", teamInfo }: PlayerStatsPrintProps) {
  if (!stats.length) {
    return <p className="print-muted">참가자가 없습니다.</p>;
  }

  const typeLabels: { key: MatchType; label: string }[] = [
    { key: "WD", label: "여복" },
    { key: "MD", label: "남복" },
    { key: "MXD", label: "혼복" },
  ];

  const isTeamMode = mode === "team" && teamInfo;
  const teamAPlayers = isTeamMode
    ? [...teamInfo.teamAMales, ...teamInfo.teamAFemales]
    : [];
  const teamBPlayers = isTeamMode
    ? [...teamInfo.teamBMales, ...teamInfo.teamBFemales]
    : [];
  const teamAStats = isTeamMode ? stats.filter((s) => teamAPlayers.includes(s.player)) : stats;
  const teamBStats = isTeamMode ? stats.filter((s) => teamBPlayers.includes(s.player)) : stats;
  const allPlayers = stats.map((s) => s.player);

  return (
    <div className="print-stats">
      <div className="print-stats-block">
        <h3 className="print-subheading">경기 횟수</h3>
        <table className="print-table">
          <thead>
            <tr>
              <th>이름</th>
              {typeLabels.map(({ label }) => (
                <th key={label}>{label}</th>
              ))}
              <th>합계</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.player}>
                <th>{stat.player}</th>
                {typeLabels.map(({ key }) => (
                  <td key={key}>{stat.typeCounts[key]}</td>
                ))}
                <td className="print-cell-emphasis">{stat.totalMatches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-matrix-row">
        {isTeamMode ? (
          <>
            <StatMatrix
              title={`페어 횟수 (${teamInfo.teamAName})`}
              stats={teamAStats}
              allPlayers={teamAPlayers}
              getCount={(stat, name) => stat.partners[name] ?? 0}
            />
            <StatMatrix
              title={`페어 횟수 (${teamInfo.teamBName})`}
              stats={teamBStats}
              allPlayers={teamBPlayers}
              getCount={(stat, name) => stat.partners[name] ?? 0}
            />
            <StatMatrix
              title={`상대 횟수 (${teamInfo.teamAName})`}
              stats={teamAStats}
              allPlayers={teamBPlayers}
              getCount={(stat, name) => stat.opponents[name] ?? 0}
            />
            <StatMatrix
              title={`상대 횟수 (${teamInfo.teamBName})`}
              stats={teamBStats}
              allPlayers={teamAPlayers}
              getCount={(stat, name) => stat.opponents[name] ?? 0}
            />
          </>
        ) : (
          <>
            <StatMatrix
              title="페어 횟수"
              stats={stats}
              allPlayers={allPlayers}
              getCount={(stat, name) => stat.partners[name] ?? 0}
            />
            <StatMatrix
              title="상대 횟수"
              stats={stats}
              allPlayers={allPlayers}
              getCount={(stat, name) => stat.opponents[name] ?? 0}
            />
          </>
        )}
      </div>
    </div>
  );
}
