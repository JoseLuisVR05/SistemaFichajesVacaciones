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

  const handleMobileMenuClick = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className={styles.mainLayout}>
      {/* Overlay para cerrar sidebar en mobile */}
      {mobileMenuOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={styles.sidebarContainer}>
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <div className={styles.mainContent}>
        {/* Header */}
        <Header onMenuClick={handleMobileMenuClick} />

        {/* Página actual */}
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}