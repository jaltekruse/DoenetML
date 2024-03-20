import WithNextra from 'nextra';

let withNextra = WithNextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx'
})

let stuff = withNextra();

export default stuff;

// If you have other Next.js configurations, you can pass them as the parameter:
// module.exports = withNextra({ /* other next.js config */ })
