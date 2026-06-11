interface ScheduleExportActionsProps {
  onShare: () => void;
  onImageDownload: () => void;
  onExcelDownload: () => void;
  onPrint: () => void;
  isExporting: boolean;
  isExcelExporting: boolean;
  isPrintExporting: boolean;
  className?: string;
}

export function ScheduleExportActions({
  onShare,
  onImageDownload,
  onExcelDownload,
  onPrint,
  isExporting,
  isExcelExporting,
  isPrintExporting,
  className = "",
}: ScheduleExportActionsProps) {
  const disabled = isExporting || isExcelExporting || isPrintExporting;

  return (
    <div className={`schedule-export-actions ${className}`.trim()}>
      <button type="button" onClick={onShare} className="btn btn-ghost">
        대진공유
      </button>
      <button
        type="button"
        onClick={onImageDownload}
        disabled={disabled}
        className="btn btn-ghost"
      >
        {isExporting ? "이미지저장 중" : "이미지저장"}
      </button>
      <button
        type="button"
        onClick={onExcelDownload}
        disabled={disabled}
        className="btn btn-ghost"
      >
        {isExcelExporting ? "엑셀저장 중" : "엑셀저장"}
      </button>
      <button type="button" onClick={onPrint} disabled={disabled} className="btn btn-ghost">
        {isPrintExporting ? "인쇄 중" : "인쇄"}
      </button>
    </div>
  );
}
