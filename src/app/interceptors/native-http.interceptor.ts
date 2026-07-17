import { HttpInterceptorFn, HttpResponse, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { from, throwError } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export const nativeHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const isNative = Capacitor.isNativePlatform();
  
  // Only use CapacitorHttp for FormData (photos/audio) since JSON requests work fine via standard Angular HttpClient and CapacitorHttp has bugs with JSON POSTs on some Android versions.
  if (isNative && req.url.startsWith(environment.apiUrl) && req.body instanceof FormData) {
    const headers: { [key: string]: string } = {
      'Accept': 'application/json'
    };
    req.headers.keys().forEach(key => {
      headers[key] = req.headers.get(key) || '';
    });
    
    // Explicitly set Content-Type if it's missing and we have a JSON body
    const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type');
    if (!hasContentType && req.body && !(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Convert headers for CapacitorHttp
    let requestOptions: any = {
      url: req.url,
      method: req.method,
      headers: headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body instanceof FormData) {
        requestOptions.data = req.body;
      } else if (req.body !== null) {
        const isJson = Object.keys(headers).find(k => k.toLowerCase() === 'content-type' && headers[k].includes('application/json'));
        if (isJson && typeof req.body === 'object') {
          requestOptions.data = JSON.stringify(req.body);
        } else {
          requestOptions.data = req.body;
        }
      }
    }

    const request$ = from(CapacitorHttp.request(requestOptions)).pipe(
      map(res => {
        // In case of error status from API (like 401, 403, 422), CapacitorHttp still resolves the Promise.
        // We need to convert it to an Angular HttpErrorResponse if status >= 400.
        if (res.status >= 400 || res.status === 0) {
          console.error('CapacitorHttp error response:', res);
          throw new HttpErrorResponse({
            error: res.data,
            status: res.status,
            statusText: res.status === 0 ? 'CapacitorHttp Native Error' : 'Backend Error',
            url: res.url
          });
        }

        return new HttpResponse({
          body: res.data,
          headers: new HttpHeaders(res.headers),
          status: res.status,
          url: res.url
        });
      }),
      catchError(err => {
        console.error('CapacitorHttp native exception:', err);
        return throwError(() => ({
          status: 0,
          error: err.message || err,
          message: `Http failure response for ${req.url}: ${err.message || 'Plugin Error'}`,
          url: req.url
        }));
      })
    );
    
    return request$;
  }
  
  return next(req);
};
