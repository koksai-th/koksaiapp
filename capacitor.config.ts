import type { CapacitorConfig } from '@capacitor/cli';

export const pushNotificationsPluginConfig = {
PushNotifications: {
  presentationOptions:[
    'badge',
    'sound',
    'alert',
    'banner',
    'list'
  ],

  sound: "siren.mp3"
}
};

const config: CapacitorConfig = {
  appId: 'com.koksai.rescue',
  appName: 'KOKSAI RESCUE',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
  },

  plugins: {
    ...pushNotificationsPluginConfig,
  },
};

export default config;