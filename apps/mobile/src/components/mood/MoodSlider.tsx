import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { MoodLevel, MOOD_LABELS, MOOD_COLOR } from "@/types";
import { MoodFaceIcon } from "@/components/mood/MoodFaceIcon";

interface MoodSliderProps {
  label: string;
  value: MoodLevel;
  onChange: (value: MoodLevel) => void;
  emoji?: boolean;
}

const LEVELS: MoodLevel[] = [1, 2, 3, 4, 5];

export function MoodSlider({
  label,
  value,
  onChange,
  emoji = false,
}: MoodSliderProps) {
  const handlePress = (level: MoodLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(level);
  };

  return (
    <View className="w-full gap-3">
      <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </Text>
      <View className="flex-row justify-between gap-2">
        {LEVELS.map((level) => {
          const isSelected = value === level;
          const color = MOOD_COLOR[level];
          return (
            <TouchableOpacity
              key={level}
              onPress={() => handlePress(level)}
              activeOpacity={0.7}
              className={`flex-1 items-center justify-center py-3 rounded-2xl border-2 ${
                isSelected ? "border-transparent" : "border-gray-100 bg-gray-50"
              }`}
              style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
            >
              {emoji ? (
                <MoodFaceIcon level={level} selected={isSelected} />
              ) : (
                <Text
                  className={`text-lg font-bold ${
                    isSelected ? "text-white" : "text-gray-400"
                  }`}
                >
                  {level}
                </Text>
              )}
              {isSelected && emoji ? (
                <Text className="text-xs text-white font-medium mt-1">
                  {MOOD_LABELS[level]}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
