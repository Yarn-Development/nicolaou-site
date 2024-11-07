import React, { useEffect } from 'react';
import '../App.css'; // Import the CSS file

const GoogleSignIn = () => {
  useEffect(() => {
    window.handleCredentialResponse = (response) => {
      const token = response.credential;
      fetch('/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })
      .then(response => response.json())
      .then(data => {
        console.log(data);  // Successful login
        // Handle successful login (e.g., store token, redirect, etc.)
      })
      .catch(error => console.error('Error:', error));
    };

    window.google.accounts.id.initialize({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });

    window.google.accounts.id.renderButton(
      document.getElementById('googleSignInButton'),
      { theme: 'outline', size: 'large' }
    );
  }, []);

  return (
    <div className="google-signin-button">
      <div id="googleSignInButton"></div>
    </div>
  );
};

export const LoginPage = () => {
  return (
    <div className="login-container">
      <div>
        <h1>Login with Google</h1>
        <GoogleSignIn />
      </div>
    </div>
  );
};