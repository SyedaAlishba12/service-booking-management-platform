"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Button from "./Button";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch: (value: string) => void;
  buttonLabel?: string;
  className?: string;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-5 w-5"
    >
      <circle
        cx="8.75"
        cy="8.75"
        r="5.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12.75 12.75L17 17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SearchBar({
  placeholder = "Search services...",
  defaultValue = "",
  onSearch,
  buttonLabel = "Search",
  className = "",
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        "flex w-full flex-col gap-2 sm:flex-row",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="relative flex-1">
        <input
          type="search"
          value={value}
          onChange={(event) =>
            setValue(event.target.value)
          }
          placeholder={placeholder}
          className="input min-h-10 pl-11"
          aria-label="Search"
        />

        <span
          aria-hidden="true"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        >
          <SearchIcon />
        </span>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="shrink-0"
      >
        {buttonLabel}
      </Button>
    </form>
  );
}