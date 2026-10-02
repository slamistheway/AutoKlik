'use client';

import Link from 'next/link';

export default function MyProfileAside() {
  return (
    <div className="w-48 shrink-0 space-y-2 bg-white rounded-lg p-4 shadow-md">
      <Link href="/my-profile" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-sm font-medium">
        Moj profil
      </Link>
      <Link href="/my-saved-ads" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-sm font-medium">
        Spremljeni oglasi
      </Link>
      <Link href="/autoklik/src/pages/search" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-sm font-medium">
        Svi oglasi
      </Link>
    </div>
  );
}
