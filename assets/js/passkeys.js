// ============================================================
// PASSKEYS (WebAuthn) FUNCTIONALITY
// ============================================================

/**
 * Check if WebAuthn is supported
 */
function isWebAuthnSupported() {
    if (window.PublicKeyCredential === undefined || navigator.credentials === undefined) {
        return false;
    }
    
    // Check if we're on a secure context (HTTPS or localhost)
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return false;
    }
    
    return true;
}

/**
 * Check if platform authenticator is available (helps Android diagnostics)
 */
async function isPlatformAuthenticatorAvailable() {
    try {
        if (!window.PublicKeyCredential || typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
            return false;
        }
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (_) {
        return false;
    }
}

/**
 * Check if current environment is Safari on IP address
 */
function isSafariOnIPAddress() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
    return isSafari && isIPAddress;
}

/**
 * Show secure context warning
 */
function showSecureContextWarning() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHTTPS = window.location.protocol === 'https:';
    const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Safari doesn't support passkeys on IP addresses at all
    if (isSafari && isIPAddress) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 1rem 1.5rem;
            max-width: 600px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        warning.innerHTML = `
            <div style="display: flex; align-items: start; gap: 1rem;">
                <div style="font-size: 2rem;">🚫</div>
                <div>
                    <strong style="display: block; margin-bottom: 0.5rem; color: #856404;">Safari + IP Address = No Passkeys</strong>
                    <p style="margin: 0 0 0.75rem 0; font-size: 0.9rem; color: #856404;">
                        Safari doesn't support passkeys on IP addresses. To use passkeys:
                    </p>
                    <ol style="margin: 0 0 0.75rem 1.25rem; padding: 0; font-size: 0.9rem; color: #856404;">
                        <li>Access from the same computer: <strong>http://localhost:8000</strong></li>
                        <li>Or add to /etc/hosts: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${window.location.hostname} velvetvogue.local</code><br>
                        Then visit: <strong>https://velvetvogue.local:8443</strong></li>
                    </ol>
                    <button onclick="this.closest('div').parentElement.parentElement.remove()" style="padding: 0.5rem 1rem; background: #ffc107; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; color: #856404;">
                        Got it
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(warning);
        return;
    }
    
    // Show HTTPS warning for non-localhost HTTP
    if (!isLocalhost && !isHTTPS) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 1rem 1.5rem;
            max-width: 500px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        warning.innerHTML = `
            <div style="display: flex; align-items: start; gap: 1rem;">
                <div style="font-size: 2rem;">⚠️</div>
                <div>
                    <strong style="display: block; margin-bottom: 0.5rem;">Passkeys Require HTTPS</strong>
                    <p style="margin: 0; font-size: 0.9rem; color: #856404;">
                        Passkeys only work on HTTPS or localhost. To use passkeys on this device, access the site at:
                        <br><strong>https://${window.location.hostname}:8443</strong>
                    </p>
                    <button onclick="this.closest('div').parentElement.parentElement.remove()" style="margin-top: 0.75rem; padding: 0.5rem 1rem; background: #ffc107; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
                        Got it
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(warning);
    }
}

/**
 * Base64 URL encoding/decoding utilities
 */
function base64urlEncode(buffer) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Register a new passkey for the current user
 */
async function registerPasskey() {
    if (!isWebAuthnSupported()) {
        showNotification('Passkeys are not supported on this device', 'error');
        return;
    }

    // Safari-specific IP address check
    if (isSafariOnIPAddress()) {
        showNotification('Safari does not support passkeys on IP addresses. Please use localhost or a domain name.', 'error');
        showSecureContextWarning();
        return;
    }

    if (!currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }

    try {
        const hasPlatformAuthenticator = await isPlatformAuthenticatorAvailable();
        if (!hasPlatformAuthenticator) {
            showNotification('No platform authenticator available. Enable screen lock/biometrics on this device.', 'error');
            return;
        }

        // Get registration challenge from server
        const startResponse = await fetch('/api/passkeys.php?action=register-start', {
            method: 'POST',
            credentials: 'same-origin'
        });
        
        // Check if response is JSON
        let contentType = startResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await startResponse.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned invalid response. Check console for details.');
        }
        
        const startData = await startResponse.json();
        
        if (!startData.success) {
            throw new Error(startData.message || 'Failed to start registration');
        }

        // Prepare credential creation options
        const publicKey = {
            challenge: base64urlDecode(startData.data.challenge),
            rp: {
                name: startData.data.rp?.name || 'Velvet Vogue',
                id: startData.data.rp?.id || window.location.hostname
            },
            user: {
                id: base64urlDecode(startData.data.user.id),
                name: startData.data.user.name,
                displayName: startData.data.user.displayName
            },
            pubKeyCredParams: [
                { alg: -7, type: "public-key" },  // ES256
                { alg: -257, type: "public-key" }  // RS256
            ],
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform'
            },
            timeout: 60000,
            attestation: "none",
            excludeCredentials: startData.data.excludeCredentials.map(cred => ({
                type: cred.type,
                id: base64urlDecode(cred.id)
            }))
        };

        // Create credential
        const credential = await navigator.credentials.create({ publicKey });

        if (!credential) {
            throw new Error('Failed to create credential');
        }

        // Get device name
        const deviceName = prompt('Name this passkey (e.g., "iPhone", "MacBook"):', 
                                  getUserAgent()) || 'Unknown Device';

        // Send credential to server
        const finishResponse = await fetch('/api/passkeys.php?action=register-finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                credential_id: base64urlEncode(credential.rawId),
                public_key: base64urlEncode(credential.response.attestationObject),
                client_data: base64urlEncode(credential.response.clientDataJSON),
                device_name: deviceName
            })
        });

        // Check if response is JSON
        contentType = finishResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await finishResponse.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned invalid response. Check console for details.');
        }

        const finishData = await finishResponse.json();

        if (finishData.success) {
            showNotification('Passkey registered successfully! You can now use it to sign in.', 'success');
            loadPasskeysList();
        } else {
            throw new Error(finishData.message || 'Failed to register passkey');
        }

    } catch (error) {
        console.error('Passkey registration error:', error);
        if (error.name === 'NotAllowedError') {
            showNotification('Passkey registration was cancelled or blocked. Ensure screen lock/biometrics are enabled in Android settings.', 'error');
        } else {
            showNotification('Failed to register passkey: ' + error.message, 'error');
        }
    }
}

