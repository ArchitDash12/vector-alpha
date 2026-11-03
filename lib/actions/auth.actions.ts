"use server";

import { headers } from "next/headers";
import { auth } from "../better-auth/auth";
import { inngest } from "../inngest/client";

export const signUpWithEmail = async ({
  email,
  password,
  fullName,
  country,
  investmentGoals,
  riskTolerance,
  preferredIndustry,
}: SignUpFormData) => {
  try {
    const response = await auth?.api.signUpEmail({
      body: { email, password, name: fullName },
      headers: await headers(),
    });

    if (!response) {
      return { success: false, error: "Failed to create an account" };
    }

    try {
      await inngest.send({
        name: "app/user.created",
        data: {
          email,
          name: fullName,
          country,
          investmentGoals,
          riskTolerance,
          preferredIndustry,
        },
      });
    } catch (e) {
      console.error("Failed to send Inngest event (sign-up still succeeded):", e);
    }

    return { success: true, data: response };
  } catch (e: any) {
    console.error("Sign up failed:", e);
    const errorMessage = e?.body?.message || e?.message || "Sign up failed";
    return { success: false, error: errorMessage };
  }
};

export const signOut = async () => {
  try {
    await auth?.api.signOut({
      headers: await headers(),
    });
    return { success: true };
  } catch (e: any) {
    console.error("Sign out failed:", e);
    return { success: false, error: e?.message || "Sign out failed" };
  }
};

export const signInWithEmail = async ({
  email,
  password,
}: SignInFormData) => {
  try {
    const response = await auth?.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });

    return { success: true, data: response };
  } catch (e: any) {
    console.error("Sign in failed:", e);
    const errorMessage = e?.body?.message || e?.message || "Sign in failed";
    return { success: false, error: errorMessage };
  }
};
