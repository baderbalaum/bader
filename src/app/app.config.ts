import { ApplicationConfig, provideZonelessChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getDatabase, provideDatabase, connectDatabaseEmulator } from '@angular/fire/database';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation(), withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideDatabase(() => {
      const db = getDatabase();
      if (environment.useEmulators) connectDatabaseEmulator(db, '127.0.0.1', 9000);
      return db;
    }),
    provideStorage(() => getStorage()),
    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      return auth;
    }),
  ],
};
