import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KASPA TN12 Dashboard",
  description: "Kaspa Testnet 12 Dashboard with Atomic Swaps & Deadman Switch",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          data-design-ignore="true"
          dangerouslySetInnerHTML={{
            __html: `(function(){if(window===window.parent||window.__DESIGN_NAV_REPORTER__)return;window.__DESIGN_NAV_REPORTER__=true;function report(){try{window.parent.postMessage({type:'IFRAME_URL_CHANGE',payload:{url:location.origin+location.pathname+location.hash}},'*')}catch(e){}}report();var ps=history.pushState,rs=history.replaceState;history.pushState=function(){ps.apply(this,arguments);report()};history.replaceState=function(){rs.apply(this,arguments);report()};window.addEventListener('popstate',report);window.addEventListener('hashchange',report);window.addEventListener('load',report)})();`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
