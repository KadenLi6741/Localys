'use client';

import { useRef } from 'react';
import type { FloorPlan, RestaurantTable, SectionElement } from '@/models/FloorPlan';
import { TableElement } from './TableElement';
import { SectionLabel } from './SectionLabel';

interface FloorPlanCanvasProps {
  floorPlan: FloorPlan | null;
  tables: RestaurantTable[];
  selectedTableId?: string | null;
  onTableClick?: (tableId: string) => void;
  onCanvasClick?: () => void;
  width?: number;
  height?: number;
}

export function FloorPlanCanvas({
  floorPlan,
  tables,
  selectedTableId,
  onTableClick,
  onCanvasClick,
  width = 900,
  height = 600,
}: FloorPlanCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const sections = floorPlan?.layout_data?.sections || [];
  const walls = floorPlan?.layout_data?.walls || [];

  return (
    <div className="relative overflow-auto bg-black/40 border border-white/10 rounded-lg">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="select-none"
        onClick={(e) => {
          if (e.target === svgRef.current) onCanvasClick?.();
        }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff08" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {sections.map((section: SectionElement) => (
          <g key={section.id}>
            <rect
              x={section.x}
              y={section.y}
              width={section.width}
              height={section.height}
              fill={`${section.color}15`}
              stroke={`${section.color}40`}
              strokeWidth={1}
              strokeDasharray="8 4"
              rx={8}
            />
            <SectionLabel
              x={section.x + 8}
              y={section.y + 20}
              name={section.name}
              color={section.color}
            />
          </g>
        ))}

        {walls.map((wall) => (
          <line
            key={wall.id}
            x1={wall.x1}
            y1={wall.y1}
            x2={wall.x2}
            y2={wall.y2}
            stroke="#ffffff40"
            strokeWidth={wall.thickness || 4}
            strokeLinecap="round"
          />
        ))}

        {tables.map((table) => (
          <TableElement
            key={table.id}
            id={table.id}
            shape={table.shape}
            x={table.x}
            y={table.y}
            width={table.width}
            height={table.height}
            rotation={table.rotation}
            label={table.label}
            capacity={table.capacity}
            status={table.status}
            selected={table.id === selectedTableId}
            onClick={onTableClick}
          />
        ))}
      </svg>
    </div>
  );
}
