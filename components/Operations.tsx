'use client';

import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';

export type Field = {
  name: string;
  label: string;
  type?:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'date'
    | 'datetime-local'
    | 'email'
    | 'url'
    | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  min?: number;
  step?: number;
};

export type Column = {
  key: string;
  label: string;
  kind?: 'badge' | 'url' | 'date' | 'number' | 'text';
};

export type RecordRow = Record<string, unknown>;

type FormValue = string | number | boolean;

export async function command(
  slug: string,
  action: string,
  payload: Record<string, unknown>
) {
  const response = await fetch('/api/commands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceSlug: slug, action, payload }),
    credentials: 'same-origin',
  });

  const data = await response
    .json()
    .catch(() => ({ error: 'Invalid response from server' }));

  if (!response.ok) {
    throw Error(data.error || 'The operation failed');
  }

  return data.result as Record<string, unknown>;
}

export function ActionForm({
  slug,
  action,
  fields,
  label = 'Save changes',
  title,
  initial,
  buttonVariant = 'primary',
  onSaved,
}: {
  slug: string;
  action: string;
  fields: Field[];
  label?: string;
  title?: string;
  initial?: Record<string, unknown>;
  buttonVariant?: 'primary' | 'secondary' | 'ghost';
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [link, setLink] = useState('');

  const [values, setValues] = useState<Record<string, FormValue>>(() => {
    const result: Record<string, FormValue> = {};

    for (const f of fields) {
      const fallback = f.defaultValue ?? (f.type === 'checkbox' ? false : '');
      const value = initial?.[f.name] ?? fallback;

      result[f.name] =
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
          ? value
          : fallback;
    }

    return result;
  });

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const payload: Record<string, unknown> = {};

      for (const f of fields) {
        let value: FormValue | null = values[f.name];

        if (f.type === 'number') {
          value = value === '' ? '' : Number(value);
        }

        if (f.type === 'datetime-local' && value) {
          value = new Date(String(value)).toISOString();
        }

        if (f.type === 'select' && value === '' && !f.required) {
          value = null;
        }

        payload[f.name] = value;
      }

      const result = await command(slug, action, {
        ...initial,
        ...payload,
      });

      if (typeof result?.inviteUrl === 'string') {
        setLink(result.inviteUrl);
        setSuccess(
          'Invitation link created. Copy it and send it securely to the invited member.'
        );
      } else {
        setSuccess('Saved successfully.');
        setOpen(false);
        router.refresh();
        onSaved?.();
      }
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const fieldInput = (f: Field) => {
    const val = values[f.name] ?? '';

    const update = (value: string | boolean) => {
      setValues((previous) => ({
        ...previous,
        [f.name]: value,
      }));
    };

    if (f.type === 'textarea') {
      return (
        <textarea
          value={String(val)}
          required={f.required}
          placeholder={f.placeholder}
          onChange={(e) => update(e.target.value)}
          rows={3}
        />
      );
    }

    if (f.type === 'select') {
      return (
        <select
          required={f.required}
          value={String(val)}
          onChange={(e) => update(e.target.value)}
        >
          <option value="">Choose...</option>
          {(f.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (f.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={Boolean(val)}
          onChange={(e) => update(e.target.checked)}
          style={{ width: 20 }}
        />
      );
    }

    return (
      <input
        type={f.type || 'text'}
        value={String(val)}
        required={f.required}
        placeholder={f.placeholder}
        min={f.min}
        step={f.step}
        maxLength={f.type === 'text' ? 500 : undefined}
        onChange={(e) => update(e.target.value)}
      />
    );
  };

  return (
    <>
      <button
        className={buttonVariant}
        type="button"
        onClick={() => {
          setOpen(true);
          setError('');
        }}
      >
        <Plus size={15} />
        {label}
      </button>

      {open && (
        <div
          className="modal-cover"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={title || label}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex between center">
              <h2>{title || label}</h2>
              <button
                className="secondary btn-sm"
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="form-grid">
                {fields.map((f) => (
                  <label
                    className={'field ' + (f.type === 'textarea' ? 'wide' : '')}
                    key={f.name}
                  >
                    {f.label}
                    {fieldInput(f)}
                  </label>
                ))}
              </div>

              {error && (
                <p role="alert" className="message space-top">
                  {error}
                </p>
              )}

              {success && (
                <p role="status" className="message ok space-top">
                  {success}
                </p>
              )}

              {link && (
                <label className="field space-top">
                  Invitation URL
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
              )}

              <div className="form-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
                <button className="primary" type="submit" disabled={busy}>
                  {busy ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}{' '}
                  {busy ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function formatValue(value: unknown, kind?: Column['kind']) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (kind === 'number' && typeof value === 'number') {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (kind === 'date') {
    const dt = new Date(String(value));
    return isNaN(dt.getTime()) ? String(value) : dt.toLocaleDateString();
  }

  return String(value);
}

export function DataTable({
  rows,
  columns,
  empty = 'Nothing here yet.',
  pageSize = 15,
  children,
}: {
  rows: RecordRow[];
  columns: Column[];
  empty?: string;
  pageSize?: number;
  children?: (row: RecordRow) => ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        columns.some((col) =>
          String(row[col.key] ?? '')
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      ),
    [rows, search, columns]
  );

  const count = Math.max(1, Math.ceil(filtered.length / pageSize));
  const p = Math.min(page, count - 1);
  const current = filtered.slice(p * pageSize, (p + 1) * pageSize);

  const csv = () => {
    const keys = columns.map((c) => c.key);

    const escapeCell = (value: unknown) => {
      const raw = String(value ?? '');
      const protectedValue = /^[=+@\-\t\r]/.test(raw) ? "'" + raw : raw;
      return '"' + protectedValue.replace(/"/g, '""') + '"';
    };

    const all = [
      keys.join(','),
      ...filtered.map((row) =>
        keys.map((key) => escapeCell(row[key])).join(',')
      ),
    ].join('\r\n');

    const url = URL.createObjectURL(
      new Blob(['\ufeff' + all], {
        type: 'text/csv;charset=utf-8',
      })
    );

    const a = document.createElement('a');
    a.href = url;
    a.download = 'workspace-table.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="filter-bar">
        <label
          className="flex center gap8"
          style={{ position: 'relative' }}
        >
          <Search size={15} className="muted" />
          <input
            className="search-input"
            placeholder="Search the visible rows..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            aria-label="Filter rows"
          />
        </label>

        <button
          className="secondary btn-sm"
          type="button"
          onClick={csv}
          disabled={!filtered.length}
        >
          <Download size={15} />
          Export CSV
        </button>

        <span
          className="muted small"
          style={{ margin: 'auto 0 auto auto' }}
        >
          {filtered.length} displayed
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {children && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {current.map((row, i) => (
              <tr key={String(row.id ?? i)}>
                {columns.map((c) => (
                  <td key={c.key}>
                    {c.kind === 'badge' ? (
                      <span className={'badge ' + String(row[c.key] ?? '')}>
                        {formatValue(row[c.key])}
                      </span>
                    ) : c.kind === 'url' &&
                      typeof row[c.key] === 'string' &&
                      /^https?:\/\//.test(row[c.key] as string) ? (
                      <a
                        className="pill-link"
                        href={String(row[c.key])}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open URL ↗
                      </a>
                    ) : (
                      formatValue(row[c.key], c.kind)
                    )}
                  </td>
                ))}
                {children && <td>{children(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {!current.length && (
          <div className="empty">
            <h3>No matching records</h3>
            <p>{empty}</p>
          </div>
        )}
      </div>

      {count > 1 && (
        <div className="flex between center space-top">
          <span className="muted small">
            Page {p + 1} of {count}
          </span>

          <div className="action-row">
            <button
              className="secondary btn-sm"
              type="button"
              disabled={p === 0}
              onClick={() => setPage(p - 1)}
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <button
              className="secondary btn-sm"
              type="button"
              disabled={p >= count - 1}
              onClick={() => setPage(p + 1)}
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusAction({
  slug,
  action,
  payload,
  label,
  confirm,
  variant = 'secondary',
}: {
  slug: string;
  action: string;
  payload: Record<string, unknown>;
  label: string;
  confirm?: string;
  variant?: 'secondary' | 'ghost' | 'danger';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <div>
      <button
        className={variant + ' btn-sm'}
        disabled={busy}
        type="button"
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) {
            return;
          }

          setBusy(true);
          setError('');

          try {
            await command(slug, action, payload);
            router.refresh();
          } catch (ex) {
            setError(ex instanceof Error ? ex.message : 'Failed');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Saving...' : label}
      </button>

      {error && (
        <span
          role="alert"
          className="tiny"
          style={{ color: '#bb3642', display: 'block' }}
        >
          {error}
        </span>
      )}
    </div>
  );
}