import { Node, Edge } from '@xyflow/react';
import { getHandleInfo } from './handleInfo';
import { rgbToCssFormat, typeToColor } from './color';
import { ExecutionType, GenericTypeDefinition, NodeMetaMap } from '@/types';
import { ExecuteGraphRequest, ExecuteGraphNode, ExecuteGraphDataEdge, ExecuteGraphRouteEdge, NodeData } from '@/types';
import { genericTypeDefinitionToString } from './genericTypes';
export interface FlowExportFormat {
  nodes: {
    id: string;
    node_type: string;
    execution_type: string;
    inputs: Record<string, string | number | boolean>;
    position: {
      x: number;
      y: number;
    };
    width?: number;
    height?: number;
    generic_types: Record<string, GenericTypeDefinition>;
  }[];
  edges: {
    source_id: string;
    source_pin: string;
    target_id: string;
    target_pin: string;
  }[];
  route_edges: {
    source_id: string;
    source_pin: string;
    target_id: string;
  }[];
}

export function convertToExportFormat(nodes: Node[], edges: Edge[]): FlowExportFormat {
  const dataEdges: FlowExportFormat['edges'] = [];
  const routeEdges: FlowExportFormat['route_edges'] = [];

  // 处理边
  edges.forEach(edge => {
    // 如果目标handle是'_'，说明是控制流边
    if (edge.targetHandle === '_') {
      routeEdges.push({
        source_id: edge.source,
        source_pin: edge.sourceHandle || '_',
        target_id: edge.target
      });
    } else {
      dataEdges.push({
        source_id: edge.source,
        source_pin: edge.sourceHandle || '_',
        target_id: edge.target,
        target_pin: edge.targetHandle || '_'
      });
    }
  });
  // 处理节点
  const exportNodes = nodes.map(node => ({
    id: node.id,
    node_type: (node.data as NodeData).nodeType as string,
    execution_type: (node.data as NodeData).executionType as string,
    inputs: (node.data as NodeData).inputs || {},
    position: {
      x: node.position.x,
      y: node.position.y
    },
    generic_types: (node.data as NodeData).generic_types || {},
    width: node.width,
    height: node.height
  }));

  return {
    nodes: exportNodes,
    edges: dataEdges,
    route_edges: routeEdges
  };
}

export function convertFromExportFormat(flowData: FlowExportFormat, nodeMetas: NodeMetaMap): { nodes: Node<NodeData>[], edges: Edge[] } {
  // 转换节点
  const nodes: Node<NodeData>[] = flowData.nodes.map(node => ({
    id: node.id,
    type: 'standard',
    position: node.position,
    width: node.width,
    height: node.height,
    data: {
      id: node.id,
      nodeType: node.node_type,
      executionType: node.execution_type as ExecutionType,
      inputs: node.inputs,
      generic_types: node.generic_types
    }
  }));

  // 转换边
  const edges: Edge[] = [
    // 转换数据流边
    ...flowData.edges.map((edge, index) => {
      // 获取源Handle的信息来设置边的颜色
      const sourceInfo = getHandleInfo(edge.source_id, edge.source_pin, true, nodes, nodeMetas);
      const style = sourceInfo?.type === 'data' && sourceInfo.genericType
        ? { stroke: rgbToCssFormat(typeToColor(genericTypeDefinitionToString(sourceInfo.genericType))) }
        : undefined;

      return {
        id: `data-${index}`,
        source: edge.source_id,
        sourceHandle: edge.source_pin,
        target: edge.target_id,
        targetHandle: edge.target_pin,
        animated: false,
        style
      };
    }),
    // 转换控制流边
    ...flowData.route_edges.map((edge, index) => ({
      id: `route-${index}`,
      source: edge.source_id,
      sourceHandle: edge.source_pin,
      target: edge.target_id,
      targetHandle: '_',
      animated: true
    }))
  ];

  return { nodes, edges };
}

export function convertToExecuteGraphRequest(nodes: Node[], edges: Edge[]): ExecuteGraphRequest {
    // 转换节点
    const executeNodes: ExecuteGraphNode[] = nodes.map(node => {
        const data = node.data as NodeData;
        return {
            id: node.id,
            node_type: data.nodeType,
            execution_type: data.executionType,
            inputs: data.inputs
        };
    });

    // 分离数据流边和执行流边
    const dataEdges: ExecuteGraphDataEdge[] = [];
    const routeEdges: ExecuteGraphRouteEdge[] = [];

    edges.forEach(edge => {
        // 检查是否是执行流边（animated为true表示执行流边）
        if (edge.animated) {
            routeEdges.push({
                source_id: edge.source,
                source_pin: edge.sourceHandle || '_',
                target_id: edge.target
            });
        } else {
            dataEdges.push({
                source_id: edge.source,
                source_pin: edge.sourceHandle || '_',
                target_id: edge.target,
                target_pin: edge.targetHandle || '_'
            });
        }
    });

    return {
        nodes: executeNodes,
        edges: dataEdges,
        route_edges: routeEdges
    };
} 