'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, addEdge, Connection, NodeChange, EdgeChange, Edge, Node, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Toolbar from '@/components/Toolbar';
import { NodeMetaProvider, useNodeMeta } from '@/components/NodeMetaProvider';
import StandardNode from '@/components/StandardNode';
import ContextMenu from '@/components/ContextMenu';
import { rgbToCssFormat, typeToColor } from '@/utils/color';
import { convertToExecuteGraphRequest } from '@/utils/flowFormat';
import { getHandleInfo, HandleInfo } from '@/utils/handleInfo';
import { importFlow, exportFlow, handleFileImport } from '@/utils/fileOperations';
import { executeGraphWithProgress } from '@/api';
import toast, { Toaster } from 'react-hot-toast';
import { useFlowHistory } from '@/hooks/useFlowHistory';
import { useFlowContextMenu } from '@/hooks/useFlowContextMenu';
import { genericTypeDefinitionToString, genericTypesMatch, resolveGenericType } from '@/utils/genericTypes';
import assert from 'assert';
import { NodeData, ExecutionType, NodeInputs, SaveHistoryType } from '@/types';
import { getMaxId, useAutoIncrementId } from '@/hooks/useAutoIncrementId';

const startId = 'start';

const initialNodes: Node<NodeData>[] = [
  { id: startId, position: { x: 20, y: 20 }, data: { id: startId, nodeType: 'StartNode', executionType: ExecutionType.TRIGGERED, inputs: {}, generic_types: {} }, type: 'standard' }
];

const initialEdges: Edge[] = [];

const getInitialState = (): { nodes: Node<NodeData>[], edges: Edge[] } => {
  if (typeof window === 'undefined') return { nodes: initialNodes, edges: initialEdges };

  try {
    const savedState = localStorage.getItem('flowState');
    if (savedState) {
      const { nodes, edges } = JSON.parse(savedState);
      // 确保至少有一个起始节点
      if (nodes.length > 0) {
        return { nodes, edges };
      }
    }
  } catch (error) {
    console.error('Failed to load flow state from localStorage:', error);
  }

  return { nodes: initialNodes, edges: initialEdges };
};

const shouldNodeChangeBeSavedOrAccumulate = (change: NodeChange) => {
  if (change.type === 'position' && !change.dragging) {
    return [true, false];
  }
  if (change.type === 'remove') {
    return [true, false];
  }
  if (change.type === 'dimensions' && change.resizing === false) {
    return [true, false];
  }
  if (change.type === 'replace') {
    return [true, true];
  }
  return [false, false];
};

const shouldEdgeChangeBeSaved = (change: EdgeChange) => {
  if (change.type === 'remove') {
    return true;
  }
  return false;
};

