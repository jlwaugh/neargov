import "@/styles/globals.css";
import { AppProps } from "next/app";
import { Navigation } from "@/components/Navigation";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Navigation />
      <Component {...pageProps} />
    </>
  );
}
