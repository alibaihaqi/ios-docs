import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/ios-docs/',
  cleanUrls: true,
  lang: 'en-US',
  lastUpdated: true,
  srcDir: 'src',

  locales: {
    root: {
      label: 'English',
      lang: 'en'
    },
    // fr: {
    //   label: 'French',
    //   lang: 'fr', // optional, will be added  as `lang` attribute on `html` tag
    // }
  },

  title: 'iOS Documentation',
  description: 'iOS Documentation Collection',

  head: [
    ['link', { rel: 'icon', href: 'https://www.alibaihaqi.com/favicon.ico' }]
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Beginner', link: '/beginner/' },
      { text: 'Intermediate', link: '/intermediate/' },
      { text: 'Advanced', link: '/advanced/' },
      { text: 'Objective-C', link: '/objective-c/' },
      { text: 'Swift', link: '/swift/' }
    ],

    search: {
      provider: 'local',
    },

    footer: {
      copyright: 'Copyright © 2023 - Present by Fadli Al Baihaqi'
    },

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Introduction', link: '/introduction/' },
          { text: 'Getting Started', link: '/introduction/getting-started' }
        ]
      },
      {
        text: 'Beginner',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/beginner/' },
          { text: '01 Install Xcode', link: '/beginner/01-install-xcode' },
          { text: '02 Swift values and variables', link: '/beginner/02-values-and-variables' },
          { text: '03 Functions and trailing closures', link: '/beginner/03-functions-and-closures' },
          { text: '04 Structs', link: '/beginner/04-structs' },
          { text: '05 The View protocol', link: '/beginner/05-the-view-protocol' },
          { text: '06 Text, VStack, HStack', link: '/beginner/06-text-stacks' },
          { text: '07 View modifiers', link: '/beginner/07-view-modifiers' },
          { text: '08 State', link: '/beginner/08-state' },
          { text: '09 List', link: '/beginner/09-list' },
          { text: '10 ForEach and Identifiable', link: '/beginner/10-foreach-and-identifiable' },
          { text: '11 Ship a one-screen list app', link: '/beginner/11-ship-list-app' }
        ]
      },
      {
        text: 'Intermediate',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/intermediate/' },
          { text: '01 Why MVVM', link: '/intermediate/01-why-mvvm' },
          { text: '02 The view model', link: '/intermediate/02-viewmodel' },
          { text: '03 Async load with URLSession', link: '/intermediate/03-async-urlsession' },
          { text: '04 Bind the view', link: '/intermediate/04-bind-view' },
          { text: '05 Loading and error states', link: '/intermediate/05-loading-error' },
          { text: '06 NavigationStack detail', link: '/intermediate/06-navigationstack-detail' }
        ]
      },
      {
        text: 'Advanced',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/advanced/' },
          { text: '01 Why SwiftData', link: '/advanced/01-why-swiftdata' },
          { text: '02 Add SwiftData', link: '/advanced/02-add-swiftdata' },
          { text: '03 Sign in with Apple', link: '/advanced/03-sign-in-with-apple' },
          { text: '04 Secure token storage', link: '/advanced/04-secure-token-storage' },
          { text: '05 Unit tests', link: '/advanced/05-unit-tests' },
          { text: '06 UI tests', link: '/advanced/06-ui-tests' },
          { text: '07 CI/CD GitHub Actions', link: '/advanced/07-ci-cd-github-actions' },
          { text: '08 Push notifications', link: '/advanced/08-push-notifications' },
          { text: '09 Instruments profiling', link: '/advanced/09-instruments-profiling' },
          { text: '10 TestFlight distribution', link: '/advanced/10-testflight-distribution' },
        ]
      },
      {
        text: 'Objective-C',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/objective-c/' },
          { text: '01 Why Objective-C', link: '/objective-c/01-why-objective-c' },
          { text: '02 Syntax foundations', link: '/objective-c/02-syntax-foundations' },
          { text: '03 Classes and objects', link: '/objective-c/03-classes-and-objects' },
          { text: '04 Memory management', link: '/objective-c/04-memory-management' },
          { text: '05 Categories and protocols', link: '/objective-c/05-categories-and-protocols' },
          { text: '06 Foundation essentials', link: '/objective-c/06-foundation-essentials' },
          { text: '07 Blocks', link: '/objective-c/07-blocks' },
          { text: '08 UIKit with ObjC', link: '/objective-c/08-uikit-with-objc' },
          { text: '09 Error handling', link: '/objective-c/09-error-handling' },
          { text: '10 KVO and NotificationCenter', link: '/objective-c/10-kvo-notificationcenter' },
          { text: '11 ObjC-Swift interop', link: '/objective-c/11-objc-swift-interop' },
          { text: '12 Testing ObjC code', link: '/objective-c/12-testing-objective-c' }
        ]
      },
      {
        text: 'Swift',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/swift/' },
          { text: '01 Why Swift', link: '/swift/01-why-swift' },
          { text: '02 Types and optionals', link: '/swift/02-types-and-optionals' },
          { text: '03 Functions and closures', link: '/swift/03-functions-and-closures' },
          { text: '04 Structs and classes', link: '/swift/04-structs-and-classes' },
          { text: '05 Enums and pattern matching', link: '/swift/05-enums-and-pattern-matching' },
          { text: '06 Protocols and POP', link: '/swift/06-protocols-and-pop' },
          { text: '07 Generics', link: '/swift/07-generics' },
          { text: '08 Error handling', link: '/swift/08-error-handling' },
          { text: '09 Property wrappers and result builders', link: '/swift/09-property-wrappers-result-builders' },
          { text: '10 Swift concurrency', link: '/swift/10-swift-concurrency' },
          { text: '11 Swift Package Manager', link: '/swift/11-swift-package-manager' },
          { text: '12 iOS patterns in Swift', link: '/swift/12-ios-patterns-in-swift' },
          { text: '13 Testing Swift code', link: '/swift/13-testing-swift-code' },
          { text: '14 Swift-ObjC interop', link: '/swift/14-swift-objc-interop' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/alibaihaqi' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/alibaihaqi/' }
    ]
  }
})
