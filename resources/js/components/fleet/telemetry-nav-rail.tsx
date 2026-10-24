import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavRailItem {
    id: string;
    title: string;
    href: string;
    icon: string;
}

const primaryNavItems: NavRailItem[] = [
    {
        id: 'live-map',
        title: 'Live Map',
        href: '/dashboard',
        icon: 'radar',
    },
    {
        id: 'stations',
        title: 'Stations',
        href: '/stations',
        icon: 'ev_station',
    },
    {
        id: 'robots',
        title: 'Robots',
        href: '/robots',
        icon: 'precision_manufacturing',
    },
    {
        id: 'path-planning',
        title: 'Path Planning',
        href: '/path-planning',
        icon: 'alt_route',
    },
    {
        id: 'map-studio',
        title: 'Map Studio',
        href: '/map-studio',
        icon: 'polyline',
    },
    {
        id: 'event-logs',
        title: 'Event Logs',
        href: '/event-logs',
        icon: 'terminal',
    },
];

export function TelemetryNavRail() {
    const { url } = usePage();
    const [rosModalOpen, setRosModalOpen] = useState(false);
    const [docsModalOpen, setDocsModalOpen] = useState(false);

    const isActivePath = (href: string) => {
        if (href === '/dashboard') {
            return url === '/dashboard' || url.startsWith('/dashboard?');
        }
        return url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`);
    };

    const isSettingsActive = url.startsWith('/settings');

    return (
        <>
            <aside className="fixed top-16 bottom-0 left-0 z-40 flex w-16 flex-col justify-between border-r border-slate-200/80 bg-surface-container-lowest py-space-md shadow-[1px_0_6px_rgba(0,0,0,0.03)]">
                {/* Top Primary Fleet Modules */}
                <nav
                    aria-label="Primary Fleet Modules"
                    className="flex w-full flex-col items-center gap-space-sm"
                >
                    {primaryNavItems.map((item) => {
                        const active = isActivePath(item.href);
                        return (
                            <Tooltip key={item.id}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        data-path={item.id}
                                        className={`group relative flex h-11 w-11 items-center justify-center rounded-lg transition-all ${
                                            active
                                                ? 'bg-surface-container font-bold text-primary shadow-sm'
                                                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                                        }`}
                                    >
                                        {active && (
                                            <span className="absolute top-1.5 bottom-1.5 -left-1.5 w-[3px] rounded-r-full bg-primary-container" />
                                        )}
                                        <span className="material-symbols-outlined text-[22px]">
                                            {item.icon}
                                        </span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="font-label-md text-xs">
                                    {item.title}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>

                {/* Bottom Utility & ROS2 Bridge Controls */}
                <nav
                    aria-label="System & ROS2 Utilities"
                    className="flex w-full flex-col items-center gap-space-sm border-t border-slate-100 pt-space-sm"
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href="/settings/profile"
                                data-path="system-settings"
                                aria-current={
                                    isSettingsActive ? 'page' : undefined
                                }
                                className={`group relative flex h-11 w-11 items-center justify-center rounded-lg transition-all ${
                                    isSettingsActive
                                        ? 'bg-surface-container font-bold text-primary shadow-sm'
                                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                                }`}
                            >
                                {isSettingsActive && (
                                    <span className="absolute top-1.5 bottom-1.5 -left-1.5 w-[3px] rounded-r-full bg-primary-container" />
                                )}
                                <span className="material-symbols-outlined text-[20px]">
                                    settings
                                </span>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-label-md text-xs">
                            System Settings
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => setRosModalOpen(true)}
                                data-path="ros2-bridge"
                                className="group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    hub
                                </span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-label-md text-xs">
                            ROS2 Bridge Config
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => setDocsModalOpen(true)}
                                data-path="documentation"
                                className="group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    help
                                </span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-label-md text-xs">
                            Help & Docs
                        </TooltipContent>
                    </Tooltip>
                </nav>
            </aside>

            {/* ROS2 Bridge Configuration Modal */}
            <Dialog open={rosModalOpen} onOpenChange={setRosModalOpen}>
                <DialogContent className="border-primary-container/40 sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-headline-md text-lg tracking-wide text-on-surface uppercase">
                            <span className="material-symbols-outlined text-[22px] text-primary">
                                hub
                            </span>
                            ROS 2 Humble Telemetry Bridge
                        </DialogTitle>
                        <DialogDescription className="font-body-sm text-xs text-slate-600">
                            Active link parameters between AMR Core OS and the physical KSR AGV host.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 font-label-md text-xs">
                        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-surface-container-low/60 p-3">
                            <div>
                                <span className="text-[10px] text-tertiary uppercase">
                                    Robot Host / SSH Alias
                                </span>
                                <div className="mt-0.5 font-semibold text-on-surface">
                                    agv-robot (10.32.254.195)
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] text-tertiary uppercase">
                                    ROS 2 Distribution
                                </span>
                                <div className="mt-0.5 font-semibold text-primary">
                                    ROS 2 Humble (/opt/ros/humble)
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] text-tertiary uppercase">
                                    Remote Workspace
                                </span>
                                <div className="mt-0.5 font-semibold text-on-surface">
                                    /home/ksr/agv_ws
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] text-tertiary uppercase">
                                    WebSocket Endpoint
                                </span>
                                <div className="mt-0.5 font-semibold text-emerald-600">
                                    ws://10.32.254.195:9090
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-2 text-[10px] font-semibold text-tertiary uppercase">
                                Subscribed Telemetry Topics
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="rounded bg-slate-50 px-2.5 py-1.5">
                                    <span className="text-primary">/amcl_pose</span>{' '}
                                    <span className="text-slate-400">(Pose2D)</span>
                                </div>
                                <div className="rounded bg-slate-50 px-2.5 py-1.5">
                                    <span className="text-primary">/scan</span>{' '}
                                    <span className="text-slate-400">(LaserScan)</span>
                                </div>
                                <div className="rounded bg-slate-50 px-2.5 py-1.5">
                                    <span className="text-primary">/cmd_vel</span>{' '}
                                    <span className="text-slate-400">(Twist)</span>
                                </div>
                                <div className="rounded bg-slate-50 px-2.5 py-1.5">
                                    <span className="text-primary">/battery_state</span>{' '}
                                    <span className="text-slate-400">(SOC%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Help & Operator Quick Reference Modal */}
            <Dialog open={docsModalOpen} onOpenChange={setDocsModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-headline-md text-lg tracking-wide text-on-surface uppercase">
                            <span className="material-symbols-outlined text-[22px] text-primary">
                                help
                            </span>
                            AMR Fleet Manager — Operator Guide
                        </DialogTitle>
                        <DialogDescription className="font-body-sm text-xs text-slate-600">
                            Quick keyboard shortcuts and tactical command reference for control room operators.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2.5 py-2 text-xs">
                        <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="font-medium text-on-surface">
                                Quick Telemetry Search (Vehicles, Stations, Missions)
                            </span>
                            <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 font-label-sm text-[11px]">
                                ⌘K / Ctrl+K
                            </kbd>
                        </div>
                        <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="font-medium text-on-surface">
                                Global Fleet Emergency Stop (E-STOP)
                            </span>
                            <span className="rounded bg-error-container px-2 py-0.5 font-label-sm text-[10px] font-bold text-on-error-container uppercase">
                                Top Bar Red CTA
                            </span>
                        </div>
                        <div className="rounded border border-slate-200 bg-white p-3 text-slate-600">
                            <p className="font-semibold text-on-surface">
                                Cockpit Navigation Modules:
                            </p>
                            <ul className="mt-1.5 list-inside list-disc space-y-1 text-[11px]">
                                <li>
                                    <strong>Live Map:</strong> Real-time spatial telemetry, active mission queue, and SLAM recording.
                                </li>
                                <li>
                                    <strong>Stations:</strong> Manage charging bays, pick/drop docks, and orientation angles.
                                </li>
                                <li>
                                    <strong>Robots:</strong> Register AMR units, inspect battery SOC, and trigger teleop overrides.
                                </li>
                                <li>
                                    <strong>Path Planning:</strong> Configure bidirectional corridors and speed limits.
                                </li>
                                <li>
                                    <strong>Map Studio:</strong> Manage facility OccupancyGrid maps and push to Nav2.
                                </li>
                                <li>
                                    <strong>Event Logs:</strong> Audit vehicle telemetry and system events.
                                </li>
                            </ul>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
