import ExcelJS from "exceljs";
import { formatTeamSummary } from "@/lib/parse-schedule-input";
import { formatMatchText } from "@/lib/schedule";
import type { GeneratedSchedule, MatchType, PlayerStat, ScheduleInput, ScheduleMatch } from "@/lib/types";

const TYPE_LABELS: { key: MatchType; label: string }[] = [
  { key: "WD", label: "여복" },
  { key: "MD", label: "남복" },
  { key: "MXD", label: "혼복" },
];

const COLORS = {
  border: "FFBBBBBB",
  header: "FFF0F0F0",
  rowHeader: "FFF8F8F8",
  emphasis: "FFF5F5F5",
  meta: "FF555555",
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: COLORS.border } },
  left: { style: "thin", color: { argb: COLORS.border } },
  bottom: { style: "thin", color: { argb: COLORS.border } },
  right: { style: "thin", color: { argb: COLORS.border } },
};

type CellValue = string | number;

class SheetWriter {
  private row = 1;

  constructor(private readonly worksheet: ExcelJS.Worksheet) {}

  private applyStyle(
    r: number,
    c: number,
    style: Partial<ExcelJS.Style>
  ): void {
    const cell = this.worksheet.getCell(r, c);
    if (style.font) cell.font = { ...cell.font, ...style.font };
    if (style.fill) cell.fill = style.fill;
    if (style.alignment) cell.alignment = { ...cell.alignment, ...style.alignment };
    if (style.border) cell.border = style.border;
  }

  private applyRangeStyle(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    style: Partial<ExcelJS.Style>
  ): void {
    for (let r = startRow; r <= endRow; r += 1) {
      for (let c = startCol; c <= endCol; c += 1) {
        this.applyStyle(r, c, style);
      }
    }
  }

  writeTitle(text: string): void {
    const cell = this.worksheet.getCell(this.row, 1);
    cell.value = text;
    cell.font = { bold: true, size: 16, color: { argb: "FF111111" } };
    this.row += 1;
  }

  writeMeta(text: string): void {
    const cell = this.worksheet.getCell(this.row, 1);
    cell.value = text;
    cell.font = { size: 10, color: { argb: COLORS.meta } };
    this.row += 1;
  }

  writeBlank(): void {
    this.row += 1;
  }

  writeSectionTitle(text: string): void {
    const cell = this.worksheet.getCell(this.row, 1);
    cell.value = text;
    cell.font = { bold: true, size: 12, color: { argb: "FF111111" } };
    this.row += 1;
  }

  writeSubSectionTitle(text: string): void {
    const cell = this.worksheet.getCell(this.row, 1);
    cell.value = text;
    cell.font = { bold: true, size: 11, color: { argb: "FF333333" } };
    this.row += 1;
  }

  writeTable(
    rows: CellValue[][],
    options: {
      headerRowCount?: number;
      rowHeaderCols?: number;
      emphasisCols?: number[];
      wrapCols?: number[];
      minColWidth?: number;
    } = {}
  ): { startRow: number; endRow: number; startCol: number; endCol: number } {
    const {
      headerRowCount = 1,
      rowHeaderCols = 0,
      emphasisCols = [],
      wrapCols = [],
    } = options;
    const startRow = this.row;
    const startCol = 1;
    const endCol = Math.max(...rows.map((row) => row.length), 1);

    rows.forEach((rowValues, rowIndex) => {
      const r = this.row;
      rowValues.forEach((value, colIndex) => {
        const c = startCol + colIndex;
        const cell = this.worksheet.getCell(r, c);
        cell.value = value;
        cell.border = thinBorder;
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: wrapCols.includes(c),
        };
        cell.font = { size: 10 };

        const isHeader = rowIndex < headerRowCount;
        const isRowHeader = rowHeaderCols > 0 && colIndex < rowHeaderCols && rowIndex >= headerRowCount;
        const isEmphasis = emphasisCols.includes(c);

        if (isHeader) {
          cell.font = { bold: true, size: 10 };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.header },
          };
        } else if (isRowHeader) {
          cell.font = { bold: true, size: 10 };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.rowHeader },
          };
          cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        } else if (isEmphasis) {
          cell.font = { bold: true, size: 10 };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.emphasis },
          };
        }
      });
      this.row += 1;
    });

    const endRow = this.row - 1;
    return { startRow, endRow, startCol, endCol };
  }

  writeMatrixBlock(
    title: string,
    stats: PlayerStat[],
    allPlayers: string[],
    getCount: (stat: PlayerStat, name: string) => number,
    startCol: number
  ): number {
    const colCount = 1 + allPlayers.length;

    const titleCell = this.worksheet.getCell(this.row, startCol);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 11, color: { argb: "FF333333" } };
    this.row += 1;

    const headerRow = this.row;
    this.worksheet.getCell(headerRow, startCol).value = "";
    allPlayers.forEach((name, i) => {
      this.worksheet.getCell(headerRow, startCol + 1 + i).value = name;
    });

    stats.forEach((stat, rowIndex) => {
      const r = headerRow + 1 + rowIndex;
      this.worksheet.getCell(r, startCol).value = stat.player;
      allPlayers.forEach((name, colIndex) => {
        const value = name === stat.player ? "—" : getCount(stat, name);
        this.worksheet.getCell(r, startCol + 1 + colIndex).value = value;
      });
    });

    const endRow = headerRow + stats.length;
    this.applyRangeStyle(headerRow, startCol, endRow, startCol + colCount - 1, {
      border: thinBorder,
      alignment: { vertical: "middle", horizontal: "center" },
      font: { size: 10 },
    });

    this.applyRangeStyle(headerRow, startCol, headerRow, startCol + colCount - 1, {
      font: { bold: true, size: 10 },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.header },
      },
    });

    for (let r = headerRow + 1; r <= endRow; r += 1) {
      this.applyStyle(r, startCol, {
        font: { bold: true, size: 10 },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.rowHeader },
        },
        alignment: { vertical: "middle", horizontal: "left", indent: 1 },
      });
    }

    this.row = endRow + 1;
    return colCount;
  }

  get currentRow(): number {
    return this.row;
  }

  set currentRow(value: number) {
    this.row = value;
  }
}

