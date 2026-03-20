# Sprint 2 Implementation Checklist

Focus: Design System, Global Components, and Home Page (per archive/new/frontend.md + frontend-implementation-checklist.md)

## 1) Design System Foundation (Must be complete before pages)
- [ ] Tailwind CSS v3+ configured with content paths
- [ ] Full color tokens (chimera-* palette) in tailwind.config.js + CSS vars
- [ ] Typography scale (Playfair Display for display, Inter for body) with font-display class
- [ ] Spacing, radius, shadow, and layout tokens defined
- [ ] Button, Card, Badge variants using Tailwind + cva if added
- [ ] prefers-reduced-motion support in globals.css

## 2) Global Components
- [ ] Header: trust strip, logo, nav, Get Estimate + Emergency CTAs, mobile drawer
- [ ] Footer: 4-column layout, real links, consistent phone/email, UTF-8 copyright
- [ ] NEXT_PUBLIC_PHONE used everywhere (no hardcoded numbers)
- [ ] No href="#" anywhere

## 3) Home Page (/home)
- [ ] Hero: full viewport, H1 with display font, trust pills, primary CTA
- [ ] Path chooser: 2 distinct paths with value framing
- [ ] Emergency callout banner (sticky on mobile)
- [ ] KPI section with count-up animation (reduced-motion fallback)
- [ ] Services grid: 6 cards with badges
- [ ] Portfolio section stub (filterable placeholder)
- [ ] Testimonials carousel stub
- [ ] Final CTA strip

## 4) Content State Matrix Pattern
- [ ] Create reusable Loading, Empty, Error, Success components in src/components/ui/
- [ ] Apply to contact form and new home sections

## 5) Motion & Accessibility Baseline
- [ ] Add Framer Motion for key animations
- [ ] Implement prefers-reduced-motion globally
- [ ] Focus-visible styles and basic ARIA on interactive elements
- [ ] Keyboard navigation on header

## 6) Quality Gates
- [ ] Update metadata/canonicals in layout.tsx per SEO plan
- [ ] Lighthouse score targets (perf >=90, a11y >=95)
- [ ] Run full lint, typecheck, test suite
- [ ] Cross-browser check on Chrome + Edge

## Definition of Done
- All checkboxes complete
- Home page loads with premium feel (no placeholder "Sprint 1 Baseline")
- No P1 defects from checklist
- sprint-1 remaining items completed (staging deployment)

Sprint 2 goal: Foundation for premium UX and lead conversion paths.

Next sprint will cover /services, wizard, portal, and full QA.
