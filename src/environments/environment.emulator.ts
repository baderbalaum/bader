export const environment = {
  production: false,
  /** Connect to local Firebase emulators (npm run dev:emulator). */
  /** Offline demo: built-in menu, simulated orders, no Firebase calls (npm run build:demo). */
  demo: false,
  useEmulators: true,
  firebase: {
  apiKey: "AIzaSyCgmdMmrruA_EblnE-SxTnZhd1JlnkIGNI",
  authDomain: "toroz-kiosk.firebaseapp.com",
  databaseURL: "https://toroz-kiosk-default-rtdb.firebaseio.com",
  projectId: "toroz-kiosk",
  storageBucket: "toroz-kiosk.firebasestorage.app",
  messagingSenderId: "830774076185",
  appId: "1:830774076185:web:27739afec9e550cd991b88"
},
};