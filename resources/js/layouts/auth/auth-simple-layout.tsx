import { Link } from '@inertiajs/react';
import { useEffect } from 'react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    useEffect(() => {
        // Enforce light theme on auth pages to maintain visual identity with the rest of the fleet telemetry system
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }, []);

    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#f8f9ff] p-6 text-on-surface select-none md:p-10">
            {/* Subtle Engineering Grid Background */}
            <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                    backgroundSize: '36px 36px',
                    backgroundImage:
                        'radial-gradient(#949cb5 1px, transparent 1px)',
                }}
            />

            <div className="relative z-10 w-full max-w-md">
                <div className="flex flex-col gap-6 rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-md [--background:#ffffff] [--border:#e2e8f0] [--card-foreground:#0b1c30] [--card:#ffffff] [--foreground:#0b1c30] [--input:#cbd5e1] [--muted-foreground:#565e74] [--muted:#eff4ff] [--primary-foreground:#ffffff] [--primary:#00629d] [--ring:#00a3ff]">
                    <div className="flex flex-col items-center gap-3">
                        <Link
                            href={home()}
                            className="group flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b1c30] p-2.5 shadow-sm ring-2 ring-primary/20 transition-transform duration-300 group-hover:scale-105">
                                <img
                                    src="/images/Logo_KSR.png"
                                    alt="KSR Logo"
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <span className="font-mono text-[10px] font-bold tracking-widest text-primary uppercase">
                                AMR Fleet Telemetry Hub
                            </span>
                        </Link>

                        <div className="space-y-1 text-center">
                            <h1 className="font-headline-md text-xl font-bold tracking-tight text-on-surface">
                                {title}
                            </h1>
                            <p className="font-body-sm text-center text-xs text-tertiary">
                                {description}
                            </p>
                        </div>
                    </div>

                    <div className="mt-2">{children}</div>
                </div>
            </div>
        </div>
    );
}
