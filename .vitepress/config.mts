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
      { text: 'Examples', link: '/markdown-examples' }
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
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/alibaihaqi' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/alibaihaqi/' }
    ]
  }
})
