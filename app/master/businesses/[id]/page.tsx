"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Business = {
  id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  registration_number: string | null;
  uif_reference_number: string | null;
  sars_reference_number: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  selected_package: string | null;
  number_of_employees: number | null;
  status: string | null;
};

export default function ManageBusinessPage() {
  const params = useParams();
  const businessId = params.id as string;
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchBusiness();
  }, []);

  async function fetchBusiness() {
    setLoading(true);

    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setBusiness(data);
    setLoading(false);
  }

  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];

    if (!business) return;

    setUploadingLogo(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${business.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      setUploadingLogo(false);
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("business-logos")
      .getPublicUrl(fileName);

    setBusiness({
      ...business,
      logo_url: data.publicUrl,
    });

    setUploadingLogo(false);
  }

  async function saveBusiness() {
    if (!business) return;

    setSaving(true);

    const { error } = await supabase
      .from("businesses")
      .update({
        business_name: business.business_name,
        email: business.email,
        phone: business.phone,
        registration_number: business.registration_number,
        uif_reference_number: business.uif_reference_number,
        sars_reference_number: business.sars_reference_number,
        logo_url: business.logo_url,
        primary_color: business.primary_color,
        accent_color: business.accent_color,
        selected_package: business.selected_package,
        number_of_employees: business.number_of_employees,
        status: business.status,
      })
      .eq("id", business.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Business updated successfully.");
router.push("/master/businesses");
  }

  if (loading) {
    return (
      <main style={page}>
        <p>Loading business...</p>
      </main>
    );
  }

  if (!business) {
    return (
      <main style={page}>
        <p>Business not found.</p>
        <Link href="/master/businesses" style={backButton}>
          Back to Businesses
        </Link>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={topBar}>
        <Link href="/master/businesses" style={backButton}>
          ← Back to Businesses
        </Link>
      </div>

      <h1 style={title}>Manage Business</h1>
      <p style={subtitle}>
        Complete the business profile, branding, and setup information before
        employer activation.
      </p>

      <section style={card}>
        <h2 style={sectionTitle}>Business Profile</h2>

        <div style={grid}>
          <label style={label}>
            Business Name
            <input
              style={input}
              value={business.business_name || ""}
              onChange={(e) =>
                setBusiness({ ...business, business_name: e.target.value })
              }
            />
          </label>

          <label style={label}>
            Email
            <input
              style={input}
              value={business.email || ""}
              onChange={(e) =>
                setBusiness({ ...business, email: e.target.value })
              }
            />
          </label>

          <label style={label}>
            Phone
            <input
              style={input}
              value={business.phone || ""}
              onChange={(e) =>
                setBusiness({ ...business, phone: e.target.value })
              }
            />
          </label>

          <label style={label}>
            Registration Number
            <input
              style={input}
              value={business.registration_number || ""}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  registration_number: e.target.value,
                })
              }
            />
          </label>

          <label style={label}>
            UIF Reference Number
            <input
              style={input}
              value={business.uif_reference_number || ""}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  uif_reference_number: e.target.value,
                })
              }
            />
          </label>

          <label style={label}>
            SARS Reference Number
            <input
              style={input}
              value={business.sars_reference_number || ""}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  sars_reference_number: e.target.value,
                })
              }
            />
          </label>
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Branding</h2>

        <div style={grid}>
          <label style={label}>
            Business Logo
            <input
              type="file"
              accept="image/*"
              onChange={uploadLogo}
              style={input}
            />

            {uploadingLogo && <span style={muted}>Uploading logo...</span>}

            {business.logo_url && (
              <div style={logoPreviewWrap}>
                <img
                  src={business.logo_url}
                  alt="Business Logo"
                  style={logoPreview}
                />
              </div>
            )}
          </label>

          <label style={label}>
            Primary Colour
            <input
              style={input}
              value={business.primary_color || ""}
              onChange={(e) =>
                setBusiness({ ...business, primary_color: e.target.value })
              }
              placeholder="#0f766e"
            />
          </label>

          <label style={label}>
            Accent Colour
            <input
              style={input}
              value={business.accent_color || ""}
              onChange={(e) =>
                setBusiness({ ...business, accent_color: e.target.value })
              }
              placeholder="#d4af37"
            />
          </label>
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Setup Status</h2>

        <div style={grid}>
          <label style={label}>
            Package
            <select
              style={input}
              value={business.selected_package || ""}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  selected_package: e.target.value,
                })
              }
            >
              <option value="">Select package</option>
              <option value="Starter - R149/month">
                Starter - R149/month
              </option>
              <option value="Growth - R249/month">
                Growth - R249/month
              </option>
              <option value="Elite - Custom">Elite - Custom</option>
            </select>
          </label>

          <label style={label}>
            Number of Employees
            <input
              style={input}
              type="number"
              value={business.number_of_employees || 0}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  number_of_employees: Number(e.target.value),
                })
              }
            />
          </label>

          <label style={label}>
            Status
            <select
              style={input}
              value={business.status || "Setup In Progress"}
              onChange={(e) =>
                setBusiness({ ...business, status: e.target.value })
              }
            >
              <option>Setup In Progress</option>
              <option>Branding Needed</option>
              <option>Employee Setup Needed</option>
              <option>Ready for Employer</option>
              <option>Active</option>
              <option>Suspended</option>
            </select>
          </label>
        </div>
      </section>

      <div style={actions}>
        <button style={saveButton} onClick={saveBusiness} disabled={saving}>
          {saving ? "Saving..." : "Save Business Setup"}
        </button>
      </div>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const topBar = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: 20,
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  padding: "10px 16px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 14,
};

const title = {
  fontSize: 30,
  color: "#102a43",
  margin: 0,
};

const subtitle = {
  color: "#486581",
  marginTop: 8,
  marginBottom: 22,
};

const card = {
  background: "#ffffff",
  border: "1px solid #d9e2ec",
  borderRadius: 18,
  padding: 20,
  marginBottom: 18,
};

const sectionTitle = {
  fontSize: 18,
  color: "#102a43",
  marginBottom: 16,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const label = {
  display: "grid",
  gap: 6,
  color: "#334e68",
  fontSize: 13,
  fontWeight: 700,
};

const input = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #bcccdc",
  fontSize: 14,
};

const muted = {
  color: "#64748b",
  fontSize: 13,
};

const logoPreviewWrap = {
  marginTop: 12,
};

const logoPreview = {
  width: 90,
  height: 90,
  objectFit: "contain" as const,
  borderRadius: 12,
  border: "1px solid #d9e2ec",
  background: "#ffffff",
  padding: 8,
};

const actions = {
  display: "flex",
  justifyContent: "flex-end",
};

const saveButton = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: 999,
  padding: "13px 20px",
  fontWeight: 800,
  cursor: "pointer",
};