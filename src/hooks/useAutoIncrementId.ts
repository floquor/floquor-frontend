import { useState } from 'react';
import { Node } from '@xyflow/react';
import { NodeData } from '@/types';

export function getMaxId(nodes: Node<NodeData>[]) {
    return nodes.reduce((max, node) => {
        const numId = parseInt(node.id);
        return !isNaN(numId) ? Math.max(max, numId) : max;
    }, 0);
}

export function useAutoIncrementId(initialNextId: number = 1) {
    const [nextId, setNextId] = useState(initialNextId);

    const getNextId = () => {
        const currentId = nextId;
        setNextId(currentId + 1);
        return currentId.toString();
    };

    const resetIdCounter = () => {
        setNextId(1);
    };

    return {
        getNextId,
        setNextId,
        resetIdCounter,
    };
} 