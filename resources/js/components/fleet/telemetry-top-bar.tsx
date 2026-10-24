import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import type { Auth, TelemetryShellData } from '@/types';

export function TelemetryTopBar() {
    const { auth, telemetryShell } = usePage<{
        auth: Auth;
        telemetryShell?: TelemetryShellData;
    }>().props;

    const shell: TelemetryShellData = telemetryShell ?? {
        onlineCount: 2,
        totalVehicles: 2,
        emergencyActive: false,
        rosMasterStatus: 'OK',
        latencyMs: 12,
        notifications: [],
        searchItems: [],
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [eStopModalOpen, setEStopModalOpen] = useState(false);
    const [eStopReason, setEStopReason] = useState('');
    const [submittingEStop, setSubmittingEStop] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                setSearchFocused(true);
            } else if (e.key === 'Escape') {
                setSearchFocused(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredSearch = searchQuery.trim()
        ? shell.searchItems.filter(
              (item) =>
                  item.label
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                  item.sublabel
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
          )
        : shell.searchItems.slice(0, 6);

    const handleTriggerEStop = async () => {
        setSubmittingEStop(true);
        const action = shell.emergencyActive ? 'release' : 'engage';

        try {
            const response = await fetch('/api/vehicles/emergency-stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    action,
                    reason:
                        eStopReason.trim() ||
                        (action === 'engage'
                            ? 'Operator triggered Global E-STOP from Cockpit TopBar'
                            : 'Operator released Global E-STOP'),
                }),
            });

            if (response.ok) {
                toast.success(
                    action === 'engage'
                        ? 'EMERGENCY STOP ENGAGED across all AMR units.'
                        : 'Emergency stop released. Fleet returned to standby.',
                );
                setEStopModalOpen(false);
                setEStopReason('');
                router.reload();
            } else {
                toast.error('Failed to execute Emergency Stop command.');
            }
        } catch {
            toast.error('Network error while contacting Fleet Core API.');
        } finally {
            setSubmittingEStop(false);
        }
    };

    const userName = auth?.user?.name ?? 'Sarah L.';

    return (
        <>
            <header className="fixed top-0 right-0 left-0 z-50 flex h-16 items-center justify-between border-b border-slate-200/80 bg-surface-container-lowest/95 px-margin-lg shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md">
                {/* Left Brand Identity */}
                <Link
                    href="/dashboard"
                    className="flex w-72 items-center gap-space-lg transition-opacity hover:opacity-90"
                >
                    <img
                        alt="KSR Robot Logo"
                        className="h-8 w-auto object-contain"
                        src="/images/Logo_KSR.png"
                    />
                    <div className="flex flex-col">
                        <span className="font-headline-md text-headline-md tracking-tight text-on-surface uppercase">
                            FLEET MANAGER
                        </span>
                        <span className="font-label-sm text-label-sm tracking-wider text-tertiary uppercase">
                            AMR CORE OS v4.2
                        </span>
                    </div>
                </Link>

                {/* Center Unified Search (⌘K) */}
                <div className="relative max-w-xl flex-1 px-margin">
                    <div className="relative flex w-full items-center">
                        <span className="material-symbols-outlined pointer-events-none absolute left-space-md text-[18px] text-on-surface-variant">
                            search
                        </span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() =>
                                setTimeout(() => setSearchFocused(false), 180)
                            }
                            placeholder="Search vehicle, mission, station (⌘K)..."
                            className="h-9 w-full rounded-full border border-transparent bg-surface-container-low pr-14 pl-10 font-body-sm text-body-sm text-on-surface transition-all placeholder:text-on-surface-variant focus:border-primary-container focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container/20 focus:outline-none"
                        />
                        <kbd className="pointer-events-none absolute right-3 hidden rounded border border-slate-300 bg-white px-1.5 py-0.5 font-label-sm text-[10px] text-slate-500 sm:inline-block">
                            ⌘K
                        </kbd>
                    </div>

                    {/* Quick Search Results Popover */}
                    {searchFocused && filteredSearch.length > 0 && (
                        <div className="absolute top-11 right-4 left-4 z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)]">
                            <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-1.5 font-label-sm text-[10px] tracking-wider text-slate-500 uppercase">
                                Quick Telemetry Jump ({filteredSearch.length})
                            </div>
                            <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                                {filteredSearch.map((item) => (
                                    <button
                                        key={`${item.type}-${item.id}`}
                                        type="button"
                                        onMouseDown={() => {
                                            setSearchFocused(false);
                                            router.visit(item.href);
                                        }}
                                        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-surface-container-low"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="material-symbols-outlined text-[18px] text-primary">
                                                {item.type === 'vehicle'
                                                    ? 'precision_manufacturing'
                                                    : item.type === 'station'
                                                      ? 'ev_station'
                                                      : 'alt_route'}
                                            </span>
                                            <div>
                                                <div className="font-body-sm text-xs font-semibold text-on-surface">
                                                    {item.label}
                                                </div>
                                                <div className="font-label-sm text-[10px] text-tertiary">
                                                    {item.sublabel}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="rounded bg-surface-container px-2 py-0.5 font-label-sm text-[10px] text-primary uppercase">
                                            {item.type}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Telemetry Status, E-STOP, Notifications & User */}
                <div className="flex items-center gap-space-md">
                    {/* Live ROS2 Master Telemetry Pill */}
                    <div className="hidden items-center gap-space-sm rounded-full border border-slate-200/70 bg-surface-container-low px-space-md py-space-xs xl:flex">
                        <span className="relative flex h-2 w-2">
                            <span
                                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                                    shell.emergencyActive
                                        ? 'bg-red-500'
                                        : 'bg-primary-container'
                                }`}
                            />
                            <span
                                className={`relative inline-flex h-2 w-2 rounded-full ${
                                    shell.emergencyActive
                                        ? 'bg-red-600'
                                        : 'bg-primary'
                                }`}
                            />
                        </span>
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface uppercase">
                            {shell.emergencyActive
                                ? 'E-STOP ACTIVE'
                                : `Online (${shell.onlineCount}/${shell.totalVehicles})`}
                        </span>
                        <span className="font-label-sm text-label-sm text-outline-variant">
                            |
                        </span>
                        <span className="font-label-sm text-label-sm text-tertiary">
                            ROS2 MASTER: {shell.rosMasterStatus}
                        </span>
                        <span className="font-label-sm text-label-sm text-outline-variant">
                            |
                        </span>
                        <span className="font-label-sm text-label-sm font-medium text-primary">
                            {shell.latencyMs}ms
                        </span>
                    </div>

                    {/* Global Emergency Stop Button */}
                    <button
                        type="button"
                        onClick={() => setEStopModalOpen(true)}
                        className={`flex cursor-pointer items-center gap-space-xs rounded-lg px-space-md py-1.5 font-label-md text-label-md font-bold tracking-wide uppercase transition-all ${
                            shell.emergencyActive
                                ? 'animate-pulse bg-[#EF4444] text-white shadow-[0_0_16px_rgba(239,68,68,0.5)] hover:bg-red-700'
                                : 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            emergency
                        </span>
                        {shell.emergencyActive ? 'RELEASE E-STOP' : 'E-STOP'}
                    </button>

                    {/* Notifications Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Telemetry Notifications"
                                className="relative cursor-pointer rounded-full p-space-sm text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    notifications
                                </span>
                                {shell.notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error" />
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel className="flex items-center justify-between font-headline-sm text-xs tracking-wider uppercase">
                                <span>Telemetry Event Feed</span>
                                <span className="font-label-sm text-[10px] text-primary">
                                    Live
                                </span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                                {shell.notifications.length > 0 ? (
                                    shell.notifications.map((item) => (
                                        <div
                                            key={item.id}
                                            className="px-3 py-2.5 text-xs hover:bg-slate-50"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span
                                                    className={`rounded px-1.5 py-0.5 font-label-sm text-[9px] uppercase ${
                                                        item.level ===
                                                            'critical' ||
                                                        item.level === 'error'
                                                            ? 'bg-red-100 text-red-700'
                                                            : item.level ===
                                                                'warning'
                                                              ? 'bg-amber-100 text-amber-700'
                                                              : 'bg-sky-100 text-sky-700'
                                                    }`}
                                                >
                                                    {item.level}
                                                </span>
                                                <span className="font-label-sm text-[10px] text-slate-400">
                                                    {item.time}
                                                </span>
                                            </div>
                                            <p className="mt-1 font-body-sm text-xs text-on-surface">
                                                {item.title}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-3 py-6 text-center text-xs text-slate-400">
                                        No recent telemetry alerts
                                    </div>
                                )}
                            </div>
                            <DropdownMenuSeparator />
                            <div className="p-1.5">
                                <Link
                                    href="/event-logs"
                                    className="block w-full rounded bg-surface-container-low py-1.5 text-center font-label-md text-[11px] font-semibold text-primary uppercase transition-colors hover:bg-surface-container"
                                >
                                    Open Full Event Logs →
                                </Link>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Operator Profile Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex cursor-pointer items-center gap-space-sm rounded-lg py-1 pr-2 pl-space-sm transition-colors hover:bg-surface-container-low"
                            >
                                <img
                                    alt="Operator Avatar"
                                    className="h-8 w-auto object-contain"
                                    src="/images/Logo_KSR.png"
                                />
                                <div className="hidden flex-col text-left md:flex">
                                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                                        {userName}
                                    </span>
                                    <span className="font-label-sm text-label-sm text-tertiary">
                                        Ops Admin
                                    </span>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {auth?.user && <UserMenuContent user={auth.user} />}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Emergency Stop Confirmation Modal */}
            <Dialog open={eStopModalOpen} onOpenChange={setEStopModalOpen}>
                <DialogContent className="border-red-500/40 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-headline-md text-lg tracking-wide text-red-600 uppercase">
                            <span className="material-symbols-outlined text-[22px]">
                                emergency
                            </span>
                            {shell.emergencyActive
                                ? 'Release Global Emergency Stop'
                                : 'Confirm Fleet-Wide Emergency Stop'}
                        </DialogTitle>
                        <DialogDescription className="font-body-sm text-xs text-slate-600">
                            {shell.emergencyActive
                                ? 'Releasing E-STOP will return all AMR vehicles to IDLE standby state and re-enable Nav2 velocity controllers.'
                                : 'Engaging E-STOP immediately broadcasts a zero-velocity brake override to all active AMR units and halts ongoing missions.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <label className="mb-1.5 block font-label-md text-[11px] text-slate-600 uppercase">
                            Operator Audit Note (Optional)
                        </label>
                        <input
                            type="text"
                            value={eStopReason}
                            onChange={(e) => setEStopReason(e.target.value)}
                            placeholder={
                                shell.emergencyActive
                                    ? 'e.g., Aisle obstacle cleared by technician'
                                    : 'e.g., Personnel entered Zone A-01 corridor'
                            }
                            className="w-full rounded border border-slate-300 px-3 py-2 font-body-sm text-xs focus:border-primary-container focus:outline-none"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setEStopModalOpen(false)}
                            className="rounded border border-slate-300 bg-white px-4 py-2 font-label-md text-xs font-semibold text-slate-700 uppercase hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={submittingEStop}
                            onClick={handleTriggerEStop}
                            className={`rounded px-4 py-2 font-label-md text-xs font-bold text-white uppercase shadow transition-all ${
                                shell.emergencyActive
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            {submittingEStop
                                ? 'Executing...'
                                : shell.emergencyActive
                                  ? 'Confirm Release E-STOP'
                                  : 'ENGAGE GLOBAL E-STOP'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
