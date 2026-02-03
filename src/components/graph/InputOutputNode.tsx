import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Card } from '@/components/ui/card';
import { ArrowRight, Bot } from 'lucide-react';

interface InputOutputNodeProps {
  id: string;
  label: string;
  type: 'input' | 'output';
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}

export const InputOutputNode = ({ id, label, type, position, isSelected, onClick }: InputOutputNodeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle pulsing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + position[1]) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  const color = type === 'input' ? '#3b82f6' : '#10b981';
  const emissiveColor = isSelected ? color : hovered ? color : '#000000';

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[2, 2, 0.5]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={isSelected ? 0.6 : hovered ? 0.4 : 0.1}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {(hovered || isSelected) && (
        <Html distanceFactor={10} center>
          <Card className="p-2 bg-card/95 backdrop-blur-sm border-primary/50">
            <div className="flex items-center gap-2">
              {type === 'input' ? (
                <Bot className="h-4 w-4 text-blue-500" />
              ) : (
                <ArrowRight className="h-4 w-4 text-green-500" />
              )}
              <span className="text-xs font-medium whitespace-nowrap">{label}</span>
            </div>
          </Card>
        </Html>
      )}

      {/* Edge indicator */}
      <mesh 
        position={[type === 'input' ? 1.2 : -1.2, 0, 0]}
        rotation={[0, 0, type === 'input' ? Math.PI / 2 : -Math.PI / 2]}
      >
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};
