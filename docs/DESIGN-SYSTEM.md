# Design System: Dark Monarch

## 1. Visual Philosophy
**"Glass & Steel"**: A professional, high-density interface designed for active traders.
- **Aesthetic**: Dark, utilitarian, and data-first.
- **Interaction**: "Mechanical" precision—instant feedback, no bouncy physics.
- **Environment**: Optimized for low-light environments and long trading sessions.

---

## 2. Color Palette
Colors are defined as CSS variables using HSL values for runtime manipulation.

### Base Layer (The Stage)
| Token | Color | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | `hsl(224, 71%, 4%)` | `#030B1C` | Global app background. Deep navy/black. |
| **Card / Surface** | `hsl(220, 13%, 13%)` | `#1D2126` | Dashboard tiles, tables, sidebars. |
| **Popover / Elevated** | `hsl(217, 19%, 20%)` | `#29303D` | Dropdowns, modals, tooltips. |

### Functional Layer (The Signal)
| Token | Color | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Primary (Brand)** | `hsl(221, 83%, 53%)` | `#2563EB` | Call-to-actions, active states, "Buy". |
| **Profit (Success)** | `hsl(142, 70%, 45%)` | `#22C55E` | Positive P&L, "Yes" contracts. |
| **Loss (Destructive)** | `hsl(0, 84%, 60%)` | `#EF4444` | Negative P&L, "No" contracts, Errors. |
| **Warning** | `hsl(38, 92%, 50%)` | `#F59E0B` | Fees, voided markets, partial fills. |
| **Muted** | `hsl(215, 20%, 65%)` | `#94A3B8` | Secondary labels, metadata. |

---

## 3. Typography
**Font Family**: `Inter` (Variable)
**Critical Feature**: `font-variant-numeric: tabular-nums` used on all data tables.

| Role | Size | Weight | Tracking |
| :--- | :--- | :--- | :--- |
| **Display** | 30px (`text-3xl`) | Bold (700) | -0.02em |
| **H1** | 24px (`text-2xl`) | Semibold (600) | -0.01em |
| **H2** | 18px (`text-lg`) | Medium (500) | Normal |
| **Body** | 14px (`text-sm`) | Regular (400) | Normal |
| **Mono/Code** | 12px (`text-xs`) | Medium (500) | 0.05em |

---

## 4. Spacing & Layout
**Grid Base**: 4px
**Default Radius**: `0.5rem` (8px) for outer containers, `0.375rem` (6px) for inner elements.

| Token | Size | Usage |
| :--- | :--- | :--- |
| `gap-2` | 8px | Tight grouping (Label + Value) |
| `gap-4` | 16px | Standard component separation |
| `p-4` | 16px | Card internal padding |
| `p-6` | 24px | Screen/Container padding |

---

## 5. UI Components & Style
- **Borders over Shadows**: Use 1px borders (`border-border`) to define edges.
- **Micro-Interactions**:
    - **Hover**: Instant brightness shift (150ms `ease-out`).
    - **Active**: "Press" effect (scale 0.98).
- **Glass Effect**: Subtle top-highlight gradient on cards: `bg-gradient-to-b from-white/5 to-transparent`.

---

## 6. Animation
**"Snap, don't bounce."**
- **Duration**: 200ms
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (Decelerate fast)
- **Use Cases**:
    - Sidebar slide-in
    - Filter row expansion
    - Toast notification entry
