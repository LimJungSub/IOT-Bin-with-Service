import type { ReactNode } from 'react';
import './StatsCard.css';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: 'red' | 'orange' | 'green' | 'blue';
  description?: string;
}

export function StatsCard({ title, value, icon, color, description }: StatsCardProps) {
  return (
    <div className={`stats-card stats-card--${color}`}>
      <div className="stats-card__row">
        <div className="stats-card__content">
          <div className="stats-card__title">{title}</div>
          <div className="stats-card__value">{value}</div>
          {description && <div className="stats-card__desc">{description}</div>}
        </div>
        <div className="stats-card__icon">{icon}</div>
      </div>
    </div>
  );
}
