import { Handle, NodeResizer, Position, useNodeConnections, useReactFlow } from '@xyflow/react';
import { useNodeMeta } from '@/components/NodeMetaProvider';
import { ExecutionType, GenericTypeDefinition, NodeData, NodePort } from '@/types';
import InputWidget, { getInputGrowRatio } from './InputWidget';
import DisplayWidget, { getDisplayGrowRatio } from './DisplayWidget';
import { rgbToCssFormat, typeToColor } from '@/utils/color';
import clsx from 'clsx';
import { genericTypeDefinitionToString, hasUnresolvedGenericType, parseGenericTypeDefinition, replaceGenericType } from '@/utils/genericTypes';
import React, { memo, useEffect, useRef, useState } from 'react';
import { BiArrowFromLeft } from "react-icons/bi";
import { MdReplay } from "react-icons/md";


type HandleData = {
  id: string;
  name: string;
  type: 'control' | 'data';
  port: NodePort;
  genericType: GenericTypeDefinition;
  genericTypeStr: string;
  style: React.CSSProperties;
};

const StandardNode = ({
  data, selected
}: {
  data: NodeData;
  selected: boolean;
}) => {
  const { updateNodeData } = useReactFlow();
  const nodeMetas = useNodeMeta();
  const connections = useNodeConnections({
    handleType: 'target',
  });

  const nodeRef = useRef<HTMLDivElement>(null);
  const [minDimensions, setMinDimensions] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (nodeRef.current) {
      const { width, height } = nodeRef.current.getBoundingClientRect();
      setMinDimensions({
        width: width,
        height: height
      });
    }
  }, []);

  const meta = nodeMetas[data.nodeType];

  if (!meta) {
    return (
      <div
        ref={nodeRef}
        className={clsx(
          "flex flex-col rounded-sm bg-red-500 border pb-2 h-full border-[var(--node-border)]"
        )}
      >
        <div className="text-white font-medium border-b border-[var(--node-border)] text-sm px-1 mb-1 flex items-center">
          <span>???</span>

        </div>
        <div className="flex justify-center items-center h-full">
          <div className="m-1 w-[100px]">
            <span className="text-gray-300 text-sm break-words">Node {data.nodeType} does not exist, possibly missing required plugins</span>
          </div>
        </div>
      </div>
    )
  }

  const resolveGenericType = (type: string | undefined): { genericType: GenericTypeDefinition, hasUnresolved: boolean } => {
    type = type ?? '*';
    const genericType = parseGenericTypeDefinition(type);
    const resolvedType = replaceGenericType(genericType, data.generic_types);
    const hasUnresolved = hasUnresolvedGenericType(resolvedType, new Set(meta.generic_types));
    return {
      genericType: resolvedType,
      hasUnresolved,
    }
  };

  const getHandleColor = (genericTypeStr: string, hasUnresolved: boolean): [number, number, number] => {
    if (hasUnresolved) {
      return [128, 128, 128];
    }
    return typeToColor(genericTypeStr);
  };

  const controlHandleStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '0',
    background: 'var(--handle-background)',
    clipPath: 'polygon(0 0, 100% 50%, 0 100%)'
  };

  const getHandleStyle = (type: 'control' | 'data', hasUnresolved: boolean, genericTypeStr: string): React.CSSProperties => {
    if (type === 'control') {
      return controlHandleStyle;
    }
    const handleColor = getHandleColor(genericTypeStr, hasUnresolved);
    return {
      width: '12px',
      height: '12px',
      background: rgbToCssFormat(handleColor),
      borderRadius: '50%'
    };
  };

  const connectedInputHandles = connections.map(connection => connection.targetHandle);

  const inputs: HandleData[] = [
    ...(!meta.no_trigger && data.executionType === ExecutionType.TRIGGERED ? [{ id: '_', name: '', type: 'control', style: controlHandleStyle } as HandleData] : []),
    ...meta.inputs.map(input => {
      const { genericType, hasUnresolved } = resolveGenericType(input.type);
      const genericTypeStr = genericTypeDefinitionToString(genericType);
      return {
        id: input.name,
        name: input.name,
        type: 'data',
        port: input,
        genericType: genericType,
        genericTypeStr: genericTypeStr,
        style: getHandleStyle('data', hasUnresolved, genericTypeStr),
      } as HandleData
    })
  ];

  const outputs: HandleData[] = [
    ...(data.executionType === ExecutionType.TRIGGERED ? [{ id: '_', name: '', type: 'control', style: controlHandleStyle } as HandleData] : []),
    ...meta.outputs.map(output => {
      const { genericType, hasUnresolved } = resolveGenericType(output.type);
      const genericTypeStr = genericTypeDefinitionToString(genericType);
      if (output.type === 'route') {
        return {
          id: output.name,
          name: output.name,
          type: 'control',
          style: controlHandleStyle,
        } as HandleData
      }
      return {
        id: output.name,
        name: output.name,
        type: 'data',
        port: output,
        genericType: genericType,
        genericTypeStr: genericTypeStr,
        style: getHandleStyle('data', hasUnresolved, genericTypeStr),
      } as HandleData
    })
  ];

  const inputGrowRatio = inputs.reduce((acc, input) => {
    if (!input.port) {
      return acc;
    }
    return acc + getInputGrowRatio(input.port);
  }, 0);

  const displayGrowRatio = meta.display?.reduce((acc, display) => {
    if (!display.type) {
      return acc;
    }
    return acc + getDisplayGrowRatio(display.type);
  }, 0);

  return (
    <div
      ref={nodeRef}
      className={clsx(
        "flex flex-col relative rounded-sm bg-[var(--node-background)] border pb-2 h-full",
        data.isExecuting ? "border-green-500 border-2" :
          data.isError ? "border-red-500 border-2" :
            "border-[var(--node-border)]"
      )}
    >
      <NodeResizer
        minHeight={minDimensions.height}
        minWidth={minDimensions.width}
        isVisible={selected}
        handleStyle={{
          width: '8px',
          height: '8px',
        }}
        lineStyle={{
          border: 'none',
        }}
      />
      {/* 标题 */}
      <div className="text-white font-medium border-b border-[var(--node-border)] text-sm px-1 mb-1 flex items-center">
        {data.executionType === ExecutionType.DATA_ONCE && (
          <BiArrowFromLeft className="text-gray-400 mr-1" size={14} />
        )}
        {data.executionType === ExecutionType.DATA && (
          <MdReplay className="text-gray-400 mr-1" size={14} />
        )}
        <span>{meta.title}</span>
      </div>

      {/* 输入输出端口容器 */}
      <div className="flex" style={{ flexGrow: inputGrowRatio }}>
        {/* 输入端口 */}
        <div className="flex flex-col grow">
          {inputs.map((input) => (
            <React.Fragment key={input.name}>
              <div className="flex items-center">
                <div className="relative">
                  <Handle
                    className="bg-[var(--handle-background)] border-[var(--handle-border)]"
                    type="target"
                    position={Position.Left}
                    id={input.id}
                    style={input.style}
                  />
                </div>
                <span className="text-gray-300 text-sm ml-2">{input.name || '\u00A0'}</span>
              </div>
              {!connectedInputHandles.includes(input.name) && input.type === 'data' && input.port && (
                <InputWidget nodePort={input.port} value={data.inputs[input.name]} onChange={(newValue) => {
                  updateNodeData(data.id, {
                    ...data,
                    inputs: {
                      ...data.inputs,
                      [input.id]: newValue,
                    },
                  });
                }} />
              )}
            </React.Fragment>
          ))}
        </div>
        {/* 输入端口和输出端口之间的空隙 */}
        <div className="flex-none min-w-4"></div>
        {/* 输出端口 */}
        <div className="flex flex-col">
          {outputs.map((output) => (
            <React.Fragment key={output.name}>
              <div className="flex flex-row-reverse items-center">
                <div className="relative">
                  <Handle
                    className="bg-[var(--handle-background)] border-[var(--handle-border)]"
                    type="source"
                    position={Position.Right}
                    id={output.id}
                    style={output.style}
                  />
                </div>
                <span className="text-gray-300 text-sm mr-2">{output.name || '\u00A0'}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 显示 DisplayWidget */}
      {meta.display && (
        <div className="flex flex-col border-t border-[var(--node-border)] mt-2" style={{ flexGrow: displayGrowRatio }}>
          {meta.display.map((display) => (
            <div key={display.name} className="flex w-full h-full items-center justify-center">
              <div className="w-full h-full flex justify-center">
                {DisplayWidget(display.type, data.display?.[display.name])}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(StandardNode);