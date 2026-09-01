import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  // AuthForm reads search params, so it must sit behind a Suspense boundary
  // for the route to stay statically shell-renderable.
  return (
    <Suspense fallback={<FormSkeleton />}>
      <AuthForm mode="sign-up" />
    </Suspense>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton h-9 w-2/3" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton mt-4 h-12 w-full" />
      <div className="skeleton h-11 w-full" />
      <div className="skeleton h-11 w-full" />
    </div>
  );
}
