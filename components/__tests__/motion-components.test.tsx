import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  SlideIn,
  ScaleOnTap,
  HoverLift,
  AnimatedNumber,
} from "@/components/motion";

describe("Motion primitives", () => {
  it("FadeIn renders children without crashing", () => {
    render(
      <FadeIn>
        <div data-testid="fade-child">Hello</div>
      </FadeIn>
    );
    expect(screen.getByTestId("fade-child")).toBeTruthy();
  });

  it("StaggerContainer with StaggerItem renders list without crashing", () => {
    render(
      <StaggerContainer>
        <StaggerItem>
          <div data-testid="item-1">Item 1</div>
        </StaggerItem>
        <StaggerItem>
          <div data-testid="item-2">Item 2</div>
        </StaggerItem>
      </StaggerContainer>
    );
    expect(screen.getByTestId("item-1")).toBeTruthy();
    expect(screen.getByTestId("item-2")).toBeTruthy();
  });

  it("SlideIn renders children without crashing", () => {
    render(
      <SlideIn direction="left">
        <div data-testid="slide-child">Hello</div>
      </SlideIn>
    );
    expect(screen.getByTestId("slide-child")).toBeTruthy();
  });

  it("ScaleOnTap renders children without crashing", () => {
    render(
      <ScaleOnTap>
        <button>Tap me</button>
      </ScaleOnTap>
    );
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("HoverLift renders children without crashing", () => {
    render(
      <HoverLift>
        <div data-testid="hover-child">Card</div>
      </HoverLift>
    );
    expect(screen.getByTestId("hover-child")).toBeTruthy();
  });

  it("AnimatedNumber renders without crashing", () => {
    const { container } = render(<AnimatedNumber value={42} />);
    expect(container.textContent).toBeTruthy();
  });
});
