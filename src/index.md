---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "iOS Documentation"
  tagline: Part of the Learning Docs hub.
  actions:
    - theme: brand
      text: Beginner tier
      link: /beginner/
    - theme: alt
      text: Getting Started
      link: /introduction/
    - theme: alt
      text: Hub
      link: https://alibaihaqi.github.io/learning-docs/

features:
  - title: Beginner tier
    details: Ladder from zero to a SwiftUI list app running in the simulator.
    link: /beginner/
  - title: Intermediate tier
    details: Extend the beginner list into an MVVM async app with URLSession and NavigationStack.
    link: /intermediate/
  - title: Advanced tier
    details: Production-ready iOS with SwiftData persistence, Sign in with Apple, unit/UI tests, CI/CD, push notifications, and TestFlight distribution.
    link: /advanced/
  - title: Objective-C
    details: From message passing to modern iOS patterns — the language behind UIKit.
    link: /objective-c/
  - title: Swift
    details: Safety, expressiveness, and concurrency for iOS development.
    link: /swift/
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);

  --vp-home-hero-name-background-image: linear-gradient(-45deg, #bd34fe 50%, #47caff 50%);
}
</style>