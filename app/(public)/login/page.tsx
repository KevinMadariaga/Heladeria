import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="sticker w-full max-w-sm bg-card p-6 text-center">
        <Logo className="mx-auto w-56" />
        <h1 className="mt-4 mb-6 text-2xl font-semibold">Ingresar</h1>
        <LoginForm />
      </div>
    </main>
  );
}
