'use client';

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  category?: string;
  productCode?: string;
  uom?: string;
  qty?: number;
}

export default function ProductListClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const accountId = searchParams.get("a");

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ---------------- VALIDATE TOKEN ---------------- */
  useEffect(() => {
    if (!token) {
      setError("Invalid link");
      setLoading(false);
      return;
    }

    fetch(`/api/public/validate-token?t=${token}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error("Invalid token");
        fetchProducts();
      })
      .catch(() => {
        setError("This link is invalid or expired");
        setLoading(false);
      });
  }, [token]);

  /* ---------------- FETCH PRODUCTS ---------------- */
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/packaging/product");
      const data = await res.json();
      setProducts(data.data || []);
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- GROUP PRODUCTS ---------------- */
  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    if (!accountId) {
      alert("Account ID is missing from the link");
      return;
    }

    setSubmitting(true);
    try {
      const form = document.getElementById("productForm") as HTMLFormElement;
      const formData = new FormData(form);
      const products = Object.fromEntries(formData.entries());

      const res = await fetch("/api/public/submit-product-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accountId, products })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit");

      alert("Thank you! Your response has been submitted.");
    } catch (err: any) {
      alert(err.message || "Error submitting form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;
  if (error) return <p style={{ color: "red", textAlign: "center" }}>{error}</p>;

  return (
    <div style={{ fontFamily: "Arial", margin: 20, textAlign: "center" }}>
      <div className="header">
        <img
          src="https://previewengine-accl.zohoexternal.com/image/WD/hs4az81bf02c5b60c436b84645ba8ae3190db"
          height={100}
        />
        <h2>Elitechem Product List – 2026</h2>
      </div>

      <form id="productForm" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
        <table style={{ width: "84%", margin: "0 auto", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Product Name</th>
              <th>Product Code</th>
              <th>Qty</th>
              <th>UoM</th>
              <th>Currently Used</th>
              <th>Avg / Month</th>
              <th>Your Price</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([cat, items]) => (
              <React.Fragment key={cat}>
                <tr style={{ background: "#f2f2f2", fontWeight: "bold" }}>
                  <td colSpan={8}>{cat}</td>
                </tr>
                {items.map(p => (
                  <tr key={p.id}>
                    <td />
                    <td>{p.name}</td>
                    <td>{p.productCode || ""}</td>
                    <td>{p.qty || ""}</td>
                    <td>{p.uom || ""}</td>
                    <td><input type="checkbox" name={`use_${p.id}`} /></td>
                    <td><input type="number" name={`avg_${p.id}`} /></td>
                    <td><input type="number" name={`price_${p.id}`} /></td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 30 }}>
          <button disabled={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
