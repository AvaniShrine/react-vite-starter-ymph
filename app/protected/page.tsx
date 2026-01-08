'use client'

import { useEffect, useState } from 'react'

export default function ProtectedPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function fetchProtected() {
      try {
        const res = await fetch('/api/protected')
        const body = await res.json()
        if (!res.ok) {
          setError(body.error || 'Unknown error')
        } else {
          setData(body.data)
        }
      } catch (err: any) {
        setError(err.message)
      }
    }
    fetchProtected()
  }, [])

  return (
    <>
      <header className="header">
        <h1>Zoho OAuth Secure App</h1>
        <nav>
          <a href="/">Home</a>
          <a href="/protected">Protected</a>
        </nav>
      </header>

      <main className="container" style={{ marginTop: '2rem' }}>
        <h2>Protected Data from Zoho</h2>
        {error ? (
          <p style={{ color: 'red' }}>Error: {error}</p>
        ) : (
          <pre style={{
            background: '#fff',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginTop: '1rem'
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </main>
    </>
  )
}
