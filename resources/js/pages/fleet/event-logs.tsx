import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/fleet/status-badge';
import type { SystemLogEntry, Vehicle, VehicleLogEntry } from '@/types';

interface EventLogsProps {
    vehicles?: Vehicle[];
    vehicleLogs: VehicleLogEntry[];
    systemLogs: SystemLogEntry[];
}

type CategoryTab = 'ALL' | 'TELEMETRY' | 'MISSION_STATION' | 'OPERATOR';
type SeverityFilter = 'ALL' | 'critical' | 'error' | 'warning' | 'info';

interface UnifiedLogRow {
    uid: string;
    rawId: number;
    kind: 'vehicle' | 'system';
    category: 'TELEMETRY' | 'MISSION_STATION' | 'OPERATOR';
    source: string;
    message: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    rosTopic: string;
    payload: Record<string, unknown> | null;
    createdAt: string;
}

export default function EventLogsPage({
    vehicles = [],
    vehicleLogs: initialVehicleLogs = [],
    systemLogs: initialSystemLogs = [],
}: EventLogsProps) {
    const [vehicleLogs] = useState<VehicleLogEntry[]>(initialVehicleLogs);
    const [systemLogs, setSystemLogs] =
        useState<SystemLogEntry[]>(initialSystemLogs);

    const [activeCategory, setActiveCategory] = useState<CategoryTab>('ALL');
    const [severityFilter, setSeverityFilter] =
        useState<SeverityFilter>('ALL');
    const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isPaused, setIsPaused] = useState(false);

    // Manual Log Entry Modal
    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [manualAction, setManualAction] = useState('');
    const [manualLevel, setManualLevel] = useState<
        'info' | 'warning' | 'error' | 'critical'
    >('info');
    const [manualNote, setManualNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Build Unified Chronological Stream
    const unifiedLogs = useMemo<UnifiedLogRow[]>(() => {
        const vRows: UnifiedLogRow[] = vehicleLogs.map((vLog) => {
            const lower = vLog.event.toLowerCase();
            const isMissionOrStation =
                lower.includes('mission') ||
                lower.includes('station') ||
                lower.includes('waypoint') ||
                lower.includes('dock');

            return {
                uid: `VH-${vLog.id}`,
                rawId: vLog.id,
                kind: 'vehicle',
                category: isMissionOrStation ? 'MISSION_STATION' : 'TELEMETRY',
                source: vLog.vehicle_id,
                message: vLog.event,
                level: vLog.level,
                rosTopic: isMissionOrStation
                    ? '/nav2_bt_navigator'
                    : '/amcl_pose',
                payload: vLog.payload ?? null,
                createdAt: vLog.created_at,
            };
        });

        const sRows: UnifiedLogRow[] = systemLogs.map((sLog) => {
            const lower = sLog.action.toLowerCase();
            const isMissionOrStation =
                lower.includes('mission') ||
                lower.includes('waypoint') ||
                lower.includes('station');

            return {
                uid: `SYS-${sLog.id}`,
                rawId: sLog.id,
                kind: 'system',
                category: isMissionOrStation ? 'MISSION_STATION' : 'OPERATOR',
                source: 'SYSTEM_CORE',
                message: sLog.action,
                level: sLog.level,
                rosTopic: lower.includes('e-stop')
                    ? '/safety_estop_mux'
                    : '/fleet_supervisor',
                payload: sLog.context ?? null,
                createdAt: sLog.created_at,
            };
        });

        return [...vRows, ...sRows].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
        );
    }, [vehicleLogs, systemLogs]);

    const filteredLogs = useMemo(() => {
        return unifiedLogs.filter((row) => {
            if (activeCategory !== 'ALL' && row.category !== activeCategory) {
                return false;
            }
            if (severityFilter !== 'ALL' && row.level !== severityFilter) {
                return false;
            }
            if (vehicleFilter !== 'ALL' && row.source !== vehicleFilter) {
                return false;
            }
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                const inMsg = row.message.toLowerCase().includes(q);
                const inSrc = row.source.toLowerCase().includes(q);
                const inTopic = row.rosTopic.toLowerCase().includes(q);
                const inPayload = JSON.stringify(row.payload ?? {})
                    .toLowerCase()
                    .includes(q);
                if (!inMsg && !inSrc && !inTopic && !inPayload) {
                    return false;
                }
            }
            return true;
        });
    }, [
        unifiedLogs,
        activeCategory,
        severityFilter,
        vehicleFilter,
        searchQuery,
    ]);

    const [selectedUid, setSelectedUid] = useState<string | null>(
        unifiedLogs[0]?.uid ?? null,
    );

    const selectedLog =
        filteredLogs.find((r) => r.uid === selectedUid) ??
        filteredLogs[0] ??
        null;

    // Category Counts
    const countAll = unifiedLogs.length;
    const countTelemetry = unifiedLogs.filter(
        (r) => r.category === 'TELEMETRY',
    ).length;
    const countMissionStation = unifiedLogs.filter(
        (r) => r.category === 'MISSION_STATION',
    ).length;
    const countOperator = unifiedLogs.filter(
        (r) => r.category === 'OPERATOR',
    ).length;

    const handleExportCsv = () => {
        const headers = [
            'UID',
            'Timestamp',
            'Category',
            'Source',
            'Severity',
            'ROS2_Topic',
            'Message',
            'Payload_JSON',
        ];
        const rows = filteredLogs.map((r) => [
            r.uid,
            r.createdAt,
            r.category,
            r.source,
            r.level.toUpperCase(),
            r.rosTopic,
            `"${r.message.replace(/"/g, '""')}"`,
            `"${JSON.stringify(r.payload ?? {}).replace(/"/g, '""')}"`,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((line) => line.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amr-event-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCreateManualLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualAction.trim()) {
            return;
        }
        setIsSaving(true);
        try {
            const response = await fetch('/api/logs/system', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    action: manualAction.trim(),
                    level: manualLevel,
                    context: manualNote.trim()
                        ? { operator_note: manualNote.trim() }
                        : { source: 'manual_audit_entry' },
                }),
            });

            const json = await response.json();
            if (response.ok && json.data) {
                const created: SystemLogEntry = json.data;
                setSystemLogs((prev) => [created, ...prev]);
                setSelectedUid(`SYS-${created.id}`);
                setManualAction('');
                setManualNote('');
                setManualModalOpen(false);
                router.reload({ only: ['systemLogs'] });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Head title="Activity & Event Logs" />
            <div className="flex h-full w-full flex-col gap-5 overflow-y-auto bg-surface p-6">
                {/* 1. Top Header & Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-secondary" />
                            <span className="font-mono text-[10px] tracking-widest text-primary uppercase">
                                Audit Trail & ROS 2 Telemetry Diagnostics
                            </span>
                        </div>
                        <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface uppercase">
                            Activity & Event Logs
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsPaused((prev) => !prev)}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 font-mono text-xs font-bold uppercase transition-colors ${
                                isPaused
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-slate-200 bg-white text-on-surface hover:bg-surface-container-low'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                {isPaused ? 'play_arrow' : 'pause'}
                            </span>
                            {isPaused ? 'Resume Buffer' : 'Live Stream Active'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setManualModalOpen(true)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 font-label-md text-xs font-bold text-primary uppercase transition-colors hover:bg-sky-50"
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                note_add
                            </span>
                            + Catat Log Manual
                        </button>

                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-label-md text-xs font-bold text-white uppercase shadow-xs transition-colors hover:bg-secondary"
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                download
                            </span>
                            Export CSV ({filteredLogs.length})
                        </button>
                    </div>
                </div>

                {/* 2. Four Category Summary Tabs */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <button
                        type="button"
                        onClick={() => setActiveCategory('ALL')}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all ${
                            activeCategory === 'ALL'
                                ? 'border-secondary border-b-4 border-b-secondary bg-white shadow-sm'
                                : 'border-slate-200 bg-surface-container-low hover:bg-white'
                        }`}
                    >
                        <div>
                            <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                                Unified Feed
                            </span>
                            <div className="mt-0.5 font-headline-sm text-base font-bold text-on-surface">
                                All Logs
                            </div>
                        </div>
                        <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary">
                            {countAll}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveCategory('TELEMETRY')}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all ${
                            activeCategory === 'TELEMETRY'
                                ? 'border-secondary border-b-4 border-b-secondary bg-white shadow-sm'
                                : 'border-slate-200 bg-surface-container-low hover:bg-white'
                        }`}
                    >
                        <div>
                            <span className="font-mono text-[10px] font-bold tracking-wider text-tertiary uppercase">
                                /amcl_pose & /odom
                            </span>
                            <div className="mt-0.5 font-headline-sm text-base font-bold text-on-surface">
                                Robot Telemetry
                            </div>
                        </div>
                        <span className="rounded-lg bg-surface-container-high px-2.5 py-1 font-mono text-sm font-bold text-on-surface">
                            {countTelemetry}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveCategory('MISSION_STATION')}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all ${
                            activeCategory === 'MISSION_STATION'
                                ? 'border-secondary border-b-4 border-b-secondary bg-white shadow-sm'
                                : 'border-slate-200 bg-surface-container-low hover:bg-white'
                        }`}
                    >
                        <div>
                            <span className="font-mono text-[10px] font-bold tracking-wider text-tertiary uppercase">
                                /nav2_bt_navigator
                            </span>
                            <div className="mt-0.5 font-headline-sm text-base font-bold text-on-surface">
                                Station & Missions
                            </div>
                        </div>
                        <span className="rounded-lg bg-surface-container-high px-2.5 py-1 font-mono text-sm font-bold text-on-surface">
                            {countMissionStation}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveCategory('OPERATOR')}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all ${
                            activeCategory === 'OPERATOR'
                                ? 'border-secondary border-b-4 border-b-secondary bg-white shadow-sm'
                                : 'border-slate-200 bg-surface-container-low hover:bg-white'
                        }`}
                    >
                        <div>
                            <span className="font-mono text-[10px] font-bold tracking-wider text-tertiary uppercase">
                                /fleet_supervisor
                            </span>
                            <div className="mt-0.5 font-headline-sm text-base font-bold text-on-surface">
                                Operator Actions
                            </div>
                        </div>
                        <span className="rounded-lg bg-surface-container-high px-2.5 py-1 font-mono text-sm font-bold text-on-surface">
                            {countOperator}
                        </span>
                    </button>
                </div>

                {/* 3. Filter Strip & Severity Matrix */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="relative min-w-64 flex-1">
                        <span className="material-symbols-outlined absolute top-2 left-3 text-[18px] text-tertiary">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari log berdasarkan kode AMR, pesan event, ROS2 topic, atau payload JSON..."
                            className="w-full rounded-lg border border-slate-200 bg-surface-container-low py-1.5 pr-4 pl-9 font-body-sm text-xs text-on-surface placeholder:text-tertiary focus:border-secondary focus:outline-none"
                        />
                    </div>

                    {/* Unit Filter */}
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-tertiary uppercase">
                            Source:
                        </span>
                        <select
                            value={vehicleFilter}
                            onChange={(e) => setVehicleFilter(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-surface-container-low px-2.5 py-1.5 font-mono text-xs text-on-surface"
                        >
                            <option value="ALL">ALL SOURCES</option>
                            <option value="SYSTEM_CORE">SYSTEM_CORE</option>
                            {vehicles.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.id} ({v.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Severity Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-tertiary uppercase">
                            Severity:
                        </span>
                        {(
                            [
                                'ALL',
                                'critical',
                                'error',
                                'warning',
                                'info',
                            ] as SeverityFilter[]
                        ).map((sev) => (
                            <button
                                key={sev}
                                type="button"
                                onClick={() => setSeverityFilter(sev)}
                                className={`cursor-pointer rounded-md px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
                                    severityFilter === sev
                                        ? 'bg-primary text-white'
                                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                                }`}
                            >
                                {sev}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. Main Tactical Split: Data Grid Table (8 Cols) + Payload Inspector (4 Cols) */}
                <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-12">
                    {/* Left 8-Col Data Grid Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs lg:col-span-8">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-surface-container-low px-4 py-3">
                            <span className="font-headline-sm text-xs font-bold tracking-wider text-on-surface uppercase">
                                Chronological Event Stream (
                                {filteredLogs.length} entries)
                            </span>
                            <span className="font-mono text-[10px] text-tertiary">
                                SQLITE AUDIT STORAGE // SYNCED
                            </span>
                        </div>

                        <div className="max-h-[540px] overflow-y-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-surface-container text-[10px] font-bold tracking-wider text-tertiary uppercase">
                                    <tr>
                                        <th className="px-3.5 py-2.5">
                                            Timestamp
                                        </th>
                                        <th className="px-3.5 py-2.5">
                                            Source / Actor
                                        </th>
                                        <th className="px-3.5 py-2.5">
                                            Description & Diagnostics
                                        </th>
                                        <th className="px-3.5 py-2.5">
                                            ROS 2 Topic
                                        </th>
                                        <th className="px-3.5 py-2.5">
                                            Severity
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredLogs.map((row) => {
                                        const isSelected =
                                            row.uid === selectedLog?.uid;
                                        return (
                                            <tr
                                                key={row.uid}
                                                onClick={() =>
                                                    setSelectedUid(row.uid)
                                                }
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-sky-50/90'
                                                        : 'hover:bg-surface-container-low'
                                                }`}
                                            >
                                                <td className="whitespace-nowrap px-3.5 py-3 font-mono text-[11px] text-tertiary">
                                                    {row.createdAt}
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-3">
                                                    <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                                                        {row.source}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-3 font-medium text-on-surface">
                                                    {row.message}
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-3 font-mono text-[11px] text-on-surface-variant">
                                                    {row.rosTopic}
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-3">
                                                    <StatusBadge
                                                        status={
                                                            row.level ===
                                                                'critical' ||
                                                            row.level ===
                                                                'error'
                                                                ? 'error'
                                                                : row.level ===
                                                                    'warning'
                                                                  ? 'warning'
                                                                  : 'online'
                                                        }
                                                        label={row.level}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredLogs.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-10 text-center font-body-sm text-xs text-tertiary"
                                            >
                                                Tidak ada baris log yang sesuai
                                                dengan kriteria filter saat ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right 4-Col Live Visual Diagnostics & JSON Payload Inspector */}
                    <div className="flex flex-col gap-4 lg:col-span-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                                        Telemetry Frame Inspector
                                    </span>
                                    <h2 className="font-headline-sm text-sm font-bold text-on-surface uppercase">
                                        {selectedLog
                                            ? `Log Packet // ${selectedLog.uid}`
                                            : 'Pilih Log Untuk Inspeksi'}
                                    </h2>
                                </div>
                                {selectedLog && (
                                    <StatusBadge
                                        status={
                                            selectedLog.level === 'critical' ||
                                            selectedLog.level === 'error'
                                                ? 'error'
                                                : selectedLog.level ===
                                                    'warning'
                                                  ? 'warning'
                                                  : 'online'
                                        }
                                        label={selectedLog.level}
                                    />
                                )}
                            </div>

                            {selectedLog ? (
                                <div className="mt-3 space-y-3 text-xs">
                                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-container-low p-3 font-mono text-[11px]">
                                        <div>
                                            <span className="block text-[9px] text-tertiary">
                                                SOURCE NODE
                                            </span>
                                            <span className="font-bold text-primary">
                                                {selectedLog.source}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] text-tertiary">
                                                ROS 2 TOPIC
                                            </span>
                                            <span className="font-bold text-on-surface">
                                                {selectedLog.rosTopic}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="block text-[9px] text-tertiary">
                                                TIMESTAMP (ISO)
                                            </span>
                                            <span className="font-semibold text-on-surface">
                                                {selectedLog.createdAt}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="mb-1 block font-mono text-[10px] font-bold text-tertiary uppercase">
                                            Event Summary
                                        </span>
                                        <p className="rounded-lg border border-slate-100 bg-surface-container-low p-2.5 font-medium text-on-surface">
                                            {selectedLog.message}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="mb-1 block font-mono text-[10px] font-bold text-tertiary uppercase">
                                            Raw Payload / Context JSON
                                        </span>
                                        <pre className="max-h-56 overflow-x-auto rounded-xl bg-[#0b1c30] p-3.5 font-mono text-[11px] leading-relaxed text-sky-200">
                                            {JSON.stringify(
                                                selectedLog.payload ?? {
                                                    status: 'nominal',
                                                    frame_id: 'map',
                                                },
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <p className="py-8 text-center font-body-sm text-xs text-tertiary">
                                    Klik salah satu baris event di tabel kiri
                                    untuk melihat payload diagnostik JSON.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. Modal Catat Log Manual */}
                {manualModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
                                        System Audit Logger
                                    </span>
                                    <h3 className="font-headline-md text-lg font-bold text-on-surface">
                                        Catat Event Audit Manual
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setManualModalOpen(false)}
                                    className="cursor-pointer rounded-lg p-1 text-tertiary hover:bg-slate-100"
                                >
                                    <span className="material-symbols-outlined">
                                        close
                                    </span>
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => void handleCreateManualLog(e)}
                                className="mt-4 space-y-4"
                            >
                                <div>
                                    <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                        Deskripsi Aksi / Kejadian
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={manualAction}
                                        onChange={(e) =>
                                            setManualAction(e.target.value)
                                        }
                                        placeholder="Kalibrasi ulang sensor LiDAR AMR-01 selesai"
                                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-body-sm text-xs text-on-surface"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                        Tingkat Severity
                                    </label>
                                    <select
                                        value={manualLevel}
                                        onChange={(e) =>
                                            setManualLevel(
                                                e.target.value as
                                                    | 'info'
                                                    | 'warning'
                                                    | 'error'
                                                    | 'critical',
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface"
                                    >
                                        <option value="info">INFO</option>
                                        <option value="warning">WARNING</option>
                                        <option value="error">ERROR</option>
                                        <option value="critical">
                                            CRITICAL
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block font-label-sm text-xs font-bold text-on-surface uppercase">
                                        Catatan Konteks Operator (Opsional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={manualNote}
                                        onChange={(e) =>
                                            setManualNote(e.target.value)
                                        }
                                        placeholder="Catatan teknisi atau parameter tambahan..."
                                        className="w-full rounded-lg border border-slate-200 bg-surface-container-low px-3 py-2 font-body-sm text-xs text-on-surface"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setManualModalOpen(false)
                                        }
                                        className="cursor-pointer rounded-lg px-4 py-2 font-label-md text-xs font-semibold text-tertiary hover:bg-slate-100"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="cursor-pointer rounded-lg bg-primary px-5 py-2 font-label-md text-xs font-bold text-white shadow-sm hover:bg-secondary disabled:opacity-50"
                                    >
                                        {isSaving
                                            ? 'Menyimpan...'
                                            : 'Simpan Log'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
