import React, { useState, useId } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipAlign = 'center' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  align?: TooltipAlign;
  className?: string;
  style?: React.CSSProperties;
}

export const getTooltipPositionStyles = (
  position: TooltipPosition = 'top',
  align: TooltipAlign = 'center'
): React.CSSProperties => {
  switch (position) {
    case 'bottom':
      if (align === 'right') {
        return {
          top: 'calc(100% + 8px)',
          right: 0,
        };
      }
      if (align === 'left') {
        return {
          top: 'calc(100% + 8px)',
          left: 0,
        };
      }
      return {
        top: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
      };
    case 'left':
      return {
        right: 'calc(100% + 8px)',
        top: '50%',
        transform: 'translateY(-50%)',
      };
    case 'right':
      return {
        left: 'calc(100% + 8px)',
        top: '50%',
        transform: 'translateY(-50%)',
      };
    case 'top':
    default:
      if (align === 'right') {
        return {
          bottom: 'calc(100% + 8px)',
          right: 0,
        };
      }
      if (align === 'left') {
        return {
          bottom: 'calc(100% + 8px)',
          left: 0,
        };
      }
      return {
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
      };
  }
};

export const getTooltipArrowStyles = (
  position: TooltipPosition = 'top',
  align: TooltipAlign = 'center'
): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: '6px',
    height: '6px',
    backgroundColor: '#0f172a',
    borderColor: 'rgba(51, 65, 85, 0.8)',
  };
  switch (position) {
    case 'bottom':
      return {
        ...base,
        top: '-3px',
        left: align === 'center' ? '50%' : align === 'left' ? '8px' : 'auto',
        right: align === 'right' ? '8px' : 'auto',
        transform: align === 'center' ? 'translateX(-50%) rotate(45deg)' : 'rotate(45deg)',
        borderTop: '1px solid rgba(51, 65, 85, 0.8)',
        borderLeft: '1px solid rgba(51, 65, 85, 0.8)',
      };
    case 'left':
      return {
        ...base,
        right: '-3px',
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
        borderTop: '1px solid rgba(51, 65, 85, 0.8)',
        borderRight: '1px solid rgba(51, 65, 85, 0.8)',
      };
    case 'right':
      return {
        ...base,
        left: '-3px',
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
        borderLeft: '1px solid rgba(51, 65, 85, 0.8)',
      };
    case 'top':
    default:
      return {
        ...base,
        bottom: '-3px',
        left: align === 'center' ? '50%' : align === 'left' ? '8px' : 'auto',
        right: align === 'right' ? '8px' : 'auto',
        transform: align === 'center' ? 'translateX(-50%) rotate(45deg)' : 'rotate(45deg)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
        borderRight: '1px solid rgba(51, 65, 85, 0.8)',
      };
  }
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  align = 'center',
  className = '',
  style = {},
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  const positionStyles = getTooltipPositionStyles(position, align);
  const arrowStyles = getTooltipArrowStyles(position, align);

  return (
    <div
      className={`tooltip-container ${className}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      aria-describedby={isVisible && content ? tooltipId : undefined}
    >
      {children}
      {isVisible && content && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 9999,
            padding: '6px 10px',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            fontWeight: 400,
            color: '#f8fafc',
            backgroundColor: '#0f172a',
            borderRadius: '6px',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            maxWidth: '280px',
            width: 'max-content',
            whiteSpace: 'normal',
            pointerEvents: 'none',
            opacity: 1,
            transition: 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out',
            ...positionStyles,
          }}
        >
          {content}
          <div style={arrowStyles} />
        </div>
      )}
    </div>
  );
};
