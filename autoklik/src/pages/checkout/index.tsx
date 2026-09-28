import { useEffect } from 'react';
import { useRouter } from 'next/router';

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/checkout/vehicle-category',
      permanent: false,
    },
  };
}

export default function CheckoutIndexPage() {
  return null;
}