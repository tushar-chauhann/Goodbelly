// Mock Voice for iOS (Expo Go) and Web
// This prevents the "native module doesn't exist" crash on iOS when using Expo Go

const Voice = {
  onSpeechStart: null,
  onSpeechEnd: null,
  onSpeechResults: null,
  onSpeechError: null,
  onSpeechPartialResults: null,
  onSpeechVolumeChanged: null,
  start: async () => Promise.resolve(),
  stop: async () => Promise.resolve(),
  cancel: async () => Promise.resolve(),
  destroy: async () => Promise.resolve(),
  removeAllListeners: () => {},
  isAvailable: async () => false,
};

export default Voice;
