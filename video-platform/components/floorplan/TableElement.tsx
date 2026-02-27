'use client';

import type { TableShape, TableStatus } from '@/models/FloorPlan';

interface TableElementProps {
  id: string;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  capacity: number;
  status: TableStatus;
  selected?: boolean;
  onClick?: (id: string) => void;
}

const STATUS_COLORS: Record<TableStatus, { fill: string; stroke: string }> = {
  available: { fill: '#22c55e20', stroke: '#22c55e' },
  reserved: { fill: '#eab30820', stroke: '#eab308' },
  occupied: { fill: '#ef444420', stroke: '#ef4444' },
  unavailable: { fill: '#4b556320', stroke: '#4b5563' },
};

export function TableElement({
  id, shape, x, y, width, height, rotation, label, capacity, status, selected, onClick,
}: TableElementProps) {
  const colors = STATUS_COLORS[status];
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return (
    <g
      transform={`rotate(${rotation}, ${centerX}, ${centerY})`}
      onClick={(e) => { e.stopPropagation(); onClick?.(id); }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {shape === 'round' ? (
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={width / 2}
          ry={height / 2}
          fill={colors.fill}
          stroke={selected ? '#ffffff' : colors.stroke}
          strokeWidth={selected ? 3 : 2}
          filter={selected ? 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' : undefined}
        />
      ) : (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={shape === 'rectangular' ? 8 : 4}
          ry={shape === 'rectangular' ? 8 : 4}
          fill={colors.fill}
          stroke={selected ? '#ffffff' : colors.stroke}
          strokeWidth={selected ? 3 : 2}
          filter={selected ? 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' : undefined}
        />
      )}
      <text
        x={centerX}
        y={centerY - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={14}
        fontWeight="600"
        pointerEvents="none"
      >
        {label}
      </text>
      <text
        x={centerX}
        y={centerY + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff80"
        fontSize={11}
        pointerEvents="none"
      >
        {capacity}p
      </text>
    </g>
  );
}
