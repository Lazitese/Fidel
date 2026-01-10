import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.fidelai.app',
    appName: 'Fidel AI',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    android: {
        buildOptions: {
            keystorePath: undefined,
            keystoreAlias: undefined,
        }
    }
};

export default config;
