import { useEffect, useMemo, useState, useCallback } from "react";
import BotonCrear from "./BotonCrear";
import CheckBoxActivos from "./CheckBoxActivos";
import BarraBusqueda from "./BarraBusqueda";
import Pagination from "./Pagination";
import Table from "./Table";

const HEADERS = [
  { key: "Caratula", label: "Carátula" },
  { key: "Estado", label: "Estado" },
  { key: "Objeto", label: "Objeto" },
  { key: "Numero", label: "Número" },
  { key: "Fuero", label: "Fuero" },
  { key: "Juzgado", label: "Juzgado" },
  { key: "Jurisdiccion", label: "Jurisdicción" },
  //{ key: "Activo", label: "Activo" },
  { key: "Pendiente", label: "Pendientes" },
];

const PAGE_SIZE = 10;

function detectIsNumber(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return false;
  const v = String(value).replace(/[^0-9.-]/g, "");
  return v !== "" && isFinite(Number(v));
}

export default function DataTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState({ key: null, direction: "asc" });

  const [expandedRows, setExpandedRows] = useState(new Set());
  const [onlyActivo, setonlyActivo] = useState(true);

  const endpoint = import.meta.env.VITE_API_PUBLIC_ENDPOINT || "";

  useEffect(() => {
    if (!endpoint) {
      setError("No API endpoint configured. Set VITE_API_ENDPOINT in .env");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const arr = Array.isArray(json) ? json : json?.data || [];
        setData(arr);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  useEffect(() => setPage(1), [query, sortBy, data, onlyActivo]);

  const handleSort = useCallback((key) => {
    setSortBy((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }, []);

  const filtered = useMemo(() => {
    let base = data;
    if (onlyActivo) {
      base = base.filter((row) => String(row.Activo).toLowerCase() === "si");
    }
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [data, query, onlyActivo]);

  const sorted = useMemo(() => {
    const { key, direction } = sortBy;
    if (!key) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const avNum = detectIsNumber(av);
      const bvNum = detectIsNumber(bv);
      if (avNum && bvNum) {
        const na = Number(String(av).replace(/[^0-9.-]/g, ""));
        const nb = Number(String(bv).replace(/[^0-9.-]/g, ""));
        return direction === "asc" ? na - nb : nb - na;
      }
      const sa = String(av ?? "");
      const sb = String(bv ?? "");
      return direction === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const toggleRow = (idx) => {
    const s = new Set(expandedRows);
    if (s.has(idx)) s.delete(idx);
    else s.add(idx);
    setExpandedRows(s);
  };

  return (
    <div className="card">
      <div className="toolbar">
        <div className="left-controls">
          <BotonCrear />
          <CheckBoxActivos
            onlyActivo={onlyActivo}
            setonlyActivo={setonlyActivo}
          />
        </div>
        <div className="right-controls">
          <BarraBusqueda query={query} setQuery={setQuery} />
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="status">Cargando...</div>
        ) : error ? (
          <div className="status error">Error: {error}</div>
        ) : (
          <Table
            pageData={pageData}
            sortBy={sortBy}
            handleSort={handleSort}
            toggleRow={toggleRow}
            HEADERS={HEADERS}
            expandedRows={expandedRows}
            page={page}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>

      <Pagination page={page} setPage={setPage} totalPages={totalPages} />
    </div>
  );
}
