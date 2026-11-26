/**
 * components/ui — the Atomicly design-system primitive kit (ADR-0003,
 * design-system/atomicly/MASTER.md). Each primitive owns its styling via a
 * colocated CSS Module and reads only semantic tokens, so it works in both
 * themes and with any accent hue. Import from "@/components/ui".
 */
export { Badge, type BadgeProps, type BadgeTone } from "./Badge";
export { Button, buttonClassName, type ButtonProps, type ButtonSize, type ButtonVariant } from "./Button";
export { Card, type CardProps } from "./Card";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { Field, Input, Select, TextArea, type FieldProps } from "./Field";
export { IconButton, type IconButtonProps } from "./IconButton";
export { PageHeader, type PageHeaderProps } from "./PageHeader";
export { ProgressRing, type ProgressRingProps } from "./ProgressRing";
export { RouteTabs, type RouteTab, type RouteTabsProps } from "./RouteTabs";
export { Skeleton, type SkeletonProps } from "./Skeleton";
export { Switch, type SwitchProps } from "./Switch";
export { Tab, TabList, TabPanel, Tabs, type TabListProps, type TabPanelProps, type TabProps, type TabsProps } from "./Tabs";
// Existing accessible overlays/feedback, re-exported (not duplicated) so the
// kit has one import path. Modal: Esc + backdrop close, labelled dialog.
// Toast: polite live region fed by the store.
export { Modal, type ModalProps, type ModalTone } from "@/components/Modal";
export { Toast } from "@/components/Toast";
