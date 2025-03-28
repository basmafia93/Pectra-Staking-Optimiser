import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className, style }) => {
  return (
    <div className={className} style={{ padding: "1rem", borderRadius: "8px", background: "#fff", ...style }}>
      {children}
    </div>
  );
};
