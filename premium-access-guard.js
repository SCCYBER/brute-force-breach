(function () {
  document.documentElement.style.visibility = "hidden";

  function showLocked(message) {
    document.documentElement.style.visibility = "visible";
    document.body.innerHTML = `
      <main class="game-shell" style="min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;">
        <section class="intro-card" style="max-width:760px;">
          <img src="logo.png" alt="SCCYBER logo" class="logo">
          <div class="intro-title">PREMIUM ACCESS REQUIRED</div>
          <div class="intro-text">${message}<br><br>Please return to the SCCYBER Training Portal and log in with an active premium account.</div>
          <a class="action-btn primary-btn" style="display:inline-block;text-decoration:none;margin-top:18px;" href="https://sccyber.github.io/Immersive-Training-Package/">RETURN TO PORTAL</a>
        </section>
      </main>
    `;
  }

  async function checkPremiumAccess() {
    try {
      if (!window.supabase || !window.SCCYBER_SUPABASE_URL || !window.SCCYBER_SUPABASE_ANON_KEY) {
        showLocked("Secure access check is not available.");
        return;
      }

      const client = window.supabase.createClient(window.SCCYBER_SUPABASE_URL, window.SCCYBER_SUPABASE_ANON_KEY);
      const sessionResult = await client.auth.getSession();
      const session = sessionResult?.data?.session;

      if (!session?.user?.id) {
        showLocked("No active portal session was found.");
        return;
      }

      const profileResult = await client
        .from("profiles")
        .select("premium_enabled,is_admin")
        .eq("id", session.user.id)
        .single();

      if (profileResult.error || !profileResult.data) {
        showLocked("Your account could not be verified.");
        return;
      }

      if (profileResult.data.is_admin === true || profileResult.data.premium_enabled === true) {
        document.documentElement.style.visibility = "visible";
        return;
      }

      showLocked("Premium access is not active for this account.");
    } catch (e) {
      showLocked("Secure access check failed.");
    }
  }

  checkPremiumAccess();
})();
