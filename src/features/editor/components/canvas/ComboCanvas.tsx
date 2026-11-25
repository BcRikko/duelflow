import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStoreApi,
  type Connection as RFConnection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StepWithoutIdPosition } from '../../model/form';
import { detectCardTypeCategory } from '../../../../shared/cardType';
import { useComboStore } from '../../store/comboStore';
import { ActionNode } from '../nodes/ActionNode';
import { NoteNode } from '../nodes/NoteNode';
import { EditableEdge } from '../edges/EditableEdge';
import { CanvasControls } from './CanvasControls';
import { CopyrightNotice } from './CopyrightNotice';
import { NeuronImportDialog } from '../../../neuron/components/NeuronImportDialog';
import { PlusIcon } from '../../../../components/icons';
import { getSnapPosition } from './snap';
import { SelectionToolbar } from './SelectionToolbar';
import demoPng from '../../../../../docs/images/demo.png';
import styles from './ComboCanvas.module.css';
import { getSelectedStepIds } from '../../store/types';

const nodeTypes = {
  actionNode: ActionNode,
  noteNode: NoteNode,
};

const edgeTypes = {
  editableEdge: EditableEdge,
};

function CanvasContent() {
  const currentDeck = useComboStore((state) => state.currentDeck);
  const route = currentDeck?.route ?? null;
  const cardCatalog = useComboStore((state) => state.cards);
  const selection = useComboStore((state) => state.selection);
  const addNodeForm = useComboStore((state) => state.addNodeForm);
  const isNodeEditing = useComboStore((state) => state.isNodeEditing);
  const selectStep = useComboStore((state) => state.selectStep);
  const toggleStepSelection = useComboStore((state) => state.toggleStepSelection);
  const selectConnection = useComboStore((state) => state.selectConnection);
  const addConnection = useComboStore((state) => state.addConnection);
  const updateConnectionEndpoints = useComboStore((state) => state.updateConnectionEndpoints);
  const updateStepPositions = useComboStore((state) => state.updateStepPositions);
  const addStepAtPosition = useComboStore((state) => state.addStepAtPosition);
  const deleteStep = useComboStore((state) => state.deleteStep);
  const deleteSteps = useComboStore((state) => state.deleteSteps);
  const deleteConnection = useComboStore((state) => state.deleteConnection);
  const clearSelection = useComboStore((state) => state.clearSelection);

  const { screenToFlowPosition, zoomTo, getZoom } = useReactFlow();
  const store = useStoreApi();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const cardMap = useMemo(() => new Map(cardCatalog.map((c) => [c.id, c])), [cardCatalog]);

  const structureKey = useMemo(
    () =>
      route
        ? `${route.id}|${route.steps.map((s) => s.id).join(',')}|${route.connections.map((c) => c.id).join(',')}`
        : '',
    [route],
  );

  const defaultViewport = useMemo(() => {
    if (!route) {
      return { x: 0, y: 0, zoom: 1 };
    }

    let minX = Infinity;
    let minY = Infinity;
    for (const step of route.steps) {
      minX = Math.min(minX, step.position.x);
      minY = Math.min(minY, step.position.y);
    }
    const padding = 20;
    return {
      x: minX === Infinity ? 0 : -minX + padding,
      y: minY === Infinity ? 0 : -minY + padding,
      zoom: 1,
    };
  }, [route]);

  /* Sync domain model to React Flow nodes/edges when route structure changes */
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!route) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];

    for (const step of route.steps) {
      if (step.type === 'action') {
        const card = cardMap.get(step.cardId);
        rfNodes.push({
          id: step.id,
          type: 'actionNode',
          position: step.position,
          data: {
            cardName: card?.name ?? '不明なカード',
            actions: step.actions,
            cardId: step.cardId,
            cardType: detectCardTypeCategory(card?.type ?? ''),
            description: step.description,
            cardDescription: card?.description,
            relatedCards: step.relatedCards,
          },
        });
      } else {
        rfNodes.push({
          id: step.id,
          type: 'noteNode',
          position: step.position,
          data: {
            description: step.description,
          },
        });
      }
    }

    for (const conn of route.connections) {
      rfEdges.push({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        label: conn.label,
        type: 'editableEdge',
        style: {
          stroke: conn.label ? '#1976d2' : '#999',
          strokeWidth: conn.label ? 2 : 1,
        },
      });
    }

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [structureKey, cardCatalog, route, setNodes, setEdges]);

  // Data sync effect: update node data and edge labels when step/connection data changes
  // without changing positions
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const step = route?.steps.find((s) => s.id === node.id);
        if (!step) return node;

        if (step.type === 'action') {
          const card = cardMap.get(step.cardId);
          const nextData = {
            cardName: card?.name ?? '不明なカード',
            actions: step.actions,
            cardId: step.cardId,
            cardType: detectCardTypeCategory(card?.type ?? ''),
            description: step.description,
            cardDescription: card?.description,
            relatedCards: step.relatedCards,
          };
          const prevData = node.data as typeof nextData;
          if (
            prevData.cardName === nextData.cardName &&
            prevData.cardId === nextData.cardId &&
            prevData.cardType === nextData.cardType &&
            prevData.description === nextData.description &&
            prevData.cardDescription === nextData.cardDescription &&
            JSON.stringify(prevData.actions) === JSON.stringify(nextData.actions) &&
            JSON.stringify(prevData.relatedCards) === JSON.stringify(nextData.relatedCards)
          ) {
            return node;
          }
          return { ...node, data: nextData };
        }

        const nextData = { description: step.description };
        const prevData = node.data as typeof nextData;
        if (prevData.description === nextData.description) {
          return node;
        }
        return { ...node, data: nextData };
      }),
    );

    setEdges((current) =>
      current.map((edge) => {
        const conn = route?.connections.find((c) => c.id === edge.id);
        if (!conn) return edge;
        const nextStyle = {
          stroke: conn.label ? '#1976d2' : '#999',
          strokeWidth: conn.label ? 2 : 1,
        };
        if (edge.label === conn.label && JSON.stringify(edge.style) === JSON.stringify(nextStyle)) {
          return edge;
        }
        return {
          ...edge,
          label: conn.label,
          style: nextStyle,
        };
      }),
    );
  }, [route, cardMap, setNodes, setEdges]);

  // Selection effect: update selected flags without changing positions
  useEffect(() => {
    const selectedStepIds = new Set(getSelectedStepIds(selection));
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: selectedStepIds.has(node.id),
      })),
    );
    setEdges((current) =>
      current.map((edge) => ({
        ...edge,
        selected: selection?.type === 'connection' && selection.id === edge.id,
      })),
    );
  }, [selection, setNodes, setEdges]);

  // Keyboard shortcuts for deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;

      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable)
      ) {
        return;
      }

      if (selection?.type === 'connection') {
        deleteConnection(selection.id);
      } else if (selection?.type === 'step') {
        deleteStep(selection.id);
      } else if (selection?.type === 'steps') {
        deleteSteps(selection.ids);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, deleteConnection, deleteStep, deleteSteps]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (event.metaKey || event.ctrlKey) {
        toggleStepSelection(node.id);
      } else {
        selectStep(node.id);
      }
    },
    [selectStep, toggleStepSelection],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectConnection(edge.id);
    },
    [selectConnection],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const onConnect = useCallback(
    (connection: RFConnection) => {
      if (connection.source && connection.target) {
        addConnection({
          source: connection.source,
          target: connection.target,
        });
      }
    },
    [addConnection],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: RFConnection) => {
      if (newConnection.source && newConnection.target) {
        updateConnectionEndpoints(oldEdge.id, newConnection.source, newConnection.target);
      }
    },
    [updateConnectionEndpoints],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      const selectedStepIds = new Set(getSelectedStepIds(useComboStore.getState().selection));
      const draggedNodes =
        selectedStepIds.size > 1 && selectedStepIds.has(node.id)
          ? nodes.filter((n) => selectedStepIds.has(n.id))
          : [node];
      const otherNodes = nodes.filter((n) => !selectedStepIds.has(n.id));

      const updates = draggedNodes.map((target) => {
        const { x, y } = getSnapPosition(target, otherNodes);
        return { stepId: target.id, position: { x, y } };
      });
      updateStepPositions(updates);
    },
    [nodes, updateStepPositions],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!route) {
        // eslint-disable-next-line no-alert
        alert('デッキが選択されていません。');
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const isNote = event.dataTransfer.getData('application/duelflow-note') === '1';
      if (isNote) {
        addStepAtPosition({ type: 'note', description: '' }, position);
        return;
      }

      const cardId = event.dataTransfer.getData('application/duelflow-card');
      if (!cardId) return;

      const card = cardCatalog.find((c) => c.id === cardId);
      if (!card) return;

      const newStep: StepWithoutIdPosition = {
        type: 'action',
        actions: addNodeForm.type === 'action' ? addNodeForm.actions : [],
        cardId: card.id,
        relatedCards: [],
        description: '',
      };

      addStepAtPosition(newStep, position);
    },
    [addStepAtPosition, addNodeForm, cardCatalog, route, screenToFlowPosition],
  );

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      if (isNodeEditing) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.metaKey || e.ctrlKey) {
        const nextZoom = getZoom() - e.deltaY * 0.001;
        zoomTo(nextZoom);
        return;
      }

      if (e.shiftKey) {
        const deltaX = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        store.getState().panBy({ x: deltaX, y: 0 });
        return;
      }

      store.getState().panBy({ x: 0, y: -e.deltaY });
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [getZoom, isNodeEditing, store, zoomTo]);

  if (!route) {
    return <EmptyDeckAnnouncement />;
  }

  const isRouteEmpty = route.steps.length === 0;

  return (
    <div ref={canvasRef} className={styles.canvas}>
      {isRouteEmpty ? (
        <div className={styles.emptyRouteOverlay} aria-hidden="true">
          <div className={styles.emptyRouteMessage}>
            <p className={styles.emptyRouteTitle}>カードをここにドラッグ＆ドロップしてください</p>
            <p className={styles.emptyRouteDescription}>
              左サイドバーのカード一覧からキャンバスにドラッグすると、ノードが作成されます。
            </p>
          </div>
        </div>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onReconnect={onReconnect}
        edgesReconnectable
        reconnectRadius={20}
        onNodeDragStop={onNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        defaultViewport={defaultViewport}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
        minZoom={0.5}
        maxZoom={2}
        nodesDraggable={!isNodeEditing}
        nodesConnectable
        attributionPosition="bottom-right"
      >
        <Background gap={16} size={1} />
        <CanvasControls />
        <SelectionToolbar />
        <CopyrightNotice />
      </ReactFlow>
    </div>
  );
}

function EmptyDeckAnnouncement() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.empty}>
      <div
        className={styles.demoBackground}
        style={{ backgroundImage: `url(${demoPng})` }}
        aria-hidden="true"
        data-testid="demo-background"
      />
      <div className={styles.emptyContent}>
        <p className={styles.emptyTitle}>まずは「デッキを追加」しましょう</p>
        <p className={styles.emptyDescription}>
          サイドバーにカード一覧が表示されるので、ドラッグ＆ドロップで展開ルートがつくれます。
        </p>
        <button
          type="button"
          className={styles.emptyAddButton}
          onClick={() => setIsOpen(true)}
        >
          <PlusIcon className={styles.emptyAddIcon} />
          デッキを追加
        </button>
      </div>
      {isOpen ? <NeuronImportDialog onClose={() => setIsOpen(false)} /> : null}
    </div>
  );
}

export function ComboCanvas() {
  return (
    <div className={styles.canvas}>
      <ReactFlowProvider>
        <CanvasContent />
      </ReactFlowProvider>
    </div>
  );
}
