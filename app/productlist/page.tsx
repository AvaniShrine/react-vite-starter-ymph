"use client";

import React, { useEffect, useState } from "react";

export type CRMModule = "Leads" | "Accounts";

/* ---------------- TYPES ---------------- */

interface Contact {
  id: string;
  name: string;
  email?: string | null;
}

export interface Product {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  productCode?: string | null;
  price?: number | null;
  uom?: string | null;
  qty?: number | null;
}

/* ---------------- PROPS ---------------- */

interface SelectContactModalProps {
  recordId?: string;
  module?: CRMModule;
  onClose?: () => void;
  onSuccess?: () => void;
}

/* ===================================================== */

const SelectContactModal: React.FC<SelectContactModalProps> = ({
  recordId = "6265769000042531069",
  module = "Accounts",
  onClose,
  onSuccess
}) => {

  /* ---------------- STATE ---------------- */

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- FETCH CONTACTS ---------------- */

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const query =
        module === "Accounts"
          ? `accountId=${recordId}`
          : `leadId=${recordId}`;

      const res = await fetch(`/api/packaging/contacts?${query}`);
      if (!res.ok) throw new Error("Failed to fetch contacts");

      const result = await res.json();
      setContacts(result.data || []);
      setFilteredContacts(result.data || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load contacts");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SEARCH ---------------- */

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const q = searchText.toLowerCase();
    setFilteredContacts(
      contacts.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      )
    );
  }, [searchText, contacts]);

  /* =====================================================
     PRODUCT LIST HTML (USED FOR PREVIEW + PUBLIC LINK)
     ===================================================== */

  const buildProductListHTML = (products: Product[], publicToken?: string) => {

    const grouped: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    return `
    <html>
    <head>
      <title>Elitechem Product List – 2026</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
        .header { display: flex; align-items: center; justify-content: center; margin-bottom: 30px; }
        .logo { height: 100px; margin-right: 15px; } /* slightly bigger */
        h2 { margin: 0; text-align: center; }
        table { width: 84%; margin: 0 auto; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; }
        th { background-color: #0070c0; color: white; }
        /* Column widths */
        th:nth-child(1), td:nth-child(1) { width: 15%; }   /* Category */
        th:nth-child(2), td:nth-child(2) { width: 38%; }   /* Product Name */
        th:nth-child(3), td:nth-child(3) { width: 10%; }   /* Product Code */
        th:nth-child(4), td:nth-child(4) { width: 5%; text-align: right; }  /* Qty */
        th:nth-child(5), td:nth-child(5) { width: 5%; }   /* UoM */
        th:nth-child(6), td:nth-child(6) { width: 10%; text-align: center; } /* Checkbox centered */
        th:nth-child(7), td:nth-child(7) { width: 8%; }    /* Avg / Month */
        th:nth-child(8), td:nth-child(8) { width: 9%; }    /* Your Current Price */
        td input[type=number] { width:80px; }
        td input[type=checkbox] { transform:scale(1.2); }
        .category-row { background:#f2f2f2; font-weight:bold; text-align:left; }
        .submit-wrap { margin-top:30px; }
        button { padding:10px 20px; font-size:14px; background:#0070c0; color:#fff; border:none; border-radius:4px; cursor:pointer; }
      </style>
    </head>
    <body>

      <div class="header">
        <img class="logo" src="https://previewengine-accl.zohoexternal.com/image/WD/hs4az81bf02c5b60c436b84645ba8ae3190db" />
        <h2>Elitechem Product List – 2026</h2>
      </div>

      <form id="productForm">
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
            ${Object.keys(grouped).map(cat => `
              <tr class="category-row"><td colspan="8">${cat}</td></tr>
              ${grouped[cat].map(p => `
                <tr>
                  <td></td>
                  <td>${p.name}</td>
                  <td>${p.productCode || ""}</td>
                  <td>${p.qty || ""}</td>
                  <td>${p.uom || ""}</td>
                  <td><input type="checkbox" name="use_${p.id}" /></td>
                  <td><input type="number" name="avg_${p.id}" /></td>
                  <td><input type="number" name="price_${p.id}" /></td>
                </tr>
              `).join("")}
            `).join("")}
          </tbody>
        </table>

        <div class="submit-wrap">
          <button type="button" onclick="submitForm()">Submit</button>
        </div>
      </form>

      <script>
        function submitForm() {
          const data = Object.fromEntries(new FormData(document.getElementById("productForm")));
          fetch("/api/public/submit-product-list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: "${publicToken || ""}",
              accountId: "${recordId || ""}",
              products: data
            })
          }).then(() => {
            alert("Product list submitted successfully");
          });
        }
      </script>

    </body>
    </html>
    `;
  };

  /* ---------------- PREVIEW ---------------- */

  const fetchProductsForPreview = async () => {
    const res = await fetch("/api/packaging/product");
    const data = await res.json();
    const html = buildProductListHTML(data.data || []);
    const w = window.open("", "_blank");
    w?.document.write(html);
    w?.document.close();
  };

  /* ---------------- SEND EMAIL ---------------- */

  const handleSendEmail = async () => {
    if (!selectedContactId) return;

    setSending(true);
    try {
      const contact = filteredContacts.find(c => c.id === selectedContactId);
      if (!contact) throw new Error("Contact not found");

    const linkRes = await fetch("/api/packaging/generate-public-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: recordId,
        contactId: contact.id
      })
    });

      const linkData = await linkRes.json();
      if (!linkData?.url) throw new Error("Public link failed");

    const payload = {
      contacts: [
        {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          firstName: contact.name.split(" ")[0]
        }
      ],
      entityId: recordId,
      entityName: "Accounts",
      publicLink: linkData.url
    };
    const res = await fetch("/api/packaging/sendemail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || "Failed to send email");
    }

    alert("Product List email sent successfully");
    onSuccess?.();
    onClose?.();

  } catch (err: any) {
    console.error(err);
    alert(err.message || "Something went wrong");
  } finally {
    setSending(false);
  }
};

  /* ================= UI ================= */

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3>Select Contact</h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading contacts...</p>
        ) : error ? (
          <p style={{ color: "red", textAlign: "center" }}>{error}</p>
        ) : (
          <>
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={searchInputStyle}
            />

            <div style={listStyle}>
              {filteredContacts.map(c => (
                <label key={c.id} style={rowStyle}>
                  <input
                    type="radio"
                    checked={selectedContactId === c.id}
                    onChange={() => setSelectedContactId(c.id)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12 }}>{c.email}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* -------- FOOTER BUTTONS -------- */}
            <div style={footerStyle}>
              <button
                type="button"
                disabled={!selectedContactId}
                onClick={fetchProductsForPreview}
                style={previewBtnStyle}
              >
                Generate Product List Preview
              </button>

              <button
                type="button"
                disabled={!selectedContactId || sending}
                onClick={handleSendEmail}
                style={{
                  ...sendBtnStyle,
                  opacity: !selectedContactId || sending ? 0.6 : 1
                }}
              >
                {sending ? "Sending..." : "Send Product List"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SelectContactModal;

/* ================= STYLES ================= */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modalStyle: React.CSSProperties = {
  width: 900,
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: 8,
  padding: 16
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 12
};

const closeBtnStyle = {
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer"
};

const searchInputStyle = {
  width: "100%",
  padding: 8,
  marginBottom: 12
};
const listStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 4,
  maxHeight: 290,
  overflowY: "auto",
};

const rowStyle = {
  display: "flex",
  gap: 10,
  padding: 8,
  borderBottom: "1px solid #eee"
};

const footerStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 16
};

const previewBtnStyle = {
  padding: "6px 12px",
  color: "#fff",
  border: "none",
  borderRadius: 4
};

const sendBtnStyle = {
  padding: "6px 14px",
  background: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: 4
};

const tableStyle:  React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse"
};
