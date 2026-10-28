import type { ReactNode } from 'react';

interface ButtonProps {
    children: ReactNode;
    onClick?: () => void;
    secondary?: boolean;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    'aria-label'?: string;
}

export function Button({
    children,
    onClick,
    secondary = false,
    disabled = false,
    className = '',
    type = 'button',
    'aria-label': ariaLabel
}: ButtonProps) {
    const baseClass = secondary ? 'button secondary' : 'button';
    const combinedClass = className ? `${baseClass} ${className}` : baseClass;
    return (
        <button
            type={type}
            className={combinedClass}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    );
}
