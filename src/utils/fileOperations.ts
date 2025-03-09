import { Node, Edge } from '@xyflow/react';
import { NodeMetaMap, NodeData } from '@/types';
import { convertToExportFormat, convertFromExportFormat } from './flowFormat';

export const downloadJson = (data: unknown, filename: string) => {
  const jsonString = JSON.stringify(data);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getTimestamp = () => {
  const now = new Date();
  return now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
};


export const exportFlow = (nodes: Node<NodeData>[], edges: Edge[]) => {
  const flowData = convertToExportFormat(nodes, edges);
  const timestamp = getTimestamp();
  // 下载压缩后的JSON文件
  downloadJson(flowData, `workflow-${timestamp}.json`);
};

// 处理文件导入的核心逻辑
export const handleFileImport = (
  file: File,
  nodeMeta: NodeMetaMap,
  onSuccess: (nodes: Node<NodeData>[], edges: Edge[]) => void,
  onError?: (error: Error) => void
) => {
  if (!file.name.endsWith('.json')) {
    onError?.(new Error('only support import .json file'));
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const flowData = JSON.parse(e.target?.result as string);
      const { nodes, edges } = convertFromExportFormat(flowData, nodeMeta);
      onSuccess(nodes, edges);
    } catch (error) {
      console.error('import failed:', error);
      onError?.(error as Error);
    }
  };
  reader.readAsText(file);
};

export const importFlow = (
  nodeMeta: NodeMetaMap,
  onSuccess: (nodes: Node<NodeData>[], edges: Edge[]) => void,
  onError?: (error: Error) => void
) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    handleFileImport(file, nodeMeta, onSuccess, onError);
  };
  input.click();
}; 