import { Button } from "@/components/ui/button";
import { resetPassword } from "@/app/login/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-base">
      <div className="w-full max-w-sm">
        <h1 className="mb-lg text-center text-title font-bold">Reset password</h1>
        {error ? (
          <p role="alert" className="mb-base text-caption text-destructive">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-base text-caption text-text-secondary">{message}</p>
        ) : null}
        <form className="flex flex-col gap-md rounded-lg border border-border bg-surface p-lg">
          <label className="flex flex-col gap-xs">
            <span className="text-caption text-text-secondary">Work email</span>
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-border bg-bg px-md py-sm"
            />
          </label>
          <Button formAction={resetPassword}>Send reset link</Button>
        </form>
      </div>
    </div>
  );
}
