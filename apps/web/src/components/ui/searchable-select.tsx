"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  label?: string;
  labelClassName?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Выберите…",
  searchPlaceholder = "Поиск…",
  disabled = false,
  required = false,
  name,
  label,
  labelClassName,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openForSearch() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
  }

  function select(option: SearchableSelectOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={className}>
      {label && (
        <label
          className={`mb-1 block ${labelClassName ?? "text-sm text-zinc-400"}`}
          onClick={() => inputRef.current?.focus()}
        >
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative">
        {name && (
          <input type="hidden" name={name} value={value} required={required} />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={open ? query : (selected?.label ?? "")}
          placeholder={open ? searchPlaceholder : placeholder}
          disabled={disabled}
          required={required && !value}
          onFocus={openForSearch}
          onClick={openForSearch}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
            if (e.key === "Enter" && open && filtered.length === 1) {
              e.preventDefault();
              select(filtered[0]!);
            }
          }}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        />
        {open && !disabled && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-500">Ничего не найдено</li>
            ) : (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(option)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
                      option.value === value
                        ? "bg-zinc-800 text-emerald-400"
                        : "text-zinc-200"
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SearchableMultiSelectProps {
  options: SearchableSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  label?: string;
  labelClassName?: string;
  className?: string;
}

export function SearchableMultiSelect({
  options,
  values,
  onChange,
  placeholder = "Выберите…",
  searchPlaceholder = "Поиск…",
  disabled = false,
  label,
  labelClassName,
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selectedSet = useMemo(() => new Set(values), [values]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openForSearch() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
  }

  function toggle(option: SearchableSelectOption) {
    if (selectedSet.has(option.value)) {
      onChange(values.filter((v) => v !== option.value));
    } else {
      onChange([...values, option.value]);
    }
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  const selectedLabels = useMemo(
    () =>
      values
        .map((v) => options.find((o) => o.value === v))
        .filter(Boolean) as SearchableSelectOption[],
    [values, options],
  );

  const inputValue = open
    ? query
    : values.length > 0
      ? `Выбрано: ${values.length}`
      : "";

  return (
    <div className={className}>
      {label && (
        <label
          className={`mb-1 block ${labelClassName ?? "text-sm text-zinc-400"}`}
          onClick={() => inputRef.current?.focus()}
        >
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={inputValue}
          placeholder={open ? searchPlaceholder : placeholder}
          disabled={disabled}
          onFocus={openForSearch}
          onClick={openForSearch}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
            if (e.key === "Enter" && open && filtered.length === 1) {
              e.preventDefault();
              toggle(filtered[0]!);
            }
          }}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        />
        {open && !disabled && (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable
            className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-500">Ничего не найдено</li>
            ) : (
              filtered.map((option) => {
                const checked = selectedSet.has(option.value);
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggle(option)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
                        checked ? "bg-zinc-800 text-emerald-400" : "text-zinc-200"
                      }`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-emerald-500 bg-emerald-600 text-[10px] text-white"
                            : "border-zinc-600"
                        }`}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
      {selectedLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedLabels.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => remove(option.value)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200 hover:border-red-500/60 hover:text-red-300"
            >
              {option.label}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
