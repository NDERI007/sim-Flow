'use client';

import { usePathname } from 'next/navigation';
import CompanyHeader from '../components/companyHeader';

const HeaderOn = [
  '/send',
  '/purchase',
  '/contacts',
  '/Reports',
  '/Quota-Usage',
  '/templates',
  '/scheduled',
  '/settings',
];

export default function ShowHeaderClient() {
  const pathname = usePathname();
  const showHeader = HeaderOn.includes(pathname);

  return showHeader ? <CompanyHeader /> : null;
}
