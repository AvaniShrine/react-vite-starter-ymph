"use client";

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

export default function ProductListPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const accountId = searchParams.get("a"); // Account ID from URL

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
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
        setValid(true);
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
  const grouped = products.reduce((acc: any, p) => {
    const cat = p.category || "Other";
    acc[cat] = acc[cat] || [];
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
      const formData = new FormData(document.getElementById("productForm") as HTMLFormElement);
      const products = Object.fromEntries(formData);

      const response = await fetch("/api/public/submit-product-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          accountId,
          products
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit");
      }

      alert("Thank you! Your response has been submitted and saved as a PDF attachment.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error submitting form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;
  if (error) return <p style={{ textAlign: "center", color: "red" }}>{error}</p>;

  return (
    <>
      <style>{`
        body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
        .header { display: flex; align-items: center; justify-content: center; margin-bottom: 30px; }
        .logo { height: 100px; margin-right: 15px; }
        h2 { margin: 0; text-align: center; }
        table { width: 84%; margin: 0 auto; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; }
        th { background-color: #0070c0; color: white; }
        th:nth-child(1), td:nth-child(1) { width: 15%; }
        th:nth-child(2), td:nth-child(2) { width: 38%; }
        th:nth-child(3), td:nth-child(3) { width: 10%; }
        th:nth-child(4), td:nth-child(4) { width: 5%; text-align: right; }
        th:nth-child(5), td:nth-child(5) { width: 5%; }
        th:nth-child(6), td:nth-child(6) { width: 10%; text-align: center; }
        th:nth-child(7), td:nth-child(7) { width: 8%; }
        th:nth-child(8), td:nth-child(8) { width: 9%; }
        td input[type=number] { width:80px; }
        td input[type=checkbox] { transform:scale(1.2); }
        .category-row { background:#f2f2f2; font-weight:bold; text-align:left; }
        .submit-wrap { margin-top:30px; }
        button { padding:10px 20px; font-size:14px; background:#0070c0; color:#fff; border:none; border-radius:4px; cursor:pointer; }
      `}</style>
      <div style={{ fontFamily: "Arial, sans-serif", margin: "20px", textAlign: "center" }}>
        <div className="header">
          <img className="logo" src="https://previewengine-accl.zohoexternal.com/image/WD/hs4az81bf02c5b60c436b84645ba8ae3190db" />
          <h2>Elitechem Product List – 2026</h2>
        </div>

        <form id="productForm" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <table>
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
              {Object.keys(grouped).map(cat => (
                <React.Fragment key={cat}>
                  <tr className="category-row">
                    <td colSpan={8}>{cat}</td>
                  </tr>
                  {grouped[cat].map((p: Product) => (
                    <tr key={p.id} data-id={p.id}>
                      <td></td>
                      <td>{p.name}</td>
                      <td>{p.productCode || ""}</td>
                      <td>{p.qty || ""}</td>
                      <td>{p.uom || ""}</td>
                      <td><input type="checkbox" name={`use_${p.id}`} /></td>
                      <td><input type="number" name={`avg_${p.id}`} className="avg" /></td>
                      <td><input type="number" name={`price_${p.id}`} className="price" /></td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div className="submit-wrap">
            <button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
