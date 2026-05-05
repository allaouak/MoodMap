import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { resetPasswordSchema } from "@moodmap/validation";
import { PasswordStrengthIndicator } from "@/features/auth/PasswordStrengthIndicator";

type Form = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const { setRecovery } = useAuthStore();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(resetPasswordSchema) });

  const password = watch("password") ?? "";

  const onSubmit = async (values: Form) => {
    try {
      setLoading(true);
      await authService.updatePassword(values.password);
      setRecovery(false);
      Alert.alert(
        "Mot de passe mis à jour",
        "Tu peux maintenant te connecter avec ton nouveau mot de passe.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch {
      Alert.alert(
        "Erreur",
        "Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-12 pb-8 gap-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <Text className="text-3xl font-bold text-gray-900">
              Nouveau mot de passe
            </Text>
            <Text className="text-gray-500">
              Choisis un mot de passe sécurisé pour ton compte MoodMap.
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-2">
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Nouveau mot de passe"
                    placeholder="••••••••"
                    secureTextEntry
                    textContentType="newPassword"
                    value={value}
                    onChangeText={onChange}
                    error={errors.password?.message}
                  />
                )}
              />
              {password.length > 0 && <PasswordStrengthIndicator password={password} />}
            </View>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Confirme le mot de passe"
                  placeholder="••••••••"
                  secureTextEntry
                  textContentType="newPassword"
                  value={value}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </View>

          <Button
            label="Mettre à jour"
            size="lg"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
