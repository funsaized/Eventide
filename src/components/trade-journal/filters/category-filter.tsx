"use client";

/**
 * CategoryFilter - Multi-select dropdown for trade categories
 *
 * Uses a Popover with checkboxes for category selection.
 */

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  /** Available categories */
  categories: string[];
  /** Currently selected categories */
  value: string[];
  /** Callback when selection changes */
  onChange: (categories: string[]) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);

  function toggleCategory(category: string) {
    if (value.includes(category)) {
      onChange(value.filter((c) => c !== category));
    } else {
      onChange([...value, category]);
    }
  }

  const label =
    value.length === 0
      ? "Category"
      : value.length === 1
        ? value[0]
        : `${value.length} categories`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 justify-between font-normal",
            value.length === 0 && "text-muted-foreground"
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {categories.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No categories found
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {categories.map((category) => {
              const isSelected = value.includes(category);
              return (
                <button
                  key={category}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "font-medium"
                  )}
                  onClick={() => toggleCategory(category)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  {category}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export type { CategoryFilterProps };
