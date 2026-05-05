import { View, Text, StyleSheet } from "react-native";

const CRITERIA = [
  { label: "8 car. min.", test: (p: string) => p.length >= 8 },
  { label: "Majuscule", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Chiffre", test: (p: string) => /[0-9]/.test(p) },
  { label: "Car. spécial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_COLORS = ["#E5E7EB", "#EF4444", "#F97316", "#EAB308", "#22C55E"] as const;
const STRENGTH_LABELS = ["", "Faible", "Passable", "Bon", "Fort"] as const;

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const results = CRITERIA.map((c) => ({ label: c.label, met: c.test(password) }));
  const score = results.filter((r) => r.met).length;
  const color = STRENGTH_COLORS[score];
  const label = STRENGTH_LABELS[score];

  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {CRITERIA.map((_, i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i < score ? color : "#E5E7EB" }]}
          />
        ))}
        <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.criteriaRow}>
        {results.map((r) => (
          <View key={r.label} style={styles.criterion}>
            <Text style={r.met ? styles.checkMet : styles.checkPending}>
              {r.met ? "✓" : "·"}
            </Text>
            <Text style={[styles.criterionText, r.met && styles.criterionTextMet]}>
              {r.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  barsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "700", minWidth: 52, textAlign: "right" },
  criteriaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  criterion: { flexDirection: "row", alignItems: "center", gap: 3 },
  checkPending: { fontSize: 14, color: "#D1D5DB", fontWeight: "700", lineHeight: 16 },
  checkMet: { fontSize: 12, color: "#22C55E", fontWeight: "700", lineHeight: 16 },
  criterionText: { fontSize: 11, color: "#9CA3AF" },
  criterionTextMet: { color: "#374151" },
});
