// Use the globally initialized Supabase client
const supabase = window.supabaseClient;

let currentUser = null;
let authInProgress = false;
const authButton = document.getElementById('authButton');
const authModal = document.getElementById('authModal');
const emailAuthForm = document.getElementById('emailAuthForm');

function openAuthModal() {
  if (!supabase) {
    alert('Authentication service is not available. Please try again later.');
    return;
  }
  if (authInProgress) return;
  authModal.style.display = 'block';
}

function closeAuthModal() {
  authModal.style.display = 'none';
  emailAuthForm.style.display = 'none';
  emailAuthForm.reset();
  const loginTab = document.querySelector('.form-tab');
  if (loginTab) {
    loginTab.click();
  }
  // Remove any error messages
  const errorDiv = emailAuthForm.querySelector('.auth-error');
  if (errorDiv) {
    errorDiv.remove();
  }
  authInProgress = false;
}

function showEmailLogin() {
  // Disabled - Coming Soon
  return;
}

function switchTab(tab) {
  // Disabled - Coming Soon
  return;
}

async function connectWallet() {
  // Disabled - Coming Soon
  return;
}

async function generateWalletPassword(publicKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey.toLowerCase() + 'phantom-auth');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'auth-error';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    color: #ef4444;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 4px;
    text-align: center;
  `;
  
  // Remove any existing error message
  const existingError = emailAuthForm.querySelector('.auth-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Insert error before the form
  emailAuthForm.insertBefore(errorDiv, emailAuthForm.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

function updateAuthButton() {
  if (!authButton) return;

  if (currentUser) {
    const shortAddress = currentUser.user_metadata?.wallet_address ? 
      `${currentUser.user_metadata.wallet_address.slice(0, 4)}...${currentUser.user_metadata.wallet_address.slice(-4)}` : 
      currentUser.email;

    authButton.innerHTML = `
      <div class="user-profile">
        <div class="user-avatar">${currentUser.email ? currentUser.email[0].toUpperCase() : 'W'}</div>
        <div class="user-info">
          <span>${shortAddress}</span>
          <span class="user-email">${currentUser.user_metadata?.wallet_address ? 'wallet' : 'email'}</span>
        </div>
        <button class="logout-button" onclick="logout()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    `;
  } else {
    authButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      <span>Connect/Login</span>
    `;
  }
}

async function logout() {
  try {
    if (authInProgress) return;
    authInProgress = true;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    currentUser = null;
    updateAuthButton();
    localStorage.setItem('auth_state_change', Date.now().toString());
  } catch (error) {
    console.error('Logout error:', error);
    showError('Failed to log out. Please try again.');
  } finally {
    authInProgress = false;
  }
}

// Initialize auth state
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Check for existing session
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (session) {
      currentUser = session.user;
      updateAuthButton();
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        currentUser = session.user;
        localStorage.setItem('supabase.auth.token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        localStorage.removeItem('supabase.auth.token');
      }
      
      updateAuthButton();
      localStorage.setItem('auth_state_change', Date.now().toString());
    });

    // Listen for auth state changes from other tabs/windows
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_state_change') {
        checkAndUpdateAuthState();
      }
    });

    // Cleanup subscription on page unload
    window.addEventListener('unload', () => {
      subscription?.unsubscribe();
    });
  } catch (error) {
    console.error('Auth initialization error:', error);
    updateAuthButton();
  }
});

// Event Listeners
if (authButton) {
  authButton.addEventListener('click', () => {
    if (!currentUser) {
      openAuthModal();
    }
  });
}

window.addEventListener('click', (e) => {
  if (e.target === authModal) {
    closeAuthModal();
  }
});

// Export necessary functions
window.connectWallet = connectWallet;
window.closeAuthModal = closeAuthModal;
window.showEmailLogin = showEmailLogin;
window.switchTab = switchTab;
window.logout = logout;
window.openAuthModal = openAuthModal;