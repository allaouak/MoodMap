import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";

const schema = z.object({
  email: z.string().email("Email invalide"),
});

type Form = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    try {
      setLoading(true);
      await authService.resetPassword(values.email);
      setSent(true);
    } catch {
      // Message générique — ne pas confirmer si l'email existe
      setSent(true);
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
              Mot de passe oublié
            </Text>
            <Text className="text-gray-500">
              Saisis ton email et on t'envoie un lien de réinitialisation.
            </Text>
          </View>

          {sent ? (
            <View className="bg-brand-50 rounded-3xl p-6 gap-3 items-center">
              <Text className="text-4xl">📬</Text>
              <Text className="text-lg font-bold text-gray-900 text-center">
                Vérifie ta boîte mail
              </Text>
              <Text className="text-sm text-gray-500 text-center leading-relaxed">
                Si un compte existe avec cet email, tu recevras un lien dans
                quelques minutes. Pense à vérifier tes spams.
              </Text>
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/login")}
                className="mt-2"
              >
                <Text className="text-brand-500 font-semibold">
                  Retour à la connexion
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
              <Button
                label="Envoyer le lien"
                size="lg"
                loading={loading}
                onPress={handleSubmit(onSubmit)}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
