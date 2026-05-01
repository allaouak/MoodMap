import { View, Text, SafeAreaView } from "react-native";

export default function CalendarScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface-soft items-center justify-center">
      <Text className="text-4xl mb-4">📅</Text>
      <Text className="text-xl font-bold text-gray-700">Calendrier</Text>
      <Text className="text-sm text-gray-400 mt-2 text-center px-8">
        Visualise tes humeurs jour par jour. Bientôt disponible.
      </Text>
    </SafeAreaView>
  );
}
