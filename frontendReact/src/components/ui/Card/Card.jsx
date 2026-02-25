/**
 * Card Component
 * 
 * Uso:
 * <Card variant="elevated">
 *   <h2>Card Title</h2>
 *   <p>Card content</p>
 * </Card>
 * 
 * Propiedades:
 * - variant: 'elevated' | 'flat' | 'outlined' (default: 'elevated')
 * - children: ReactNode
 * - className: string
 */

import styles from './Card.module.css';

export function Card({ 
  children, 
  variant = 'elevated',
  className = '',
  ...props 
}) {
  return (
    <div 
      className={`${styles.card} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}