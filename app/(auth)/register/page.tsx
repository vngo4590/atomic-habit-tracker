import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
import { registerAction } from "@/lib/actions/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

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
