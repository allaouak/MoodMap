import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <View className="flex-1 items-center justify-between px-8 py-12">
        <View className="flex-1 items-center justify-center gap-6">
          <AppIcon name="sprout-outline" size={42} frameSize={76} />
          <View className="items-center gap-3">
            <Text className="text-4xl font-bold text-brand-700 tracking-tight">
              MoodMap
            </Text>
            <Text className="text-center text-base text-gray-500 leading-relaxed max-w-xs">
              Ton journal émotionnel visuel, privé et bienveillant.
            </Text>
          </View>

          <View className="mt-8 w-full gap-3">
            <View className="flex-row items-center gap-3 bg-white rounded-2xl px-4 py-3">
              <AppIcon name="lock-outline" size={20} frameSize={36} />
              <Text className="text-sm text-gray-600 flex-1">
                Tes données restent privées et sécurisées
              </Text>
            </View>
            <View className="flex-row items-center gap-3 bg-white rounded-2xl px-4 py-3">
              <AppIcon name="palette-outline" size={20} frameSize={36} />
              <Text className="text-sm text-gray-600 flex-1">
                Visualise tes cycles d'humeur avec douceur
              </Text>
            </View>
            <View className="flex-row items-center gap-3 bg-white rounded-2xl px-4 py-3">
              <AppIcon name="chart-line" size={20} frameSize={36} />
              <Text className="text-sm text-gray-600 flex-1">
                Des résumés IA pour mieux te comprendre
              </Text>
            </View>
          </View>
        </View>

        <View className="w-full gap-3">
          <Button
            label="Commencer"
            size="lg"
            onPress={() => router.push("/(auth)/register")}
          />
          <Button
            label="J'ai déjà un compte"
            variant="ghost"
            size="lg"
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
