import { GoogleLogin } from '@react-oauth/google';

interface GoogleAuthButtonProps {
  onCredential: (credential?: string) => void;
  onError: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export default function GoogleAuthButton({
  onCredential,
  onError,
  disabled = false,
  loading = false,
  error,
}: GoogleAuthButtonProps) {
  return (
    <div
      className={`google-auth-button mx-auto flex w-full max-w-[400px] flex-col items-center ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
      aria-busy={loading}
    >
      <div className="flex w-full max-w-[400px] justify-center overflow-visible">
        <GoogleLogin
          onSuccess={({ credential }) => onCredential(credential)}
          onError={onError}
          useOneTap={false}
          type="standard"
          size="medium"
          text="signin_with"
          theme="filled_black"
          shape="rectangular"
          logo_alignment="left"
          width="400"
        />
      </div>

      {error && (
        <p className="mt-2 text-center text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
