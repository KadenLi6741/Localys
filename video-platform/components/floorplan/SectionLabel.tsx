'use client';

interface SectionLabelProps {
  x: number;
  y: number;
  name: string;
  color: string;
}

export function SectionLabel({ x, y, name, color }: SectionLabelProps) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={12}
      fontWeight="600"
      opacity={0.7}
    >
      {name.toUpperCase()}
    </text>
  );
}
