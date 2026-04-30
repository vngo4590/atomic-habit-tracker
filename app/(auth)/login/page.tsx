import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

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
