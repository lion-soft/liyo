
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Settings() {
  const [profile, setProfile] = useState({
    businessName: "",
    email: "",
    phone: "",
  });

  const [preferences, setPreferences] = useState({
    notifications: true,
    aiInsights: true,
    weeklyReport: true,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  });

  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    loadBusinessProfile();
    loadPreferences();
  }, []);

  // =====================================================
  // GET CURRENT USER
  // =====================================================

  const getCurrentUser = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      return null;
    }

    return session?.user ?? null;
  };

  // =====================================================
  // LOAD BUSINESS PROFILE
  // =====================================================

  const loadBusinessProfile = async () => {
    try {
      setProfileLoading(true);

      const user = await getCurrentUser();

      if (!user) {
        console.error("No authenticated user.");
        return;
      }

      console.log("LIYO current user:", user.id);

      const {
        data,
        error,
      } = await supabase
        .from("businesses")
        .select("id, name, email, phone")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Business profile SELECT error:",
          error
        );

        /*
          Do not block the settings page.
          The user can still enter their information.
        */

        setProfile({
          businessName: "",
          email: user.email || "",
          phone: "",
        });

        return;
      }

      // Existing business
      if (data) {
        setProfile({
          businessName: data.name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
        });

        return;
      }

      // =================================================
      // BUSINESS DOES NOT EXIST
      // =================================================

      console.log(
        "No business found. Creating business profile..."
      );

      const {
        data: newBusiness,
        error: createError,
      } = await supabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          name: "",
          email: user.email || "",
          phone: "",
        })
        .select("id, name, email, phone")
        .single();

      if (createError) {
        console.error(
          "Business profile creation error:",
          createError
        );

        /*
          Keep the settings page usable even if
          automatic creation fails.
        */

        setProfile({
          businessName: "",
          email: user.email || "",
          phone: "",
        });

        return;
      }

      setProfile({
        businessName: newBusiness.name || "",
        email:
          newBusiness.email ||
          user.email ||
          "",
        phone: newBusiness.phone || "",
      });
    } catch (error) {
      console.error(
        "Business profile loading failed:",
        error
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // =====================================================
  // LOAD PREFERENCES
  // =====================================================

  const loadPreferences = () => {
    const savedPreferences =
      localStorage.getItem("liyo_preferences");

    if (!savedPreferences) {
      return;
    }

    try {
      setPreferences(
        JSON.parse(savedPreferences)
      );
    } catch (error) {
      console.error(
        "Failed to load preferences:",
        error
      );
    }
  };

  // =====================================================
  // PROFILE CHANGE
  // =====================================================

  const handleProfileChange = (e) => {
    const { name, value } = e.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setProfileSaved(false);
  };

  // =====================================================
  // SAVE BUSINESS PROFILE
  // =====================================================

  const saveProfile = async (e) => {
    e.preventDefault();

    if (!profile.businessName.trim()) {
      alert("Please enter your business name.");
      return;
    }

    try {
      setProfileSaving(true);
      setProfileSaved(false);

      const user = await getCurrentUser();

      if (!user) {
        alert(
          "Your login session could not be verified. Please login again."
        );
        return;
      }

      console.log(
        "Saving business for user:",
        user.id
      );

      // =================================================
      // CHECK EXISTING BUSINESS
      // =================================================

      const {
        data: existingBusiness,
        error: findError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (findError) {
        console.error(
          "Business lookup error:",
          findError
        );

        /*
          Show the actual Supabase error instead of
          hiding it behind a generic message.
        */

        alert(
          `Unable to access your business profile.\n\n${findError.message}`
        );

        return;
      }

      // =================================================
      // UPDATE
      // =================================================

      if (existingBusiness) {
        const {
          error: updateError,
        } = await supabase
          .from("businesses")
          .update({
            name: profile.businessName.trim(),
            email: profile.email.trim(),
            phone: profile.phone.trim(),
          })
          .eq("id", existingBusiness.id)
          .eq("owner_id", user.id);

        if (updateError) {
          console.error(
            "Business update error:",
            updateError
          );

          alert(
            `Unable to save business profile.\n\n${updateError.message}`
          );

          return;
        }
      }

      // =================================================
      // INSERT
      // =================================================

      else {
        const {
          error: insertError,
        } = await supabase
          .from("businesses")
          .insert({
            owner_id: user.id,
            name: profile.businessName.trim(),
            email: profile.email.trim(),
            phone: profile.phone.trim(),
          });

        if (insertError) {
          console.error(
            "Business insert error:",
            insertError
          );

          alert(
            `Unable to create business profile.\n\n${insertError.message}`
          );

          return;
        }
      }

      setProfileSaved(true);

      setTimeout(() => {
        setProfileSaved(false);
      }, 2500);
    } catch (error) {
      console.error(
        "Saving business profile failed:",
        error
      );

      alert(
        "Something went wrong while saving your profile."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  // =====================================================
  // PREFERENCES
  // =====================================================

  const handlePreferenceChange = (name) => {
    const updatedPreferences = {
      ...preferences,
      [name]: !preferences[name],
    };

    setPreferences(updatedPreferences);

    localStorage.setItem(
      "liyo_preferences",
      JSON.stringify(updatedPreferences)
    );
  };

  // =====================================================
  // PASSWORD INPUT
  // =====================================================

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswords((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  const changePassword = async (e) => {
    e.preventDefault();

    if (
      !passwords.current ||
      !passwords.newPassword ||
      !passwords.confirm
    ) {
      alert("Please fill all password fields.");
      return;
    }

    if (passwords.newPassword.length < 6) {
      alert(
        "New password must contain at least 6 characters."
      );
      return;
    }

    if (
      passwords.newPassword !==
      passwords.confirm
    ) {
      alert("New passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);

      const user = await getCurrentUser();

      if (!user?.email) {
        alert(
          "Unable to verify your account. Please login again."
        );
        return;
      }

      // =================================================
      // VERIFY CURRENT PASSWORD
      // =================================================

      const {
        error: verifyError,
      } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.current,
      });

      if (verifyError) {
        alert("Current password is incorrect.");
        return;
      }

      // =================================================
      // UPDATE PASSWORD
      // =================================================

      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });

      if (updateError) {
        console.error(
          "Password update error:",
          updateError
        );

        alert(
          updateError.message ||
            "Unable to change password."
        );

        return;
      }

      alert(
        "Password changed successfully."
      );

      setPasswords({
        current: "",
        newPassword: "",
        confirm: "",
      });
    } catch (error) {
      console.error(
        "Password change failed:",
        error
      );

      alert(
        "Something went wrong while changing your password."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  // =====================================================
  // SIGN OUT
  // =====================================================

  const signOut = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to sign out?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Sign out error:",
          error
        );

        alert(
          "Unable to sign out. Please try again."
        );

        return;
      }

      // ProtectedRoute will automatically
      // redirect to /auth.
    } catch (error) {
      console.error(
        "Sign out failed:",
        error
      );

      alert(
        "Something went wrong while signing out."
      );
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="label">
            SYSTEM SETTINGS
          </span>

          <h1>Settings</h1>

          <p>
            Manage your business profile
            and LIYO preferences.
          </p>
        </div>
      </div>

      <div className="settings-grid">

        {/* BUSINESS PROFILE */}

        <div className="panel settings-card">
          <div className="settings-title">
            <div className="settings-icon">
              🏢
            </div>

            <div>
              <h2>Business Profile</h2>

              <p>
                Manage your business information.
              </p>
            </div>
          </div>

          <form
            className="settings-form"
            onSubmit={saveProfile}
          >
            <label>
              Business Name

              <input
                name="businessName"
                value={profile.businessName}
                onChange={handleProfileChange}
                placeholder="Your Business Name"
                disabled={profileLoading}
              />
            </label>

            <label>
              Business Email

              <input
                name="email"
                type="email"
                value={profile.email}
                onChange={handleProfileChange}
                placeholder="business@email.com"
                disabled={profileLoading}
              />
            </label>

            <label>
              Phone Number

              <input
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                placeholder="077 123 4567"
                disabled={profileLoading}
              />
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "5px",
              }}
            >
              <button
                type="submit"
                className="primary-btn"
                disabled={
                  profileLoading ||
                  profileSaving
                }
              >
                {profileSaving
                  ? "Saving..."
                  : "Save Profile"}
              </button>

              {profileSaved && (
                <span
                  style={{
                    color: "#5ee5a1",
                    fontSize: "11px",
                  }}
                >
                  ✓ Profile saved
                </span>
              )}
            </div>
          </form>
        </div>

        {/* PREFERENCES */}

        <div className="panel settings-card">
          <div className="settings-title">
            <div className="settings-icon">
              ⚙️
            </div>

            <div>
              <h2>Preferences</h2>

              <p>
                Customize your LIYO experience.
              </p>
            </div>
          </div>

          <div className="settings-options">

            <div className="setting-row">
              <div>
                <strong>
                  Notifications
                </strong>

                <span>
                  Receive important business notifications.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  preferences.notifications
                }
                onChange={() =>
                  handlePreferenceChange(
                    "notifications"
                  )
                }
              />
            </div>

            <div className="setting-row">
              <div>
                <strong>
                  AI Insights
                </strong>

                <span>
                  Allow LIYO to provide business insights.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  preferences.aiInsights
                }
                onChange={() =>
                  handlePreferenceChange(
                    "aiInsights"
                  )
                }
              />
            </div>

            <div className="setting-row">
              <div>
                <strong>
                  Weekly Report
                </strong>

                <span>
                  Receive a weekly business performance report.
                </span>
              </div>

              <input
                type="checkbox"
                checked={
                  preferences.weeklyReport
                }
                onChange={() =>
                  handlePreferenceChange(
                    "weeklyReport"
                  )
                }
              />
            </div>

          </div>
        </div>

        {/* SECURITY */}

        <div className="panel settings-card">
          <div className="settings-title">
            <div className="settings-icon">
              🔐
            </div>

            <div>
              <h2>Security</h2>

              <p>
                Manage your account security.
              </p>
            </div>
          </div>

          <form
            className="settings-form"
            onSubmit={changePassword}
          >
            <label>
              Current Password

              <input
                name="current"
                type="password"
                value={passwords.current}
                onChange={handlePasswordChange}
                placeholder="Current password"
              />
            </label>

            <label>
              New Password

              <input
                name="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
                placeholder="Minimum 6 characters"
              />
            </label>

            <label>
              Confirm New Password

              <input
                name="confirm"
                type="password"
                value={passwords.confirm}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
              />
            </label>

            <div className="security-actions">
              <button
                type="submit"
                className="primary-btn"
                disabled={passwordSaving}
              >
                {passwordSaving
                  ? "Changing..."
                  : "Change Password"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={signOut}
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

export default Settings;