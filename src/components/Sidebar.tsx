import { useEffect } from 'react';
import { BookOpen, Compass, Home, Leaf, MessageCircle, Search, Settings, X } from 'lucide-react';
import type { LearningState } from '../domain/learning';

export type Route = 'today' | 'path' | 'review' | 'dictionary' | 'conversation' | 'settings';

export const navigationItems = [
    { id: 'today', label: 'Hôm nay', subtitle: 'Trang chủ · 首頁', icon: Home },
    { id: 'path', label: 'Lộ trình', subtitle: 'Từ vựng & Ngữ pháp · 詞彙', icon: Compass },
    { id: 'dictionary', label: 'Từ điển', subtitle: 'Từ điển Hán-Việt · 華越', icon: Search },
    { id: 'review', label: 'Ôn tập', subtitle: 'Thẻ SRS · 生詞卡', icon: BookOpen },
    { id: 'conversation', label: 'Hội thoại', subtitle: 'Luyện phát âm & AI · 口說與AI', icon: MessageCircle },
    { id: 'settings', label: 'Tiến độ & Cài đặt', subtitle: 'Tiến độ học · 學習紀錄', icon: Settings }
] as const;

interface SidebarProps {
    route: Route;
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    onNavigate: (r: Route) => void;
    dueCount: number;
    profile: LearningState['profile'];
}

export function Sidebar({
    route,
    menuOpen,
    setMenuOpen,
    onNavigate,
    dueCount,
    profile
}: SidebarProps) {
    useEffect(() => {
        if (!menuOpen) return;
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setMenuOpen(false);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [menuOpen, setMenuOpen]);

    if (!menuOpen) return null;

    const initial = profile.name?.slice(0, 1).toUpperCase() || '中';

    return (
        <>
            <div
                className="mobile-backdrop"
                style={{
                    display: 'block',
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(19, 27, 46, 0.4)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 90
                }}
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
            />
            <aside
                className="bento-mobile-drawer"
                style={{
                    position: 'fixed',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '280px',
                    background: '#ffffff',
                    borderRight: '1px solid var(--border-strong)',
                    zIndex: 100,
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.15)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="bento-brand-icon" style={{ width: '34px', height: '34px', fontSize: '18px' }}>中</div>
                        <span style={{ fontWeight: 700, fontSize: '16px' }}>ZhongXue+</span>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(false)}
                        style={{ padding: '6px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav aria-label="Điều hướng chính" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {navigationItems.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className={`bento-nav-tab ${route === item.id ? 'active' : ''}`}
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                padding: '10px 14px',
                                borderRadius: '8px'
                            }}
                            aria-current={route === item.id ? 'page' : undefined}
                            onClick={() => {
                                onNavigate(item.id);
                                setMenuOpen(false);
                            }}
                        >
                            <item.icon size={18} style={{ marginRight: '8px' }} />
                            <span>{item.label}</span>
                            <span style={{ fontSize: '11px', opacity: 0.8, marginLeft: 'auto' }}>{item.subtitle.split('·')[0]}</span>
                            {item.id === 'review' && dueCount > 0 && (
                                <span className="bento-nav-count" style={{ marginLeft: '6px' }}>{dueCount}</span>
                            )}
                        </button>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="bento-avatar" style={{ width: '32px', height: '32px' }}>{initial}</div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{profile.name || '示範學習者'}</div>
                        <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Chuẩn TOCFL A2</div>
                    </div>
                    <Leaf size={16} color="var(--jade-emerald)" style={{ marginLeft: 'auto' }} />
                </div>
            </aside>
        </>
    );
}
