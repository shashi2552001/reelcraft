import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#12151E] px-6 py-12 text-center flex flex-col items-center">
      <div className="h-11 w-11 rounded-lg bg-[#1A1F2B] border border-white/[0.07] flex items-center justify-center text-[#9CA3B2] mb-4">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-[#F3F5F8] mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-[#8E96A4] max-w-md leading-relaxed mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 rounded-lg bg-[#E59A1A] hover:bg-[#D48B0F] text-[#0B0D12] text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
