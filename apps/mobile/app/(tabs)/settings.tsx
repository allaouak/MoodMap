import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export default function SettingsScreen() {
  const { profile } = useAuth();
  const { reset } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert("Se déconnecter", "Tu vas être déconnecté(e). Tes données restent sauvegardées.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await authService.signOut();
          reset();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-soft">
      <View className="px-5 pt-6 gap-6">
        <Text className="text-2xl font-bold text-gray-900">Réglages</Text>

        {/* Profil */}
        <View className="bg-white rounded-3xl p-5 gap-3">
          <View className="w-14 h-14 rounded-full bg-brand-100 items-center justify-center mb-1">
            <Text className="text-2xl">
              {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="text-lg font-semibold text-gray-900">
            {profile?.display_name ?? "Utilisateur"}
          </Text>
        </View>

        {/* Confidentialité */}
        <View className="bg-white rounded-3xl px-5 py-4 gap-1">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Confidentialité
          </Text>
          <Text className="text-sm text-gray-500 leading-relaxed">
            Tes données émotionnelles sont chiffrées et ne sont jamais partagées
            avec des tiers. Tu peux demander leur suppression à tout moment.
          </Text>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-white rounded-3xl px-5 py-4 flex-row items-center justify-between"
        >
          <Text className="text-base font-medium text-red-500">
            Se déconnecter
          </Text>
          <Text className="text-gray-300 text-lg">→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
