import { View, Text, StyleSheet } from "react-native";

interface TagCloudProps {
  topTags: { tag: string; count: number }[];
}

export function TagCloud({ topTags }: TagCloudProps) {
  if (topTags.length === 0) return null;
  return (
    <View style={styles.cloud}>
      {topTags.map(({ tag, count }, i) => (
        <View key={tag} style={[styles.chip, i === 0 && styles.chipTop]}>
          <Text style={[styles.chipText, i === 0 && styles.chipTextTop]}>{tag}</Text>
          <Text style={[styles.chipCount, i === 0 && styles.chipCountTop]}>×{count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipTop: { backgroundColor: "#EDE5FF" },
  chipText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  chipTextTop: { color: "#6D28D9" },
  chipCount: { fontSize: 11, color: "#9CA3AF" },
  chipCountTop: { color: "#9B6EFF" },
});
