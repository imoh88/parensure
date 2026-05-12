import { NativeModules, Platform } from 'react-native';

const { SosForegroundService: Native } = NativeModules;

export const sosForegroundService = {
  start(params: {
    title: string;
    body: string;
    alertId: string;
    receiverName: string;
  }) {
    if (Platform.OS !== 'android' || !Native) return;
    Native.start(params.title, params.body, params.alertId, params.receiverName);
  },

  stop() {
    if (Platform.OS !== 'android' || !Native) return;
    Native.stop();
  },
};
