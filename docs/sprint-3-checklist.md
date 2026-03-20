# Sprint 3 Implementation Checklist

**Focus:** Content completeness, state management, and quality gates (per archive/new/frontend.md + frontend-implementation-checklist.md)

## 1) Content State Matrix (Critical)
- [ ] Create `src/components/ui/` with LoadingState, EmptyState, ErrorState, SuccessState components
- [ ] Apply state matrix to Portfolio, Testimonials, Service Matcher, and Contact form
- [ ] All dynamic sections must never render blank

## 2) Portfolio & Testimonials (Home page)
- [ ] Portfolio section: filterable grid with real project cards, loading + empty + error states
- [ ] Testimonials carousel: auto-play with pause, keyboard controls, focus management
- [ ] Final CTA strip on home with strong conversion focus

## 3) Contact Page Completion
- [ ] Contact method cards (phone, email, form) with priority ordering
- [ ] Map embed (Google Maps or static fallback)
- [ ] Office info block + FAQ accordion (data-driven)
- [ ] Emergency banner uses unified `NEXT_PUBLIC_PHONE`

## 4) Motion & Polish
- [ ] Add Framer Motion to remaining components (testimonials, cards, page transitions)
- [ ] Ensure all animations respect `prefers-reduced-motion`
- [ ] Add focus-visible styles and micro-interactions

## 5) Quality & Release Gates
- [ ] Lighthouse: Performance ≥90, Accessibility ≥95, SEO ≥95
- [ ] Full accessibility audit (keyboard navigation, ARIA, contrast)
- [ ] Cross-browser testing (Chrome, Edge, Safari)
- [ ] Update all metadata, canonicals, and structured data
- [ ] Run full test suite + build successfully

## Definition of Done
- All dynamic sections have complete state handling
- Home page is conversion-optimized and visually premium
- No critical accessibility or performance issues
- Staging environment passes all checks
- sprint-2 items fully resolved

**Next (Sprint 4):** Client portal, auth middleware, real imagery integration, and production deployment.

---
**Sprint Goal:** Make the public site feel complete, trustworthy, and highly convertible.
