export type MatchType = "MD" | "WD" | "MXD";

export type CourtFilter = "ALL" | number;

export interface ScheduleInput {
  maleCount: number;
  femaleCount: number;
  maleNames: string[];
  femaleNames: string[];
  courtCount: number;
  startTime: string;
  endTime: string;
  matchMinutes: number;
  types: MatchType[];
}

export interface ScheduleMatch {
  time: string;
  court: number;
  empty?: boolean;
  type?: MatchType;
  teamA?: [string, string];
  teamB?: [string, string];
}

export interface GeneratedSchedule {
  slots: string[];
  totalMatches: number;
  schedule: ScheduleMatch[];
  males: string[];
  females: string[];
  playStat: { minPlay: number; maxPlay: number };
  playerStats: PlayerStat[];
}

export interface PlayerStat {
  player: string;
  totalMatches: number;
  typeCounts: Record<MatchType, number>;
  partners: Record<string, number>;
  opponents: Record<string, number>;
}
