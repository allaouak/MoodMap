import { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";

const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "Minimum 2 caractères")
      .max(50, "Maximum 50 caractères"),
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "Minimum 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterForm) => {
    try {
      setLoading(true);
      await authService.signUp(values.email, values.password, values.displayName);
      Alert.alert(
        "Compte créé !",
        "Vérifie ton email pour confirmer ton compte.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Inscription impossible";
      Alert.alert("Erreur", message);
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
            <TouchableOpacity onPress={() => router.back()} className="mb-4">
              <Text className="text-brand-500 text-base">← Retour</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-gray-900">
              Crée ton compte 🌱
            </Text>
            <Text className="text-gray-500">
              Ton journal t'appartient. Tes données restent privées.
            </Text>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Prénom (ou pseudo)"
                  placeholder="Alex"
                  textContentType="givenName"
                  autoCapitalize="words"
                  value={value}
                  onChangeText={onChange}
                  error={errors.displayName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  placeholder="toi@exemple.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Mot de passe"
                  placeholder="••••••••"
                  secureTextEntry
                  textContentType="newPassword"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />
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

          <View className="gap-3">
            <Button
              label="Créer mon compte"
              size="lg"
              loading={loading}
              onPress={handleSubmit(onSubmit)}
            />
            <Text className="text-xs text-center text-gray-400 px-4">
              En créant un compte, tu acceptes nos conditions d'utilisation et
              notre politique de confidentialité.
            </Text>
          </View>

          <View className="flex-row justify-center gap-1">
            <Text className="text-gray-500">Déjà un compte ?</Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text className="text-brand-500 font-semibold">Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
