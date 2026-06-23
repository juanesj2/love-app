import { HttpInterceptorFn } from '@angular/common/http';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Preferences } from '@capacitor/preferences';
import { from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const getToken = async () => {
    try {
      const res = await SecureStoragePlugin.get({ key: 'auth_token' });
      return res;
    } catch (e) {
      // Fallback for web development or older users
      const pref = await Preferences.get({ key: 'auth_token' });
      if (pref && pref.value) {
        // Try to migrate if possible (might fail on web, which is fine)
        try {
          await SecureStoragePlugin.set({ key: 'auth_token', value: pref.value });
          await Preferences.remove({ key: 'auth_token' });
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
