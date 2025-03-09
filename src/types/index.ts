import { Node, Edge } from '@xyflow/react';

export enum SaveHistoryType {
  NONE,
  SAVE,
  ACCUMULATE
}

export enum ExecutionType {
  TRIGGERED = 'TRIGGERED', // 触发执行
  DATA = 'DATA', // 数据被需要时执行
  DATA_ONCE = "DATA_ONCE" // 数据被需要时，执行一次
}

export type GenericTypeDefinition = {
  mainType: string;
  genericTypes: GenericTypeDefinition[];
}

export type NodeTypeOptions = {
  default?: string | number | boolean;
  multiline?: boolean;
  choices?: string[];
}

export type NodePort = {
  name: string;
  type: string;
  widget?: string;
  options?: NodeTypeOptions;
};

export type NodeDisplayWidget = {
  name: string;
  type: string;
}

export type NodeMeta = {
  title: string;
  category: string;
  execution?: ExecutionType;
  no_trigger?: boolean;
  inputs: NodePort[];
  outputs: NodePort[];
  display?: NodeDisplayWidget[];
  // 泛型类型
  generic_types: string[];
};

export type NodeMetaMap = {
  [key: string]: NodeMeta;
};

export type NodePosition = {
  x: number;
  y: number;
};

export type NodeInputs = {
  [key: string]: string | number | boolean;
};

export type NodeData = {
  id: string;
  nodeType: string;
  executionType: ExecutionType;
  inputs: NodeInputs;
  display?: NodeInputs;
  isExecuting?: boolean;
  isError?: boolean;
  // 已确定的泛型类型到实际类型的映射
  generic_types: Record<string, GenericTypeDefinition>;
};

export type NodeStore = NodeData & {
  position: NodePosition;
};

export type MenuItem = {
  label: string;
  onClick?: () => void;
  children?: MenuItem[];
  icon?: React.ReactNode;
  tip?: string;
};

export type ExecuteGraphNode = {
  id: string;
  node_type: string;
  execution_type: ExecutionType;
  inputs: NodeInputs;
};

export type ExecuteGraphDataEdge = {
  source_id: string;
  source_pin: string;
  target_id: string;
  target_pin: string;
};

export type ExecuteGraphRouteEdge = {
  source_id: string;
  source_pin: string;
  target_id: string;
};

export type ExecuteGraphRequest = {
  nodes: ExecuteGraphNode[];
  edges: ExecuteGraphDataEdge[];
  route_edges: ExecuteGraphRouteEdge[];
};

export type ExecuteGraphResponse = {
  status: 'success' | 'error';
  message?: string;
};

export type ExecutingNodeState = {
  nodeId: string;
  status: 'executing' | 'error';
};

export type FlowState = {
  nodes: Node<NodeData>[];
  edges: Edge[];
};
