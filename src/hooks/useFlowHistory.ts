import { Node, Edge } from '@xyflow/react';
import { useCallback, useRef, useState } from 'react';
import { NodeData, FlowState } from '@/types';

export function useFlowHistory() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const history = useRef<FlowState[]>([]);
  const accumulatingLastHistory = useRef(false);
  const currentIndex = useRef(0);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(currentIndex.current > 0);
    setCanRedo(currentIndex.current < history.current.length - 1);
  }, []);

  // 保存历史记录
  // accumulate: 用于合并连续的变化， 如果为true，则不增加历史记录的索引，而是将当前历史记录合并到上一条历史记录中
  const saveToHistory = useCallback((nodes: Node<NodeData>[], edges: Edge[], accumulate: boolean = false) => {
    const shouldAccumulate = accumulate && accumulatingLastHistory.current && accumulate;
    accumulatingLastHistory.current = accumulate;
    history.current = history.current.slice(0, currentIndex.current + (shouldAccumulate ? 0 : 1));
    history.current.push({ nodes, edges });
    // 限制历史记录最多保存条数，防止内存溢出
    const maxHistoryLength = 1000;
    if (history.current.length > maxHistoryLength) {
      history.current = history.current.slice(history.current.length - maxHistoryLength);
    }
    currentIndex.current = history.current.length - 1;

    // 保存当前状态到本地存储
    try {
      localStorage.setItem('flowState', JSON.stringify({ nodes, edges }));
    } catch (error) {
      console.error('Failed to save flow state to localStorage:', error);
    }

    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const clearHistory = useCallback((initNodes: Node<NodeData>[], initEdges: Edge[]) => {
    history.current = [];
    currentIndex.current = 0;
    saveToHistory(initNodes, initEdges);
    updateUndoRedoState();
    accumulatingLastHistory.current = false;
  }, [saveToHistory, updateUndoRedoState]);

  const undo = useCallback((setNodes: (nodes: Node<NodeData>[]) => void, setEdges: (edges: Edge[]) => void) => {
    if (currentIndex.current > 0) {
      currentIndex.current--;
      const { nodes, edges } = history.current[currentIndex.current];
      setNodes(nodes);
      setEdges(edges);
      updateUndoRedoState();
      accumulatingLastHistory.current = false;
    }
  }, [updateUndoRedoState]);

  const redo = useCallback((setNodes: (nodes: Node<NodeData>[]) => void, setEdges: (edges: Edge[]) => void) => {
    if (currentIndex.current < history.current.length - 1) {
      currentIndex.current++;
      const { nodes, edges } = history.current[currentIndex.current];
      setNodes(nodes);
      setEdges(edges);
      updateUndoRedoState();
      accumulatingLastHistory.current = false;
    }
  }, [updateUndoRedoState]);

  return {
    canUndo,
    canRedo,
    saveToHistory,
    clearHistory,
    undo,
    redo
  };
} 