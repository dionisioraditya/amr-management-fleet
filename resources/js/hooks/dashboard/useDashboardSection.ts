import { useEffect, useState } from 'react';
import type { CockpitSection } from '@/components/fleet/telemetry-nav-rail';
import type { FacilityMap } from '@/types';

function resolveSectionFromPathname(pathname: string): CockpitSection {
    const clean = pathname.split('?')[0].split('#')[0];
    if (clean === '/stations' || clean.startsWith('/stations/')) {
        return 'stations';
    }
    if (clean === '/robots' || clean.startsWith('/robots/')) {
        return 'robots';
    }
    return 'live-map';
}

interface UseDashboardSectionOptions {
    initialSection?: CockpitSection;
    activeMap?: FacilityMap | null;
    onResetInteractiveModes: () => void;
}

export function useDashboardSection({
    initialSection,
    activeMap,
    onResetInteractiveModes,
}: UseDashboardSectionOptions) {
    const [activeSection, setActiveSection] = useState<CockpitSection>(() => {
        if (initialSection) return initialSection;
        if (typeof window !== 'undefined') {
            return resolveSectionFromPathname(window.location.pathname);
        }
        return 'live-map';
    });

    const [mapView, setMapView] = useState<'active' | 'empty'>(
        activeMap ? 'active' : 'empty',
    );

    useEffect(() => {
        const handleCockpitSwitch = (event: Event) => {
            const custom = event as CustomEvent<{ section: CockpitSection; href: string }>;
            if (custom.detail?.section) {
                setActiveSection(custom.detail.section);
                onResetInteractiveModes();
                if (custom.detail.section !== 'live-map' && activeMap) {
                    setMapView('active');
                }
            }
        };

        const handlePopState = () => {
            const nextSection = resolveSectionFromPathname(window.location.pathname);
            setActiveSection(nextSection);
            onResetInteractiveModes();
        };

        window.addEventListener('fleet:cockpit-section', handleCockpitSwitch);
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('fleet:cockpit-section', handleCockpitSwitch);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [activeMap, onResetInteractiveModes]);

    return {
        activeSection,
        setActiveSection,
        mapView,
        setMapView,
    };
}
