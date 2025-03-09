import React from "react";

interface DisplayFieldProps {
  value: unknown;
}

interface DisplayWidgetInfo {
  component: React.FC<DisplayFieldProps>;
  growRatio?: number;
}

const DisplayText: React.FC<DisplayFieldProps> = ({ value }) => (
  <div className="mt-2 ml-2 mr-2 w-full">
    <textarea
      className="nodrag nowheel w-full h-full border border-[var(--input-border)] rounded bg-[var(--menu-background)] text-xs text-[var(--text-primary)] resize-none"
      value={value as string ?? ""}
      readOnly
    />
  </div>
);

const displayWidgetMap: Record<string, DisplayWidgetInfo> = {
  "text": {
    component: DisplayText,
    growRatio: 1,
  },
};

const DisplayWidget = (type: string, value: unknown) => {
  const widgetInfo = displayWidgetMap[type];

  if (!widgetInfo) {
    return <></>;
  }

  return <widgetInfo.component value={value} />;
};

export const getDisplayGrowRatio = (type: string) => {
  const widgetInfo = displayWidgetMap[type];
  if (!widgetInfo) {
    return 0;
  }
  return widgetInfo.growRatio || 0;
};

export default DisplayWidget;