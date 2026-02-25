import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useRole } from '../../../hooks/useRole';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hasRole } = useRole();

  // Aquí va toda la lógica de navegación que estaba en MainLayout
  
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      {/* Contenido del sidebar */}
    </aside>
  );
}