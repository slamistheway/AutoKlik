import type { GetServerSidePropsContext } from 'next';
import { getAdPageProps } from '@/server/ad-page-props';
export { default } from '../[id]';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return getAdPageProps(context);
}
