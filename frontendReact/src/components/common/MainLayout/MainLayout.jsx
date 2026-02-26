import { useState } from 'react';
import { Sidebar } from './Sidebar/Sidebar';
import { Header } from './Header/Header'; 
import styles from './MainLayout.module.css';

/**
 * MainLayout Component
 * Layout principal de la aplicación
 * Orquesta Sidebar y Header
 */
export function MainLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleMobileMenuClick = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className={`${styles.mainLayout} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Overlay para cerrar sidebar en mobile */}
      {mobileMenuOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={styles.sidebarContainer}>
        <Sidebar
          collapsed={collapsed}                    // 👈
          onToggleCollapse={() => setCollapsed(!collapsed)} // 👈
          mobileOpen={mobileMenuOpen}              // 👈 pasa el estado real
          onMobileClose={() => setMobileMenuOpen(false)} // 👈
        />
      </div>

      {/* Contenido principal */}
      <div className={styles.mainContent}>
        {/* Header */}
        <Header 
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          isCollapsed={collapsed} 
          />
          

        {/* Página actual */}
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}