/**
 * FirebaseRecaptcha — Invisible reCAPTCHA via WebView
 *
 * Renders a hidden WebView that loads Firebase Auth JS SDK,
 * creates an invisible RecaptchaVerifier, and sends the
 * reCAPTCHA token back to React Native via postMessage.
 *
 * Usage:
 *   const recaptchaRef = useRef<FirebaseRecaptchaHandle>(null);
 *   <FirebaseRecaptcha ref={recaptchaRef} />
 *   const token = await recaptchaRef.current?.getToken();
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import Config from '../constants/config';

export interface FirebaseRecaptchaHandle {
  /**
   * Trigger the invisible reCAPTCHA and send the OTP.
   * Resolves with the verificationId string, or rejects on error.
   */
  sendOTP: (phoneNumber: string) => Promise<string>;
}

interface Props {
  /**
   * Optional: called when reCAPTCHA is ready
   */
  onReady?: () => void;
}

const firebaseConfig = Config.firebase;

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
</head>
<body>
  <div id="recaptcha-container"></div>
  <script>
    try {
      firebase.initializeApp(${JSON.stringify(firebaseConfig)});

      window.sendOTP = function(phoneNumber) {
        // Clear any previous reCAPTCHA
        document.getElementById('recaptcha-container').innerHTML = '';
        
        var verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'invisible'
        });
        
        firebase.auth().signInWithPhoneNumber(phoneNumber, verifier)
          .then(function(confirmationResult) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'otp_sent', 
              verificationId: confirmationResult.verificationId 
            }));
          })
          .catch(function(error) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'error', 
              error: error.message 
            }));
          });
      };

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    } catch (err) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: err.message }));
    }
  </script>
</body>
</html>
`;

export const FirebaseRecaptcha = forwardRef<FirebaseRecaptchaHandle, Props>(
  ({ onReady }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);
    const pendingResolve = useRef<((token: string) => void) | null>(null);
    const pendingReject = useRef<((err: Error) => void) | null>(null);

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          switch (data.type) {
            case 'ready':
              setIsReady(true);
              onReady?.();
              break;
            case 'otp_sent':
              pendingResolve.current?.(data.verificationId);
              pendingResolve.current = null;
              pendingReject.current = null;
              break;
            case 'error':
              pendingReject.current?.(new Error(data.error));
              pendingResolve.current = null;
              pendingReject.current = null;
              break;
          }
        } catch {
          // Ignore parse errors
        }
      },
      [onReady],
    );

    useImperativeHandle(ref, () => ({
      sendOTP: (phoneNumber: string) => {
        return new Promise<string>((resolve, reject) => {
          if (!isReady) {
            reject(new Error('reCAPTCHA not ready yet'));
            return;
          }
          pendingResolve.current = resolve;
          pendingReject.current = reject;

          // Trigger sendOTP in WebView
          webViewRef.current?.injectJavaScript(`
            if (typeof window.sendOTP === 'function') {
              window.sendOTP('${phoneNumber}');
            }
            true;
          `);

          // Timeout after 30 seconds
          setTimeout(() => {
            if (pendingResolve.current === resolve) {
              pendingReject.current?.(new Error('reCAPTCHA timeout'));
              pendingResolve.current = null;
              pendingReject.current = null;
            }
          }, 30000);
        });
      },
    }));

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ html: HTML_CONTENT, baseUrl: 'https://localhost' }}
          onMessage={handleMessage}
          javaScriptEnabled
          originWhitelist={['*']}
          style={styles.webview}
        />
      </View>
    );
  },
);

FirebaseRecaptcha.displayName = 'FirebaseRecaptcha';

const styles = StyleSheet.create({
  container: {
    width: 0,
    height: 0,
    overflow: 'hidden',
    position: 'absolute',
  },
  webview: {
    width: 0,
    height: 0,
    opacity: 0,
  },
});

export default FirebaseRecaptcha;
