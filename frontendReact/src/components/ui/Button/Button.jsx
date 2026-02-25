/**
 * Button Component
 * 
 * Uso:
 * <Button variant="contained" color="primary" size="md">
 *   Click me
 * </Button>
 * 
 * Propiedades:
 * - variant: 'contained' | 'outlined' | 'text' (default: 'contained')
 * - color: 'primary' | 'success' | 'error' | 'warning' | 'info' (default: 'primary')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - disabled: boolean (default: false)
 * - fullWidth: boolean (default: false)
 * - onClick: function
 * - children: ReactNode
 */

import styles from './Button.module.css';

export function Button({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const buttonClass = [
    styles.button,
    styles[variant],
    styles[color],
    styles[size],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={buttonClass}
      disabled={disabled}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}