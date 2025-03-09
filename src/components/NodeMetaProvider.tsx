import React, { createContext, useContext, useState, useEffect } from 'react';
import { NodeMetaMap } from '@/types';
import { fetchNodeMetas } from '@/api';

const NodeMetaContext = createContext<NodeMetaMap | null>(null);

export function NodeMetaProvider({ children }: { children: React.ReactNode }) {
  const [nodeMetas, setNodeMetas] = useState<NodeMetaMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 在组件挂载时从后端获取节点元数据
    const loadNodeMetas = async () => {
      try {
        const data = await fetchNodeMetas();
        setNodeMetas(data);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch node metadata:', error);
        setError('Failed to fetch node metadata. Please refresh the page and try again later.');
      }
    };

    loadNodeMetas();
  }, []);

  return (
    <NodeMetaContext.Provider value={nodeMetas}>
      {error ? (
        <div className="p-4 text-red-500 text-center">{error}</div>
      ) : nodeMetas ? (
        children
      ) : (
        <></>
      )}
    </NodeMetaContext.Provider>
  );
}

export function useNodeMeta(): NodeMetaMap {
  const context = useContext(NodeMetaContext);
  if (context === null) {
    throw new Error('useNodeMeta must be used within a NodeMetaProvider');
  }
  return context;
}
