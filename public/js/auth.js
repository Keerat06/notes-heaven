// Authentication logic
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if authenticated
  guardPage(false);

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const alertBox = document.getElementById('alertBox');

  function showAlert(message, isError = true) {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert-box ${isError ? 'alert-error' : 'alert-success'}`;
    alertBox.style.display = 'flex';
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.style.display = 'none';
  }

  // Handle login form
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        showAlert('Please fill in both email and password.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed. Please check your credentials.');
        }

        Auth.setAuth(data.token, data.user);
        showAlert('Login successful! Redirecting...', false);

        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 500);
      } catch (error) {
        showAlert(error.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }

  // Handle register form
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword')?.value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (!name || !email || !password) {
        showAlert('Please fill in all required fields.');
        return;
      }

      if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.');
        return;
      }

      if (confirmPassword !== undefined && password !== confirmPassword) {
        showAlert('Passwords do not match. Please re-enter.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Registration failed.');
        }

        Auth.setAuth(data.token, data.user);
        showAlert('Account created! Setting up your workspace...', false);

        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 600);
      } catch (error) {
        showAlert(error.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }
});
