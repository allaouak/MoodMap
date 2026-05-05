import { useState } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { changePasswordSchema } from "@moodmap/validation";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

type Form = z.infer<typeof changePasswordSchema>;

interface ChangePasswordFormProps {
  userEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ChangePasswordForm({ userEmail, onSuccess, onCancel }: ChangePasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(changePasswordSchema) });

  const newPassword = watch("newPassword") ?? "";

  const onSubmit = async (values: Form) => {
    setLoading(true);
    // Étape 1 : ré-authentification — échec = mot de passe actuel incorrect
    try {
      await authService.confirmPassword(userEmail, values.currentPassword);
    } catch {
      Alert.alert("Mot de passe incorrect", "Vérifie ton mot de passe actuel et réessaie.");
      setLoading(false);
      return;
    }
    // Étape 2 : mise à jour du mot de passe
    try {
      await authService.updatePassword(values.newPassword);
      Alert.alert("Mot de passe mis à jour", "Ton mot de passe a bien été modifié.", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour le mot de passe. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modifier le mot de passe</Text>

      <Controller
        control={control}
        name="currentPassword"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Mot de passe actuel"
            placeholder="••••••••"
            secureTextEntry
            textContentType="password"
            value={value}
            onChangeText={onChange}
            error={errors.currentPassword?.message}
          />
        )}
      />

      <View style={styles.newPasswordBlock}>
        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Nouveau mot de passe"
              placeholder="••••••••"
              secureTextEntry
              textContentType="newPassword"
              value={value}
              onChangeText={onChange}
              error={errors.newPassword?.message}
            />
          )}
        />
        {newPassword.length > 0 && <PasswordStrengthIndicator password={newPassword} />}
      </View>

      <Controller
        control={control}
        name="confirmNewPassword"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Confirmer le nouveau mot de passe"
            placeholder="••••••••"
            secureTextEntry
            textContentType="newPassword"
            value={value}
            onChangeText={onChange}
            error={errors.confirmNewPassword?.message}
          />
        )}
      />

      <View style={styles.actions}>
        <Button label="Annuler" variant="ghost" onPress={onCancel} disabled={loading} />
        <Button label="Enregistrer" loading={loading} onPress={handleSubmit(onSubmit)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  newPasswordBlock: { gap: 8 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
});
