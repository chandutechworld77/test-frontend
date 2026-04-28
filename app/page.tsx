"use client";

import { FormEvent, useEffect, useState } from "react";

type Item = {
  id: number;
  name: string;
  status: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001";

async function request(path: string, options?: RequestInit) {
  const headers = new Headers(options?.headers);

  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function fetchItems() {
  const response = await request("/api/items");
  return response.data || [];
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadItems() {
    try {
      setLoading(true);
      setError("");
      setItems(await fetchItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialItems() {
      try {
        const nextItems = await fetchItems();
        if (isMounted) {
          setItems(nextItems);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch items");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialItems();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetForm() {
    setName("");
    setStatus("active");
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      if (editingId === null) {
        await request("/api/items", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), status }),
        });
        setMessage("Item created");
      } else {
        await request(`/api/items/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ name: name.trim(), status }),
        });
        setMessage("Item replaced with PUT");
      }

      resetForm();
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(item: Item) {
    setEditingId(item.id);
    setName(item.name);
    setStatus(item.status);
    setMessage("");
    setError("");
  }

  async function handlePatch(item: Item) {
    const nextStatus = item.status === "active" ? "inactive" : "active";

    try {
      setError("");
      setMessage("");
      await request(`/api/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setMessage(`Item ${item.id} patched`);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to patch item");
    }
  }

  async function handleDelete(id: number) {
    try {
      setError("");
      setMessage("");
      await request(`/api/items/${id}`, {
        method: "DELETE",
      });
      setMessage(`Item ${id} deleted`);
      if (editingId === id) {
        resetForm();
      }
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff8e7_0%,#f8f4ec_45%,#efe7da_100%)] px-4 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-stone-300/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(120,84,42,0.12)] backdrop-blur md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
            Test frontend
          </p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
                Backend CRUD demo
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                This screen reads items from the backend and lets you create,
                replace, patch, and delete them against
                <span className="ml-1 font-medium text-stone-900">
                  {API_BASE_URL}
                </span>
                .
              </p>
            </div>
            <button
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-100"
              onClick={loadItems}
              type="button"
            >
              Refresh GET
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="rounded-[2rem] bg-stone-950 p-6 text-stone-50 shadow-[0_24px_60px_rgba(28,25,23,0.35)]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {editingId === null ? "Create item" : `Edit item ${editingId}`}
              </h2>
              {editingId !== null ? (
                <button
                  className="text-sm text-amber-300 underline-offset-4 hover:underline"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm">
                Name
                <input
                  className="rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-400"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter item name"
                  value={name}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                Status
                <select
                  className="rounded-2xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-50 outline-none transition focus:border-amber-400"
                  onChange={(event) => setStatus(event.target.value)}
                  value={status}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>

              <button
                className="mt-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-200"
                disabled={submitting}
                type="submit"
              >
                {submitting
                  ? "Saving..."
                  : editingId === null
                    ? "Create with POST"
                    : "Replace with PUT"}
              </button>
            </form>

            {message ? (
              <p className="mt-4 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                {message}
              </p>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-stone-300/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(120,84,42,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Items
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                  GET response
                </h2>
              </div>
              <div className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700">
                {items.length} records
              </div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-stone-300 px-6 py-12 text-center text-stone-500">
                Loading items...
              </div>
            ) : items.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-stone-300 px-6 py-12 text-center text-stone-500">
                No items found.
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {items.map((item) => (
                  <article
                    className="rounded-3xl border border-stone-200 bg-stone-50 p-5"
                    key={item.id}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-50">
                            #{item.id}
                          </span>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">
                            {item.status}
                          </span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-stone-950">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                          onClick={() => handleEdit(item)}
                          type="button"
                        >
                          Load for PUT
                        </button>
                        <button
                          className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                          onClick={() => handlePatch(item)}
                          type="button"
                        >
                          Toggle with PATCH
                        </button>
                        <button
                          className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          onClick={() => handleDelete(item.id)}
                          type="button"
                        >
                          Remove with DELETE
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