/**
 * Login with a passkey
 */
async function loginWithPasskey(email = null) {
    if (!isWebAuthnSupported()) {
        showNotification('Passkeys are not supported on this device', 'error');
        return;
    }

    try {
        // Get authentication challenge from server
        const startResponse = await fetch('/api/passkeys.php?action=login-start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ email })
        });

        // Check if response is JSON
        let contentType = startResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await startResponse.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned invalid response. Check console for details.');
        }

        const startData = await startResponse.json();

        if (!startData.success) {
            throw new Error(startData.message || 'Failed to start authentication');
        }

        // Prepare credential request options
        const publicKey = {
            challenge: base64urlDecode(startData.data.challenge),
            timeout: 60000,
            userVerification: 'preferred',
            rpId: startData.data.rpId || window.location.hostname
        };

        if (startData.data.allowCredentials && startData.data.allowCredentials.length > 0) {
            publicKey.allowCredentials = startData.data.allowCredentials.map(cred => ({
                type: cred.type,
                id: base64urlDecode(cred.id)
            }));
        }

        // Get credential
        const credential = await navigator.credentials.get({ publicKey });

        if (!credential) {
            throw new Error('Failed to get credential');
        }

        // Send credential to server
        const finishResponse = await fetch('/api/passkeys.php?action=login-finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                credential_id: base64urlEncode(credential.rawId),
                authenticator_data: base64urlEncode(credential.response.authenticatorData),
                client_data: base64urlEncode(credential.response.clientDataJSON),
                signature: base64urlEncode(credential.response.signature)
            })
        });

        // Check if response is JSON
        contentType = finishResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await finishResponse.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned invalid response. Check console for details.');
        }

        const finishData = await finishResponse.json();

        if (finishData.success) {
            currentUser = normalizeCurrentUser({
                ...finishData.data,
                email: finishData.data?.email
            });
            
            // Show "stay logged in" dialog
            showStayLoggedInDialog('passkey',
                // User clicked "Yes, Stay Logged In"
                () => {
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    completePasskeyLogin();
                },
                // User clicked "Not Now"
                () => {
                    localStorage.removeItem('currentUser');
                    completePasskeyLogin();
                }
            );
        } else {
            throw new Error(finishData.message || 'Failed to authenticate');
        }

    } catch (error) {
        console.error('Passkey authentication error:', error);
        if (error.name === 'NotAllowedError') {
            showNotification('Passkey sign-in was cancelled or blocked. Ensure screen lock/biometrics are enabled on this device.', 'error');
        } else {
            showNotification('Failed to sign in with passkey: ' + error.message, 'error');
        }
    }
}

/**
 * Load and display user's passkeys
 */
async function loadPasskeysList() {
    if (!currentUser) return;

    try {
        const response = await fetch('/api/passkeys.php?action=list', {
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (data.success) {
            displayPasskeys(data.data.passkeys);
        }
    } catch (error) {
        console.error('Failed to load passkeys:', error);
    }
}

/**
 * Display passkeys in the UI
 */
function displayPasskeys(passkeys) {
    const container = document.getElementById('passkeys-list');
    if (!container) return;

    if (passkeys.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light);">No passkeys registered yet.</p>';
        return;
    }

    container.innerHTML = passkeys.map(passkey => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light-bg); border-radius: 8px; margin-bottom: 0.75rem;">
            <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">🔑 ${passkey.device_name}</div>
                <div style="font-size: 0.875rem; color: var(--text-light);">
                    Created: ${new Date(passkey.created_at).toLocaleDateString()}
                    ${passkey.last_used_at ? `<br>Last used: ${new Date(passkey.last_used_at).toLocaleDateString()}` : ''}
                </div>
            </div>
            <button onclick="deletePasskey(${passkey.id})" class="btn" style="background: var(--error-color); color: white; padding: 0.5rem 1rem;">
                Delete
            </button>
        </div>
    `).join('');
}

/**
 * Delete a passkey
 */
async function deletePasskey(passkeyId) {
    if (!confirm('Are you sure you want to delete this passkey?')) {
        return;
    }

    try {
        const response = await fetch(`/api/passkeys.php?id=${passkeyId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Passkey deleted', 'success');
            loadPasskeysList();
        } else {
            throw new Error(data.message || 'Failed to delete passkey');
        }
    } catch (error) {
        showNotification('Failed to delete passkey: ' + error.message, 'error');
    }
}

/**
 * Complete passkey login after user decides about staying logged in
 */
function completePasskeyLogin() {
    loadCart();
    showLoginSuccess();
    showNotification('Signed in with passkey!', 'success');
}

/**
 * Get user agent string for device naming
 */
function getUserAgent() {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Mac')) return 'Mac';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Linux')) return 'Linux';
    return 'This Device';
}
