'use client';

import { Suspense } from 'react';
import ProductListClient from './ProductListClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center" }}>Loading…</p>}>
      <ProductListClient />
    </Suspense>
  );
}
