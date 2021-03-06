import axios, {AxiosError} from 'axios';
import Router from 'next/router';
import { destroyCookie, parseCookies, setCookie } from 'nookies';

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestQueue = [];

export function signOut() {
  destroyCookie(undefined, 'nextauth.token');
  destroyCookie(undefined, 'nextauth.refreshToken');

  Router.push('/');
}


export const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
  }
});

api.interceptors.response.use(response => {
  return response;
}, (error: AxiosError) => {
  if (error.response.status === 401) {
    if (error.response.data.code === 'token.expired') {
      cookies = parseCookies();

      const { 'nextauth.refreshToken' : refreshToken } = cookies;

      const originalConfig = error.config;

      // Código para passar o token atualizado em requisições que estão em andamento
      if (!isRefreshing) {
        isRefreshing = true;
        api.post('/refresh', {
          refreshToken
        }).then(response => {
          const { token, refreshToken } = response.data;
          setCookie(undefined, 'nextauth.token', token, {
            maxAge: 60 * 60 * 24 * 30, //30 days
            path: '/'
          });

          setCookie(undefined, 'nextauth.refreshToken', refreshToken, {
            maxAge: 60 * 60 * 24 * 30, //30 days
            path: '/'
          });

          api.defaults.headers['Authorization'] = `Bearer ${token}`;

          failedRequestQueue.forEach(request => request.onSuccess(token));
          failedRequestQueue = [];
        }).catch(err => {
          failedRequestQueue.forEach(request => request.onFailure(err ));
          failedRequestQueue = [];
        }).finally(() => {
          isRefreshing = false;
        })
      }

      return new Promise((resolve, reject) => {
        failedRequestQueue.push({
          onSuccess:(token: string) => {
            originalConfig.headers['Authorization'] = `Bearer ${token}`

            resolve(api(originalConfig));
          } ,
          onFailure: (err: AxiosError) => {
            reject(err);
          }
        })
      })
    } else {
      signOut();
    }
  }

  return Promise.reject(error);
})