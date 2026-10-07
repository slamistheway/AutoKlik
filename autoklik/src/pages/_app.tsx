import type { AppProps } from 'next/app';
import '../app/globals.css';
import {CookieConsent} from '@/components/cookies/cookieConsent';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <><Component {...pageProps} /><CookieConsent /></>;
}
