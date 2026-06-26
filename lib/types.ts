export type MatchType = "MD" | "WD" | "MXD";

export type ScheduleMode = "free" | "team" | "manual";

export type ManualLayout = "free" | "team";

export type CourtFilter = "ALL" | number;

export interface TeamRoster {
  name: string;
  maleCount: number;
  femaleCount: number;
  maleNames: string[];
  femaleNames: string[];
}

export interface ScheduleInput {
  mode: ScheduleMode;
  manualLayout: ManualLayout;
  maleCount: number;
  femaleCount: number;
  maleNames: string[];
  femaleNames: string[];
  teamA: TeamRoster;
  teamB: TeamRoster;
  courtCount: number;
  startTime: string;
  endTime: string;
  matchMinutes: number;
  types: MatchType[];
}

export interface TeamScheduleInfo {
  teamAName: string;
  teamBName: string;
  teamAMales: string[];
  teamAFemales: string[];
  teamBMales: string[];
  teamBFemales: string[];
  teamATotalMatches: number;
  teamBTotalMatches: number;
}

export interface ScheduleMatch {
  time: string;
  court: number;
  empty?: boolean;
  pending?: boolean;
  type?: MatchType;
  teamA?: [string, string];
  teamB?: [string, string];
}

export interface GeneratedSchedule {
  mode: ScheduleMode;
  manualLayout?: ManualLayout;
  slots: string[];
  totalMatches: number;
  schedule: ScheduleMatch[];
  males: string[];
  females: string[];
  playStat: { minPlay: number; maxPlay: number };
  playerStats: PlayerStat[];
  teamInfo?: TeamScheduleInfo;
}

export interface PlayerStat {
  player: string;
  totalMatches: number;
  typeCounts: Record<MatchType, number>;
  partners: Record<string, number>;
  opponents: Record<string, number>;
}
