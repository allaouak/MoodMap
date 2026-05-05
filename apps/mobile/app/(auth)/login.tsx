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
    } catch {
      // Message générique — ne pas exposer si l'email existe ou non (user enumeration)
      Alert.alert("Erreur", "Email ou mot de passe incorrect.");
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
                  secureTextEntry
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
