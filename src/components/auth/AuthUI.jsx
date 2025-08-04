import React, { useEffect, useRef } from 'react';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { auth } from '../../firebase';
import { GoogleAuthProvider } from 'firebase/auth';

const AuthUI = ({ onSuccess }) => {
  const uiRef = useRef(null);

  useEffect(() => {
    if (uiRef.current) {
      const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
      ui.start(uiRef.current, {
        signInFlow: 'popup',
        signInOptions: [
          GoogleAuthProvider.PROVIDER_ID,
          // Add other providers here if desired, e.g., EmailLinkProvider.PROVIDER_ID
        ],
        callbacks: {
          signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            // User successfully signed in.
            // Return type determines whether we continue the signIn flow
            // or redirect to the sign-in redirect URL.
            onSuccess?.(authResult.user);
            return false; // Do not redirect
          },
        },
      });
    }
  }, [onSuccess]);

  return <div ref={uiRef} id="firebaseui-auth-container"></div>;
};

export default AuthUI;