function Flow() {
  const reactFlowInstance = useReactFlow();
  const { nodes: initialStateNodes, edges: initialStateEdges } = getInitialState();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>(initialStateNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialStateEdges);
  const [saveHistoryType, setSaveHistoryType] = useState<SaveHistoryType>(SaveHistoryType.NONE);
  const [isExecuting, setIsExecuting] = useState(false);
  const nodeMeta = useNodeMeta();
  const { getNextId, setNextId, resetIdCounter } = useAutoIncrementId(getMaxId(initialStateNodes) + 1);
  const nodeTypes = useMemo(() => ({
    standard: StandardNode
  }), []);

  const {
    canUndo,
    canRedo,
    saveToHistory,
    clearHistory,
    undo: undoHistory,
    redo: redoHistory
  } = useFlowHistory();

  const {
    contextMenu,
    closeContextMenu,
    onPaneContextMenu,
    onNodeContextMenu
  } = useFlowContextMenu({
    nodes,
    setNodes,
    nodeMeta,
    setSaveHistoryType,
    getNextId
  });

  const fitView = useCallback(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        reactFlowInstance.fitView({
          duration: 0,
          maxZoom: 1.0,
          minZoom: 0.5,
          padding: 0.2
        });
      });
    });
  }, [reactFlowInstance]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const files = event.dataTransfer.files;
    if (files.length !== 1) return;

    handleFileImport(
      files[0],
      nodeMeta,
      (newNodes: Node<NodeData>[], newEdges: Edge[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
        clearHistory(newNodes, newEdges);
        fitView();
        toast.success('import success');
      },
      (error: Error) => {
        console.error('import failed:', error);
        toast.error('import failed, please check if the file format is correct');
      }
    );
  }, [setNodes, setEdges, nodeMeta, clearHistory, fitView]);

  const undo = useCallback(() => {
    undoHistory(setNodes, setEdges);
  }, [undoHistory, setNodes, setEdges]);

  const redo = useCallback(() => {
    redoHistory(setNodes, setEdges);
  }, [redoHistory, setNodes, setEdges]);

  useEffect(() => {
    clearHistory(initialStateNodes, initialStateEdges);
  }, [clearHistory, initialStateNodes, initialStateEdges]);

  useEffect(() => {
    if (saveHistoryType === SaveHistoryType.NONE) {
      return;
    }
    saveToHistory(nodes, edges, saveHistoryType === SaveHistoryType.ACCUMULATE);
    setSaveHistoryType(SaveHistoryType.NONE);
  }, [saveHistoryType, nodes, edges, saveToHistory]);

  const getEdgeStyle = (sourceInfo: HandleInfo) => {
    if (sourceInfo.type === 'control' || !sourceInfo.genericType) {
      return undefined;
    }
    const color: [number, number, number] = sourceInfo.unresolvedGenericTypes.size > 0 ? [128, 128, 128] : typeToColor(genericTypeDefinitionToString(sourceInfo.genericType));
    return { stroke: rgbToCssFormat(color) };
  };

  const onConnect = useCallback((params: Connection) => {
    // 获取源Handle和目标Handle的信息
    const sourceInfo = getHandleInfo(params.source, params.sourceHandle, true, nodes, nodeMeta);
    const targetInfo = getHandleInfo(params.target, params.targetHandle, false, nodes, nodeMeta);

    // 如果无法获取Handle信息，不允许连接
    if (!sourceInfo || !targetInfo) return;

    // 检查类型匹配
    if (sourceInfo.type !== targetInfo.type) return;
    if (sourceInfo.type === 'data') {
      assert(sourceInfo.genericType, 'sourceInfo.genericType is null');
      assert(targetInfo.genericType, 'targetInfo.genericType is null');
      const sourceHasUnresolvedGenericTypes = sourceInfo.unresolvedGenericTypes.size > 0;
      const targetHasUnresolvedGenericTypes = targetInfo.unresolvedGenericTypes.size > 0;
      // 如果两个节点都有未解析的泛型类型，不允许连接
      if (sourceHasUnresolvedGenericTypes && targetHasUnresolvedGenericTypes) {
        return;
      }
      // 如果两个节点都没有未解析的泛型类型，检查泛型类型是否匹配 
      if (!sourceHasUnresolvedGenericTypes && !targetHasUnresolvedGenericTypes
        && !genericTypesMatch(sourceInfo.genericType, targetInfo.genericType)
      ) {
        return;
      }
      // 如果只有一个节点有未解析的泛型类型，则使用另一个节点的类型推断这个节点的类型 
      const resolveNodeGenericTypes = (
        fromInfo: HandleInfo,
        toInfo: HandleInfo,
        nodeId: string,
        unresolvedTypes: Set<string>
      ) => {
        assert(fromInfo.genericType, 'fromInfo.genericType is null');
        assert(toInfo.genericType, 'toInfo.genericType is null');
        const resolvedGenericType = resolveGenericType(fromInfo.genericType, toInfo.genericType, unresolvedTypes);
        if (!resolvedGenericType) return;
        setNodes(nodes => nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                generic_types: Object.assign({}, resolvedGenericType, node.data.generic_types)
              }
            };
          }
          return node;
        }));
      };

      if (sourceHasUnresolvedGenericTypes && !targetHasUnresolvedGenericTypes) {
        try {
          resolveNodeGenericTypes(sourceInfo, targetInfo, params.source, sourceInfo.unresolvedGenericTypes);
        } catch {
          return;
        }
      }
      if (targetHasUnresolvedGenericTypes && !sourceHasUnresolvedGenericTypes) {
        try {
          resolveNodeGenericTypes(targetInfo, sourceInfo, params.target, targetInfo.unresolvedGenericTypes);
        } catch {
          return;
        }
      }
    }

    // 检查源Handle（control类型）是否已经有连接
    if (sourceInfo.type === 'control') {
      const existingEdge = edges.find(edge =>
        edge.source === params.source &&
        edge.sourceHandle === params.sourceHandle
      );
      if (existingEdge) {
        setEdges(edges => edges.filter(edge => edge.id !== existingEdge.id));
      }
    }

    // 检查目标Handle（data类型）是否已经有连接
    if (targetInfo.type === 'data') {
      const existingEdge = edges.find(edge =>
        edge.target === params.target &&
        edge.targetHandle === params.targetHandle
      );
      if (existingEdge) {
        setEdges(edges => edges.filter(edge => edge.id !== existingEdge.id));
      }
    }

    // 添加新连接
    setEdges(eds => addEdge({
      ...params,
      animated: sourceInfo.type === 'control',
      style: getEdgeStyle(sourceInfo)
    }, eds));
    setSaveHistoryType(SaveHistoryType.SAVE);
  }, [setNodes, setEdges, nodes, edges, nodeMeta]);

  const handleNodesChange = useCallback((changes: NodeChange<Node<NodeData>>[]) => {
    // 过滤掉对start节点的删除操作
    const filteredChanges = changes.filter((change: NodeChange<Node<NodeData>>) => {
      if (change.type === 'remove' && change.id === startId) {
        toast.error('start node cannot be deleted');
        return false;
      }
      return true;
    });

    onNodesChange(filteredChanges);
    for (const change of filteredChanges) {
      const [shouldSave, shouldAccumulate] = shouldNodeChangeBeSavedOrAccumulate(change);
      if (shouldSave) {
        setSaveHistoryType(shouldAccumulate ? SaveHistoryType.ACCUMULATE : SaveHistoryType.SAVE);
        continue;
      }
    }
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    onEdgesChange(changes);
    for (const change of changes) {
      if (shouldEdgeChangeBeSaved(change)) {
        setSaveHistoryType(SaveHistoryType.SAVE);
        continue;
      }
    }
  }, [onEdgesChange]);

  const clearAllNodesDisplay = useCallback(() => {
    setNodes(prevNodes => prevNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        display: undefined
      }
    })));
  }, [setNodes]);

  const clearExecutionState = useCallback(() => {
    setNodes(prevNodes => prevNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isExecuting: false,
        isError: false
      }
    })));
  }, [setNodes]);

  const setExecutingNode = useCallback((nodeId: string, isExecuting: boolean, isError: boolean) => {
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            isExecuting,
            isError
          }
        };
      }
      return {
        ...node,
        data: {
          ...node.data,
          isExecuting: false,
          isError: false
        }
      };
    }));
  }, [setNodes]);

  const onExecute = useCallback(async () => {
    try {
      setIsExecuting(true);
      // 清除所有节点的执行状态
      clearExecutionState();
      // 清除所有节点的显示数据
      clearAllNodesDisplay();

      const request = convertToExecuteGraphRequest(nodes, edges);
      await executeGraphWithProgress(
        request,
        (event) => {
          switch (event.type) {
            case 'execute_node':
              setExecutingNode(event.nodeId, true, false);
              break;
            case 'execute_node_error':
              setExecutingNode(event.nodeId, false, true);
              break;
            case 'display':
              setNodes(nodes => nodes.map(node => {
                if (node.id === event.nodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      display: event.data as NodeInputs
                    }
                  };
                }
                return node;
              }));
              break;
            case 'append':
              setNodes(nodes => nodes.map(node => {
                if (node.id === event.nodeId) {
                  const display = (node.data.display || {}) as NodeInputs;
                  const newDisplayData = Object.fromEntries(
                    Object.entries(event.data).map(([key, value]) => {
                      const existingValue = display[key] as string;
                      const newValue = value as string;
                      return [
                        key,
                        key in display
                          ? existingValue + newValue
                          : newValue
                      ];
                    })
                  ) as NodeInputs;

                  return {
                    ...node,
                    data: {
                      ...node.data,
                      display: {
                        ...display,
                        ...newDisplayData
                      }
                    }
                  };
                }
                return node;
              }));
              break;
            case 'finish':
              clearExecutionState();
              toast.success('execution success');
              break;
          }
        },
        (error) => {
          toast.error(error);
        }
      );
    } catch (error) {
      console.error('execution failed:', error);
      toast.error(error instanceof Error ? error.message : 'execution failed');
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, setNodes, clearAllNodesDisplay, clearExecutionState, setExecutingNode]);

  const onNew = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    clearHistory(initialNodes, initialEdges);
    resetIdCounter();
    fitView();
  }, [setNodes, setEdges, clearHistory, fitView, resetIdCounter]);

  const onImport = useCallback(() => {
    importFlow(
      nodeMeta,
      (newNodes, newEdges) => {
        setNodes(newNodes);
        setEdges(newEdges);
        clearHistory(newNodes, newEdges);
        setNextId(getMaxId(newNodes) + 1);
        fitView();
      },
      (error) => {
        console.error('import failed:', error);
        toast.error('import failed, please check if the file format is correct');
      }
    );
  }, [setNodes, setEdges, nodeMeta, fitView, clearHistory, setNextId]);

  const onExport = useCallback(() => {
    exportFlow(nodes, edges);
  }, [nodes, edges]);

  return (
    <div className="flex flex-col h-screen">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          }
        }}
      />
      <Toolbar
        onExecute={onExecute}
        onNew={onNew}
        onImport={onImport}
        onExport={onExport}
        onUndo={undo}
        onRedo={redo}
        isExecuting={isExecuting}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <div className="flex-1">
        <div className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            colorMode="dark"
            onPaneContextMenu={onPaneContextMenu}
            onNodeContextMenu={onNodeContextMenu}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <Background />
            <Controls />
            {contextMenu && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={closeContextMenu}
                items={contextMenu.menuItems}
                title={contextMenu.title}
              />
            )}
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <NodeMetaProvider>
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </NodeMetaProvider>
  );
}