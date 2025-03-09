import { NodePort } from "@/types";

interface InputFieldProps {
  value: unknown;
  onChange: (newValue: unknown) => void;
  options?: Record<string, unknown>;
}

interface InputWidgetInfo {
  component: React.FC<InputFieldProps>;
  growRatio?: number;
}

const IntegerInput: React.FC<InputFieldProps> = ({ value, onChange }) => (
  <div className="w-full inline-flex">
    <input
      className="grow nodrag w-[60px] ml-2 h-5 text-xs px-1 mt-1 border border-[var(--input-border)] rounded bg-[var(--menu-background)] text-[var(--text-primary)]"
      type="number"
      value={value as string}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
    />
  </div>
);

const FloatInput: React.FC<InputFieldProps> = ({ value, onChange }) => (
  <div className="w-full inline-flex">
    <input
      className="grow nodrag w-[60px] ml-2 h-5 text-xs px-1 mt-1 border border-[var(--input-border)] rounded bg-[var(--menu-background)] text-[var(--text-primary)]"
      type="number"
      step="0.1"
      value={value as string}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  </div>
);

const StringInput: React.FC<InputFieldProps> = ({ value, onChange }) => (
  <div className="inline-flex w-full">
    <input
      className="nodrag w-[80px] min-w-[80px] grow ml-2 h-5 text-xs px-1 mt-1 border border-[var(--input-border)] rounded bg-[var(--menu-background)] text-[var(--text-primary)]"
      type="text"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const StringMultilineInput: React.FC<InputFieldProps> = ({ value, onChange }) => (
  <div className="grow inline-flex w-full h-full">
    <textarea
      className="grow nodrag nowheel h-full w-[150px] min-w-[100px] ml-2 h-5 text-xs px-1 mt-1 border border-[var(--input-border)] rounded bg-[var(--menu-background)] text-[var(--text-primary)] resize-none"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const SelectInput: React.FC<InputFieldProps> = ({ value, onChange, options }) => (
  <div className="w-full inline-flex">
    <select
      className="grow nodrag w-[100px] ml-2 h-5 text-xs px-1 mt-1 border border-[var(--input-border)] rounded bg-[var(--menu-background)] text-[var(--text-primary)]"
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
    >
      {(options?.choices as string[])?.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  </div>
);

const BooleanInput: React.FC<InputFieldProps> = ({ value, onChange }) => (
  <div className="nodrag flex p-1">
    <input
      className="nodrag"
      type="checkbox"
      checked={value as boolean}
      onChange={(e) => onChange(e.target.checked)}
    />
  </div>
);

const inputWidgetMap: Record<string, InputWidgetInfo> = {
  "int": {
    component: IntegerInput,
  },
  "str": {
    component: StringInput,
  },
  "str_multiline": {
    component: StringMultilineInput,
    growRatio: 1,
  },
  "str_select": {
    component: SelectInput,
  },
  "bool": {
    component: BooleanInput,
  },
  "float": {
    component: FloatInput,
  },
}

const InputWidget = ({ nodePort, ...props }: { nodePort: NodePort } & InputFieldProps) => {
  const widgetName = nodePort.widget || nodePort.type;
  const widgetInfo = inputWidgetMap[widgetName];
  if (!widgetInfo) {
    return <></>;
  }
  return <widgetInfo.component {...props} options={nodePort.options} />;
};

export const getInputGrowRatio = (input: NodePort) => {
  const widgetName = input.widget || input.type;
  const widgetInfo = inputWidgetMap[widgetName];
  if (!widgetInfo) {
    return 0;
  }
  return widgetInfo.growRatio || 0;
};

export default InputWidget;