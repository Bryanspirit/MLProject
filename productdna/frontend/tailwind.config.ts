import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
              "on-error": "#ffffff",
              "outline-variant": "#c7c4d7",
              "tertiary": "#904900",
              "secondary-fixed": "#dae2fd",
              "on-secondary": "#ffffff",
              "on-secondary-fixed": "#131b2e",
              "primary-container": "#6063ee",
              "surface-tint": "#494bd6",
              "surface-container-highest": "#e4e1ed",
              "on-surface": "#1b1b23",
              "tertiary-container": "#b55d00",
              "on-secondary-fixed-variant": "#3f465c",
              "on-primary-fixed-variant": "#2f2ebe",
              "surface-container-high": "#e9e6f3",
              "background": "#fcf8ff",
              "surface-container": "#efecf8",
              "on-primary": "#ffffff",
              "surface-container-low": "#f5f2fe",
              "on-tertiary-container": "#fffbff",
              "on-tertiary-fixed-variant": "#703700",
              "tertiary-fixed-dim": "#ffb783",
              "on-tertiary": "#ffffff",
              "inverse-on-surface": "#f2effb",
              "surface-container-lowest": "#ffffff",
              "surface-dim": "#dbd8e4",
              "on-surface-variant": "#464554",
              "on-tertiary-fixed": "#301400",
              "tertiary-fixed": "#ffdcc5",
              "on-background": "#1b1b23",
              "error": "#ba1a1a",
              "on-error-container": "#93000a",
              "on-secondary-container": "#5c647a",
              "surface-bright": "#fcf8ff",
              "primary-fixed-dim": "#c0c1ff",
              "on-primary-container": "#fffbff",
              "primary": "#4648d4",
              "primary-fixed": "#e1e0ff",
              "secondary-container": "#dae2fd",
              "surface": "#fcf8ff",
              "secondary-fixed-dim": "#bec6e0",
              "secondary": "#565e74",
              "inverse-primary": "#c0c1ff",
              "surface-variant": "#e4e1ed",
              "outline": "#767586",
              "inverse-surface": "#303038",
              "on-primary-fixed": "#07006c",
              "error-container": "#ffdad6"
      },
      "borderRadius": {
              "DEFAULT": "0.125rem",
              "lg": "0.25rem",
              "xl": "0.5rem",
              "full": "0.75rem"
      },
      "spacing": {
              "section-margin": "32px",
              "unit": "4px",
              "cell-padding-h": "12px",
              "cell-padding-v": "6px",
              "data-gap": "8px",
              "container-padding": "24px"
      },
      "fontFamily": {
              "body-sm": [
                      "Inter"
              ],
              "body-base": [
                      "Inter"
              ],
              "h1": [
                      "Inter"
              ],
              "h2": [
                      "Inter"
              ],
              "display": [
                      "Inter"
              ],
              "data-tabular": [
                      "Inter"
              ],
              "h3": [
                      "Inter"
              ],
              "label-caps": [
                      "Inter"
              ]
      },
      "fontSize": {
              "body-sm": [
                      "13px",
                      {
                              "lineHeight": "18px",
                              "fontWeight": "400"
                      }
              ],
              "body-base": [
                      "14px",
                      {
                              "lineHeight": "20px",
                              "fontWeight": "400"
                      }
              ],
              "h1": [
                      "24px",
                      {
                              "lineHeight": "32px",
                              "letterSpacing": "-0.01em",
                              "fontWeight": "600"
                              }
                      ],
                      "h2": [
                              "20px",
                              {
                                      "lineHeight": "28px",
                                      "letterSpacing": "-0.01em",
                                      "fontWeight": "600"
                              }
                      ],
                      "display": [
                              "36px",
                              {
                                      "lineHeight": "44px",
                                      "letterSpacing": "-0.02em",
                                      "fontWeight": "600"
                              }
                      ],
                      "data-tabular": [
                              "12px",
                              {
                                      "lineHeight": "16px",
                                      "fontWeight": "500"
                              }
                      ],
                      "h3": [
                              "16px",
                              {
                                      "lineHeight": "24px",
                                      "fontWeight": "600"
                              }
                      ],
                      "label-caps": [
                              "11px",
                              {
                                      "lineHeight": "16px",
                                      "letterSpacing": "0.05em",
                                      "fontWeight": "600"
                              }
                      ]
              }
      },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
} satisfies Config