import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("Frontend - App Component", () => {
  it("renders header and main sections", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/HACK/i)).toBeInTheDocument();
    expect(screen.getByText(/Your commits,/i)).toBeInTheDocument();
    expect(screen.getByText(/The Series/i)).toBeInTheDocument();
  });
});
