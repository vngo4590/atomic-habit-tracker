import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/lib/actions/auth";

function safeCallbackUrl(raw: string | undefined): string {
  // Prevent open-redirect attacks by only allowing local paths.
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // If the user is already signed in, send them to the main flow
  // instead of showing the login form again.
  const session = await auth();
  if (session?.user) {
    redirect(safeCallbackUrl(callbackUrl));
  }

  return (
    <AuthForm
      action={loginAction}
      callbackUrl={callbackUrl}
      eyebrow="Welcome back"
      title="Sign in to Atomicly"
      submitLabel="Sign in"
      footer={
        <>
          New here? <Link href="/register">Create an account</Link>
        </>
      }
    />
  );
}
