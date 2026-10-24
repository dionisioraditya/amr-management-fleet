import type { ReactNode } from 'react';
import { TelemetryNavRail } from '@/components/fleet/telemetry-nav-rail';
import { TelemetryTopBar } from '@/components/fleet/telemetry-top-bar';

export default function TelemetryLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background font-body-md text-on-surface">
            <TelemetryTopBar />
            <TelemetryNavRail />
            <div className="flex h-full w-full flex-1 flex-col pl-16 pt-16">
                <main className="relative h-full w-full flex-1 overflow-hidden bg-background">
                    {children}
                </main>
            </div>
        </div>
    );
}
