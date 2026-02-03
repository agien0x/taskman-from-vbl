import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Agent } from '@/types/agent';
import * as THREE from 'three';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';

interface AgentGraphNodeProps {
  agent: Agent;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
}

export const AgentGraphNode = ({ agent, position, isSelected, onSelect, onClick }: AgentGraphNodeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onSelect();
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
  };

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.2;
      
      // Rotate slowly
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          color={isSelected ? '#8b5cf6' : hovered ? '#a78bfa' : '#6366f1'}
          emissive={isSelected ? '#8b5cf6' : hovered ? '#6366f1' : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {(hovered || isSelected) && (
        <Html distanceFactor={10} center>
          <Card className="p-3 min-w-[200px] bg-card/95 backdrop-blur-sm border-primary/50">
            <div className="flex items-start gap-3">
              {agent.icon_url ? (
                <img src={agent.icon_url} alt={agent.name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
                <p className="text-xs text-muted-foreground">{agent.model}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {agent.prompt.substring(0, 100)}...
                </p>
              </div>
            </div>
          </Card>
        </Html>
      )}

      {/* Glow effect for selected node */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial
            color="#8b5cf6"
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
};
