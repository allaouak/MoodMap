import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";
import { updateProfileSchema } from "@moodmap/validation";

export const authService = {
  async signUp(
    email: string,
    password: string,
    displayName: string,
    timezone?: string
  ): Promise<{ requiresConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          ...(timezone && { timezone }),
        },
      },
    });
    if (error) throw error;
    return { requiresConfirmation: !data.session };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const redirectTo = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/reset-redirect`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  async confirmPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async deleteAccount() {
    const { error } = await supabase.rpc("delete_user_account");
    if (error) throw error;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as Profile;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, "display_name" | "avatar_url" | "timezone">>
  ): Promise<Profile> {
    const validated = updateProfileSchema.parse(updates);
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },
};
