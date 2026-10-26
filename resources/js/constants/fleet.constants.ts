import type { Vehicle } from '@/types';

export const DEFAULT_SIMULATED_VEHICLES: Vehicle[] = [
    {
        id: 'AMR-01',
        name: 'Titan Runner 01',
        ip_address: '10.32.254.195',
        status: 'moving',
        battery_percentage: 88,
        pose: { id: 1, vehicle_id: 'AMR-01', x: 0.0, y: 0.0, theta: 0.0 },
    },
    {
        id: 'AMR-02',
        name: 'Echo Scout 02',
        ip_address: '10.32.254.196',
        status: 'charging',
        battery_percentage: 42,
        pose: { id: 2, vehicle_id: 'AMR-02', x: 2.5, y: 2.0, theta: 0.0 },
    },
];

export function classifyStation(name: string): {
    category: 'charging' | 'pd' | 'standby';
    label: string;
    icon: string;
} {
    const upper = name.toUpperCase();
    if (upper.includes('CHARGE') || upper.includes('CHG')) {
        return {
            category: 'charging',
            label: 'Supercharge',
            icon: 'bolt',
        };
    }
    if (
        upper.includes('PICK') ||
        upper.includes('DROP') ||
        upper.includes('BAY') ||
        upper.includes('POD')
    ) {
        return {
            category: 'pd',
            label: upper.includes('DROP') ? 'Drop-Off Bay' : 'Pick-Up Bay',
            icon: 'pallet',
        };
    }
    return {
        category: 'standby',
        label: 'Standby / QC',
        icon: 'my_location',
    };
}

export function radToDeg(rad: number): number {
    return Math.round((rad * 180) / Math.PI);
}

export function degToRad(deg: number): number {
    return Number(((deg * Math.PI) / 180).toFixed(4));
}
