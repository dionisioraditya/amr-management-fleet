import { cn } from '@/lib/utils';

type BadgeVariant =
    | 'online'
    | 'moving'
    | 'in_progress'
    | 'charging'
    | 'idle'
    | 'pending'
    | 'reached'
    | 'completed'
    | 'warning'
    | 'error'
    | 'failed'
    | 'offline'
    | 'emergency_stop';

const variantStyles: Record<
    BadgeVariant,
    { container: string; dot: string; pulse?: boolean; label?: string }
> = {
    online: {
        container: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
        dot: 'bg-[#10B981]',
        pulse: true,
    },
    moving: {
        container: 'bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]',
        dot: 'bg-[#00A3FF]',
        pulse: true,
        label: 'In Mission',
    },
    in_progress: {
        container: 'bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]',
        dot: 'bg-[#00A3FF]',
        pulse: true,
        label: 'In Progress',
    },
    charging: {
        container: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
        dot: 'bg-[#6366F1]',
        pulse: true,
    },
    idle: {
        container: 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]',
        dot: 'bg-[#94A3B8]',
    },
    pending: {
        container: 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]',
        dot: 'bg-[#94A3B8]',
    },
    reached: {
        container: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
        dot: 'bg-[#10B981]',
    },
    completed: {
        container: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
        dot: 'bg-[#10B981]',
    },
    warning: {
        container: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
        dot: 'bg-[#F59E0B]',
        pulse: true,
    },
    error: {
        container: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
        dot: 'bg-[#EF4444]',
        pulse: true,
    },
    failed: {
        container: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
        dot: 'bg-[#EF4444]',
    },
    offline: {
        container: 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]',
        dot: 'bg-[#64748B]',
    },
    emergency_stop: {
        container: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
        dot: 'bg-[#EF4444]',
        pulse: true,
        label: 'E-STOP',
    },
};

export function StatusBadge({
    status,
    label,
    className,
}: {
    status: string;
    label?: string;
    className?: string;
}) {
    const key = (status?.toLowerCase() as BadgeVariant) || 'idle';
    const style = variantStyles[key] ?? variantStyles.idle;
    const displayLabel = label ?? style.label ?? status.replace(/_/g, ' ');

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-label-md text-[11px] font-semibold tracking-[0.05em] uppercase',
                style.container,
                className,
            )}
        >
            <span className="relative flex h-1.5 w-1.5">
                {style.pulse && (
                    <span
                        className={cn(
                            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                            style.dot,
                        )}
                    />
                )}
                <span
                    className={cn(
                        'relative inline-flex h-1.5 w-1.5 rounded-full',
                        style.dot,
                    )}
                />
            </span>
            {displayLabel}
        </span>
    );
}
