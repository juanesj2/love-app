import { HttpInterceptorFn } from '@angular/common/http';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Preferences } from '@capacitor/preferences';
import { from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const getToken = async () => {
    try {
      // Add a 1-second timeout to prevent deadlocks on Android Keystore
      const res = await Promise.race([
        SecureStoragePlugin.get({ key: 'auth_token' }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('SecureStorage Timeout')), 1000))
      ]);
      return res;
    } catch (e) {
      // Fallback for web development or older users, or if SecureStorage hangs
      const pref = await Preferences.get({ key: 'auth_token' });
      if (pref && pref.value) {
        try {
          // Don't await this so we don't hang again
          SecureStoragePlugin.set({ key: 'auth_token', value: pref.value }).catch(() => {});
        } catch (err) {}
        return { value: pref.value };
      }
      return { value: null };
    }
  };

  return from(getToken()).pipe(
    catchError(() => of({ value: null })),
    switchMap(({ value }) => {
      if (value) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${value}`
          }
        });
      }
      return next(req);
    })
  );
};
