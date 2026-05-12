import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
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
import { loginSchema } from "@moodmap/validation";

// XCTest typeText() on secureTextEntry doesn't fire onChangeText reliably,
// which causes RHF to hold an empty password and Zod min(8) to fail silently.
// EXPO_PUBLIC_IS_E2E is baked into the JS bundle by Metro at CI build time.
const IS_E2E = process.env.EXPO_PUBLIC_IS_E2E === "true";

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    try {
      setLoading(true);
      await authService.signIn(values.email, values.password);
    } catch (err) {
      // In E2E mode show the raw Supabase error so CI screenshots capture the root cause.
      // In production keep the generic message to avoid user enumeration.
      const msg =
        IS_E2E && err instanceof Error
          ? err.message
          : "Email ou mot de passe incorrect.";
      Alert.alert("Erreur", msg);
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
              Bon retour 👋
            </Text>
            <Text className="text-gray-500">
              Connecte-toi pour retrouver ton journal.
            </Text>
          </View>

          <View className="gap-4">
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
                  testID="login-email-input"
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
                  showPasswordToggle={!IS_E2E}
                  textContentType="password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  testID="login-password-input"
                />
              )}
            />
          </View>

          <View className="gap-3">
            <Button
              label="Se connecter"
              size="lg"
              loading={loading}
              onPress={handleSubmit(onSubmit)}
              testID="login-submit-button"
            />
            <Button
              testID="login-forgot-password-button"
              label="Mot de passe oublié ?"
              variant="ghost"
              onPress={() => router.push("/(auth)/forgot-password")}
            />
          </View>

          <View className="flex-row justify-center gap-1">
            <Text className="text-gray-500">Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
              <Text className="text-brand-500 font-semibold">S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
