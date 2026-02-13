import { http } from '../http';

export function pingApp() {
  return http.get('/app/ping');
}
