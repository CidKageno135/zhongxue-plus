import { useEffect, useRef, useState } from 'react';
import { Menu, Search, X, Edit3 } from 'lucide-react';
import type { Route } from './Sidebar';
import { navigationItems } from './Sidebar';
import { HandwritingPad } from './HandwritingPad';

interface TopbarProps {
    route: Route;
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    streak: number;
    profileName: string;
    onNavigate: (r: Route) => void;
    dueCount?: number;
    searchValue?: string;
    onSearch?: (query: string) => void;
}

export function Topbar({
    route,
    menuOpen,
    setMenuOpen,
    streak = 0,
    profileName,
    onNavigate,
    dueCount = 0,
    searchValue = '',
    onSearch
}: TopbarProps) {
    const initial = profileName?.slice(0, 1).toUpperCase() || '中';
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [showHandwriting, setShowHandwriting] = useState(false);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="bento-header">
            {/* Top row */}
            <div className="bento-header-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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

                {/* Omnibar Search */}
                <div className="bento-search-box">
                    <Search size={16} color="var(--on-surface-variant)" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="bento-search-input"
                        aria-label="Tra cứu Hán tự, Pinyin, Hán-Việt"
                        placeholder="Tra cứu Hán tự, Pinyin, Hán-Việt..."
                        value={searchValue}
                        onChange={e => onSearch?.(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                onNavigate('dictionary');
                            }
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowHandwriting(true)}
                        aria-label="Vẽ chữ viết tay để tra từ"
                        title="Vẽ chữ viết tay (giống Hanzii)"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px 4px',
                            color: 'var(--vermilion-cinnabar)'
                        }}
                    >
                        <Edit3 size={15} />
                    </button>
                    <kbd
                        className="bento-search-kbd"
                        onClick={() => searchInputRef.current?.focus()}
                        style={{ cursor: 'pointer' }}
                        title="Phím tắt: Ctrl+K hoặc ⌘K"
                    >
                        ⌘K
                    </kbd>
                </div>

                {/* Profile & Demo stats */}
                <div className="bento-header-actions">
                    {streak > 0 && (
                        <div className="bento-gem-pill" style={{ color: 'var(--vermilion-cinnabar)', borderColor: 'rgba(200, 50, 43, 0.25)' }}>
                            <span>🔥</span>
                            <span style={{ color: 'var(--vermilion-cinnabar)', fontWeight: 700 }}>{streak}</span>
                            <span style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>ngày</span>
                        </div>
                    )}
                    <div className="bento-gem-pill">
                        <span>💎</span>
                        <span style={{ color: 'var(--on-surface)' }}>1,420</span>
                        <span style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>Demo</span>
                    </div>

                    <button
                        type="button"
                        className="bento-profile-pill"
                        aria-label="Mở hồ sơ & cài đặt"
                        onClick={() => onNavigate('settings')}
                    >
                        <div style={{ textAlign: 'right', display: 'none' }} className="profile-text-desktop">
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface)' }}>示範學習者</div>
                            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>({profileName || 'Tài khoản mẫu'})</div>
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

            {showHandwriting && (
                <HandwritingPad
                    onSelectWord={char => {
                        onSearch?.(char);
                        onNavigate('dictionary');
                    }}
                    onClose={() => setShowHandwriting(false)}
                />
            )}
        </header>
    );
}
