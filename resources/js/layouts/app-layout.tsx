import TelemetryLayout from '@/layouts/telemetry-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return <TelemetryLayout>{children}</TelemetryLayout>;
}
