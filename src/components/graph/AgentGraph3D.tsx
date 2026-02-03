import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import { Agent, INPUT_TYPES, DESTINATION_TYPES } from '@/types/agent';
import { parseMentions } from '@/utils/mentionParser';
import * as THREE from 'three';
import { AgentGraphNode } from './AgentGraphNode';
import { InputOutputNode } from './InputOutputNode';

interface GraphNode {
  id: string;
  type: 'agent' | 'input' | 'output';
  data: Agent | { type: string; label: string };
  position: [number, number, number];
}

interface GraphEdge {
  from: string;
  to: string;
  type: 'mention' | 'input' | 'output';
}

interface AgentGraph3DProps {
  agents: Agent[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  onAgentClick: (agent: Agent) => void;
  cameraAction: 'zoomIn' | 'zoomOut' | 'reset' | 'fit' | null;
}

const CameraController = ({ cameraAction }: { cameraAction: string | null }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (!cameraAction) return;

    switch (cameraAction) {
      case 'zoomIn':
        camera.position.multiplyScalar(0.8);
        break;
      case 'zoomOut':
        camera.position.multiplyScalar(1.25);
        break;
      case 'reset':
        camera.position.set(0, 0, 50);
        camera.lookAt(0, 0, 0);
        break;
      case 'fit':
        camera.position.set(0, 0, 40);
        break;
    }
  }, [cameraAction, camera]);

  return null;
};

const GraphContent = ({ nodes, edges, selectedNodeId, onNodeSelect, onAgentClick }: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  onAgentClick: (agent: Agent) => void;
}) => {
  return (
    <>
      {/* Render edges */}
      {edges.map((edge, i) => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        
        if (!fromNode || !toNode) return null;

        const color = edge.type === 'mention' ? '#8b5cf6' : edge.type === 'input' ? '#3b82f6' : '#10b981';
        const opacity = edge.type === 'mention' ? 0.6 : 0.3;

        return (
          <Line
            key={`edge-${i}`}
            points={[fromNode.position, toNode.position]}
            color={color}
            lineWidth={edge.type === 'mention' ? 2 : 1}
            opacity={opacity}
            transparent
          />
        );
      })}

      {/* Render nodes */}
      {nodes.map((node) => {
        if (node.type === 'agent') {
          return (
            <AgentGraphNode
              key={node.id}
              agent={node.data as Agent}
              position={node.position}
              isSelected={selectedNodeId === node.id}
              onSelect={() => onNodeSelect(node.id)}
              onClick={() => onAgentClick(node.data as Agent)}
            />
          );
        } else {
          return (
            <InputOutputNode
              key={node.id}
              id={node.id}
              label={(node.data as any).label}
              type={node.type}
              position={node.position}
              isSelected={selectedNodeId === node.id}
              onClick={() => onNodeSelect(node.id)}
            />
          );
        }
      })}
    </>
  );
};

export const AgentGraph3D = ({ agents, selectedNodeId, onNodeSelect, onAgentClick, cameraAction }: AgentGraph3DProps) => {
  const { nodes, edges } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const inputMap = new Map<string, { type: string; label: string }>();
    const outputMap = new Map<string, { type: string; label: string }>();

    // Collect all unique inputs and outputs
    agents.forEach(agent => {
      // Process inputElements
      agent.inputElements?.forEach(input => {
        const inputType = INPUT_TYPES.find(t => t.value === input.type);
        if (inputType && !inputMap.has(input.type)) {
          inputMap.set(input.type, { type: input.type, label: inputType.label });
        }
      });

      // Process outputElements
      agent.outputElements?.forEach(output => {
        const outputType = DESTINATION_TYPES.find(t => t.value === output.type);
        if (outputType && !outputMap.has(output.type)) {
          outputMap.set(output.type, { type: output.type, label: outputType.label });
        }
      });
    });

    // Create input nodes (left side)
    const inputArray = Array.from(inputMap.entries());
    inputArray.forEach(([type, data], i) => {
      const y = (i - inputArray.length / 2) * 8;
      nodes.push({
        id: `input-${type}`,
        type: 'input',
        data,
        position: [-30, y, 0],
      });
    });

    // Create output nodes (right side)
    const outputArray = Array.from(outputMap.entries());
    outputArray.forEach(([type, data], i) => {
      const y = (i - outputArray.length / 2) * 8;
      nodes.push({
        id: `output-${type}`,
        type: 'output',
        data,
        position: [30, y, 0],
      });
    });

    // Create agent nodes (center)
    agents.forEach((agent, i) => {
      const angle = (i / agents.length) * Math.PI * 2;
      const radius = 15;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 10;

      nodes.push({
        id: `agent-${agent.id}`,
        type: 'agent',
        data: agent,
        position: [x, y, z],
      });

      // Create edges for inputs
      agent.inputElements?.forEach(input => {
        edges.push({
          from: `input-${input.type}`,
          to: `agent-${agent.id}`,
          type: 'input',
        });
      });

      // Create edges for outputs
      agent.outputElements?.forEach(output => {
        edges.push({
          from: `agent-${agent.id}`,
          to: `output-${output.type}`,
          type: 'output',
        });
      });

      // Parse mentions from prompt
      const segments = parseMentions(agent.prompt);
      segments.forEach(segment => {
        if (segment.type === 'agent' && segment.id) {
          edges.push({
            from: `agent-${agent.id}`,
            to: `agent-${segment.id}`,
            type: 'mention',
          });
        }
      });
    });

    return { nodes, edges };
  }, [agents]);

  return (
    <Canvas camera={{ position: [0, 0, 50], fov: 60 }}>
      <CameraController cameraAction={cameraAction} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <GraphContent
        nodes={nodes}
        edges={edges}
        selectedNodeId={selectedNodeId}
        onNodeSelect={onNodeSelect}
        onAgentClick={onAgentClick}
      />
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={100}
      />
    </Canvas>
  );
};
