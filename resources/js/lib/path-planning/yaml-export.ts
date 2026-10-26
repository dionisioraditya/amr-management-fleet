import { discretizeFilletedPathForRos2 } from '@/components/fleet/interactive-blueprint-canvas';
import type { Pathplan } from '@/types';

export function exportPathToYaml(
    path: Pathplan,
    effectiveCornerRadius: number,
    inflationCorridor: number,
): void {
    const densePoses = discretizeFilletedPathForRos2(
        path.coordinates ?? [],
        effectiveCornerRadius,
        0.15,
    );
    const yamlContent = [
        `# ROS 2 Nav2 Virtual Guidance Path & Fillet Trajectory Export`,
        `path_name: "${path.name}"`,
        `map_id: ${path.map_id}`,
        `is_bidirectional: ${path.is_bidirectional}`,
        `max_linear_velocity: ${path.max_speed}`,
        `default_corner_fillet_radius_m: ${effectiveCornerRadius}`,
        `safety_inflation_corridor_m: ${inflationCorridor}`,
        `control_vertices:`,
        ...(path.coordinates ?? []).map(
            (pt, i) =>
                `  - index: ${i}\n    x: ${pt.x}\n    y: ${pt.y}\n    corner_radius_m: ${pt.r ?? effectiveCornerRadius}`,
        ),
        `discretized_nav2_poses:`,
        ...densePoses.map(
            (pose, i) =>
                `  - seq: ${i}\n    x: ${pose.x}\n    y: ${pose.y}\n    theta: ${pose.theta}\n    curvature_k: ${pose.kappa}`,
        ),
    ].join('\n');

    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${path.name.toLowerCase().replace(/\s+/g, '_')}_nav2.yaml`;
    a.click();
    URL.revokeObjectURL(url);
}
