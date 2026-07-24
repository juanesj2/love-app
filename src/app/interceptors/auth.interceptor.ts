import { HttpInterceptorFn } from '@angular/common/http';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Preferences } from '@capacitor/preferences';
import { from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

let cachedToken: string | null | undefined = undefined;
let tokenPromise: Promise<string | null> | null = null;

export const clearAuthCache = () => { cachedToken = undefined; };
export const setAuthCache = (token: string | null) => { cachedToken = token; };

const getToken = async (): Promise<string | null> => {
  if (cachedToken !== undefined) {
    return cachedToken;
  }
  
  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    try {
      const res = await Promise.race([
        SecureStoragePlugin.get({ key: 'auth_token' }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('SecureStorage Timeout')), 1000))
      ]);
      return res.value;
    } catch (e) {
      const pref = await Preferences.get({ key: 'auth_token' });
      if (pref && pref.value) {
        try {
          SecureStoragePlugin.set({ key: 'auth_token', value: pref.value }).catch(() => {});
        } catch (err) {}
        return pref.value;
      }
      return null;
    }
  })();

  cachedToken = await tokenPromise;
  tokenPromise = null;
  return cachedToken;
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return from(getToken()).pipe(
    catchError(() => of(null)),
    switchMap((value) => {
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
