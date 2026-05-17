import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { registerAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

function safeCallbackUrl(raw: string | undefined): string {
  // Prevent open-redirect attacks by only allowing local paths.
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // If the user is already signed in and exists in the database,
  // send them to the main flow instead of showing the registration form again.
  const user = await getCurrentUser();
  if (user) {
    redirect(safeCallbackUrl(callbackUrl));
  }

  return (
    <AuthForm
      action={registerAction}
      callbackUrl={callbackUrl}
      eyebrow="Start clean"
      title="Create your account"
      submitLabel="Create account"
      includeName
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
    />
  );
}
