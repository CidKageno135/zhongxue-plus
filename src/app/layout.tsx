import type {Metadata} from "next";
import type {ReactNode} from "react";
import "./globals.css";
import "./zhongxue.css";
import "./dictionary.css";
import "@/components/v2/bento-tokens.css";
export const metadata:Metadata={title:"ZhongXue+ · 智慧華語學習",description:"A1–A2 詞彙語法、口說練習、情境對話與學習紀錄。中越對照，使用繁體中文。"};
export const dynamic="force-dynamic";
const themeInitScript = `
  try {
    var saved = localStorage.getItem('zx_theme');
    var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
`;

export default function RootLayout({children}:{children:ReactNode}) {
 return (
  <html lang="zh-Hant" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
    </head>
    <body>{children}</body>
  </html>
 );
}
