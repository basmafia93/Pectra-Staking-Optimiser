import React from "react";

interface InputProps {
  id: string;
  type: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  step?: string;
}

export const Input: React.FC<InputProps> = ({ id, type, value, onChange, className, style, step }) => {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      className={className}
      style={{ padding: "0.5rem", fontSize: "1rem", ...style }}
      step={step}
    />
  );
};
