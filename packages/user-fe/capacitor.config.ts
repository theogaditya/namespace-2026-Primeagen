import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',       // change if you want a different package id
  appName: 'user-fe',
  webDir: 'public',               // okay to keep; not required when server.url is set
  server: {
    url: 'https://sih-user-fe-sd.adityahota.online/',
    androidScheme: 'https',
    hostname: 'sih-user-fe-sd.adityahota.online',
    cleartext: false
  }
};

export default config;
