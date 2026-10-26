export function CanvasSvgDefs() {
    return (
        <defs>
            <linearGradient
                id="storageZoneGradientInteractive"
                x1="0%"
                x2="0%"
                y1="0%"
                y2="100%"
            >
                <stop
                    offset="0%"
                    stopColor="#cfe5ff"
                    stopOpacity="0.65"
                />
                <stop
                    offset="100%"
                    stopColor="#e5eeff"
                    stopOpacity="0.9"
                />
            </linearGradient>

            {/* Diagonal Hazard Stripe Patterns for Keep-Out & Speed-Limit Zones */}
            <pattern
                id="hazardStripesRed"
                width="12"
                height="12"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
            >
                <rect
                    width="12"
                    height="12"
                    fill="#ef4444"
                    fillOpacity="0.16"
                />
                <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="12"
                    stroke="#dc2626"
                    strokeOpacity="0.48"
                    strokeWidth="5"
                />
            </pattern>

            <pattern
                id="hazardStripesAmber"
                width="12"
                height="12"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
            >
                <rect
                    width="12"
                    height="12"
                    fill="#f59e0b"
                    fillOpacity="0.16"
                />
                <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="12"
                    stroke="#d97706"
                    strokeOpacity="0.48"
                    strokeWidth="5"
                />
            </pattern>

            {/* Arrow Marker for 2D Pose Estimate Arrow */}
            <marker
                id="poseEstimateArrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
            >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>

            {/* Cybernetic Blueprint Filter for Real PGM Maps */}
            <filter
                id="cyberneticBlueprintFilter"
                colorInterpolationFilters="sRGB"
            >
                <feColorMatrix
                    type="matrix"
                    values="
                        0.88 0    0    0 0.08
                        0    0.92 0    0 0.11
                        0    0    0.98 0 0.22
                        0    0    0    1 0"
                />
            </filter>

            {/* Red Keep-Out Filter Mask (strictly bounded to image dimensions) */}
            <filter
                id="keepoutRedMaskFilter"
                x="0%"
                y="0%"
                width="100%"
                height="100%"
                colorInterpolationFilters="sRGB"
            >
                <feColorMatrix
                    type="matrix"
                    values="
                        0  0 0 0 0.85
                        0  0 0 0 0.10
                        0  0 0 0 0.10
                        -1 0 0 1 0"
                />
                <feComposite in2="SourceAlpha" operator="in" />
            </filter>

            <pattern
                height="40"
                id="slamNoisePattern"
                patternUnits="userSpaceOnUse"
                width="40"
            >
                <circle
                    cx="4"
                    cy="9"
                    fill="#64748b"
                    opacity="0.35"
                    r="1.3"
                />
                <circle
                    cx="18"
                    cy="16"
                    fill="#475569"
                    opacity="0.45"
                    r="1.5"
                />
                <circle
                    cx="33"
                    cy="24"
                    fill="#94a3b8"
                    opacity="0.4"
                    r="1.2"
                />
                <circle
                    cx="12"
                    cy="34"
                    fill="#64748b"
                    opacity="0.3"
                    r="1.4"
                />
                <circle
                    cx="27"
                    cy="7"
                    fill="#94a3b8"
                    opacity="0.35"
                    r="1.1"
                />
            </pattern>
        </defs>
    );
}
