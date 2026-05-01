import { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { moodService } from "@/services/mood.service";
import { useMoodStore } from "@/stores/mood.store";
import { MoodEntry } from "@/types";
import { todayISO, formatEntryDate } from "@/utils/date";
import { MoodCheckIn } from "@/features/mood/MoodCheckIn";
import { TodayCard } from "@/features/mood/TodayCard";

export default function TodayScreen() {
  const { user, profile } = useAuth();
  const { todayEntry, setTodayEntry } = useMoodStore();
  const [loading, setLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  useEffect(() => {
    if (!user) return;
    moodService
      .getTodayEntry(user.id)
      .then(setTodayEntry)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, setTodayEntry]);

  const handleSaved = (entry: MoodEntry) => {
    setTodayEntry(entry);
    setShowCheckIn(false);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-soft items-center justify-center">
        <Text className="text-brand-400 text-base">Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-soft">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-6 pb-10 gap-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="gap-1">
          <Text className="text-2xl font-bold text-gray-900">
            {greeting()},{" "}
            {profile?.display_name ?? "toi"} 👋
          </Text>
          <Text className="text-gray-400 text-sm capitalize">
            {formatEntryDate(todayISO())}
          </Text>
        </View>

        {/* Check-in ou résumé du jour */}
        {showCheckIn || !todayEntry ? (
          <MoodCheckIn
            userId={user!.id}
            existingEntry={todayEntry}
            onSaved={handleSaved}
            onCancel={todayEntry ? () => setShowCheckIn(false) : undefined}
          />
        ) : (
          <TodayCard
            entry={todayEntry}
            onEdit={() => setShowCheckIn(true)}
          />
        )}

        {/* Encouragement si entrée du jour faite */}
        {todayEntry && !showCheckIn && (
          <View className="bg-white rounded-3xl p-5 gap-2">
            <Text className="text-base font-semibold text-gray-800">
              Continue comme ça 🌱
            </Text>
            <Text className="text-sm text-gray-500 leading-relaxed">
              Prendre un moment pour noter son ressenti, c'est déjà prendre soin
              de soi. Reviens demain pour continuer.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
