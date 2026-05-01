import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string | undefined;
  error?: string | undefined;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="w-full gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
      ) : null}
      <TextInput
        className={`w-full bg-surface-muted rounded-2xl px-4 py-3.5 text-base text-gray-900 border ${
          error ? "border-red-400" : "border-transparent"
        } focus:border-brand-400`}
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {error ? (
        <Text className="text-xs text-red-500 ml-1">{error}</Text>
      ) : null}
    </View>
  );
}
