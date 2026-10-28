import { useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import type { Route } from './Sidebar';
import { navigationItems } from './Sidebar';

interface TopbarProps {
    route: Route;
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    streak: number;
    xp?: number;
    profileName: string;
    onNavigate: (r: Route) => void;
    dueCount?: number;
}

export function Topbar({
    route,
    menuOpen,
    setMenuOpen,
    streak = 0,
    xp = 0,
    profileName,
    onNavigate,
    dueCount = 0
}: TopbarProps) {
    const initial = profileName?.slice(0, 1).toUpperCase() || '中';

    // Global ⌘K / Ctrl+K shortcut: navigate to Dictionary and focus search input
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                onNavigate('dictionary');
                setTimeout(() => {
                    const dictInput = document.querySelector('input[aria-label="Tìm từ vựng"]') as HTMLInputElement | null;
                    dictInput?.focus();
                }, 60);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNavigate]);

    return (
        <header className="bento-header">
            {/* Top row */}
            <div className="bento-header-top">
                <div className="bento-header-left">
                    <button
                        type="button"
                        className="mobile-menu-btn"
                        aria-label="Mở menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>

                    <a
                        href="#"
                        className="bento-brand"
                        onClick={e => {
                            e.preventDefault();
                            onNavigate('today');
                        }}
                    >
                        <div className="bento-brand-icon">中</div>
                        <div className="bento-brand-text">
                            <span className="bento-brand-title">
                                ZhongXue+ <span className="bento-brand-badge">Bento V2</span>
                            </span>
                            <span className="bento-brand-subtitle">台閩正體 ‧ 漢越同源</span>
                        </div>
                    </a>

                    <div className="bento-tocfl-chip" style={{ marginLeft: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>school</span>
                        <span>TOCFL A2</span>
                    </div>
                </div>

                {/* Profile & Real XP / Streak stats */}
                <div className="bento-header-actions">
                    {streak > 0 && (
                        <div className="bento-gem-pill bento-streak-pill" style={{ color: 'var(--vermilion-cinnabar)', borderColor: 'rgba(200, 50, 43, 0.25)' }}>
                            <span>🔥</span>
                            <span style={{ color: 'var(--vermilion-cinnabar)', fontWeight: 700 }}>{streak}</span>
                            <span className="bento-pill-unit" style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>ngày</span>
                        </div>
                    )}
                    <div className="bento-gem-pill" title={`Tổng điểm tích lũy: ${xp} XP`}>
                        <span>💎</span>
                        <span style={{ color: 'var(--on-surface)', fontWeight: 700 }}>{xp.toLocaleString('vi-VN')}</span>
                        <span style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>XP</span>
                    </div>

                    <button
                        type="button"
                        className="bento-profile-pill"
                        aria-label="Mở hồ sơ & cài đặt"
                        onClick={() => onNavigate('settings')}
                    >
                        <div style={{ textAlign: 'right', display: 'none' }} className="profile-text-desktop">
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface)' }}>{profileName || 'Người học'}</div>
                            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>TOCFL A1–A2</div>
                        </div>
                        <div className="bento-avatar">
                            {initial}
                        </div>
                    </button>
                </div>
            </div>

            {/* Sub-navigation bar with horizontal pill tabs */}
            <div className="bento-subnav-bar">
                <div className="bento-subnav-container">
                    <nav aria-label="Điều hướng chính" style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
                        {navigationItems.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                className={`bento-nav-tab ${route === item.id ? 'active' : ''}`}
                                aria-current={route === item.id ? 'page' : undefined}
                                onClick={() => onNavigate(item.id)}
                            >
                                <span>{item.label}</span>
                                <span style={{ fontSize: '11px', opacity: 0.85 }}>({item.subtitle})</span>
                                {item.id === 'review' && dueCount > 0 && (
                                    <span className="bento-nav-count">{dueCount}</span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
        </header>
    );
}
