import { Node } from '@xyflow/react';
import { NodeData, NodeMetaMap, NodePort } from '@/types';
import { GenericTypeDefinition } from '@/types';
import { parseGenericTypeDefinition, replaceGenericType } from '@/utils/genericTypes';

export type HandleInfo = {
  type: 'control' | 'data';
  genericType: GenericTypeDefinition | null;
  unresolvedGenericTypes: Set<string>;
};

// 获取Handle的类型信息
export const getHandleInfo = (nodeId: string, handleId: string | null, isSource: boolean, nodes: Node[], nodeMetas: NodeMetaMap) : HandleInfo | null => {
  if (!handleId) return null;
  
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  if (!('nodeType' in node.data)) return null;

  const nodeData = node.data as NodeData;
  const meta = nodeMetas[nodeData.nodeType];
  if (!meta) return null;

  // 处理control类型的handle
  if (handleId === '_') {
    return {
      type: 'control' as const,
      genericType: null,
      unresolvedGenericTypes: new Set()
    };
  }

  // 根据是源节点还是目标节点，获取对应的端口信息
  const port = isSource ? 
    meta.outputs.find((o: NodePort) => o.name === handleId) :
    meta.inputs.find((i: NodePort) => i.name === handleId);

  if (!port) return null;

  const genericType = parseGenericTypeDefinition(port.type);
  const resolvedGenericType = replaceGenericType(genericType, nodeData.generic_types);
  const unresolvedGenericTypes = new Set(meta.generic_types.filter(gt => !nodeData.generic_types[gt]));

  return {
    type: port.type === 'route' ? 'control' as const : 'data' as const,
    genericType: port.type === 'route' ? null : resolvedGenericType,
    unresolvedGenericTypes
  };
}; 