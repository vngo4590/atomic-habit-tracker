## ADDED Requirements

### Requirement: Analytics shows daily completion as a line chart over a selectable range
The system SHALL render a line chart of daily habit completion percentage (0–100%) for the last 14, 30, or 90 days. The range is toggled via tab buttons.

#### Scenario: Default range is 30 days
- **WHEN** the Analytics screen renders
- **THEN** the "30 days" tab is active and the chart shows 30 data points

#### Scenario: Switching to 90-day range updates chart
- **WHEN** the user clicks the "90 days" tab
- **THEN** the chart re-renders with 90 data points

### Requirement: Four summary stats are displayed above the chart
The system SHALL show: Average adherence (%), Total check-ins (all time), Best streak ever (days + habit name), and Habits at risk (count below 50% this week).

#### Scenario: Habits at risk count is correct
- **WHEN** two habits have a 7-day completion rate below 50%
- **THEN** the "Habits at risk" stat shows "2"

### Requirement: Day-of-week bar chart shows adherence by weekday
The system SHALL render a bar chart with one bar per weekday (Sun–Sat) showing the average completion rate for that day over the last 90 days.

#### Scenario: Seven bars are rendered
- **WHEN** the Analytics screen renders
- **THEN** exactly 7 bars are visible, labeled Sun through Sat

### Requirement: Habit leaderboard ranks habits by 30-day completion rate
The system SHALL show all habits ranked 01, 02, … by their 30-day completion rate, each with a progress bar and percentage.

#### Scenario: Top-ranked habit has highest completion rate
- **WHEN** the leaderboard renders
- **THEN** the habit with the highest 30-day rate appears first with rank "01"
