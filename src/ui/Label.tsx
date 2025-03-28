import React from "react";

interface LabelProps {
  htmlFor: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
}

export const Label: React.FC<LabelProps> = ({ htmlFor, children, style, title }) => {
  return (
    <label htmlFor={htmlFor} style={{ fontWeight: "bold", ...style }} title={title}>
      {children}
    </label>
  );
};
