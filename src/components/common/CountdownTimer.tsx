import React from 'react';
import { useCountdown } from '../../hooks/useCountdown';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: number;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt }) => {
  const { formattedTime, isExpired } = useCountdown(expiresAt);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.8rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.875rem',
        fontWeight: 700,
        background: isExpired ? 'var(--danger-bg)' : 'var(--accent-light)',
        color: isExpired ? 'var(--danger-color)' : 'var(--accent-primary)',
        border: `1px solid ${isExpired ? 'var(--danger-color)' : 'var(--accent-primary)'}`
      }}
    >
      <Clock size={16} />
      <span>{isExpired ? 'QR Code Expired' : `Expires in: ${formattedTime}`}</span>
    </div>
  );
};
