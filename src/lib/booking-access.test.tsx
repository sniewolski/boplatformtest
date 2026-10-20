import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { bookingDestinations, readReadiness } = vi.hoisted(() => ({
  bookingDestinations: [] as string[],
  readReadiness: vi.fn(() => ({
    isLoading: false,
    allComplete: false,
    incomplete: [{ key: "salescode" }, { key: "conversion" }],
  })),
}));

vi.mock("@/lib/useBookingReadiness", () => ({ useBookingReadiness: readReadiness }));
vi.mock("@/tools/registry", () => ({
  toolRegistry: [{ key: "test-tool", dashboardWidget: { render: () => null } }],
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
  Link: ({ to }: { to: string }) => {
    bookingDestinations.push(to);
    return null;
  },
}));

import { Route as DashboardRoute } from "@/routes/_authenticated/app.index";
import { Route as BookingRoute } from "@/routes/_authenticated/app.book-call";

describe("owner booking access", () => {
  it("allows booking without a submitted Selling Systems Audit or SalesCode", () => {
    bookingDestinations.length = 0;
    readReadiness.mockClear();
    const Dashboard = DashboardRoute.options.component;
    const Booking = BookingRoute.options.component;
    if (!Dashboard || !Booking) throw new Error("Booking screens must exist");

    renderToStaticMarkup(createElement(Dashboard));
    renderToStaticMarkup(createElement(Booking));

    expect(bookingDestinations).toContain("/app/book-call");
    expect(readReadiness).not.toHaveBeenCalled();
  });
});