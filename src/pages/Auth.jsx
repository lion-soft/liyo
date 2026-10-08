
import { useState } from "react";
import { supabase } from "../lib/supabase";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      // =========================
      // LOGIN
      // =========================
      if (isLogin) {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (error) {
          throw error;
        }

        if (data.user) {
          window.location.href = "/";
          return;
        }
      }

      // =========================
      // CREATE ACCOUNT
      // =========================
      else {
        const cleanEmail = email.trim();
        const cleanBusinessName =
          businessName.trim() || "My Business";

        const {
          data: { user, session },
          error,
        } = await supabase.auth.signUp({
          email: cleanEmail,
          password,

          // Send business name to the database trigger
          options: {
            data: {
              business_name: cleanBusinessName,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (!user) {
          throw new Error(
            "Account could not be created. Please try again."
          );
        }

        /*
         * Business row is NOT inserted here.
         *
         * The Supabase database trigger automatically
         * creates the business row when auth.users
         * receives the new user.
         */

        // =========================
        // EMAIL CONFIRMATION
        // =========================
        if (!session) {
          setShowConfirmation(true);
          setMessage("");

          setPassword("");
          setBusinessName("");

          return;
        }

        // =========================
        // IF EMAIL CONFIRMATION
        // IS DISABLED
        // =========================
        setMessage(
          "Account created successfully! You can now use LIYO."
        );

        setPassword("");
        setBusinessName("");
      }
    } catch (error) {
      console.error("Auth Error:", error);

      setMessage(
        error?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // EMAIL CONFIRMATION SCREEN
  // =========================
  if (showConfirmation) {
    return (
      <div className="auth-page">
        <div className="auth-card">

          {/* LOGO */}
          <div className="auth-logo">
            <div className="auth-logo-icon">L</div>

            <div>
              <h1>LIYO</h1>
              <p>One App. Your Business.</p>
            </div>
          </div>

          {/* EMAIL ICON */}
          <div className="auth-heading">

            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 22px",
                borderRadius: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                background:
                  "linear-gradient(135deg, rgba(29,157,255,.18), rgba(40,104,219,.12))",
                border:
                  "1px solid rgba(29,157,255,.25)",
                boxShadow:
                  "0 15px 40px rgba(29,157,255,.12)",
              }}
            >
              ✉
            </div>

            <h2>Check Your Email</h2>

            <p>
              We've sent a confirmation link to
              <br />

              <strong
                style={{
                  color: "#1d9dff",
                  wordBreak: "break-word",
                }}
              >
                {email}
              </strong>
            </p>
          </div>

          {/* INFORMATION CARD */}
          <div
            style={{
              marginTop: "24px",
              padding: "20px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, rgba(255,255,255,.045), rgba(255,255,255,.02))",
              border:
                "1px solid rgba(255,255,255,.08)",
              lineHeight: "1.7",
              color: "#aebbd0",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            Open your email and click
            <strong
              style={{
                color: "#ffffff",
                margin: "0 5px",
              }}
            >
              Confirm your email
            </strong>
            to activate your LIYO account.
          </div>

          {/* BACK TO LOGIN */}
          <button
            type="button"
            className="auth-submit"
            style={{
              marginTop: "22px",
            }}
            onClick={() => {
              setShowConfirmation(false);
              setIsLogin(true);
              setMessage("");
              setPassword("");
            }}
          >
            Back to Login
          </button>

          {/* HELP TEXT */}
          <div
            style={{
              marginTop: "18px",
              textAlign: "center",
              fontSize: "13px",
              color: "#718096",
              lineHeight: "1.7",
            }}
          >
            Didn't receive the email?
            <br />
            Check your spam or promotions folder.
          </div>

        </div>
      </div>
    );
  }

  // =========================
  // LOGIN / REGISTER SCREEN
  // =========================
  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* LOGO */}
        <div className="auth-logo">
          <div className="auth-logo-icon">L</div>

          <div>
            <h1>LIYO</h1>
            <p>One App. Your Business.</p>
          </div>
        </div>

        {/* HEADING */}
        <div className="auth-heading">
          <h2>
            {isLogin
              ? "Welcome Back"
              : "Create Your Account"}
          </h2>

          <p>
            {isLogin
              ? "Login to manage your business."
              : "Start managing your business with LIYO."}
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>

          {/* BUSINESS NAME */}
          {!isLogin && (
            <div className="auth-field">
              <label>Business Name</label>

              <input
                type="text"
                placeholder="Enter your business name"
                value={businessName}
                onChange={(e) =>
                  setBusinessName(e.target.value)
                }
                required
                autoComplete="organization"
              />
            </div>
          )}

          {/* EMAIL */}
          <div className="auth-field">
            <label>Email</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              autoComplete="email"
            />
          </div>

          {/* PASSWORD */}
          <div className="auth-field">
            <label>Password</label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              minLength={6}
              autoComplete={
                isLogin
                  ? "current-password"
                  : "new-password"
              }
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
              ? "Login"
              : "Create Account"}
          </button>
        </form>

        {/* MESSAGE */}
        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

        {/* SWITCH LOGIN / REGISTER */}
        <div className="auth-switch">

          {isLogin ? (
            <>
              Don't have an account?{" "}

              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setMessage("");
                }}
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}

              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setMessage("");
                }}
              >
                Login
              </button>
            </>
          )}

        </div>

      </div>
    </div>
  );
}

export default Auth;