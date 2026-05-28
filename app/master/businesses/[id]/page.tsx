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
  const router = useRouter();
  const businessId = params.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

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
    if (!business) return;

    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingLogo(true);

    const fileExtension = file.name.split(".").pop();
    const fileName = `${business.id}-${Date.now()}.${fileExtension}`;
    const filePath = `business-logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      alert(uploadError.message);
      setUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage
      .from("business-logos")
      .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        logo_url: publicUrl,
      })
      .eq("id", business.id);

    setUploadingLogo(false);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    setBusiness({
      ...business,
      logo_url: publicUrl,
    });

    alert("Logo uploaded successfully.");
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
        status: business.status || "active",
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

  async function resendSetupEmail() {
  if (!business?.email || !business?.business_name) {
    alert("Business email or business name is missing.");
    return;
  }

  setResendingEmail(true);

  try {
    const response = await fetch(
      "/api/contact/create-employer-login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
        businessId: business.id,
        email: business.email,
        businessName: business.business_name,
        }),
      }
    );

    const result = await response.json();

    setResendingEmail(false);

    if (!response.ok) {
      alert(result.error || "Failed to send setup email.");
      return;
    }

    alert(
      result.message ||
        "Employer setup email sent successfully."
    );
  } catch (error) {
    console.error(error);

    setResendingEmail(false);

    alert("Something went wrong.");
  }
}

  async function updateBusinessStatus(
    status: "active" | "suspended" | "archived" | "deleted"
  ) {
    if (!business) return;

    const actionLabel =
      status === "deleted"
        ? "delete"
        : status === "archived"
        ? "archive"
        : status === "suspended"
        ? "suspend"
        : "activate";

    const confirmed = confirm(
      `Are you sure you want to ${actionLabel} ${business.business_name}?`
    );

    if (!confirmed) return;

    const updatePayload: {
      status: string;
      archived_at?: string | null;
      deleted_at?: string | null;
    } = {
      status,
    };

    if (status === "archived") {
      updatePayload.archived_at = new Date().toISOString();
      updatePayload.deleted_at = null;
    }

    if (status === "deleted") {
      updatePayload.deleted_at = new Date().toISOString();
    }

    if (status === "active" || status === "suspended") {
      updatePayload.archived_at = null;
      updatePayload.deleted_at = null;
    }

    const { error } = await supabase
      .from("businesses")
      .update(updatePayload)
      .eq("id", business.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert(`Business status updated to ${status}.`);

    if (status === "deleted") {
      router.push("/master/businesses");
      return;
    }

    setBusiness({
      ...business,
      status,
    });
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
          Back to Businesses
        </Link>
      </div>

      <h1 style={title}>Manage Business</h1>

      <p style={subtitle}>
        Master controls business profile, branding, setup status, suspension,
        archiving and soft deletion.
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
                setBusiness({
                  ...business,
                  business_name: e.target.value,
                })
              }
            />
          </label>

          <label style={label}>
            Email
            <input
              style={input}
              value={business.email || ""}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  email: e.target.value,
                })
              }
            />
          </label>

          <label style={label}>
            Phone
            <input
              style={input}
              value={business.phone || ""}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  phone: e.target.value,
                })
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

          <label style={label}>
            Selected Package
            <input
              style={input}
              value={business.selected_package || ""}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  selected_package: e.target.value,
                })
              }
            />
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
              value={business.status || "active"}
              onChange={(e) =>
                setBusiness({
                  ...business,
                  status: e.target.value,
                })
              }
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
              <option value="deleted">Deleted</option>
            </select>
          </label>
        </div>

        <div style={actionRow}>
          <button style={saveButton} onClick={saveBusiness} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            style={secondaryButton}
            onClick={resendSetupEmail}
            disabled={resendingEmail}
          >
            {resendingEmail ? "Sending..." : "Resend Setup Email"}
          </button>
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Business Branding</h2>

        <div style={grid}>
          <div>
            <label style={label}>Business Logo</label>

            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt="Business Logo"
                style={logoPreview}
              />
            ) : (
              <div style={emptyLogo}>No logo uploaded</div>
            )}

            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={uploadLogo}
              disabled={uploadingLogo}
            />

            <button
              type="button"
              style={uploadButton}
              onClick={() => document.getElementById("logo-upload")?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? "Uploading..." : "Choose Logo from Computer"}
            </button>

            {business.logo_url && (
              <p style={logoHelpText}>
                Logo uploaded successfully. Upload a new file to replace it.
              </p>
            )}
          </div>

          <label style={label}>
            Primary Colour
            <div style={colourRow}>
              <input
                style={colourInput}
                type="color"
                value={business.primary_color || "#0f766e"}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    primary_color: e.target.value,
                  })
                }
              />

              <input
                style={input}
                value={business.primary_color || ""}
                placeholder="#0f766e"
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    primary_color: e.target.value,
                  })
                }
              />
            </div>
          </label>

          <label style={label}>
            Accent Colour
            <div style={colourRow}>
              <input
                style={colourInput}
                type="color"
                value={business.accent_color || "#7f1d1d"}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    accent_color: e.target.value,
                  })
                }
              />

              <input
                style={input}
                value={business.accent_color || ""}
                placeholder="#7f1d1d"
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    accent_color: e.target.value,
                  })
                }
              />
            </div>
          </label>
        </div>
      </section>

      <section style={dangerCard}>
        <h2 style={dangerTitle}>Master Account Controls</h2>

        <p style={dangerText}>
          These actions affect whether the employer can continue using WageFlow.
          Deleting is handled as a soft delete so the business record is hidden
          but not permanently removed.
        </p>

        <div style={divider} />

        <div style={controlList}>
          <div style={controlItem}>
            <div>
              <h3 style={controlTitle}>Activate</h3>
              <p style={controlText}>
                Set this business as active so the employer can log in and use
                WageFlow.
              </p>
            </div>

            <button
              style={outlineButton}
              onClick={() => updateBusinessStatus("active")}
            >
              Activate
            </button>
          </div>

          <div style={controlItem}>
            <div>
              <h3 style={controlTitle}>Suspend</h3>
              <p style={controlText}>
                Suspend this business. The employer will not be able to log in
                or use WageFlow.
              </p>
            </div>

            <button
              style={outlineButton}
              onClick={() => updateBusinessStatus("suspended")}
            >
              Suspend
            </button>
          </div>

          <div style={controlItem}>
            <div>
              <h3 style={controlTitle}>Archive</h3>
              <p style={controlText}>
                Archive this business. It will be hidden from the employer but
                can be restored later.
              </p>
            </div>

            <button
              style={outlineButton}
              onClick={() => updateBusinessStatus("archived")}
            >
              Archive
            </button>
          </div>

          <div style={controlItemNoBorder}>
            <div>
              <h3 style={controlTitle}>Delete</h3>
              <p style={controlText}>
                Soft delete this business. It will be permanently hidden but not
                removed from the system.
              </p>
            </div>

            <button
              style={outlineDangerButton}
              onClick={() => updateBusinessStatus("deleted")}
            >
              Delete
            </button>
          </div>
        </div>
      </section>
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
  marginBottom: 24,
};

const card = {
  background: "#ffffff",
  border: "1px solid #d9e2ec",
  borderRadius: 18,
  padding: 20,
  marginBottom: 20,
};

const dangerCard = {
  background: "#ffffff",
  border: "1px solid #d9e2ec",
  borderRadius: 18,
  padding: 24,
  marginBottom: 20,
};

const sectionTitle = {
  fontSize: 20,
  color: "#102a43",
  marginTop: 0,
};

const dangerTitle = {
  fontSize: 24,
  color: "#7f1d1d",
  marginTop: 0,
  marginBottom: 12,
};

const dangerText = {
  color: "#334155",
  lineHeight: 1.7,
  fontSize: 16,
  maxWidth: 900,
};

const divider = {
  height: 1,
  background: "#e2e8f0",
  marginTop: 24,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
};

const label = {
  display: "grid",
  gap: 8,
  color: "#334e68",
  fontWeight: 700,
  fontSize: 14,
};

const input = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #bcccdc",
  fontSize: 14,
  boxSizing: "border-box" as const,
};

const actionRow = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
  marginTop: 20,
};

const saveButton = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "2px solid #0f766e",
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const logoPreview = {
  width: 140,
  height: 140,
  objectFit: "contain" as const,
  borderRadius: 16,
  border: "1px solid #d9e2ec",
  padding: 12,
  background: "#ffffff",
  marginTop: 10,
  marginBottom: 16,
};

const emptyLogo = {
  width: 140,
  height: 140,
  borderRadius: 16,
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  fontSize: 14,
  marginTop: 10,
  marginBottom: 16,
};

const uploadButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const logoHelpText = {
  color: "#64748b",
  fontSize: 13,
  marginTop: 10,
};

const colourRow = {
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const colourInput = {
  width: 58,
  height: 44,
  border: "1px solid #bcccdc",
  borderRadius: 12,
  padding: 4,
  background: "#ffffff",
  cursor: "pointer",
};

const controlList = {
  display: "grid",
  gap: 0,
};

const controlItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  padding: "24px 0",
  borderBottom: "1px solid #e2e8f0",
};

const controlItemNoBorder = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  padding: "24px 0 0",
};

const controlTitle = {
  fontSize: 22,
  fontWeight: 800,
  color: "#7f1d1d",
  margin: 0,
};

const controlText = {
  marginTop: 8,
  color: "#475569",
  lineHeight: 1.7,
  fontSize: 15,
  maxWidth: 650,
};

const outlineButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "2px solid #0f766e",
  borderRadius: 14,
  padding: "12px 22px",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  minWidth: 140,
};

const outlineDangerButton = {
  background: "#ffffff",
  color: "#7f1d1d",
  border: "2px solid #0f766e",
  borderRadius: 14,
  padding: "12px 22px",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  minWidth: 140,
};