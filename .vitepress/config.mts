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
      { text: 'Advanced', link: '/advanced/' }
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
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/alibaihaqi' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/alibaihaqi/' }
    ]
  }
})
