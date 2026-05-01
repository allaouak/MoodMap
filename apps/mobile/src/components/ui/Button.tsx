import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantStyles = {
  primary: {
    container: "bg-brand-500 active:bg-brand-600",
    text: "text-white font-semibold",
  },
  secondary: {
    container: "bg-brand-100 active:bg-brand-200",
    text: "text-brand-700 font-semibold",
  },
  ghost: {
    container: "active:bg-brand-50",
    text: "text-brand-500 font-medium",
  },
};

const sizeStyles = {
  sm: { container: "px-4 py-2 rounded-xl", text: "text-sm" },
  md: { container: "px-6 py-3.5 rounded-2xl", text: "text-base" },
  lg: { container: "px-8 py-4 rounded-2xl", text: "text-lg" },
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      className={`${v.container} ${s.container} flex-row items-center justify-center ${
        disabled || loading ? "opacity-50" : ""
      }`}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : "#7C3AED"}
        />
      ) : (
        <Text className={`${v.text} ${s.text}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
