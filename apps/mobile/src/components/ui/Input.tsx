import React, { useState } from "react";
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface InputProps extends TextInputProps {
  label?: string | undefined;
  error?: string | undefined;
  showPasswordToggle?: boolean;
}

export function Input({ label, error, showPasswordToggle, secureTextEntry, ...props }: InputProps) {
  const [visible, setVisible] = useState(false);

  const effectiveSecure = showPasswordToggle ? !visible : secureTextEntry;

  return (
    <View className="w-full gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
      ) : null}
      <View className="relative">
        <TextInput
          className={`w-full bg-surface-muted rounded-2xl px-4 py-3.5 text-base text-gray-900 border ${
            error ? "border-red-400" : "border-transparent"
          } focus:border-brand-400${showPasswordToggle ? " pr-12" : ""}`}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={effectiveSecure}
          {...props}
        />
        {showPasswordToggle ? (
          <TouchableOpacity
            className="absolute right-3 top-0 bottom-0 justify-center"
            onPress={() => setVisible((v) => !v)}
            accessibilityLabel={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text className="text-xs text-red-500 ml-1">{error}</Text>
      ) : null}
    </View>
  );
}