function buildMatchCountRows(stats: PlayerStat[]): CellValue[][] {
  return [
    ["이름", ...TYPE_LABELS.map(({ label }) => label), "합계"],
    ...stats.map((stat) => [
      stat.player,
      ...TYPE_LABELS.map(({ key }) => stat.typeCounts[key]),
      stat.totalMatches,
    ]),
  ];
}

function autoFitColumns(worksheet: ExcelJS.Worksheet): void {
  const columnCount = worksheet.columnCount || worksheet.actualColumnCount || 1;
  for (let col = 1; col <= columnCount; col += 1) {
    const column = worksheet.getColumn(col);
    let maxLength = 8;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const text = String(cell.value ?? "");
      maxLength = Math.max(maxLength, Math.min(text.length + 2, 52));
    });
    column.width = maxLength;
  }
}

async function buildWorkbook(
  input: ScheduleInput,
  generated: GeneratedSchedule,
  slotMap: Map<string, ScheduleMatch[]>
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("테니스 대진표", {
    views: [{ showGridLines: false }],
  });
  const writer = new SheetWriter(worksheet);
  const courtCount = input.courtCount;

  writer.writeTitle(generated.mode === "team" ? "테니스 팀전 대진표" : "테니스 대진표");
  writer.writeMeta(
    `${input.startTime} ~ ${input.endTime} · 코트 ${input.courtCount} · 경기 ${input.matchMinutes}분`
  );

  if (generated.mode === "team" && generated.teamInfo) {
    const matchCount = generated.schedule.filter((m) => !m.empty).length;
    writer.writeMeta(
      formatTeamSummary(
        generated.teamInfo.teamAName,
        generated.teamInfo.teamBName,
        input.teamA.maleCount,
        input.teamA.femaleCount,
        input.teamB.maleCount,
        input.teamB.femaleCount,
        matchCount,
        generated.teamInfo.teamATotalMatches,
        generated.teamInfo.teamBTotalMatches
      )
    );
    const { teamAName, teamBName, teamAMales, teamAFemales, teamBMales, teamBFemales } = generated.teamInfo;
    const rosterParts: string[] = [];
    if (teamAMales.length > 0 || teamAFemales.length > 0) {
      const aParts: string[] = [];
      if (teamAMales.length > 0) aParts.push(`남 ${teamAMales.join(", ")}`);
      if (teamAFemales.length > 0) aParts.push(`여 ${teamAFemales.join(", ")}`);
      rosterParts.push(`${teamAName}: ${aParts.join(" · ")}`);
    }
    if (teamBMales.length > 0 || teamBFemales.length > 0) {
      const bParts: string[] = [];
      if (teamBMales.length > 0) bParts.push(`남 ${teamBMales.join(", ")}`);
      if (teamBFemales.length > 0) bParts.push(`여 ${teamBFemales.join(", ")}`);
      rosterParts.push(`${teamBName}: ${bParts.join(" · ")}`);
    }
    if (rosterParts.length > 0) writer.writeMeta(rosterParts.join(" / "));
  } else {
    writer.writeMeta(`남 ${input.maleCount} / 여 ${input.femaleCount}`);
    const participantParts: string[] = [];
    if (generated.males.length > 0) participantParts.push(`남 ${generated.males.join(", ")}`);
    if (generated.females.length > 0) participantParts.push(`여 ${generated.females.join(", ")}`);
    if (participantParts.length > 0) writer.writeMeta(participantParts.join(" · "));
  }

  writer.writeBlank();
  writer.writeSectionTitle("대진표");

  const scheduleRows: CellValue[][] = [
    ["시간", ...Array.from({ length: courtCount }, (_, i) => `코트${i + 1}`)],
    ...[...slotMap.entries()].map(([time, list]) => {
      const row: CellValue[] = [time];
      for (let court = 1; court <= courtCount; court += 1) {
        const match = list.find((x) => x.court === court);
        row.push(match && !match.empty ? formatMatchText(match, generated.teamInfo) : "-");
      }
      return row;
    }),
  ];

  const scheduleWrapCols = Array.from({ length: courtCount }, (_, i) => 2 + i);
  writer.writeTable(scheduleRows, {
    headerRowCount: 1,
    rowHeaderCols: 1,
    wrapCols: scheduleWrapCols,
  });

  writer.writeBlank();
  writer.writeSectionTitle("참가자별 페어/상대 통계");

  const stats = generated.playerStats;
  if (!stats.length) {
    writer.writeMeta("참가자가 없습니다.");
    autoFitColumns(worksheet);
    return workbook;
  }

  writer.writeSubSectionTitle("경기 횟수");
  const matchCountRows = buildMatchCountRows(stats);
  const emphasisCol = 1 + TYPE_LABELS.length + 1;
  writer.writeTable(matchCountRows, {
    headerRowCount: 1,
    rowHeaderCols: 1,
    emphasisCols: [emphasisCol],
  });

  writer.writeBlank();

  const allPlayers = stats.map((s) => s.player);

  if (generated.mode === "team" && generated.teamInfo) {
    const { teamAName, teamBName, teamAMales, teamAFemales, teamBMales, teamBFemales } =
      generated.teamInfo;
    const teamAPlayers = [...teamAMales, ...teamAFemales];
    const teamBPlayers = [...teamBMales, ...teamBFemales];
    const teamAStats = stats.filter((s) => teamAPlayers.includes(s.player));
    const teamBStats = stats.filter((s) => teamBPlayers.includes(s.player));

    let matrixStartRow = writer.currentRow;
    let partnerWidth = writer.writeMatrixBlock(
      `페어 횟수 (${teamAName})`,
      teamAStats,
      teamAPlayers,
      (stat, name) => stat.partners[name] ?? 0,
      1
    );
    let matrixEndRow = writer.currentRow;
    writer.currentRow = matrixStartRow;
    partnerWidth = Math.max(
      partnerWidth,
      writer.writeMatrixBlock(
        `페어 횟수 (${teamBName})`,
        teamBStats,
        teamBPlayers,
        (stat, name) => stat.partners[name] ?? 0,
        partnerWidth + 2
      )
    );
    writer.currentRow = Math.max(matrixEndRow, writer.currentRow);
    writer.writeBlank();

    matrixStartRow = writer.currentRow;
    let opponentWidth = writer.writeMatrixBlock(
      `상대 횟수 (${teamAName})`,
      teamAStats,
      teamBPlayers,
      (stat, name) => stat.opponents[name] ?? 0,
      1
    );
    matrixEndRow = writer.currentRow;
    writer.currentRow = matrixStartRow;
    opponentWidth = Math.max(
      opponentWidth,
      writer.writeMatrixBlock(
        `상대 횟수 (${teamBName})`,
        teamBStats,
        teamAPlayers,
        (stat, name) => stat.opponents[name] ?? 0,
        opponentWidth + 2
      )
    );
    writer.currentRow = Math.max(matrixEndRow, writer.currentRow);
  } else {
    const matrixStartRow = writer.currentRow;
    const partnerWidth = writer.writeMatrixBlock(
      "페어 횟수",
      stats,
      allPlayers,
      (stat, name) => stat.partners[name] ?? 0,
      1
    );
    const matrixEndRow = writer.currentRow;
    writer.currentRow = matrixStartRow;
    writer.writeMatrixBlock(
      "상대 횟수",
      stats,
      allPlayers,
      (stat, name) => stat.opponents[name] ?? 0,
      partnerWidth + 2
    );
    writer.currentRow = Math.max(matrixEndRow, writer.currentRow);
  }

  autoFitColumns(worksheet);
  return workbook;
}

export async function buildExcelBuffer(
  input: ScheduleInput,
  generated: GeneratedSchedule,
  slotMap: Map<string, ScheduleMatch[]>
): Promise<Uint8Array> {
  const workbook = await buildWorkbook(input, generated, slotMap);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
