"use server";
import { signIn } from "@/auth";

export const signInAction = async (formData: FormData) => {
	await signIn("credentials", {
		...Object.fromEntries(formData),
		redirectTo: "/",
	});
};
