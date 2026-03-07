import React from 'react';

interface ViewInfoCardProps {
  title: string;
  description: string;
  instructions?: { label: string; action: string }[];
}

const ViewInfoCard: React.FC<ViewInfoCardProps> = ({ title, description, instructions }) => {
  return (
    <div className="w-full ui-card p-5 flex flex-col gap-4 shrink-0 view-description-card">
      <div className="flex flex-col gap-1">
        <h3 className="ui-text font-bold text-sm tracking-wide">{title}</h3>
        <p className="ui-text-muted text-xs leading-relaxed max-w-4xl">{description}</p>
      </div>

      {instructions && instructions.length > 0 && (
        <div className="flex flex-col gap-2 pt-4 border-t ui-divider">
          <h4 className="text-[10px] font-black uppercase tracking-widest ui-text-subtle">Usage Instructions</h4>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {instructions.map((instruction, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className="px-1.5 py-0.5 rounded font-mono text-[10px] min-w-[50px] text-center shrink-0"
                  style={{
                    background: 'var(--ui-control-bg)',
                    border: '1px solid var(--ui-border)',
                    color: 'var(--ui-text)',
                  }}
                >
                  {instruction.label}
                </span>
                <span className="ui-text-muted">{instruction.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewInfoCard;
