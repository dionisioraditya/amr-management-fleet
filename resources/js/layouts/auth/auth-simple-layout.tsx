import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6 select-none md:p-10">
            {/* Subtle Engineering Grid Background */}
            <div
                className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
                style={{
                    backgroundSize: '36px 36px',
                    backgroundImage:
                        'radial-gradient(#949cb5 1px, transparent 1px)',
                }}
            />

            <div className="relative z-10 w-full max-w-md">
                <div className="flex flex-col gap-6 rounded-2xl border border-slate-200/90 bg-white/95 p-8 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-[#0f1d33]/95">
                    <div className="flex flex-col items-center gap-3">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <img
                                src="/images/Logo_KSR.png"
                                alt="KSR Logo"
                                className="h-12 w-auto object-contain transition-transform hover:scale-105"
                            />
                            <span className="font-mono text-[10px] tracking-widest text-primary uppercase">
                                AMR Fleet Telemetry Hub
                            </span>
                        </Link>

                        <div className="space-y-1 text-center">
                            <h1 className="font-headline-md text-xl font-bold tracking-tight text-on-surface dark:text-white">
                                {title}
                            </h1>
                            <p className="font-body-sm text-center text-xs text-muted-foreground">
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
