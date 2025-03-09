import { NodeMetaMap, ExecuteGraphRequest, ExecuteGraphResponse } from '@/types';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function fetchNodeMetas(): Promise<NodeMetaMap> {
    const response = await fetch(`${apiUrl}/node-metas`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.json();

    if (json.status !== 'success') {
        throw new Error(json.message || 'Failed to fetch node metas');
    }

    const nodeMetas: NodeMetaMap = json.data;

    Object.keys(nodeMetas).forEach(key => {
        nodeMetas[key].generic_types = nodeMetas[key].generic_types ?? [];
    });

    return nodeMetas;
}

export async function executeGraph(request: ExecuteGraphRequest): Promise<ExecuteGraphResponse> {
    const response = await fetch(`${apiUrl}/execute-graph`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.json();

    if (json.status !== 'success') {
        throw new Error(json.message || 'execution failed');
    }

    return json;
}

export type GraphExecutionEvent =
    | { type: 'execute_node'; nodeId: string }
    | { type: 'execute_node_error'; nodeId: string; error: string }
    | { type: 'display'; nodeId: string; data: Record<string, unknown> }
    | { type: 'append'; nodeId: string; data: Record<string, unknown> }
    | { type: 'finish' };

export async function executeGraphWithProgress(
    request: ExecuteGraphRequest,
    onEvent: (event: GraphExecutionEvent) => void,
    onError: (error: string) => void
) {
    try {
        await fetchEventSource(`${apiUrl}/execute-graph-with-progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
            onmessage(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.error) {
                        onError(data.error);
                        return;
                    }
                    if (data.event === 'execute_node') {
                        onEvent({ type: 'execute_node', nodeId: data.node_id });
                    } else if (data.event === 'execute_node_error') {
                        onEvent({ type: 'execute_node_error', nodeId: data.node_id, error: data.node_error });
                    } else if (data.event === 'display') {
                        onEvent({ type: 'display', nodeId: data.node_id, data: data.data });
                    } else if (data.event === 'append') {
                        onEvent({ type: 'append', nodeId: data.node_id, data: data.data });
                    } else if (data.event === 'finish') {
                        onEvent({ type: 'finish' });
                    }
                } catch (e) {
                    console.error('failed to parse event data:', e);
                }
            },
            onerror(err) {
                onError(err instanceof Error ? err.message : String(err));
            },
        });
    } catch (error) {
        onError(error instanceof Error ? error.message : String(error));
    }
}
