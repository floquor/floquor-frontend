import { useState, useCallback } from 'react';
import { Node, Edge, useReactFlow } from '@xyflow/react';
import { BsCheck } from 'react-icons/bs';
import { MenuItem, ExecutionType, NodeMetaMap, NodePort, NodeData, NodeInputs, SaveHistoryType } from '@/types';
import { toast } from 'react-hot-toast';
import { createElement } from 'react';

interface UseFlowContextMenuProps {
    nodes: Node<NodeData>[];
    setNodes: (updater: (nodes: Node<NodeData>[]) => Node<NodeData>[]) => void;
    nodeMeta: NodeMetaMap;
    setSaveHistoryType: (value: SaveHistoryType) => void;
    getNextId: () => string;
}

interface ContextMenu {
    x: number;
    y: number;
    title?: string;
    menuItems: MenuItem[];
}

interface MenuItemStructure {
    label: string;
    children?: MenuItemStructure[];
    onClick?: () => void;
}

const startId = 'start';

export function useFlowContextMenu({
    nodes,
    setNodes,
    nodeMeta,
    setSaveHistoryType,
    getNextId
}: UseFlowContextMenuProps) {
    const { screenToFlowPosition, setEdges } = useReactFlow();
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const getDefaultInputs = useCallback((nodeType: string): NodeInputs => {
        const defaultInputs: { [key: string]: string | number | boolean } = {};
        nodeMeta[nodeType].inputs.forEach((input: NodePort) => {
            if (input.options?.default) {
                defaultInputs[input.name] = input.options.default;
                return;
            }
            switch (input.type) {
                case 'int':
                    defaultInputs[input.name] = 0;
                    break;
                case 'float':
                    defaultInputs[input.name] = 0.0;
                    break;
                case 'str':
                    defaultInputs[input.name] = '';
                    break;
                case 'bool':
                    defaultInputs[input.name] = false;
                    break;
            }
        });
        return defaultInputs;
    }, [nodeMeta]);

    const handleAddNode = useCallback((nodeType: string, menuPosition: { x: number, y: number }) => {
        const position = screenToFlowPosition({
            x: menuPosition.x,
            y: menuPosition.y
        });

        const newId = getNextId();
        const newNode: Node<NodeData> = {
            id: newId,
            type: 'standard',
            position,
            data: {
                id: newId,
                nodeType,
                executionType: nodeMeta[nodeType].execution || ExecutionType.TRIGGERED,
                inputs: getDefaultInputs(nodeType),
                generic_types: {}
            }
        };

        setNodes((nds) => [...nds, newNode]);
        setSaveHistoryType(SaveHistoryType.SAVE);
    }, [nodeMeta, setNodes, setSaveHistoryType, screenToFlowPosition, getDefaultInputs, getNextId]);

    const handleDeleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter(node => node.id !== nodeId));
        setSaveHistoryType(SaveHistoryType.SAVE);
    }, [setNodes, setSaveHistoryType]);

    const handleDuplicateNode = useCallback((nodeId: string) => {
        const nodeToClone = nodes.find(node => node.id === nodeId);
        if (!nodeToClone || !nodeToClone.data) return;

        const newId = getNextId();
        const newNode: Node<NodeData> = {
            ...nodeToClone,
            id: newId,
            position: {
                x: nodeToClone.position.x + 100,
                y: nodeToClone.position.y + 100
            },
            selected: true,
            data: {
                id: newId,
                nodeType: nodeToClone.data.nodeType,
                executionType: nodeToClone.data.executionType,
                inputs: { ...nodeToClone.data.inputs },
                generic_types: {}
            }
        };

        setNodes((nds) => [
            ...nds.map(node => ({
                ...node,
                selected: false
            })),
            newNode
        ]);

        setSaveHistoryType(SaveHistoryType.SAVE);
    }, [nodes, setNodes, setSaveHistoryType, getNextId]);

    const handleChangeNodeExecutionType = useCallback((nodeId: string, executionType: ExecutionType) => {
        if (nodeId === startId && executionType !== ExecutionType.TRIGGERED) {
            toast.error('Start node can only use triggered execution mode');
            return;
        }

        // 如果起始节点从触发模式改为非触发模式，则原先连接触发Handle的边要删除
        const node = nodes.find(n => n.id === nodeId);
        if (node?.data.executionType === ExecutionType.TRIGGERED && executionType !== ExecutionType.TRIGGERED) {
            setEdges((edges: Edge[]) => edges.filter((edge: Edge) => {
                const isSourceEdge = edge.source === nodeId && edge.sourceHandle === '_';
                const isTargetEdge = edge.target === nodeId && edge.targetHandle === '_';
                return !(isSourceEdge || isTargetEdge);
            }));
        }

        setNodes((nds) => nds.map(node => node.id === nodeId ? { ...node, data: { ...node.data, executionType } } : node));
        setSaveHistoryType(SaveHistoryType.SAVE);
    }, [setNodes, setSaveHistoryType, nodes, setEdges]);

    const buildPaneMenuItems = useCallback((x: number, y: number) => {
        const nodesByCategory: { [key: string]: typeof nodeMeta } = {};
        Object.entries(nodeMeta).forEach((entry) => {
            const [nodeType, node] = entry;
            if (!nodesByCategory[node.category]) {
                nodesByCategory[node.category] = {};
            }
            nodesByCategory[node.category][nodeType] = node;
        });

        const buildNestedMenu = () => {
            const menuStructure: MenuItemStructure[] = [];

            Object.entries(nodesByCategory)
                .filter(([category]) => category !== '_')
                .forEach(([category, nodes]) => {
                    const categories = category.includes('/') ? category.split('/') : [category];

                    const findOrCreateSubmenu = (
                        menuItems: MenuItemStructure[],
                        path: string[],
                        currentIndex: number,
                        nodeType?: string,
                        node?: typeof nodeMeta[keyof typeof nodeMeta]
                    ) => {
                        const currentCategory = path[currentIndex];

                        let menuItem = menuItems.find(item => item.label === currentCategory);

                        if (!menuItem) {
                            menuItem = {
                                label: currentCategory,
                                children: []
                            };
                            menuItems.push(menuItem);
                        }

                        if (!menuItem.children) {
                            menuItem.children = [];
                        }

                        if (currentIndex === path.length - 1 && nodeType && node) {
                            menuItem.children.push({
                                label: node.title,
                                onClick: () => handleAddNode(nodeType, { x, y })
                            });
                        }
                        else if (currentIndex < path.length - 1) {
                            findOrCreateSubmenu(menuItem.children, path, currentIndex + 1, nodeType, node);
                        }

                        return menuItems;
                    };

                    Object.entries(nodes).forEach(([nodeType, node]) => {
                        findOrCreateSubmenu(menuStructure, categories, 0, nodeType, node);
                    });
                });

            return menuStructure;
        };

        return [{
            label: 'Add node',
            children: buildNestedMenu()
        }];
    }, [nodeMeta, handleAddNode]);

    const executionTypeToTip = useCallback((type: ExecutionType) => {
        switch (type) {
            case ExecutionType.TRIGGERED:
                return 'when triggered';
            case ExecutionType.DATA:
                return 'when output is needed';
            case ExecutionType.DATA_ONCE:
                return 'when output is needed, and cache result';
            default:
                throw new Error(`Unknown execution type: ${type}`);
        }
    }, []);

    const buildNodeMenuItems = useCallback((nodeId: string) => {
        const currentNode = nodes.find(node => node.id === nodeId);
        const menuItems: MenuItem[] = [{
            label: 'Trigger mode',
            children: Object.values(ExecutionType)
                .filter(type => nodeId !== startId || type === ExecutionType.TRIGGERED)
                .map(type => ({
                    label: type,
                    icon: currentNode?.data.executionType === type ? createElement(BsCheck) : undefined,
                    onClick: () => handleChangeNodeExecutionType(nodeId, type),
                    tip: executionTypeToTip(type)
                }))
        }];

        if (nodeId !== startId) {
            menuItems.push({
                label: 'Duplicate',
                onClick: () => handleDuplicateNode(nodeId)
            });

            menuItems.push({
                label: 'Delete node',
                onClick: () => handleDeleteNode(nodeId)
            });
        }

        return menuItems;
    }, [handleDeleteNode, handleChangeNodeExecutionType, handleDuplicateNode, nodes, executionTypeToTip]);

    const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
        event.preventDefault();
        setContextMenu({ x: event.pageX, y: event.pageY, menuItems: buildPaneMenuItems(event.pageX, event.pageY) });
    }, [buildPaneMenuItems]);

    const onNodeContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>, node: Node) => {
        event.preventDefault();
        setContextMenu({ x: event.pageX, y: event.pageY, title: `Node: ${node.id}`, menuItems: buildNodeMenuItems(node.id) });
    }, [buildNodeMenuItems]);

    return {
        contextMenu,
        closeContextMenu,
        onPaneContextMenu,
        onNodeContextMenu
    };
} 