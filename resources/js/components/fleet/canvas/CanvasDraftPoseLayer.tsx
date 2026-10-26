interface CanvasDraftPoseLayerProps {
    mode: string;
    poseEstimateOrigin: { x: number; y: number; cx: number; cy: number } | null;
    poseEstimateCurrent: {
        x: number;
        y: number;
        cx: number;
        cy: number;
        theta: number;
    } | null;
    cursorMetric: { x: number; y: number };
    cursorSvg: { cx: number; cy: number };
}

export function CanvasDraftPoseLayer({
    mode,
    poseEstimateOrigin,
    poseEstimateCurrent,
    cursorMetric,
    cursorSvg,
}: CanvasDraftPoseLayerProps) {
    if (mode !== 'pose-estimate') return null;

    // RViz 2D Pose Estimate Active Drag-to-Aim Arrow
    if (poseEstimateOrigin && poseEstimateCurrent) {
        return (
            <g className="pointer-events-none">
                {/* Origin Base Dot & Radial Target Radar */}
                <circle
                    cx={poseEstimateOrigin.cx}
                    cy={poseEstimateOrigin.cy}
                    r="14"
                    fill="#10b981"
                    fillOpacity="0.2"
                    stroke="#10b981"
                    strokeWidth="2"
                />
                <circle
                    cx={poseEstimateOrigin.cx}
                    cy={poseEstimateOrigin.cy}
                    r="4"
                    fill="#10b981"
                />

                {/* Heading Vector Line & Arrowhead */}
                <line
                    x1={poseEstimateOrigin.cx}
                    y1={poseEstimateOrigin.cy}
                    x2={poseEstimateCurrent.cx}
                    y2={poseEstimateCurrent.cy}
                    stroke="#10b981"
                    strokeWidth="3"
                    markerEnd="url(#poseEstimateArrow)"
                />

                {/* Angle Degrees HUD Badge */}
                <g
                    transform={`translate(${poseEstimateCurrent.cx + 12}, ${poseEstimateCurrent.cy - 12})`}
                >
                    <rect
                        fill="#0b1c30"
                        fillOpacity="0.4"
                        height="22"
                        rx="4"
                        width="136"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        className="drop-shadow-md"
                    />
                    <text
                        className="font-mono text-[9px] font-bold"
                        fill="#6ee7b7"
                        x="8"
                        y="14"
                    >
                        θ: {Math.round((poseEstimateCurrent.theta * 180) / Math.PI)}° (
                        {poseEstimateCurrent.theta.toFixed(2)} rad)
                    </text>
                </g>
            </g>
        );
    }

    // Idle Hover Crosshair in Pose Estimate Mode
    return (
        <g
            className="pointer-events-none"
            transform={`translate(${cursorSvg.cx}, ${cursorSvg.cy})`}
        >
            <circle
                cx="0"
                cy="0"
                fill="#10b981"
                fillOpacity="0.15"
                r="20"
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth="1.5"
            />
            <circle cx="0" cy="0" fill="#10b981" r="3.5" />
            <rect
                fill="#0b1c30"
                fillOpacity="0.4"
                height="20"
                rx="3"
                width="128"
                x="12"
                y="-24"
            />
            <text
                className="font-mono text-[9px] font-bold"
                fill="#a7f3d0"
                x="16"
                y="-10"
            >
                DRAG ARROW: [{cursorMetric.x.toFixed(2)}, {cursorMetric.y.toFixed(2)}]
            </text>
        </g>
    );
}
