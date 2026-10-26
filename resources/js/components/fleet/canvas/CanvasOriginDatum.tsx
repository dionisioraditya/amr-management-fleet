interface CanvasOriginDatumProps {
    originSvg: { cx: number; cy: number };
}

export function CanvasOriginDatum({ originSvg }: CanvasOriginDatumProps) {
    return (
        <g
            className="pointer-events-none"
            transform={`translate(${originSvg.cx}, ${originSvg.cy})`}
        >
            {/* Outer Target Ring */}
            <circle
                cx="0"
                cy="0"
                r="14"
                fill="#0b1c30"
                fillOpacity="0.12"
                stroke="#0b1c30"
                strokeDasharray="3 2"
                strokeWidth="1.2"
            />
            {/* ROS +X Axis (Red, Right) */}
            <line
                x1="0"
                y1="0"
                x2="26"
                y2="0"
                stroke="#dc2626"
                strokeWidth="2.2"
            />
            <polygon
                points="26,-3 32,0 26,3"
                fill="#dc2626"
            />
            {/* ROS +Y Axis (Green, Up) */}
            <line
                x1="0"
                y1="0"
                x2="0"
                y2="-26"
                stroke="#16a34a"
                strokeWidth="2.2"
            />
            <polygon
                points="-3,-26 0,-32 3,-26"
                fill="#16a34a"
            />
            {/* Center Origin Dot */}
            <circle
                cx="0"
                cy="0"
                r="3.5"
                fill="#ffffff"
                stroke="#0b1c30"
                strokeWidth="2"
            />
            <rect
                x="6"
                y="5"
                width="84"
                height="14"
                rx="3"
                fill="#0b1c30"
                fillOpacity="0.4"
            />
            <text
                x="10"
                y="14.5"
                fill="#ffffff"
                className="font-mono text-[8px] font-bold"
            >
                ORIGIN [0.0, 0.0]
            </text>
        </g>
    );
}
