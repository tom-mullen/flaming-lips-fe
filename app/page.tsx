import Image from "next/image";
import logo from "./logo.png";
import LoginButton from "./components/login-button";
import Alert from "./components/ui/alert";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: "Could not complete sign-in. Please try again.",
  OAuthSignin: "Could not initiate sign-in. Please try again.",
  OAuthAccountNotLinked:
    "This account is already linked to another sign-in method.",
  AccessDenied: "You do not have permission to sign in.",
  Configuration: "There is a problem with the server configuration.",
  // Legacy codes
  access_denied: "You denied access to your account.",
  state_mismatch:
    "Authentication failed due to a security check. Please try again.",
  token_exchange_failed: "Could not complete sign-in. Please try again.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.")
    : null;

  const callbackUrl = redirect ? `/${redirect}` : undefined;

  return (
    <div className="bg-canvas flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Image
            src={logo}
            alt="Standard Innovation"
            className="size-10 object-contain"
            priority
          />
        </div>

        <div className="bg-surface rounded-2xl px-8 py-10 shadow-xl">
          <h1 className="mb-1 text-center text-2xl font-bold text-white">
            Welcome
          </h1>
          <p className="text-muted-foreground mb-8 text-center text-sm">
            Sign in to get started
          </p>

          {errorMessage && (
            <Alert className="mb-6 text-center">{errorMessage}</Alert>
          )}

          <div className="flex flex-col gap-3">
            <LoginButton provider="google" callbackUrl={callbackUrl} />
            <LoginButton
              provider="microsoft-entra-id"
              callbackUrl={callbackUrl}
            />
            <LoginButton provider="spotify" callbackUrl={callbackUrl} />
          </div>
        </div>

        <p className="text-dimmed mt-6 text-center text-xs">
          By continuing, you agree to our{" "}
          <span className="text-muted">Terms of Service</span> and{" "}
          <span className="text-muted">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
