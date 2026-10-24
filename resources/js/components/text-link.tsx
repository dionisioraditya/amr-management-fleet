import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

export default function TextLink({
    className = '',
    children,
    ...props
}: Props) {
    return (
        <Link
            className={cn(
                'text-primary font-semibold underline underline-offset-4 transition-colors duration-200 hover:text-secondary hover:decoration-current dark:text-sky-400 dark:hover:text-sky-300',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
