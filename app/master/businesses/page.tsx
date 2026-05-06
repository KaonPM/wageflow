"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Business = {
  id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  selected_package: string | null;
  number_of_employees: number | null;
  created_at: string;
};

const PAGE_SIZE = 5;

export default function MasterBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    setLoading(true);

    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setBusinesses(data || []);
    setLoading(false);
  }

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business) =>
      business.business_name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [businesses, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBusinesses.length / PAGE_SIZE)
  );

  const visibleBusinesses = filteredBusinesses.slice(
    (pageNumber - 1) * PAGE_SIZE,
    pageNumber * PAGE_SIZE
  );

  function getSetupStage(business: Business) {
    if (!business.logo_url || !business.primary_color || !business.accent_color) {
      return "Branding needed";
    }

    if (!business.selected_package) {
      return "Package needed";
    }

    if (!business.status || business.status !== "Active") {
      return "Activation pending";
    }

    return "Ready";
  }

  function getStageStyle(stage: string) {
    if (stage === "Ready") {
      return {
        ...badge,
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (stage === "Activation pending") {
      return {
        ...badge,
        background: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      ...badge,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return (
    <main style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>WageFlow Businesses</h1>
          <p style={subtitle}>
            View approved businesses and continue their setup.
          </p>
        </div>

        <Link href="/master" style={backButton}>
          Back to Dashboard
        </Link>
      </div>

      <section style={toolbar}>
        <input
          style={searchInput}
          placeholder="Search business by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPageNumber(1);
          }}
        />

        <button onClick={fetchBusinesses} style={refreshButton}>
          Refresh
        </button>
      </section>

      <section style={card}>
        {loading ? (
          <p style={muted}>Loading businesses...</p>
        ) : filteredBusinesses.length === 0 ? (
          <p style={muted}>No businesses found.</p>
        ) : (
          <>
            <div style={list}>
              {visibleBusinesses.map((business) => {
                const stage = getSetupStage(business);

                return (
                  <div key={business.id} style={businessRow}>
                    <div style={mainInfo}>
                      <div style={nameRow}>
                        <h2 style={businessName}>
                          {business.business_name}
                        </h2>
                        <span style={getStageStyle(stage)}>{stage}</span>
                      </div>

                      <p style={smallText}>
                        {business.email || "No email"} •{" "}
                        {business.phone || "No phone"}
                      </p>

                      <p style={smallText}>
                        Package: {business.selected_package || "Not set"} •
                        Employees: {business.number_of_employees || 0}
                      </p>
                    </div>

                    <div style={actions}>
                      <Link
                        href={`/master/businesses/${business.id}`}
                        style={manageButton}
                      >
                        Manage Business
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={pagination}>
              <button
                style={pageButton}
                disabled={pageNumber === 1}
                onClick={() => setPageNumber((current) => current - 1)}
              >
                Previous
              </button>

              <span style={pageText}>
                Page {pageNumber} of {totalPages}
              </span>

              <button
                style={pageButton}
                disabled={pageNumber === totalPages}
                onClick={() => setPageNumber((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
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

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 24,
};

const title = {
  fontSize: 30,
  color: "#102a43",
  margin: 0,
};

const subtitle = {
  color: "#486581",
  marginTop: 8,
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

const toolbar = {
  display: "flex",
  gap: 12,
  marginBottom: 18,
};

const searchInput = {
  flex: 1,
  padding: 13,
  borderRadius: 12,
  border: "1px solid #bcccdc",
  fontSize: 14,
};

const refreshButton = {
  background: "#102a43",
  color: "#ffffff",
  border: "none",
  borderRadius: 12,
  padding: "0 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const card = {
  background: "#ffffff",
  border: "1px solid #d9e2ec",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)",
};

const list = {
  display: "grid",
  gap: 12,
};

const businessRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  background: "#ffffff",
};

const mainInfo = {
  flex: 1,
};

const nameRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const businessName = {
  fontSize: 17,
  color: "#102a43",
  margin: 0,
};

const smallText = {
  margin: "6px 0 0",
  color: "#486581",
  fontSize: 13,
};

const badge = {
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const actions = {
  display: "flex",
  justifyContent: "flex-end",
};

const manageButton = {
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 13,
  whiteSpace: "nowrap" as const,
};

const pagination = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 12,
  marginTop: 18,
};

const pageButton = {
  background: "#ffffff",
  border: "1px solid #bcccdc",
  borderRadius: 999,
  padding: "9px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const pageText = {
  color: "#486581",
  fontSize: 13,
  fontWeight: 700,
};

const muted = {
  color: "#64748b",
};