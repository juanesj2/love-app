import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.juanesj2.lovewidget',
  appName: 'love-widget',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffe3e9",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    GoogleSignIn: {
      clientId: '598297080553-h6sfq42rfibl91g88usbaqb91r56gbbp.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
